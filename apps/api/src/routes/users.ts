import { and, asc, desc, eq, inArray, type SQL } from "drizzle-orm"
import express from "express"
import { AdminUpdateUserSchema, UpdateUserSchema, UserGroupPhotosQuerySchema } from "@pub-hopper/schemas"
import { db } from "@/db/client"
import {
  collages,
  gameSessions,
  groupMembers,
  photos,
  playerGroups,
  routeStops,
  routes,
  sessionStops,
  users,
  venues,
} from "@/db/schema"
import { requireAdmin, requireAuth } from "@/middleware/auth"
import z from "zod"
import { sendError, sendSuccess } from "@/lib/response"

const router = express.Router()

 type GroupMemoryPhoto = {
  id: string
  photoUrl: string | null
  localUri: string | null
  proofType: string
  createdAt: string
  venue: {
    id: string
    name: string
    address: string
  } | null
  stop: {
    sessionStopId: string
    routeStopId: string
    routeOrder: number
  }
}

type GroupMemorySession = {
  id: string
  status: string
  selectedTimeSlot: string
  startedAt: string | null
  completedAt: string | null
  route: {
    id: string
    name: string
    area: string
    city: string
  } | null
  collage: {
    id: string
    title: string
    collageUrl: string | null
    shareToken: string | null
  } | null
  photos: GroupMemoryPhoto[]
  photosMap: Map<string, GroupMemoryPhoto>
}

type GroupMemory = {
  group: {
    id: string
    groupName: string
    groupSize: number
    selectedTimeSlot: string
    matchStatus: string
  }
  member: {
    role: string
    joinedAt: string
  }
  sessions: GroupMemorySession[]
  sessionsMap: Map<string, GroupMemorySession>
  photoIds: Set<string>
  photoCount: number
  sessionCount: number
  sortValue: string
}

const safeUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  school: users.school,
  campus: users.campus,
  createdAt: users.createdAt,
}

router.get("/", requireAuth, requireAdmin, (_req, res) => {
  const items = db.select(safeUserColumns).from(users).all()
  return sendSuccess(res, 200, { result: { users: items } })
})
function userExists(userId: string): boolean {
  return Boolean(
    db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .get()
  )
}

function removeInternalGroupMemoryFields(groupMemory: GroupMemory) {
  return {
    group: groupMemory.group,
    member: groupMemory.member,
    sessions: groupMemory.sessions.map((session) => ({
      id: session.id,
      status: session.status,
      selectedTimeSlot: session.selectedTimeSlot,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      route: session.route,
      collage: session.collage,
      photos: session.photos,
    })),
    photoCount: groupMemory.photoCount,
    sessionCount: groupMemory.sessionCount,
  }
}

