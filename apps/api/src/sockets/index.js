import { Server } from "socket.io"
import { verifyAccess } from "../lib/jwt-helper.js"
import { PartyQueue, serializeParty } from "../lib/matchmaking/queue.js"
import {
  activateSession,
  createMatchedSession,
  loadPlayerProfile,
} from "../lib/matchmaking/session.js"

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
  SESSION_READY: "session:ready",

  // ---- server -> client ----
  PARTY_UPDATED: "party:updated",
  PARTY_DISSOLVED: "party:dissolved",
  QUEUE_UPDATE: "queue:update",
  MATCH_FOUND: "match:found",
  SESSION_STARTED: "session:started",
  ERROR: "error:matchmaking",
})

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
  /** @type {Map<string, string[]>} sessionId -> partyIds waiting for release */
  const sessionParties = new Map()

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
    socket.on(SOCKET_EVENTS.SESSION_READY, (payload, ack) =>
      safe(socket, ack, () => handleSessionReady(io, socket, queue, sessionParties, payload)),
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

  return { io, queue }
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

