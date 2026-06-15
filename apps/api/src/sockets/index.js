import { Server } from "socket.io"
import { verifyAccess } from "@/lib/jwt-helper"
import { PartyQueue, serializeParty, serializePublicParty } from "@/lib/matchmaking/queue.js"
import {
  activateSession,
  createMatchedSession,
  finishStopTimer,
  getSessionMemberCount,
  getSessionStop,
  getStopVenueLocation,
  isSessionMember,
  loadPlayerProfile,
  persistQueuedParty,
  removePersistedParty,
  startStopTimer,
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
  STOP_CHECK_IN: "stop:checkin",
  STOP_START: "stop:start",
  STOP_FINISH: "stop:finish",

  // ---- server -> client ----
  PARTY_UPDATED: "party:updated",
  PARTY_DISSOLVED: "party:dissolved",
  QUEUE_UPDATE: "queue:update",
  MATCH_FOUND: "match:found",
  SESSION_STARTED: "session:started",
  STOP_PRESENCE: "stop:presence",
  STOP_TIMER_STARTED: "stop:timer:started",
  STOP_TIMER_FINISHED: "stop:timer:finished",
  CONVERSATION_STARTER: "conversation:starter",
  ERROR: "error:matchmaking",
})

/**
 * A check-in counts toward the "all members present" quorum only when the
 * member is within this many metres of the stop's venue. Distance is computed
 * server-side so the client never decides who is present.
 */
const STOP_PRESENCE_RADIUS_M = 50

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
  /** @type {Map<string, Set<string>>} `${sessionId}:${stopId}` -> userIds currently within range */
  const stopPresence = new Map()

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
    // Check-ins are high-frequency and best-effort: never surface them as a
    // user-facing ERROR, and don't bother with an ack.
    socket.on(SOCKET_EVENTS.STOP_CHECK_IN, (payload) => {
      try {
        handleStopCheckIn(io, socket, stopPresence, payload)
      } catch (err) {
        console.error("Stop check-in failed:", err)
      }
    })
    socket.on(SOCKET_EVENTS.STOP_START, (payload, ack) =>
      safe(socket, ack, () => handleStopStart(io, socket, scheduler, stopPresence, payload)),
    )
    socket.on(SOCKET_EVENTS.STOP_FINISH, (payload, ack) =>
      safe(socket, ack, () => handleStopFinish(io, socket, scheduler, payload)),
    )

    socket.on("disconnect", () => {
      // The user's other sockets (other tabs) keep their party membership.
      // If this was their last socket, we leave the party in memory but they
      // remain a member; they can rejoin via reconnect. To avoid ghost members
      // we leave it to the leader to kick or call PARTY_LEAVE explicitly.
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
      })
    } catch (err) {
      console.error("Failed to create matched session:", err)
      for (const player of match.players) {
        io.to(userRoom(player.userId)).emit(SOCKET_EVENTS.ERROR, {
          code: "MATCH_FAILED",
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
    ? queue.bucketStats(party.selectedTimeSlot)
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

  const party = queue.queueParty(leaderId, selectedTimeSlot)

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

  const stats = queue.bucketStats(selectedTimeSlot)
  io.to(partyRoom(party.id)).emit(SOCKET_EVENTS.QUEUE_UPDATE, {
    selectedTimeSlot,
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

/**
 * Record a member's live location as a check-in for the active stop and
 * broadcast the updated presence quorum to the whole session. Best-effort:
 * malformed or out-of-context check-ins are silently ignored rather than
 * surfaced as errors, since the client streams these continuously.
 */
function handleStopCheckIn(io, socket, stopPresence, payload) {
  const userId = socket.data.userId
  const sessionId = String(payload?.sessionId ?? "")
  const stopId = String(payload?.stopId ?? "")
  const lat = Number(payload?.latitude)
  const lng = Number(payload?.longitude)

  if (!sessionId || !stopId) return
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  if (!isSessionMember(sessionId, userId)) return

  // Only the stop that's waiting to begin needs presence tracking.
  const stop = getSessionStop(sessionId, stopId)
  if (!stop || stop.timerState !== "not_started") return

  const venue = getStopVenueLocation(sessionId, stopId)
  if (!venue || venue.latitude == null || venue.longitude == null) return

  const distance = haversineMeters(lat, lng, venue.latitude, venue.longitude)
  const key = presenceKey(sessionId, stopId)
  let present = stopPresence.get(key)
  if (!present) {
    present = new Set()
    stopPresence.set(key, present)
  }

  // Membership in the set tracks "currently within range" — wandering out of
  // the radius drops the member back out of the quorum.
  if (distance <= STOP_PRESENCE_RADIUS_M) present.add(userId)
  else present.delete(userId)

  const total = getSessionMemberCount(sessionId)
  io.to(sessionRoom(sessionId)).emit(SOCKET_EVENTS.STOP_PRESENCE, {
    sessionId,
    stopId,
    present: [...present],
    total,
    allPresent: total > 0 && present.size >= total,
  })
}

function handleStopStart(io, socket, scheduler, stopPresence, payload) {
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

  // Geofence gate: every member must be checked in within range before the
  // timer can start. Skipped when the venue has no coordinates to fence against.
  const venue = getStopVenueLocation(sessionId, stopId)
  if (venue && venue.latitude != null && venue.longitude != null) {
    const total = getSessionMemberCount(sessionId)
    const present = stopPresence.get(presenceKey(sessionId, stopId))
    if (!present || total === 0 || present.size < total) {
      throw httpError(
        "NOT_ALL_PRESENT",
        "All group members must be at the stop to start it",
      )
    }
  }

  const started = startStopTimer(stopId)
  if (!started) throw httpError("START_FAILED", "Could not start the stop timer")

  // The quorum has served its purpose for this stop; free the memory.
  stopPresence.delete(presenceKey(sessionId, stopId))

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

function handleStopFinish(io, socket, scheduler, payload) {
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

  const finished = finishStopTimer(stopId)
  if (!finished) throw httpError("FINISH_FAILED", "Could not finish the stop timer")

  scheduler.stopCurrent(sessionId)

  io.to(sessionRoom(sessionId)).emit(SOCKET_EVENTS.STOP_TIMER_FINISHED, { stopId, sessionId })

  return { ok: true, stopId, sessionId }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
function presenceKey(sessionId, stopId) {
  return `${sessionId}:${stopId}`
}

/**
 * Great-circle distance between two lat/lng points in metres (Haversine).
 */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
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

