import { eq } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/db/client.js"
import { routeThemes } from "@/db/schema.js"
import { requireAuth } from "@/middleware/auth.js"
import {
  ThemaRouteCreateSchema,
  ThemaRouteParamsSchema,
  ThemaRouteQuerySchema,
  ThemaRouteUpdateSchema,
} from "@pub-hopper/schemas"

const router = express.Router()

function isUniqueThemaRouteError(error) {
  return (
    error?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    (error?.code === "SQLITE_CONSTRAINT" &&
      String(error?.message ?? "").includes("route_themes.name"))
  )
}

function isForeignKeyError(error) {
  return (
    error?.code === "SQLITE_CONSTRAINT_FOREIGNKEY" ||
    (error?.code === "SQLITE_CONSTRAINT" &&
      String(error?.message ?? "")
        .toLowerCase()
        .includes("foreign key"))
  )
}

function parseParams(req, res) {
  const parsed = ThemaRouteParamsSchema.safeParse(req.params)

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid thema route parameters",
      errors: parsed.error.flatten().fieldErrors,
    })
    return null
  }

  return parsed.data
}

router.get("/", (req, res) => {
  const parsed = ThemaRouteQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid thema route query",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const query = db.select().from(routeThemes)
  const items =
    parsed.data.active === undefined
      ? query.all()
      : query.where(eq(routeThemes.active, parsed.data.active)).all()

  return res.json({ themaRoutes: items })
})

router.get("/:id", (req, res) => {
  const params = parseParams(req, res)
  if (!params) return

  const themaRoute = db
    .select()
    .from(routeThemes)
    .where(eq(routeThemes.id, params.id))
    .get()

  if (!themaRoute) {
    return res.status(404).json({ message: "Thema route not found" })
  }

  return res.json({ themaRoute })
})

router.post("/", requireAuth, (req, res) => {
  const parsed = ThemaRouteCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid thema route data",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const themaRoute = {
    id: uuidv4(),
    ...parsed.data,
  }

  try {
    db.insert(routeThemes).values(themaRoute).run()
  } catch (error) {
    if (isUniqueThemaRouteError(error)) {
      return res.status(409).json({ message: "Thema route already exists" })
    }

    console.error(error)
    return res.status(500).json({ message: "Could not create thema route" })
  }

  return res.status(201).json({ themaRoute })
})

router.patch("/:id", requireAuth, (req, res) => {
  const params = parseParams(req, res)
  if (!params) return

  const existingThemaRoute = db
    .select()
    .from(routeThemes)
    .where(eq(routeThemes.id, params.id))
    .get()

  if (!existingThemaRoute) {
    return res.status(404).json({ message: "Thema route not found" })
  }

  const parsed = ThemaRouteUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid thema route data",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ message: "No fields provided" })
  }

  try {
    db.update(routeThemes)
      .set(parsed.data)
      .where(eq(routeThemes.id, params.id))
      .run()
  } catch (error) {
    if (isUniqueThemaRouteError(error)) {
      return res.status(409).json({ message: "Thema route already exists" })
    }

    console.error(error)
    return res.status(500).json({ message: "Could not update thema route" })
  }

  const updatedThemaRoute = db
    .select()
    .from(routeThemes)
    .where(eq(routeThemes.id, params.id))
    .get()

  return res.json({ themaRoute: updatedThemaRoute })
})

router.delete("/:id", requireAuth, (req, res) => {
  const params = parseParams(req, res)
  if (!params) return

  const existingThemaRoute = db
    .select()
    .from(routeThemes)
    .where(eq(routeThemes.id, params.id))
    .get()

  if (!existingThemaRoute) {
    return res.status(404).json({ message: "Thema route not found" })
  }

  try {
    db.delete(routeThemes).where(eq(routeThemes.id, params.id)).run()
  } catch (error) {
    if (isForeignKeyError(error)) {
      return res.status(409).json({ message: "Thema route is currently in use" })
    }

    console.error(error)
    return res.status(500).json({ message: "Could not delete thema route" })
  }

  return res.status(204).send()
})

export default router
