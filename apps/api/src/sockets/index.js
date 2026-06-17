import { Server } from "socket.io"
import { verifyAccess } from "@/lib/jwt-helper"
import { PartyQueue, serializeParty, serializePublicParty } from "@/lib/matchmaking/queue.js"
import {
  activateSession,
  beginStopPhoto,
  createMatchedSession,
  finishStopTimer,
  getActiveSessionIdsForUser,
  getSessionStop,
  isSessionMember,
  loadPlayerProfile,
  persistQueuedParty,
  photoBelongsToStop,
  removePersistedParty,
  routeThemeExists,
  startStopTimer,
  themeHasActiveRoute,
} from "@/lib/matchmaking/session.js"
import { ConversationStarterScheduler } from "@/lib/conversation-starters.js"

/**
 * Event catalog. Mirror this object in the client.
 */
export const SOCKET_EVENTS = Object.freeze({
  // ---- client -> server ----
  PARTY_CREATE: "party:create",
  PARTY_JOIN: "party:join",
  PARTY_LEAVE: "party:leave",
  PARTY_KICK: "party:kick",
  PARTY_STATUS: "party:status",
  PARTY_QUEUE: "party:queue",
  PARTY_UNQUEUE: "party:unqueue",
  PARTY_SET_OPTIONS: "party:options",
  PARTY_BROWSE: "party:browse",
  PARTY_JOIN_PUBLIC: "party:join-public",
  SESSION_READY: "session:ready",
  STOP_START: "stop:start",
  STOP_FINISH: "stop:finish",
  STOP_PHOTO_SUBMIT: "stop:photo:submit",

  // ---- server -> client ----
  PARTY_UPDATED: "party:updated",
  PARTY_DISSOLVED: "party:dissolved",
  QUEUE_UPDATE: "queue:update",
  MATCH_FOUND: "match:found",
  SESSION_STARTED: "session:started",
  STOP_TIMER_STARTED: "stop:timer:started",
  STOP_PHOTO_REQUESTED: "stop:photo:requested",
  STOP_TIMER_FINISHED: "stop:timer:finished",
  CONVERSATION_STARTER: "conversation:starter",
  ERROR: "error:matchmaking",
})

/**
 * How long a chosen member has to submit the group selfie before the spotlight
 * rotates to another connected member (re-pick on no-show / disconnect).
 */
const PHOTO_REQUEST_TIMEOUT_MS = 5 * 60_000

/**
 * Wire Socket.IO onto an existing HTTP server.
 *
 * @param {import("http").Server} httpServer
 * @param {{ corsOrigin?: string }} [opts]
 * @returns {{ io: import("socket.io").Server, queue: PartyQueue }}
 */
