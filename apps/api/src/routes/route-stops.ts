import { and, eq, type SQL } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import z from "zod"
import { db } from "@/db/client"
import { routeStops, routes, sessionStops, venues } from "@/db/schema"
import { sendError, sendSuccess } from "@/lib/response"
import { isForeignKeyError, isUniqueRouteStopError } from "@/lib/sql-error"
import { requireAuth } from "@/middleware/auth"
import {
  RouteStopCreateSchema,
  RouteStopQuerySchema,
  RouteStopUpdateSchema,
} from "@pub-hopper/schemas"

const router = express.Router()

function routeExists(routeId: string): boolean {
  return Boolean(
    db
      .select({ id: routes.id })
      .from(routes)
      .where(eq(routes.id, routeId))
      .get()
  )
}

function venueExists(venueId: string): boolean {
  return Boolean(
    db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.id, venueId))
      .get()
  )
}

function getRouteStopConflictMessage(error: unknown): string {
  const message = String(
    (error as Record<string, unknown> | null | undefined)?.message ?? ""
  )

  if (
    message.includes("route_order") ||
    message.includes("route_stops.route_id, route_stops.route_order")
  ) {
    return "routeOrder already exists for this route"
  }

  if (
    message.includes("venue_id") ||
    message.includes("route_stops.route_id, route_stops.venue_id")
  ) {
    return "venueId already exists for this route"
  }

  return "Route stop already exists"
}

function validateReferences(routeId?: string, venueId?: string) {
  if (routeId !== undefined && !routeExists(routeId)) {
    return "routeId does not exist"
  }

  if (venueId !== undefined && !venueExists(venueId)) {
    return "venueId does not exist"
  }

  return null
}

router.get("/", (req, res) => {
  const parsed = RouteStopQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid route stop query",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const filters: SQL[] = []

  if (parsed.data.routeId !== undefined) {
    filters.push(eq(routeStops.routeId, parsed.data.routeId))
  }

  if (parsed.data.venueId !== undefined) {
    filters.push(eq(routeStops.venueId, parsed.data.venueId))
  }

  const query = db
    .select({
      id: routeStops.id,
      routeId: routeStops.routeId,
      venueId: routeStops.venueId,
      routeOrder: routeStops.routeOrder,
      plannedDurationMinutes: routeStops.plannedDurationMinutes,
      walkLabel: routeStops.walkLabel,

      venueName: venues.name,
      venueType: venues.venueType,
      venueAddress: venues.address,
      venueDescription: venues.description,
      venueLatitude: venues.latitude,
      venueLongitude: venues.longitude,
      venueSuggestedOrder: venues.suggestedOrder,
      venueVibe: venues.vibe,
    })
    .from(routeStops)
    .leftJoin(venues, eq(routeStops.venueId, venues.id))

  const items = filters.length
    ? query.where(and(...filters)).all()
    : query.all()

  return sendSuccess(res, 200, { result: { routeStops: items } })
})

router.get<{ id: string }>("/:id", (req, res) => {
  const routeStop = db
    .select()
    .from(routeStops)
    .where(eq(routeStops.id, req.params.id))
    .get()

  if (!routeStop) {
    return sendError(res, 404, { message: "Route stop not found" })
  }

  return sendSuccess(res, 200, { result: routeStop })
})

router.post("/", requireAuth, async (req, res) => {
  const parsed = RouteStopCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid route stop data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const referenceError = validateReferences(
    parsed.data.routeId,
    parsed.data.venueId
  )
  if (referenceError) {
    return sendError(res, 400, { message: referenceError })
  }

  const routeStop = { id: uuidv4(), ...parsed.data }

  try {
    const [result] = await db.insert(routeStops).values(routeStop).returning()
    return sendSuccess(res, 201, { result })
  } catch (error) {
    if (isUniqueRouteStopError(error)) {
      return sendError(res, 409, {
        message: getRouteStopConflictMessage(error),
      })
    }

    if (isForeignKeyError(error)) {
      return sendError(res, 400, {
        message: "routeId or venueId does not exist",
      })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not create route stop" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const existingRouteStop = db
    .select()
    .from(routeStops)
    .where(eq(routeStops.id, req.params.id))
    .get()

  if (!existingRouteStop) {
    return sendError(res, 404, { message: "Route stop not found" })
  }

  const parsed = RouteStopUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid route stop data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  const referenceError = validateReferences(
    parsed.data.routeId,
    parsed.data.venueId
  )
  if (referenceError) {
    return sendError(res, 400, { message: referenceError })
  }

  try {
    const [result] = await db
      .update(routeStops)
      .set(parsed.data)
      .where(eq(routeStops.id, req.params.id))
      .returning()

    return sendSuccess(res, 200, { result })
  } catch (error) {
    if (isUniqueRouteStopError(error)) {
      return sendError(res, 409, {
        message: getRouteStopConflictMessage(error),
      })
    }

    if (isForeignKeyError(error)) {
      return sendError(res, 400, {
        message: "routeId or venueId does not exist",
      })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not update route stop" })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const existingRouteStop = db
    .select()
    .from(routeStops)
    .where(eq(routeStops.id, req.params.id))
    .get()

  if (!existingRouteStop) {
    return sendError(res, 404, { message: "Route stop not found" })
  }

  const existingSessionStop = db
    .select({ id: sessionStops.id })
    .from(sessionStops)
    .where(eq(sessionStops.routeStopId, req.params.id))
    .get()

  if (existingSessionStop) {
    return sendError(res, 409, {
      message: "Route stop is currently used by a session",
    })
  }

  try {
    db.delete(routeStops).where(eq(routeStops.id, req.params.id)).run()
    return sendSuccess(res, 204, { message: "Route stop deleted successfully" })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 409, { message: "Route stop is currently in use" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not delete route stop" })
  }
})

export default router
