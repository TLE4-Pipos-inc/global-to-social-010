import { eq } from "drizzle-orm"
import express, { type Request, type Response } from "express"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/db/client.js"
import { venues } from "@/db/schema.js"
import { requireAuth } from "@/middleware/auth.js"
import { VenueCreateSchema, VenueUpdateSchema } from "@pub-hopper/schemas"
import { sendError, sendSuccess } from "@/lib/response"
import { isForeignKeyError } from "@/lib/sql-error"
import z from "zod"

const router = express.Router()

router.get("/", (_req, res) => {
  const items = db.select().from(venues).all()
  return sendSuccess(res, 200, { result: { venues: items } })
})

router.get("/:id", (req, res) => {
  const venue = db
    .select()
    .from(venues)
    .where(eq(venues.id, req.params.id))
    .get()

  if (!venue) {
    return sendError(res, 404, { message: "Venue not found" })
  }

  return sendSuccess(res, 200, { result: venue })
})

router.post("/", requireAuth, async (req, res) => {
  const parsed = VenueCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid venue data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const venue = { id: uuidv4(), ...parsed.data }

  try {
    const [result] = await db.insert(venues).values(venue).returning()
    return sendSuccess(res, 201, { result })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not create venue" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const parsed = VenueUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid venue data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const existingVenue = db
    .select()
    .from(venues)
    .where(eq(venues.id, req.params.id))
    .get()

  if (!existingVenue) {
    return sendError(res, 404, { message: "Venue not found" })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  try {
    const [result] = await db
      .update(venues)
      .set(parsed.data)
      .where(eq(venues.id, req.params.id))
      .returning()

    return sendSuccess(res, 200, { result })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not update venue" })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const existingVenue = db
    .select()
    .from(venues)
    .where(eq(venues.id, req.params.id))
    .get()

  if (!existingVenue) {
    return sendError(res, 404, { message: "Venue not found" })
  }

  try {
    db.delete(venues).where(eq(venues.id, req.params.id)).run()
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 409, { message: "Venue is used in a route" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not delete venue" })
  }

  return sendSuccess(res, 204, { message: "Venue deleted successfully" })
})

export default router
