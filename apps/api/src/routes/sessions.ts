import { and, eq, inArray } from "drizzle-orm"
import express from "express"
import { db } from "@/db/client.js"
import {
  gameSessions,
  groupMembers,
  playerGroups,
  routeStops,
  routes,
  sessionStops,
  users,
  venues,
} from "@/db/schema.js"
import { activateSession } from "@/lib/matchmaking/session.js"
import { requireAuth } from "@/middleware/auth.js"
import { sendError, sendSuccess } from "@/lib/response"

const router = express.Router()

// GET /api/sessions/me — current setup/active session for the authenticated user
router.get("/me", requireAuth, (_req, res) => {
  const userId = res.locals.userId

  const session = db
    .select({
      id: gameSessions.id,
      groupId: gameSessions.groupId,
      routeId: gameSessions.routeId,
      themeId: gameSessions.themeId,
      selectedTimeSlot: gameSessions.selectedTimeSlot,
      status: gameSessions.status,
      currentStopIndex: gameSessions.currentStopIndex,
      startedAt: gameSessions.startedAt,
    })
    .from(gameSessions)
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, gameSessions.groupId),
        eq(groupMembers.userId, userId)
      )
    )
    .where(inArray(gameSessions.status, ["setup", "active"]))
    .get()

  if (!session) {
    return sendError(res, 404, { message: "No active session found" })
  }

  return sendSuccess(res, 200, { result: session })
})

// GET /api/sessions/:id — full session detail; caller must be a group member
router.get<{ id: string }>("/:id", requireAuth, (req, res) => {
  const userId = res.locals.userId

  const session = db
    .select({
      id: gameSessions.id,
      groupId: gameSessions.groupId,
      routeId: gameSessions.routeId,
      themeId: gameSessions.themeId,
      selectedTimeSlot: gameSessions.selectedTimeSlot,
      status: gameSessions.status,
      currentStopIndex: gameSessions.currentStopIndex,
      startedAt: gameSessions.startedAt,
      completedAt: gameSessions.completedAt,
    })
    .from(gameSessions)
    .where(eq(gameSessions.id, req.params.id))
    .get()

  if (!session) {
    return sendError(res, 404, { message: "Session not found" })
  }

  const membership = db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, session.groupId),
        eq(groupMembers.userId, userId)
      )
    )
    .get()

  if (!membership) {
    return sendError(res, 403, {
      message: "You are not a member of this session",
    })
  }

  const group = db
    .select({
      id: playerGroups.id,
      groupName: playerGroups.groupName,
      groupSize: playerGroups.groupSize,
      selectedTimeSlot: playerGroups.selectedTimeSlot,
      matchStatus: playerGroups.matchStatus,
    })
    .from(playerGroups)
    .where(eq(playerGroups.id, session.groupId))
    .get()

  const members = db
    .select({
      userId: groupMembers.userId,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
      name: users.name,
      school: users.school,
      campus: users.campus,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, session.groupId))
    .all()

  const route = db
    .select({
      id: routes.id,
      name: routes.name,
      area: routes.area,
      city: routes.city,
      routeType: routes.routeType,
    })
    .from(routes)
    .where(eq(routes.id, session.routeId))
    .get()

  const stops = db
    .select({
      id: sessionStops.id,
      routeStopId: sessionStops.routeStopId,
      timerState: sessionStops.timerState,
      arrivedAt: sessionStops.arrivedAt,
      timerStartedAt: sessionStops.timerStartedAt,
      timerFinishedAt: sessionStops.timerFinishedAt,
      completedAt: sessionStops.completedAt,
      routeOrder: routeStops.routeOrder,
      plannedDurationMinutes: routeStops.plannedDurationMinutes,
      walkLabel: routeStops.walkLabel,
      venueId: venues.id,
      venueName: venues.name,
      venueType: venues.venueType,
      venueAddress: venues.address,
      latitude: venues.latitude,
      longitude: venues.longitude,
      vibe: venues.vibe,
    })
    .from(sessionStops)
    .innerJoin(routeStops, eq(routeStops.id, sessionStops.routeStopId))
    .innerJoin(venues, eq(venues.id, routeStops.venueId))
    .where(eq(sessionStops.sessionId, req.params.id))
    .orderBy(routeStops.routeOrder)
    .all()

  return sendSuccess(res, 200, {
    result: { session, group, members, route, stops },
  })
})

// POST /api/sessions/:id/activate — HTTP fallback for session:ready
// Activates the session immediately (bypasses socket readiness tracking).
// Only a group member may call this.
router.post<{ id: string }>("/:id/activate", requireAuth, (req, res) => {
  const userId = res.locals.userId

  const session = db
    .select({
      id: gameSessions.id,
      groupId: gameSessions.groupId,
      status: gameSessions.status,
    })
    .from(gameSessions)
    .where(eq(gameSessions.id, req.params.id))
    .get()

  if (!session) {
    return sendError(res, 404, { message: "Session not found" })
  }

  if (session.status !== "setup") {
    return sendError(res, 409, {
      message: `Session is already ${session.status}`,
    })
  }

  const membership = db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, session.groupId),
        eq(groupMembers.userId, userId)
      )
    )
    .get()

  if (!membership) {
    return sendError(res, 403, {
      message: "You are not a member of this session",
    })
  }

  const activated = activateSession(req.params.id)
  if (!activated) {
    return sendError(res, 409, { message: "Session could not be activated" })
  }

  return sendSuccess(res, 200, {
    result: { sessionId: req.params.id },
    message: "Session activated",
  })
})

export default router