export function attachSocketServer(httpServer, opts = {}) {
  const io = new Server(httpServer, {
    cors: {
      origin: opts.corsOrigin ?? "http://localhost:3000",
      credentials: true,
    },
  })

  const queue = new PartyQueue()
  queue.start()
  const scheduler = new ConversationStarterScheduler()
  /** @type {Map<string, string[]>} sessionId -> partyIds waiting for release */
  const sessionParties = new Map()
  /**
   * Stops that are paused on `awaiting_photo`, keyed by stopId.
   * @type {Map<string, { sessionId: string, chosenUserId: string|null, timeout: NodeJS.Timeout }>}
   */
  const photoRequests = new Map()

  // --- AUTH ---------------------------------------------------------------
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        extractBearer(socket.handshake.headers?.authorization) ||
        extractCookie(socket.handshake.headers?.cookie, "access_token")

      if (!token) return next(new Error("Authentication token is required"))
      const payload = verifyAccess(token)
      if (!payload?.userId) return next(new Error("Invalid token payload"))

      socket.data.userId = payload.userId
      socket.data.email = payload.email
      return next()
    } catch {
      return next(new Error("Invalid or expired token"))
    }
  })

  // --- CONNECTION ---------------------------------------------------------
  io.on("connection", (socket) => {
    const { userId } = socket.data
    socket.join(userRoom(userId))

    // If they reconnect while in a party, push the current state so the
    // client UI restores immediately.
    const existingParty = queue.getPartyOfUser(userId)
    if (existingParty) {
      socket.join(partyRoom(existingParty.id))
      socket.emit(SOCKET_EVENTS.PARTY_UPDATED, serializeParty(existingParty))
    }

    // Re-join any in-progress session rooms. Socket.IO drops room membership on
    // disconnect, so a member who briefly dropped (e.g. Android pausing the app
    // to open the camera) would otherwise stop receiving stop broadcasts and
    // hang on the current stop while everyone else advances.
    for (const sessionId of getActiveSessionIdsForUser(userId)) {
      socket.join(sessionRoom(sessionId))
    }

    socket.on(SOCKET_EVENTS.PARTY_CREATE, (payload, ack) =>
      safe(socket, ack, () => handleCreateParty(io, socket, queue)),
    )
    socket.on(SOCKET_EVENTS.PARTY_JOIN, (payload, ack) =>
      safe(socket, ack, () => handleJoinParty(io, socket, queue, payload)),
    )
    socket.on(SOCKET_EVENTS.PARTY_LEAVE, (_payload, ack) =>
      safe(socket, ack, () => handleLeaveParty(io, socket, queue)),
    )
    socket.on(SOCKET_EVENTS.PARTY_KICK, (payload, ack) =>
      safe(socket, ack, () => handleKick(io, socket, queue, payload)),
    )
    socket.on(SOCKET_EVENTS.PARTY_STATUS, (_payload, ack) =>
      safe(socket, ack, () => handleStatus(socket, queue)),
    )
    socket.on(SOCKET_EVENTS.PARTY_QUEUE, (payload, ack) =>
      safe(socket, ack, () => handleQueue(io, socket, queue, payload)),
    )
    socket.on(SOCKET_EVENTS.PARTY_UNQUEUE, (_payload, ack) =>
      safe(socket, ack, () => handleUnqueue(io, socket, queue)),
    )
    socket.on(SOCKET_EVENTS.PARTY_SET_OPTIONS, (payload, ack) =>
      safe(socket, ack, () => handleSetOptions(io, socket, queue, payload)),
    )
    socket.on(SOCKET_EVENTS.PARTY_BROWSE, (_payload, ack) =>
      safe(socket, ack, () => handleBrowse(socket, queue)),
    )
    socket.on(SOCKET_EVENTS.PARTY_JOIN_PUBLIC, (payload, ack) =>
      safe(socket, ack, () => handleJoinPublic(io, socket, queue, payload)),
    )
    socket.on(SOCKET_EVENTS.SESSION_READY, (payload, ack) =>
      safe(socket, ack, () => handleSessionReady(io, socket, queue, sessionParties, payload)),
    )
    socket.on(SOCKET_EVENTS.STOP_START, (payload, ack) =>
      safe(socket, ack, () => handleStopStart(io, socket, scheduler, payload)),
    )
    socket.on(SOCKET_EVENTS.STOP_FINISH, (payload, ack) =>
      safe(socket, ack, () => handleStopFinish(io, socket, scheduler, photoRequests, payload)),
    )
    socket.on(SOCKET_EVENTS.STOP_PHOTO_SUBMIT, (payload, ack) =>
      safe(socket, ack, () => handleStopPhotoSubmit(io, socket, photoRequests, payload)),
    )

    socket.on("disconnect", () => {
      // The user's other sockets (other tabs) keep their party membership.
      // If this was their last socket, we leave the party in memory but they
      // remain a member; they can rejoin via reconnect. To avoid ghost members
      // we leave it to the leader to kick or call PARTY_LEAVE explicitly.

      // If this user was holding the photo spotlight for a stop and has no other
      // sockets left in that session, rotate the spotlight so the stop can finish.
      for (const [stopId, entry] of photoRequests) {
        if (entry.chosenUserId !== userId) continue
        if (connectedSessionUserIds(io, entry.sessionId).includes(userId)) continue
        requestStopPhoto(io, photoRequests, entry.sessionId, stopId, userId)
      }
    })
  })

  // --- MATCH HANDLER ------------------------------------------------------
  queue.on("match", (match) => {
    let result
    try {
      result = createMatchedSession({
        parties: match.parties,
        players: match.players,
        selectedTimeSlot: match.selectedTimeSlot,
        matchScore: match.matchScore,
        themeId: match.themeId ?? null,
      })
    } catch (err) {
      console.error("Failed to create matched session:", err)
      // Release the parties so their members can re-queue instead of being
      // stranded in "matched" with no session (e.g. NO_ROUTE_FOR_THEME when a
      // themed route was deactivated mid-wait). Also drop any persisted rows.
      for (const party of match.parties) {
        queue.releaseParty(party.id)
        try {
          removePersistedParty(party.id)
        } catch (cleanupErr) {
          console.error("Failed to remove party row after match failure:", cleanupErr)
        }
      }
      for (const player of match.players) {
        io.to(userRoom(player.userId)).emit(SOCKET_EVENTS.ERROR, {
          code: err.code ?? "MATCH_FAILED",
          message: err.message ?? "Failed to start the pub hop",
        })
      }
      return
    }

    const room = result.session ? sessionRoom(result.session.id) : null
    if (result.session) {
      // Defer user release until session activates (all players ready).
      sessionParties.set(result.session.id, match.parties.map((p) => p.id))
    } else {
      // No route configured — no session to wait for, release immediately.
      for (const party of match.parties) queue.releaseParty(party.id)
    }
    const payload = {
      matchScore: match.matchScore,
      group: result.group,
      session: result.session,
      route: result.route,
      stops: result.stops,
      members: result.members,
    }

    for (const player of match.players) {
      const sockets = io.sockets.adapter.rooms.get(userRoom(player.userId))
      if (sockets && room) {
        for (const sid of sockets) io.sockets.sockets.get(sid)?.join(room)
      }
      io.to(userRoom(player.userId)).emit(SOCKET_EVENTS.MATCH_FOUND, payload)
    }
  })

  // --- ABSORPTION HANDLER -------------------------------------------------
  // Fires when the matchmaker pulls queued players into a public host team
  // during a tick (no socket handler is on the stack to do the room plumbing).
  queue.on("party:absorbed", ({ host, absorbedUserIds, dissolvedPartyIds }) => {
    const data = serializeParty(host)

    for (const userId of absorbedUserIds) {
      for (const sid of io.sockets.adapter.rooms.get(userRoom(userId)) ?? []) {
        const s = io.sockets.sockets.get(sid)
        if (!s) continue
        s.join(partyRoom(host.id))
        for (const dpid of dissolvedPartyIds) s.leave(partyRoom(dpid))
      }
    }

    // Each absorbed party was dissolved into the host; drop any persisted row.
    // Runs inside a matchmaker tick, so never let a DB error escape the handler.
    try {
      for (const dpid of dissolvedPartyIds) removePersistedParty(dpid)
    } catch (err) {
      console.error("Failed to remove absorbed party rows:", err)
    }

    io.to(partyRoom(host.id)).emit(SOCKET_EVENTS.PARTY_UPDATED, data)
  })

  return { io, queue, scheduler }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function handleCreateParty(io, socket, queue) {
  const userId = socket.data.userId
  const profile = loadPlayerProfile(userId)
  if (!profile) {
    throw httpError("USER_NOT_FOUND", "User profile no longer exists")
  }

  const party = queue.createParty(toQueuedPlayer(profile))
  socket.join(partyRoom(party.id))
  const data = serializeParty(party)
  io.to(partyRoom(party.id)).emit(SOCKET_EVENTS.PARTY_UPDATED, data)
  return { ok: true, party: data }
}

