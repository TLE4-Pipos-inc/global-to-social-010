import { and, eq, type SQL } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import z from "zod"
import { db } from "@/db/client"
import { gameSessions, routeThemes, routes } from "@/db/schema"
import { sendError, sendSuccess } from "@/lib/response"
import { isForeignKeyError } from "@/lib/sql-error"
import { requireAuth } from "@/middleware/auth"
import {
  RouteCreateSchema,
  RouteQuerySchema,
  RouteUpdateSchema,
} from "@pub-hopper/schemas"

const router = express.Router()

function routeThemeExists(themeId: string): boolean {
  return Boolean(
    db.select({ id: routeThemes.id })
      .from(routeThemes)
      .where(eq(routeThemes.id, themeId))
      .get()
  )
}

router.get("/", (req, res) => {
  const parsed = RouteQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid route query",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const filters: SQL[] = []

  if (parsed.data.themeId !== undefined) {
    filters.push(eq(routes.themeId, parsed.data.themeId))
  }

  if (parsed.data.active !== undefined) {
    filters.push(eq(routes.active, parsed.data.active))
  }

  const query = db.select().from(routes)
  const items = filters.length ? query.where(and(...filters)).all() : query.all()

  return sendSuccess(res, 200, { result: { routes: items } })
})

router.get<{ id: string }>("/:id", (req, res) => {
  const route = db
    .select()
    .from(routes)
    .where(eq(routes.id, req.params.id))
    .get()

  if (!route) {
    return sendError(res, 404, { message: "Route not found" })
  }

  return sendSuccess(res, 200, { result: route })
})

router.post("/", requireAuth, async (req, res) => {
  const parsed = RouteCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid route data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (parsed.data.themeId && !routeThemeExists(parsed.data.themeId)) {
    return sendError(res, 400, { message: "themeId does not exist" })
  }

  const route = { id: uuidv4(), ...parsed.data }

  try {
    const [result] = await db.insert(routes).values(route).returning()
    return sendSuccess(res, 201, { result })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "themeId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not create route" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const existingRoute = db
    .select()
    .from(routes)
    .where(eq(routes.id, req.params.id))
    .get()

  if (!existingRoute) {
    return sendError(res, 404, { message: "Route not found" })
  }

  const parsed = RouteUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid route data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  if (parsed.data.themeId && !routeThemeExists(parsed.data.themeId)) {
    return sendError(res, 400, { message: "themeId does not exist" })
  }

  try {
    const [result] = await db
      .update(routes)
      .set(parsed.data)
      .where(eq(routes.id, req.params.id))
      .returning()

    return sendSuccess(res, 200, { result })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "themeId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not update route" })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const existingRoute = db
    .select()
    .from(routes)
    .where(eq(routes.id, req.params.id))
    .get()

  if (!existingRoute) {
    return sendError(res, 404, { message: "Route not found" })
  }

  const existingSession = db
    .select({ id: gameSessions.id })
    .from(gameSessions)
    .where(eq(gameSessions.routeId, req.params.id))
    .get()

  if (existingSession) {
    return sendError(res, 409, { message: "Route is currently used by a game session" })
  }

  try {
    db.delete(routes).where(eq(routes.id, req.params.id)).run()
    return sendSuccess(res, 204, { message: "Route deleted successfully" })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 409, { message: "Route is currently in use" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not delete route" })
  }
})

export default router
