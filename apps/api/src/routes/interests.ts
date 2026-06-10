import { eq } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/db/client.js"
import { interests } from "@/db/schema.js"
import { InterestCreateSchema, InterestUpdateSchema } from "@pub-hopper/schemas"
import { requireAuth } from "@/middleware/auth.js"
import z from "zod"
import { sendError, sendSuccess } from "@/lib/response"
import { isForeignKeyError } from "@/lib/sql-error"

const router = express.Router()

function isUniqueInterestError(error: unknown): boolean {
  const e = error as Record<string, unknown> | null | undefined
  return (
    e?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    (e?.code === "SQLITE_CONSTRAINT" &&
      String(e?.message ?? "").includes("interests.name"))
  )
}

router.get("/", (_req, res) => {
  const items = db.select().from(interests).all()
  return sendSuccess(res, 200, { result: { interests: items } })
})

router.get("/:id", (req, res) => {
  const interest = db
    .select()
    .from(interests)
    .where(eq(interests.id, req.params.id))
    .get()

  if (!interest) {
    return sendError(res, 404, { message: "Interest not found" })
  }

  return sendSuccess(res, 200, { result: interest })
})

router.post("/", requireAuth, async (req, res) => {
  const parsed = InterestCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid interest data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const interest = {
    id: uuidv4(),
    name: parsed.data.name,
  }

  try {
    const [result] = await db.insert(interests).values(interest).returning()
    return sendSuccess(res, 201, { result })
  } catch (error) {
    if (isUniqueInterestError(error)) {
      return sendError(res, 409, { message: "Interest already exists" })
    }

    return sendError(res, 500, { message: "Could not create interest" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const existingInterest = db
    .select()
    .from(interests)
    .where(eq(interests.id, req.params.id))
    .get()

  if (!existingInterest) {
    return sendError(res, 404, { message: "Interest not found" })
  }

  const parsed = InterestUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid interest data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  try {
    const [result] = await db
      .update(interests)
      .set({ name: parsed.data.name })
      .where(eq(interests.id, req.params.id))
      .returning()

    return sendSuccess(res, 200, { result })
  } catch (error) {
    if (isUniqueInterestError(error)) {
      return sendError(res, 409, { message: "Interest already exists" })
    }

    return sendError(res, 500, { message: "Could not update interest" })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const existingInterest = db
    .select()
    .from(interests)
    .where(eq(interests.id, req.params.id))
    .get()

  if (!existingInterest) {
    return sendError(res, 404, { message: "Interest not found" })
  }

  try {
    db.delete(interests).where(eq(interests.id, req.params.id)).run()
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 409, { message: "Interest is currently in use" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not delete interest" })
  }

  return sendSuccess(res, 204, { message: "Interest deleted successfully" })
})

export default router