function handleJoinParty(io, socket, queue, payload) {
  const userId = socket.data.userId
  const inviteCode = String(payload?.inviteCode ?? "").trim().toUpperCase()
  if (!inviteCode) throw httpError("INVALID_INVITE", "inviteCode is required")

  const profile = loadPlayerProfile(userId)
  if (!profile) throw httpError("USER_NOT_FOUND", "User profile no longer exists")

  const party = queue.joinByInvite(inviteCode, toQueuedPlayer(profile))
  // Join every socket this user owns to the party room so all their tabs sync.
  for (const sid of io.sockets.adapter.rooms.get(userRoom(userId)) ?? []) {
    io.sockets.sockets.get(sid)?.join(partyRoom(party.id))
  }
  const data = serializeParty(party)
  io.to(partyRoom(party.id)).emit(SOCKET_EVENTS.PARTY_UPDATED, data)
  return { ok: true, party: data }
}

function handleLeaveParty(io, socket, queue) {
  const userId = socket.data.userId
  const partyBefore = queue.getPartyOfUser(userId)
  if (!partyBefore) return { ok: true, left: false }

  const partyId = partyBefore.id
  const result = queue.leaveParty(userId)

  // A leave always either dissolves the party or drops its size below 4,
  // making any persisted row invalid. Remove it unconditionally (no-op if absent).
  removePersistedParty(partyId)

  // Pull every socket of this user out of the room.
  for (const sid of io.sockets.adapter.rooms.get(userRoom(userId)) ?? []) {
    io.sockets.sockets.get(sid)?.leave(partyRoom(partyId))
  }

  if (result.dissolved) {
    io.to(partyRoom(partyId)).emit(SOCKET_EVENTS.PARTY_DISSOLVED, { partyId })
  } else if (result.party) {
    io.to(partyRoom(partyId)).emit(
      SOCKET_EVENTS.PARTY_UPDATED,
      serializeParty(result.party),
    )
  }
  return { ok: true, left: true, dissolved: result.dissolved }
}

