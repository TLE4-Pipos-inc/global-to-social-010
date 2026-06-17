import { eq } from "drizzle-orm"
import express, { type Request } from "express"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/db/client"
import { routeThemes } from "@/db/schema"
import { requireAuth } from "@/middleware/auth"
import {
  ThemaRouteCreateSchema,
  ThemaRouteQuerySchema,
  ThemaRouteUpdateSchema,
} from "@pub-hopper/schemas"
import { isForeignKeyError } from "@/lib/sql-error"
import { sendSuccess, sendError } from "@/lib/response"
import z from "zod"

const router = express.Router()

function isUniqueThemaRouteError(error) {
  return (
    error?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    (error?.code === "SQLITE_CONSTRAINT" &&
      String(error?.message ?? "").includes("route_themes.name"))
  )
}

router.get("/", (req, res) => {
  const parsed = ThemaRouteQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid thema route query",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const query = db.select().from(routeThemes)
  const items =
    parsed.data.active === undefined
      ? query.all()
      : query.where(eq(routeThemes.active, parsed.data.active)).all()

  return sendSuccess(res, 200, { result: items })
})

router.get("/:id", (req: Request<{ id: string }>, res) => {
  const themaRoute = db
    .select()
    .from(routeThemes)
    .where(eq(routeThemes.id, req.params.id))
    .get()

  if (!themaRoute) {
    return sendError(res, 404, { message: "Thema route not found" })
  }

  return sendSuccess(res, 200, { result: themaRoute })
})

router.post("/", requireAuth, async (req, res) => {
  const parsed = ThemaRouteCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid thema route data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  try {
    const themaRoute = {
      id: uuidv4(),
      ...parsed.data,
    }

    const [result] = await db.insert(routeThemes).values(themaRoute).returning()

    return sendSuccess(res, 201, { result: result })
  } catch (error) {
    if (isUniqueThemaRouteError(error)) {
      return sendError(res, 409, { message: "Thema route already exists" })
    }
    console.error(error)
    return sendError(res, 500, { message: "Could not create thema route" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const existingThemaRoute = db
    .select()
    .from(routeThemes)
    .where(eq(routeThemes.id, req.params.id))
    .get()

  if (!existingThemaRoute) {
    return sendError(res, 404, { message: "Thema route not found" })
  }

  const parsed = ThemaRouteUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid thema route data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  try {
    const [result] = await db
      .update(routeThemes)
      .set(parsed.data)
      .where(eq(routeThemes.id, req.params.id))
      .returning()

    return sendSuccess(res, 200, { result })
  } catch (error) {
    if (isUniqueThemaRouteError(error)) {
      return sendError(res, 409, { message: "Thema route already exists" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not update thema route" })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const existingThemaRoute = db
    .select()
    .from(routeThemes)
    .where(eq(routeThemes.id, req.params.id))
    .get()

  if (!existingThemaRoute) {
    return sendError(res, 404, { message: "Thema route not found" })
  }

  try {
    db.delete(routeThemes).where(eq(routeThemes.id, req.params.id)).run()

    return sendSuccess(res, 204, {})
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 409, {
        message: "Thema route is currently in use",
      })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not delete thema route" })
  }
})

export default router
