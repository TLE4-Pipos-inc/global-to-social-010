import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  createSocket,
  disconnectSocket,
  getSocket,
  refreshSocketAuth,
} from "@/lib/socket"
import { getAccessToken, subscribeAccessToken } from "@/lib/token"
import { userGroupPhotosQueryOptions } from "@/features/group-photos"
import { MATCH_TIME_SLOT, SOCKET_EVENTS } from "@/lib/socket-events"

const SocketContext = createContext(null)

const EMIT_TIMEOUT_MS = 8000

/**
 * Holds the single Socket.IO connection plus all matchmaking state, and exposes
 * typed actions to the rest of the app. Mount once near the app root.
 */
export function SocketProvider({ children }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState("disconnected") // disconnected | connecting | connected | error
  const [party, setParty] = useState(null)
  const [queueStats, setQueueStats] = useState(null) // { parties, players }
  const [match, setMatch] = useState(null) // { group, session, route, stops, members, matchScore }
  const [sessionReady, setSessionReady] = useState(null) // { ready, total }
  const [sessionStarted, setSessionStarted] = useState(false)
  const [stopStates, setStopStates] = useState({}) // stopId -> "not_started" | "running" | "awaiting_photo" | "finished"
  const [stopStartedAt, setStopStartedAt] = useState({}) // stopId -> ms timestamp the stop began running
  const [starters, setStarters] = useState([]) // [{ starter, triggerMinute, stopId, receivedAt }]
  const [photoRequest, setPhotoRequest] = useState(null) // { sessionId, stopId, chosenUserId } | null
  const [lastError, setLastError] = useState(null)

  // Keep the live socket in a ref so action callbacks stay stable.
  const socketRef = useRef(null)
  // Stops we've already advanced past, so a late STOP_PHOTO_REQUESTED (e.g. a
  // spotlight rotation that fired while the camera was open and the socket
  // briefly dropped) can never pull the UI back to a finished stop.
  const finishedStopsRef = useRef(new Set())

  // Mark a stop finished from any source (server broadcast OR our own submit
  // ack). Advancing on the ack means the chosen member's UI moves on even if the
  // STOP_TIMER_FINISHED broadcast never reaches them.
  const markStopFinished = useCallback((stopId) => {
    if (!stopId) return
    finishedStopsRef.current.add(stopId)
    setStopStates((prev) =>
      prev[stopId] === "finished" ? prev : { ...prev, [stopId]: "finished" },
    )
    setPhotoRequest((prev) => (prev?.stopId === stopId ? null : prev))
  }, [])

  const resetMatchmaking = useCallback(() => {
    setParty(null)
    setQueueStats(null)
    setMatch(null)
    setSessionReady(null)
    setSessionStarted(false)
    setStopStates({})
    setStopStartedAt({})
    setStarters([])
    setPhotoRequest(null)
    finishedStopsRef.current = new Set()
    // Finishing a route may have produced new group photos; drop the cached
    // memories so the profile refetches them.
    queryClient.invalidateQueries({
      queryKey: userGroupPhotosQueryOptions.queryKey,
    })
  }, [queryClient])

  // --- connection lifecycle, driven by the access token --------------------
  useEffect(() => {
    function attach(socket) {
      socket.on("connect", () => setStatus("connected"))
      socket.on("disconnect", () => setStatus("disconnected"))
      socket.on("connect_error", (err) => {
        setStatus("error")
        setLastError({ code: "CONNECT_ERROR", message: err?.message ?? "Connection failed" })
      })

      socket.on(SOCKET_EVENTS.PARTY_UPDATED, (payload) => setParty(payload))
      socket.on(SOCKET_EVENTS.PARTY_DISSOLVED, () => {
        setParty(null)
        setQueueStats(null)
      })
      socket.on(SOCKET_EVENTS.QUEUE_UPDATE, (payload) => {
        // Overloaded event: queue stats while searching, ready counter in lobby.
        if (payload?.sessionId) {
          setSessionReady({ ready: payload.ready, total: payload.total })
        } else {
          setQueueStats({ parties: payload?.parties ?? 0, players: payload?.players ?? 0 })
        }
      })
      socket.on(SOCKET_EVENTS.MATCH_FOUND, (payload) => {
        setMatch(payload)
        setQueueStats(null)
        const initial = {}
        for (const stop of payload?.stops ?? []) initial[stop.id] = "not_started"
        setStopStates(initial)
        setStopStartedAt({})
        finishedStopsRef.current = new Set()
      })
      socket.on(SOCKET_EVENTS.SESSION_STARTED, () => setSessionStarted(true))
      socket.on(SOCKET_EVENTS.STOP_TIMER_STARTED, ({ stopId }) => {
        setStopStates((prev) => ({ ...prev, [stopId]: "running" }))
        setStopStartedAt((prev) =>
          prev[stopId] ? prev : { ...prev, [stopId]: Date.now() },
        )
      })
      socket.on(SOCKET_EVENTS.STOP_PHOTO_REQUESTED, (payload) => {
        const stopId = payload?.stopId
        // Ignore a request for a stop we've already finished — it's a stale
        // rotation and must not drag the UI back to the previous stop.
        if (!stopId || finishedStopsRef.current.has(stopId)) return
        setPhotoRequest(payload)
        setStopStates((prev) =>
          prev[stopId] === "finished" ? prev : { ...prev, [stopId]: "awaiting_photo" },
        )
      })
      socket.on(SOCKET_EVENTS.STOP_TIMER_FINISHED, ({ stopId }) => {
        markStopFinished(stopId)
      })
      socket.on(SOCKET_EVENTS.CONVERSATION_STARTER, (payload) =>
        setStarters((prev) => [{ ...payload, receivedAt: Date.now() }, ...prev]),
      )
      socket.on(SOCKET_EVENTS.ERROR, (payload) => setLastError(payload))
    }

    function connect() {
      const socket = createSocket()
      socketRef.current = socket
      setStatus(socket.connected ? "connected" : "connecting")
      attach(socket)
    }

    function teardown() {
      disconnectSocket()
      socketRef.current = null
      setStatus("disconnected")
      resetMatchmaking()
    }

    // Connect now if we already have a token.
    if (getAccessToken()) connect()

    const unsubscribe = subscribeAccessToken((token) => {
      if (!token) {
        teardown()
      } else if (!socketRef.current) {
        connect()
      } else {
        // Token rotated (refresh) — reconnect with the new credentials.
        refreshSocketAuth()
      }
    })

    return () => {
      unsubscribe()
      const socket = getSocket()
      if (socket) socket.removeAllListeners()
    }
  }, [resetMatchmaking, markStopFinished])

  // --- emit helper ---------------------------------------------------------
  const emitWithAck = useCallback((event, payload) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket) {
        // Client-only failure: no server ERROR event will fire, so surface it.
        setLastError({ code: "NOT_CONNECTED", message: "Not connected" })
        reject(new Error("Not connected"))
        return
      }
      socket.timeout(EMIT_TIMEOUT_MS).emit(event, payload ?? {}, (err, ack) => {
        if (err) {
          setLastError({ code: "TIMEOUT", message: "Request timed out" })
          reject(new Error("Request timed out"))
          return
        }
        if (!ack?.ok) {
          // The server also emits an ERROR event for this; that drives the
          // alert. Just reject so the caller can settle its busy state.
          reject(new Error(ack?.error?.message ?? `${event} failed`))
          return
        }
        resolve(ack)
      })
    })
  }, [])

  // --- actions -------------------------------------------------------------
  const actions = useMemo(
    () => ({
      createParty: () => emitWithAck(SOCKET_EVENTS.PARTY_CREATE),
      // Solo fast path: create a one-person party and immediately queue it.
      // Pass themeId+routeId to queue for a specific route ("Quick queue this
      // route"); pass nothing for the "Match anywhere" path (any theme/route).
      quickMatch: async (themeId = null, routeId = null) => {
        await emitWithAck(SOCKET_EVENTS.PARTY_CREATE)
        await emitWithAck(SOCKET_EVENTS.PARTY_QUEUE, {
          selectedTimeSlot: MATCH_TIME_SLOT,
          themeId,
          routeId,
        })
      },
      joinParty: (inviteCode) =>
        emitWithAck(SOCKET_EVENTS.PARTY_JOIN, { inviteCode }),
      leaveParty: async () => {
        const ack = await emitWithAck(SOCKET_EVENTS.PARTY_LEAVE)
        setParty(null)
        setQueueStats(null)
        return ack
      },
      kickMember: (userId) => emitWithAck(SOCKET_EVENTS.PARTY_KICK, { userId }),
      queueParty: (themeId = null, routeId = null) =>
        emitWithAck(SOCKET_EVENTS.PARTY_QUEUE, {
          selectedTimeSlot: MATCH_TIME_SLOT,
          themeId,
          routeId,
        }),
      unqueueParty: () => emitWithAck(SOCKET_EVENTS.PARTY_UNQUEUE),
      // Named `readyUp` to avoid colliding with the `sessionReady` state value.
      readyUp: (sessionId) =>
        emitWithAck(SOCKET_EVENTS.SESSION_READY, { sessionId }),
      startStop: (sessionId, stopId) =>
        emitWithAck(SOCKET_EVENTS.STOP_START, { sessionId, stopId }),
      finishStop: (sessionId, stopId) =>
        emitWithAck(SOCKET_EVENTS.STOP_FINISH, { sessionId, stopId }),
      submitStopPhoto: async (sessionId, stopId, photoId) => {
        const ack = await emitWithAck(SOCKET_EVENTS.STOP_PHOTO_SUBMIT, {
          sessionId,
          stopId,
          photoId,
        })
        // The server confirmed the stop is done; advance our own UI right away
        // in case the broadcast doesn't make it back (dropped socket on Android).
        markStopFinished(stopId)
        return ack
      },
      resetMatchmaking,
      clearError: () => setLastError(null),
    }),
    [emitWithAck, resetMatchmaking, markStopFinished],
  )

  const value = useMemo(
    () => ({
      status,
      party,
      queueStats,
      match,
      sessionReady,
      sessionStarted,
      stopStates,
      stopStartedAt,
      starters,
      photoRequest,
      lastError,
      ...actions,
    }),
    [
      status,
      party,
      queueStats,
      match,
      sessionReady,
      sessionStarted,
      stopStates,
      stopStartedAt,
      starters,
      photoRequest,
      lastError,
      actions,
    ],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useMatchmaking() {
  const ctx = useContext(SocketContext)
  if (!ctx) {
    throw new Error("useMatchmaking must be used within a SocketProvider")
  }
  return ctx
}