function handleKick(io, socket, queue, payload) {
  const leaderId = socket.data.userId
  const targetUserId = String(payload?.userId ?? "")
  if (!targetUserId) throw httpError("INVALID_TARGET", "userId is required")

  const partyBefore = queue.getPartyOfUser(leaderId)
  if (!partyBefore) throw httpError("NO_PARTY", "You are not in a party")
  const partyId = partyBefore.id

  const party = queue.kickMember(leaderId, targetUserId)

  // Kick removes a member (and unqueues if queued), invalidating any persisted row.
  removePersistedParty(partyId)

  // Notify the kicked user explicitly + remove their sockets from the room.
  io.to(userRoom(targetUserId)).emit(SOCKET_EVENTS.PARTY_DISSOLVED, {
    partyId,
    reason: "kicked",
  })
  for (const sid of io.sockets.adapter.rooms.get(userRoom(targetUserId)) ?? []) {
    io.sockets.sockets.get(sid)?.leave(partyRoom(partyId))
  }

  io.to(partyRoom(partyId)).emit(SOCKET_EVENTS.PARTY_UPDATED, serializeParty(party))
  return { ok: true, party: serializeParty(party) }
}

function handleStatus(socket, queue) {
  const party = queue.getPartyOfUser(socket.data.userId)
  if (!party) return { ok: true, inParty: false }
  const bucket = party.selectedTimeSlot
    ? queue.bucketStats(party.selectedTimeSlot, party.themeId)
    : null
  return {
    ok: true,
    inParty: true,
    party: serializeParty(party),
    bucket,
  }
}

function handleQueue(io, socket, queue, payload) {
  const leaderId = socket.data.userId
  const selectedTimeSlot = String(payload?.selectedTimeSlot ?? "").trim()
  if (!selectedTimeSlot) {
    throw httpError("INVALID_TIME_SLOT", "selectedTimeSlot is required")
  }

  // themeId is optional: null/"" means "any theme" (matches anyone, random route).
  // A chosen theme must exist and have an active route to run a session on.
  const rawThemeId = payload?.themeId
  const themeId = rawThemeId == null ? null : String(rawThemeId).trim() || null
  if (themeId) {
    if (!routeThemeExists(themeId)) {
      throw httpError("INVALID_THEME", "Selected theme does not exist")
    }
    if (!themeHasActiveRoute(themeId)) {
      throw httpError("NO_ROUTE_FOR_THEME", "No active route is available for the selected theme")
    }
  }

  const party = queue.queueParty(leaderId, selectedTimeSlot, themeId)

  // Persist parties that satisfy the existing group_size constraint (4..8).
  // Smaller parties will be written to the DB when the match is confirmed.
  // Public teams are skipped: their membership keeps growing via queue-fill,
  // so they are persisted in full at form time (createMatchedSession) instead.
  if (party.visibility !== "public") {
    persistQueuedParty({
      partyId: party.id,
      members: party.members,
      leaderId: party.leaderId,
      selectedTimeSlot: party.selectedTimeSlot,
    })
  }

  const data = serializeParty(party)
  io.to(partyRoom(party.id)).emit(SOCKET_EVENTS.PARTY_UPDATED, data)

  const stats = queue.bucketStats(selectedTimeSlot, party.themeId)
  io.to(partyRoom(party.id)).emit(SOCKET_EVENTS.QUEUE_UPDATE, {
    selectedTimeSlot,
    themeId: party.themeId,
    ...stats,
  })
  return { ok: true, party: data, bucket: stats }
}

