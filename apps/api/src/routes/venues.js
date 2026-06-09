import { eq } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/db/client.js"
import { venues } from "@/db/schema.js"
import { requireAuth } from "@/middleware/auth.js"
import {
  VenueCreateSchema,
  VenueParamsSchema,
  VenueUpdateSchema,
} from "@pub-hopper/schemas"

const router = express.Router()

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
  const parsed = VenueParamsSchema.safeParse(req.params)

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid venue parameters",
      errors: parsed.error.flatten().fieldErrors,
    })
    return null
  }

  return parsed.data
}

router.get("/", (_req, res) => {
  const items = db.select().from(venues).all()
  return res.json({ venues: items })
})

router.get("/:id", (req, res) => {
  const params = parseParams(req, res)
  if (!params) return

  const venue = db.select().from(venues).where(eq(venues.id, params.id)).get()

  if (!venue) {
    return res.status(404).json({ message: "Venue not found" })
  }

  return res.json({ venue })
})

router.post("/", requireAuth, (req, res) => {
  const parsed = VenueCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid venue data",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const venue = {
    id: uuidv4(),
    ...parsed.data,
  }

  try {
    db.insert(venues).values(venue).run()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Could not create venue" })
  }

  return res.status(201).json({ venue })
})

router.patch("/:id", requireAuth, (req, res) => {
  const params = parseParams(req, res)
  if (!params) return

  const existingVenue = db
    .select()
    .from(venues)
    .where(eq(venues.id, params.id))
    .get()

  if (!existingVenue) {
    return res.status(404).json({ message: "Venue not found" })
  }

  const parsed = VenueUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid venue data",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ message: "No fields provided" })
  }

  try {
    db.update(venues).set(parsed.data).where(eq(venues.id, params.id)).run()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Could not update venue" })
  }

  const updatedVenue = db
    .select()
    .from(venues)
    .where(eq(venues.id, params.id))
    .get()

  return res.json({ venue: updatedVenue })
})

router.delete("/:id", requireAuth, (req, res) => {
  const params = parseParams(req, res)
  if (!params) return

  const existingVenue = db
    .select()
    .from(venues)
    .where(eq(venues.id, params.id))
    .get()

  if (!existingVenue) {
    return res.status(404).json({ message: "Venue not found" })
  }

  try {
    db.delete(venues).where(eq(venues.id, params.id)).run()
  } catch (error) {
    if (isForeignKeyError(error)) {
      return res.status(409).json({ message: "Venue is used in a route" })
    }

    console.error(error)
    return res.status(500).json({ message: "Could not delete venue" })
  }

  return res.status(204).send()
})

export default router