router.get("/me/groups/photos", requireAuth, (req, res) => {
  const userId = res.locals.userId

  try {
  const parsed = UserGroupPhotosQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid user group photos query",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (!userExists(userId)) {
    return sendError(res, 404, { message: "User not found" })
  }

  const membershipFilters: SQL[] = [eq(groupMembers.userId, userId)]

  if (parsed.data.groupId !== undefined) {
    membershipFilters.push(eq(groupMembers.groupId, parsed.data.groupId))
  }

  const memberships = db
    .select({
      groupId: playerGroups.id,
      groupName: playerGroups.groupName,
      groupSize: playerGroups.groupSize,
      selectedTimeSlot: playerGroups.selectedTimeSlot,
      matchStatus: playerGroups.matchStatus,
      memberRole: groupMembers.role,
      memberJoinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(playerGroups, eq(playerGroups.id, groupMembers.groupId))
    .where(and(...membershipFilters))
    .all()

  if (parsed.data.groupId !== undefined && memberships.length === 0) {
    return sendError(res, 404, { message: "Group not found" })
  }

  const groupsMap = new Map<string, GroupMemory>()

  for (const membership of memberships) {
    groupsMap.set(membership.groupId, {
      group: {
        id: membership.groupId,
        groupName: membership.groupName,
        groupSize: membership.groupSize,
        selectedTimeSlot: membership.selectedTimeSlot,
        matchStatus: membership.matchStatus,
      },
      member: {
        role: membership.memberRole,
        joinedAt: membership.memberJoinedAt,
      },
      sessions: [],
      sessionsMap: new Map(),
      photoIds: new Set(),
      photoCount: 0,
      sessionCount: 0,
      sortValue: membership.selectedTimeSlot,
    })
  }

  const groupIds = Array.from(groupsMap.keys())

  if (groupIds.length === 0) {
    return sendSuccess(res, 200, { result: { groups: [] } })
  }

  const sessionFilters: SQL[] = [inArray(gameSessions.groupId, groupIds)]

  if (parsed.data.status !== undefined) {
    sessionFilters.push(eq(gameSessions.status, parsed.data.status))
  }

  if (parsed.data.sessionId !== undefined) {
    sessionFilters.push(eq(gameSessions.id, parsed.data.sessionId))
  }

  const sessionRows = db
    .select({
      id: gameSessions.id,
      groupId: gameSessions.groupId,
      status: gameSessions.status,
      selectedTimeSlot: gameSessions.selectedTimeSlot,
      startedAt: gameSessions.startedAt,
      completedAt: gameSessions.completedAt,
      routeId: routes.id,
      routeName: routes.name,
      routeArea: routes.area,
      routeCity: routes.city,
      collageId: collages.id,
      collageTitle: collages.title,
      collageUrl: collages.collageUrl,
      collageShareToken: collages.shareToken,
    })
    .from(gameSessions)
    .leftJoin(routes, eq(routes.id, gameSessions.routeId))
    .leftJoin(collages, eq(collages.sessionId, gameSessions.id))
    .where(and(...sessionFilters))
    .orderBy(desc(gameSessions.selectedTimeSlot))
    .all()

  const sessionGroupMap = new Map<string, GroupMemory>()

  for (const sessionRow of sessionRows) {
    const groupMemory = groupsMap.get(sessionRow.groupId)
    if (!groupMemory) continue

    const sessionMemory: GroupMemorySession = {
      id: sessionRow.id,
      status: sessionRow.status,
      selectedTimeSlot: sessionRow.selectedTimeSlot,
      startedAt: sessionRow.startedAt,
      completedAt: sessionRow.completedAt,
      route: sessionRow.routeId
        ? {
            id: sessionRow.routeId,
            name: sessionRow.routeName ?? "",
            area: sessionRow.routeArea ?? "",
            city: sessionRow.routeCity ?? "",
          }
        : null,
      collage: sessionRow.collageId
        ? {
            id: sessionRow.collageId,
            title: sessionRow.collageTitle ?? "",
            collageUrl: sessionRow.collageUrl,
            shareToken: sessionRow.collageShareToken,
          }
        : null,
      photos: [],
      photosMap: new Map(),
    }

    groupMemory.sessionsMap.set(sessionRow.id, sessionMemory)
    sessionGroupMap.set(sessionRow.id, groupMemory)
    groupMemory.sessions.push(sessionMemory)
    groupMemory.sessionCount = groupMemory.sessions.length

    if (sessionRow.selectedTimeSlot > groupMemory.sortValue) {
      groupMemory.sortValue = sessionRow.selectedTimeSlot
    }
  }

  const sessionIds = sessionRows.map((session) => session.id)

  if (sessionIds.length > 0) {
    const photoRows = db
      .select({
        sessionId: sessionStops.sessionId,
        sessionStopId: sessionStops.id,
        routeStopId: routeStops.id,
        routeOrder: routeStops.routeOrder,
        venueId: venues.id,
        venueName: venues.name,
        venueAddress: venues.address,
        photoId: photos.id,
        photoUrl: photos.photoUrl,
        localUri: photos.localUri,
        proofType: photos.proofType,
        createdAt: photos.createdAt,
      })
      .from(sessionStops)
      .innerJoin(routeStops, eq(routeStops.id, sessionStops.routeStopId))
      .innerJoin(venues, eq(venues.id, routeStops.venueId))
      .leftJoin(photos, eq(photos.sessionStopId, sessionStops.id))
      .where(inArray(sessionStops.sessionId, sessionIds))
      .orderBy(asc(photos.createdAt))
      .all()

    for (const photoRow of photoRows) {
      if (!photoRow.photoId) continue

      const groupMemory = sessionGroupMap.get(photoRow.sessionId)
      const sessionMemory = groupMemory?.sessionsMap.get(photoRow.sessionId)
      if (!groupMemory || !sessionMemory || sessionMemory.photosMap.has(photoRow.photoId)) {
        continue
      }

      const photo: GroupMemoryPhoto = {
        id: photoRow.photoId,
        photoUrl: photoRow.photoUrl ?? (photoRow.localUri ? `/api/photos/${photoRow.photoId}/file` : null),
        localUri: photoRow.localUri,
        proofType: photoRow.proofType ?? "venue_proof",
        createdAt: photoRow.createdAt ?? "",
        venue: photoRow.venueId
          ? {
              id: photoRow.venueId,
              name: photoRow.venueName ?? "",
              address: photoRow.venueAddress ?? "",
            }
          : null,
        stop: {
          sessionStopId: photoRow.sessionStopId,
          routeStopId: photoRow.routeStopId,
          routeOrder: photoRow.routeOrder,
        },
      }

      sessionMemory.photosMap.set(photo.id, photo)
      sessionMemory.photos.push(photo)
      groupMemory.photoIds.add(photo.id)
      groupMemory.photoCount = groupMemory.photoIds.size
    }
  }

  const includeEmptyGroups = parsed.data.includeEmptyGroups === true
  const groups = Array.from(groupsMap.values())
    .filter((groupMemory) => includeEmptyGroups || groupMemory.photoCount > 0)
    .sort((left, right) => right.sortValue.localeCompare(left.sortValue))
    .map(removeInternalGroupMemoryFields)

  return sendSuccess(res, 200, { result: { groups } })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not fetch user group photos" })
  }


router.patch("/me", requireAuth, async (req, res) => {
  const parsed = UpdateUserSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid user data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  try {
    const [result] = await db
      .update(users)
      .set(parsed.data)
      .where(eq(users.id, res.locals.userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        school: users.school,
        campus: users.campus,
      })

    return sendSuccess(res, 200, { result })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not update user" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, requireAdmin, async (req, res) => {
  const parsed = AdminUpdateUserSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid user data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  const existingUser = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, req.params.id))
    .get()

  if (!existingUser) {
    return sendError(res, 404, { message: "User not found" })
  }

  try {
    const [result] = await db
      .update(users)
      .set(parsed.data)
      .where(eq(users.id, req.params.id))
      .returning(safeUserColumns)

    return sendSuccess(res, 200, { result })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not update user" })
  }
})

export default router