function handleUnqueue(io, socket, queue) {
  const leaderId = socket.data.userId
  const party = queue.unqueueParty(leaderId)

  // Remove the persisted row if it was written at queue time (no-op if it wasn't).
  removePersistedParty(party.id)

  const data = serializeParty(party)
  io.to(partyRoom(party.id)).emit(SOCKET_EVENTS.PARTY_UPDATED, data)
  return { ok: true, party: data }
}

function handleSetOptions(io, socket, queue, payload) {
  const leaderId = socket.data.userId
  const opts = {}
  if (payload?.visibility !== undefined) opts.visibility = payload.visibility
  if (payload?.maxSize !== undefined) opts.maxSize = payload.maxSize

  const party = queue.setPartyOptions(leaderId, opts)
  const data = serializeParty(party)
  io.to(partyRoom(party.id)).emit(SOCKET_EVENTS.PARTY_UPDATED, data)
  return { ok: true, party: data }
}

function handleBrowse(socket, queue) {
  const userId = socket.data.userId
  const profile = loadPlayerProfile(userId)
  if (!profile) throw httpError("USER_NOT_FOUND", "User profile no longer exists")

  const requester = { userId: profile.id, interestIds: profile.interestIds ?? [] }
  const teams = queue
    .listJoinableTeams()
    .map((team) => serializePublicParty(team, requester))
    // Most compatible first so the browser overview is useful by default.
    .sort((a, b) => b.compatibility - a.compatibility)

  return { ok: true, teams }
}

function handleJoinPublic(io, socket, queue, payload) {
  const userId = socket.data.userId
  const partyId = String(payload?.partyId ?? "").trim()
  if (!partyId) throw httpError("INVALID_TEAM", "partyId is required")

  const profile = loadPlayerProfile(userId)
  if (!profile) throw httpError("USER_NOT_FOUND", "User profile no longer exists")

  const party = queue.joinByPartyId(partyId, toQueuedPlayer(profile))
  // Join every socket this user owns to the party room so all their tabs sync.
  for (const sid of io.sockets.adapter.rooms.get(userRoom(userId)) ?? []) {
    io.sockets.sockets.get(sid)?.join(partyRoom(party.id))
  }
  const data = serializeParty(party)
  io.to(partyRoom(party.id)).emit(SOCKET_EVENTS.PARTY_UPDATED, data)
  return { ok: true, party: data }
}

function handleSessionReady(io, socket, queue, sessionParties, payload) {
  const sessionId = String(payload?.sessionId ?? "")
  if (!sessionId) throw httpError("INVALID_SESSION", "sessionId is required")

  const room = sessionRoom(sessionId)
  const socketIdsInRoom = io.sockets.adapter.rooms.get(room)
  if (!socketIdsInRoom || !socketIdsInRoom.has(socket.id)) {
    throw httpError("NOT_IN_SESSION", "You are not part of this session")
  }

  socket.data.readyForSession = socket.data.readyForSession ?? new Set()
  socket.data.readyForSession.add(sessionId)

  const readyUserIds = new Set()
  const totalUserIds = new Set()
  for (const sid of socketIdsInRoom) {
    const s = io.sockets.sockets.get(sid)
    if (!s) continue
    totalUserIds.add(s.data.userId)
    if (s.data.readyForSession?.has(sessionId)) readyUserIds.add(s.data.userId)
  }

  io.to(room).emit(SOCKET_EVENTS.QUEUE_UPDATE, {
    sessionId,
    ready: readyUserIds.size,
    total: totalUserIds.size,
  })

  if (readyUserIds.size === totalUserIds.size && totalUserIds.size > 0) {
    const activated = activateSession(sessionId)
    if (activated) {
      const partyIds = sessionParties.get(sessionId) ?? []
      for (const partyId of partyIds) queue.releaseParty(partyId)
      sessionParties.delete(sessionId)
      io.to(room).emit(SOCKET_EVENTS.SESSION_STARTED, {
        sessionId,
        startedAt: new Date().toISOString(),
      })
    }
  }

  return { ok: true, ready: readyUserIds.size, total: totalUserIds.size }
}

