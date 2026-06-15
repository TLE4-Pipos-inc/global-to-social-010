import { and, eq, sql } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { db } from "../../db/client.js"
import {
  gameSessions,
  groupJoinMatches,
  groupMembers,
  playerGroups,
  routeStops,
  routes,
  sessionStops,
  userInterests,
  users,
  venues,
} from "../../db/schema.js"

/**
 * Fetch the data we need to score a user when they enter the queue.
 *
 * @param {string} userId
 * @returns {{ id: string, name: string, school: string|null, campus: string|null, interestIds: string[] } | null}
 */
export function loadPlayerProfile(userId) {
  const user = db
    .select({
      id: users.id,
      name: users.name,
      school: users.school,
      campus: users.campus,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!user) return null

  const interests = db
    .select({ interestId: userInterests.interestId })
    .from(userInterests)
    .where(eq(userInterests.userId, userId))
    .all()

  return {
    ...user,
    interestIds: interests.map((row) => row.interestId),
  }
}

/**
 * Persist a queued party to the database.
 * Only writes when the party has 4+ members, satisfying the existing group_size constraint.
 *
 * @param {Object} params
 * @param {string} params.partyId
 * @param {import("./scoring.js").QueuedPlayer[]} params.members
 * @param {string} params.leaderId
 * @param {string} params.selectedTimeSlot
 */
export function persistQueuedParty({ partyId, members, leaderId, selectedTimeSlot }) {
  if (members.length < 4) return

  db.transaction((tx) => {
    tx.insert(playerGroups)
      .values({
        id: partyId,
        groupName: buildGroupName(members),
        groupSize: members.length,
        selectedTimeSlot,
        matchStatus: "queued",
      })
      .run()

    const memberRows = members.map((m) => ({
      id: uuidv4(),
      groupId: partyId,
      userId: m.userId,
      role: m.userId === leaderId ? "host" : "member",
    }))
    tx.insert(groupMembers).values(memberRows).run()
  })
}

/**
 * Remove a persisted party row and its members (cascade).
 * Safe to call even if no row exists.
 *
 * @param {string} partyId
 */
export function removePersistedParty(partyId) {
  db.delete(playerGroups).where(eq(playerGroups.id, partyId)).run()
}

/**
 * Persist a freshly matched group and optionally seed a game session.
 *
 * Accepts the matched parties from the queue so it can reuse any row that was
 * already written by persistQueuedParty (parties of 4 that were persisted at
 * queue time). Smaller parties that were never persisted are written fresh.
 *
 * If no active route exists in the DB we still create the player group + members
 * so the lobby can form; we just skip the session/stops and return session=null.
 *
 * @param {Object} params
 * @param {import("./queue.js").Party[]} params.parties  Matched parties in cluster order (index 0 = lead)
 * @param {import("./scoring.js").QueuedPlayer[]} params.players  All players across all parties
 * @param {string} params.selectedTimeSlot
 * @param {number} params.matchScore
 */
export function createMatchedSession({ parties, players, selectedTimeSlot, matchScore }) {
  if (players.length < 4 || players.length > 8) {
    throw new Error(
      `Matched group must have 4..8 players, got ${players.length}`,
    )
  }

  return db.transaction((tx) => {
    const route = tx
      .select({
        id: routes.id,
        name: routes.name,
        area: routes.area,
        city: routes.city,
        themeId: routes.themeId,
      })
      .from(routes)
      .where(eq(routes.active, true))
      .orderBy(sql`RANDOM()`)
      .limit(1)
      .get()

    const leadParty = parties[0]
    const groupId = leadParty.id
    const groupName = buildGroupName(players)

    // Check if the lead party was already written by persistQueuedParty
    const existingGroup = tx
      .select({ id: playerGroups.id })
      .from(playerGroups)
      .where(eq(playerGroups.id, groupId))
      .get()

    // Ensure the lead group row exists before inserting any groupMembers that
    // reference it — the FK constraint requires the parent row to be present first.
    if (existingGroup) {
      // Lead party row already exists — update to matched state with final combined size
      tx.update(playerGroups)
        .set({ groupName, groupSize: players.length, matchStatus: "matched", selectedTimeSlot })
        .where(eq(playerGroups.id, groupId))
        .run()
    } else {
      // Lead party was never persisted (< 4 members) — insert fresh with its own members
      tx.insert(playerGroups)
        .values({
          id: groupId,
          groupName,
          groupSize: players.length,
          selectedTimeSlot,
          matchStatus: "matched",
        })
        .run()

      const leadMemberRows = leadParty.members.map((m) => ({
        id: uuidv4(),
        groupId,
        userId: m.userId,
        role: m.userId === leadParty.leaderId ? "host" : "member",
      }))
      tx.insert(groupMembers).values(leadMemberRows).run()
    }

    // Now that the lead group row exists, merge non-lead parties: delete their row
    // if persisted (cascade removes their groupMembers), then re-insert those members
    // under the lead group.
    for (let i = 1; i < parties.length; i++) {
      const party = parties[i]
      tx.delete(playerGroups).where(eq(playerGroups.id, party.id)).run()
      const newMemberRows = party.members.map((m) => ({
        id: uuidv4(),
        groupId,
        userId: m.userId,
        role: "member",
      }))
      if (newMemberRows.length > 0) {
        tx.insert(groupMembers).values(newMemberRows).run()
      }
    }

    // Clamp matchScore to 0-100 for storage (it arrives as a 0-1 float).
    const storedScore = Math.round(Math.min(100, Math.max(0, matchScore * 100)))

    const membersResult = players.map((p) => ({
      userId: p.userId,
      role: p.userId === leadParty.leaderId ? "host" : "member",
      name: p.name ?? "Player",
    }))

    if (!route) {
      // No route configured yet — write join-match records without a session id.
      const joinMatchRows = players.map((player) => ({
        id: uuidv4(),
        userId: player.userId,
        groupId,
        sessionId: null,
        matchScore: storedScore,
        status: "pending",
      }))
      tx.insert(groupJoinMatches).values(joinMatchRows).run()

      return {
        group: {
          id: groupId,
          groupName,
          groupSize: players.length,
          selectedTimeSlot,
          matchScore,
        },
        session: null,
        route: null,
        stops: [],
        members: membersResult,
      }
    }

    const stops = tx
      .select({
        id: routeStops.id,
        routeOrder: routeStops.routeOrder,
        venueId: routeStops.venueId,
        venueName: venues.name,
        venueType: venues.venueType,
        address: venues.address,
        description: venues.description,
        vibe: venues.vibe,
        latitude: venues.latitude,
        longitude: venues.longitude,
        plannedDurationMinutes: routeStops.plannedDurationMinutes,
      })
      .from(routeStops)
      .leftJoin(venues, eq(venues.id, routeStops.venueId))
      .where(eq(routeStops.routeId, route.id))
      .orderBy(routeStops.routeOrder)
      .all()

    const sessionId = uuidv4()
    tx.insert(gameSessions)
      .values({
        id: sessionId,
        groupId,
        routeId: route.id,
        themeId: route.themeId,
        selectedTimeSlot,
        status: "setup",
        currentStopIndex: 0,
      })
      .run()

    const sessionStopRows = stops.map((stop) => ({
      id: uuidv4(),
      sessionId,
      routeStopId: stop.id,
      timerState: "not_started",
    }))
    if (sessionStopRows.length > 0) {
      tx.insert(sessionStops).values(sessionStopRows).run()
    }

    // Write one groupJoinMatches row per player, linked to this session.
    const joinMatchRows = players.map((player) => ({
      id: uuidv4(),
      userId: player.userId,
      groupId,
      sessionId,
      matchScore: storedScore,
      status: "pending",
    }))
    tx.insert(groupJoinMatches).values(joinMatchRows).run()

    return {
      group: {
        id: groupId,
        groupName,
        groupSize: players.length,
        selectedTimeSlot,
        matchScore,
      },
      session: {
        id: sessionId,
        routeId: route.id,
        themeId: route.themeId,
        selectedTimeSlot,
        status: "setup",
        currentStopIndex: 0,
      },
      route,
       stops: sessionStopRows.map((row, idx) => ({
         id: row.id,
         routeStopId: row.routeStopId,
         order: stops[idx].routeOrder,
         venueId: stops[idx].venueId,
         name: stops[idx].venueName,
         venueName: stops[idx].venueName,
         venueType: stops[idx].venueType,
         address: stops[idx].address,
         description: stops[idx].description,
         vibe: stops[idx].vibe,
         latitude: stops[idx].latitude,
         longitude: stops[idx].longitude,
         plannedDurationMinutes: stops[idx].plannedDurationMinutes,
       })),
      members: membersResult,
    }
  })
}

/**
 * Return a session stop joined with its planned duration, or null if not found.
 *
 * @param {string} sessionId
 * @param {string} stopId
 */
export function getSessionStop(sessionId, stopId) {
  return db
    .select({
      id: sessionStops.id,
      timerState: sessionStops.timerState,
      plannedDurationMinutes: routeStops.plannedDurationMinutes,
    })
    .from(sessionStops)
    .innerJoin(routeStops, eq(routeStops.id, sessionStops.routeStopId))
    .where(and(eq(sessionStops.id, stopId), eq(sessionStops.sessionId, sessionId)))
    .get()
}

/**
 * Return true if userId is a member of the group that owns sessionId.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @returns {boolean}
 */
export function isSessionMember(sessionId, userId) {
  const row = db
    .select({ groupId: gameSessions.groupId })
    .from(gameSessions)
    .innerJoin(
      groupMembers,
      and(eq(groupMembers.groupId, gameSessions.groupId), eq(groupMembers.userId, userId)),
    )
    .where(eq(gameSessions.id, sessionId))
    .get()
  return !!row
}

/**
 * Transition a stop timer from `not_started` -> `running`.
 *
 * @param {string} stopId
 * @returns {boolean}  true if the row was updated
 */
export function startStopTimer(stopId) {
  const result = db
    .update(sessionStops)
    .set({ timerState: "running", timerStartedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(sessionStops.id, stopId), eq(sessionStops.timerState, "not_started")))
    .run()
  return result.changes > 0
}

/**
 * Transition a stop timer from `running` -> `finished`.
 *
 * @param {string} stopId
 * @returns {boolean}  true if the row was updated
 */
export function finishStopTimer(stopId) {
  const result = db
    .update(sessionStops)
    .set({
      timerState: "finished",
      timerFinishedAt: sql`CURRENT_TIMESTAMP`,
      completedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(sessionStops.id, stopId), eq(sessionStops.timerState, "running")))
    .run()
  return result.changes > 0
}

/**
 * Flip a session row from `setup` -> `active`.
 *
 * @param {string} sessionId
 * @returns {boolean}
 */
export function activateSession(sessionId) {
  const result = db
    .update(gameSessions)
    .set({ status: "active", startedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(gameSessions.id, sessionId), eq(gameSessions.status, "setup")))
    .run()
  return result.changes > 0
}

function buildGroupName(players) {
  const first = players[0]?.name?.split(" ")[0] ?? "Hop"
  return `${first}'s Pub Hop`
}
