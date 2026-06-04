import { and, eq, sql } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { db } from "../../db/client.js"
import {
  gameSessions,
  groupMembers,
  playerGroups,
  routeStops,
  routes,
  sessionStops,
  userInterests,
  users,
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
 * Persist a freshly matched group and optionally seed a game session.
 *
 * If no active route exists in the DB we still create the player group + members
 * so the lobby can form; we just skip the session/stops and return session=null.
 *
 * @param {Object} params
 * @param {import("./scoring.js").QueuedPlayer[]} params.players
 * @param {string} params.selectedTimeSlot
 * @param {number} params.matchScore
 */
export function createMatchedSession({ players, selectedTimeSlot, matchScore }) {
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

    const groupId = uuidv4()
    const groupName = buildGroupName(players)
    tx.insert(playerGroups)
      .values({
        id: groupId,
        groupName,
        groupSize: players.length,
        selectedTimeSlot,
        matchStatus: "matched",
      })
      .run()

    const memberRows = players.map((player, index) => ({
      id: uuidv4(),
      groupId,
      userId: player.userId,
      role: index === 0 ? "host" : "member",
    }))
    tx.insert(groupMembers).values(memberRows).run()

    if (!route) {
      // No route configured yet — return the group only.
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
        members: memberRows.map((row) => ({
          userId: row.userId,
          role: row.role,
          name: players.find((p) => p.userId === row.userId)?.name ?? "Player",
        })),
      }
    }

    const stops = tx
      .select({
        id: routeStops.id,
        routeOrder: routeStops.routeOrder,
        venueId: routeStops.venueId,
        plannedDurationMinutes: routeStops.plannedDurationMinutes,
      })
      .from(routeStops)
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
        plannedDurationMinutes: stops[idx].plannedDurationMinutes,
      })),
      members: memberRows.map((row) => ({
        userId: row.userId,
        role: row.role,
        name: players.find((p) => p.userId === row.userId)?.name ?? "Player",
      })),
    }
  })
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