function handleStopStart(io, socket, scheduler, payload) {
  const userId = socket.data.userId
  const stopId = String(payload?.stopId ?? "")
  const sessionId = String(payload?.sessionId ?? "")

  if (!stopId) throw httpError("INVALID_STOP", "stopId is required")
  if (!sessionId) throw httpError("INVALID_SESSION", "sessionId is required")

  const stop = getSessionStop(sessionId, stopId)
  if (!stop) throw httpError("STOP_NOT_FOUND", "Stop not found in this session")
  if (stop.timerState !== "not_started") {
    throw httpError("INVALID_STATE", `Stop timer is already ${stop.timerState}`)
  }

  if (!isSessionMember(sessionId, userId)) {
    throw httpError("NOT_MEMBER", "You are not a member of this session")
  }

  const started = startStopTimer(stopId)
  if (!started) throw httpError("START_FAILED", "Could not start the stop timer")

  scheduler.startForStop({
    sessionId,
    stopId,
    plannedDurationMinutes: stop.plannedDurationMinutes,
    io,
    room: sessionRoom(sessionId),
    eventName: SOCKET_EVENTS.CONVERSATION_STARTER,
  })

  io.to(sessionRoom(sessionId)).emit(SOCKET_EVENTS.STOP_TIMER_STARTED, { stopId, sessionId })

  return { ok: true, stopId, sessionId }
}

function handleStopFinish(io, socket, scheduler, photoRequests, payload) {
  const userId = socket.data.userId
  const stopId = String(payload?.stopId ?? "")
  const sessionId = String(payload?.sessionId ?? "")

  if (!stopId) throw httpError("INVALID_STOP", "stopId is required")
  if (!sessionId) throw httpError("INVALID_SESSION", "sessionId is required")

  const stop = getSessionStop(sessionId, stopId)
  if (!stop) throw httpError("STOP_NOT_FOUND", "Stop not found in this session")
  if (stop.timerState !== "running") {
    throw httpError("INVALID_STATE", `Stop timer is not running (state: ${stop.timerState})`)
  }

  if (!isSessionMember(sessionId, userId)) {
    throw httpError("NOT_MEMBER", "You are not a member of this session")
  }

  // Pressing "end stop" no longer finishes it: the stop enters `awaiting_photo`
  // while a randomly chosen member takes the group selfie. It only finishes once
  // that photo is uploaded (REST) and confirmed via STOP_PHOTO_SUBMIT.
  const began = beginStopPhoto(stopId)
  if (!began) throw httpError("FINISH_FAILED", "Could not move the stop to awaiting photo")

  // The socialising window is over; stop the conversation-starter scheduler.
  scheduler.stopCurrent(sessionId)

  const chosenUserId = requestStopPhoto(io, photoRequests, sessionId, stopId)

  return { ok: true, stopId, sessionId, awaitingPhoto: true, chosenUserId }
}

