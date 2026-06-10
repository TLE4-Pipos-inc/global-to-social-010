import { and, eq, inArray, isNull, notInArray } from "drizzle-orm"
import { db } from "../db/client.js"
import {
  conversationStarters,
  gameSessions,
  groupMembers,
  userInterests,
} from "../db/schema.js"

/**
 * Pick one conversation starter for a session at the given trigger minute.
 *
 * Selection priority:
 *  1. Interest-specific starters for interests shared by 2+ group members
 *  2. General starters (null interestsId) at the same trigger minute
 *  3. Any general starter not yet shown (ignores trigger minute as last resort)
 *
 * @param {string} sessionId
 * @param {number} triggerMinute  Must be one of 0,5,10,...,45
 * @param {Set<string>} shownStarterIds  IDs already sent in this session
 * @returns {object|null}
 */
export function pickStarterForSession(sessionId, triggerMinute, shownStarterIds) {
  const session = db
    .select({ groupId: gameSessions.groupId })
    .from(gameSessions)
    .where(eq(gameSessions.id, sessionId))
    .get()

  if (!session) return null

  const members = db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, session.groupId))
    .all()

  const userIds = members.map((m) => m.userId)
  const excluded = shownStarterIds.size > 0 ? [...shownStarterIds] : []

  // Find interests that appear on 2+ members' profiles
  const sharedInterestIds = []
  if (userIds.length >= 2) {
    const rows = db
      .select({ interestId: userInterests.interestId })
      .from(userInterests)
      .where(inArray(userInterests.userId, userIds))
      .all()

    const counts = new Map()
    for (const { interestId } of rows) {
      counts.set(interestId, (counts.get(interestId) ?? 0) + 1)
    }
    for (const [id, count] of counts) {
      if (count >= 2) sharedInterestIds.push(id)
    }
  }

  // 1. Interest-specific at this minute
  if (sharedInterestIds.length > 0) {
    const conditions = [
      inArray(conversationStarters.interestsId, sharedInterestIds),
      eq(conversationStarters.triggerMinute, triggerMinute),
    ]
    if (excluded.length > 0) conditions.push(notInArray(conversationStarters.id, excluded))

    const candidates = db
      .select()
      .from(conversationStarters)
      .where(and(...conditions))
      .all()

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)]
    }
  }

  // 2. General starters at this minute
  const generalConditions = [
    isNull(conversationStarters.interestsId),
    eq(conversationStarters.triggerMinute, triggerMinute),
  ]
  if (excluded.length > 0) generalConditions.push(notInArray(conversationStarters.id, excluded))

  const generalAtMinute = db
    .select()
    .from(conversationStarters)
    .where(and(...generalConditions))
    .all()

  if (generalAtMinute.length > 0) {
    return generalAtMinute[Math.floor(Math.random() * generalAtMinute.length)]
  }

  // 3. Any general starter not yet shown
  const anyGeneralConditions = [isNull(conversationStarters.interestsId)]
  if (excluded.length > 0) anyGeneralConditions.push(notInArray(conversationStarters.id, excluded))

  const anyGeneral = db
    .select()
    .from(conversationStarters)
    .where(and(...anyGeneralConditions))
    .all()

  if (anyGeneral.length > 0) {
    return anyGeneral[Math.floor(Math.random() * anyGeneral.length)]
  }

  return null
}

/**
 * Manages per-session conversation starter intervals.
 * One active stop per session at a time; shown starters are tracked for the
 * full session lifetime to prevent repeats across stops.
 */
export class ConversationStarterScheduler {
  constructor() {
    /** @type {Map<string, { intervalHandle: ReturnType<typeof setInterval>, stopId: string }>} */
    this.activeStops = new Map()
    /** @type {Map<string, Set<string>>} sessionId -> shown starter IDs */
    this.shownStarters = new Map()
  }

  /**
   * Start the conversation starter stream for a stop.
   * Emits trigger minute 0 immediately, then every 5 minutes until
   * plannedDurationMinutes is reached.
   *
   * @param {object} params
   * @param {string} params.sessionId
   * @param {string} params.stopId
   * @param {number} params.plannedDurationMinutes
   * @param {import("socket.io").Server} params.io
   * @param {string} params.room  Socket.IO room to broadcast into
   * @param {string} params.eventName  Event name for the conversation:starter push
   */
  startForStop({ sessionId, stopId, plannedDurationMinutes, io, room, eventName }) {
    this.stopCurrent(sessionId)

    const shownIds = this.shownStarters.get(sessionId) ?? new Set()
    this.shownStarters.set(sessionId, shownIds)

    const emit = (triggerMinute) => {
      const starter = pickStarterForSession(sessionId, triggerMinute, shownIds)
      if (!starter) return
      shownIds.add(starter.id)
      io.to(room).emit(eventName, { starter, triggerMinute, stopId })
    }

    emit(0)

    let tick = 1
    const handle = setInterval(() => {
      const triggerMinute = tick * 5
      emit(triggerMinute)
      tick++
      if (triggerMinute >= plannedDurationMinutes) {
        this.stopCurrent(sessionId)
      }
    }, 5 * 60 * 1000)

    if (typeof handle.unref === "function") handle.unref()
    this.activeStops.set(sessionId, { intervalHandle: handle, stopId })
  }

  /** Stop the running interval for a session (no-op if none is active). */
  stopCurrent(sessionId) {
    const active = this.activeStops.get(sessionId)
    if (!active) return
    clearInterval(active.intervalHandle)
    this.activeStops.delete(sessionId)
  }

  /** Stop the interval and clear shown-starter history for a session. */
  clearSession(sessionId) {
    this.stopCurrent(sessionId)
    this.shownStarters.delete(sessionId)
  }
}
