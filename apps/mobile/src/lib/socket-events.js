/**
 * Event catalog mirrored from the API (`apps/api/src/sockets/index.js`).
 * Keep this in sync with the server's SOCKET_EVENTS.
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
 * The server matches parties by EXACT string equality of `selectedTimeSlot`.
 * For now every party queues into one shared slot so groups can always form.
 */
export const MATCH_TIME_SLOT = "2026-06-10T19:00"