function handleStopPhotoSubmit(io, socket, photoRequests, payload) {
  const userId = socket.data.userId
  const stopId = String(payload?.stopId ?? "")
  const sessionId = String(payload?.sessionId ?? "")
  const photoId = String(payload?.photoId ?? "")

  if (!stopId) throw httpError("INVALID_STOP", "stopId is required")
  if (!sessionId) throw httpError("INVALID_SESSION", "sessionId is required")
  if (!photoId) throw httpError("INVALID_PHOTO", "photoId is required")

  const stop = getSessionStop(sessionId, stopId)
  if (!stop) throw httpError("STOP_NOT_FOUND", "Stop not found in this session")
  if (stop.timerState !== "awaiting_photo") {
    throw httpError("INVALID_STATE", `Stop is not awaiting a photo (state: ${stop.timerState})`)
  }

  if (!isSessionMember(sessionId, userId)) {
    throw httpError("NOT_MEMBER", "You are not a member of this session")
  }

  const pending = photoRequests.get(stopId)
  if (!pending) throw httpError("NO_PHOTO_REQUEST", "No active photo request for this stop")
  // The spotlight (`pending.chosenUserId`) is only a UX hint for who we *ask*.
  // Any session member's valid photo finishes the stop — otherwise a spotlight
  // rotation while the chosen member is mid-capture would reject their upload and
  // leave the stop stuck in `awaiting_photo` forever.

  // Confirm the photo was actually persisted for this stop (and thus linked to
  // the session through it) before allowing the stop to finish.
  if (!photoBelongsToStop(photoId, stopId)) {
    throw httpError("PHOTO_NOT_FOUND", "No stored photo found for this stop")
  }

  const finished = finishStopTimer(stopId)
  if (!finished) throw httpError("FINISH_FAILED", "Could not finish the stop timer")

  clearPhotoRequest(photoRequests, stopId)

  io.to(sessionRoom(sessionId)).emit(SOCKET_EVENTS.STOP_TIMER_FINISHED, { stopId, sessionId, photoId })

  return { ok: true, stopId, sessionId, photoId }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Distinct userIds currently connected to a session room.
 *
 * @param {import("socket.io").Server} io
 * @param {string} sessionId
 * @returns {string[]}
 */
function connectedSessionUserIds(io, sessionId) {
  const ids = new Set()
  for (const sid of io.sockets.adapter.rooms.get(sessionRoom(sessionId)) ?? []) {
    const s = io.sockets.sockets.get(sid)
    if (s?.data?.userId) ids.add(s.data.userId)
  }
  return [...ids]
}

/**
 * Pick a random connected session member, preferring someone other than
 * `excludeUserId` so the spotlight rotates on re-pick. Returns null if nobody
 * is connected.
 *
 * @param {import("socket.io").Server} io
 * @param {string} sessionId
 * @param {string|null} [excludeUserId]
 * @returns {string|null}
 */
function pickSessionMember(io, sessionId, excludeUserId = null) {
  const ids = connectedSessionUserIds(io, sessionId)
  if (ids.length === 0) return null
  const others = ids.filter((id) => id !== excludeUserId)
  const pool = others.length > 0 ? others : ids
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Spotlight a random member to take the group selfie that ends a stop and arm
 * a timeout that rotates the spotlight if they go quiet. Stores/refreshes the
 * pending request keyed by stopId and announces the chosen member to the room.
 *
 * @param {import("socket.io").Server} io
 * @param {Map<string, { sessionId: string, chosenUserId: string|null, timeout: NodeJS.Timeout }>} photoRequests
 * @param {string} sessionId
 * @param {string} stopId
 * @param {string|null} [previousChosenId]
 * @returns {string|null} the chosen userId, or null if nobody is connected
 */
function requestStopPhoto(io, photoRequests, sessionId, stopId, previousChosenId = null) {
  const existing = photoRequests.get(stopId)
  if (existing) clearTimeout(existing.timeout)

  const chosenUserId = pickSessionMember(io, sessionId, previousChosenId)

  const timeout = setTimeout(
    () => requestStopPhoto(io, photoRequests, sessionId, stopId, chosenUserId),
    PHOTO_REQUEST_TIMEOUT_MS,
  )
  // Don't let the retry timer keep the process alive (matters for tests/shutdown).
  timeout.unref?.()
  photoRequests.set(stopId, { sessionId, chosenUserId, timeout })

  // No one connected to choose yet — keep the stop awaiting and let the timeout retry.
  if (!chosenUserId) return null

  io.to(sessionRoom(sessionId)).emit(SOCKET_EVENTS.STOP_PHOTO_REQUESTED, {
    sessionId,
    stopId,
    chosenUserId,
  })
  return chosenUserId
}

/**
 * Cancel and forget a pending photo request (its retry timeout included).
 *
 * @param {Map<string, { timeout: NodeJS.Timeout }>} photoRequests
 * @param {string} stopId
 */
function clearPhotoRequest(photoRequests, stopId) {
  const entry = photoRequests.get(stopId)
  if (!entry) return
  clearTimeout(entry.timeout)
  photoRequests.delete(stopId)
}

function toQueuedPlayer(profile) {
  return {
    userId: profile.id,
    name: profile.name,
    school: profile.school,
    campus: profile.campus,
    interestIds: profile.interestIds ?? [],
    selectedTimeSlot: "",
    enqueuedAt: 0,
  }
}

function safe(socket, ack, fn) {
  try {
    const result = fn()
    ack?.(result ?? { ok: true })
  } catch (err) {
    const code = err?.code ?? "INTERNAL_ERROR"
    const message = err?.message ?? "Something went wrong"
    socket.emit(SOCKET_EVENTS.ERROR, { code, message })
    ack?.({ ok: false, error: { code, message } })
  }
}

function httpError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

function userRoom(userId) {
  return `user:${userId}`
}
function partyRoom(partyId) {
  return `party:${partyId}`
}
function sessionRoom(sessionId) {
  return `session:${sessionId}`
}

function extractBearer(header) {
  if (typeof header !== "string") return null
  return header.startsWith("Bearer ") ? header.slice(7) : null
}

function extractCookie(cookieHeader, name) {
  if (typeof cookieHeader !== "string") return null
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

