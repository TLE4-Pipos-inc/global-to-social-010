import { and, eq, getTableColumns, isNull, type SQL } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/db/client.js"
import { conversationStarters, interests } from "@/db/schema.js"
import { requireAuth } from "@/middleware/auth.js"
import {
  ConversationStarterQuerySchema,
  ConversationStarterCreateSchema,
  ConversationStarterUpdateSchema,
} from "@pub-hopper/schemas"
import { isForeignKeyError } from "@/lib/sql-error"
import z from "zod"
import { sendError, sendSuccess } from "@/lib/response"

const router = express.Router()

router.get("/", (req, res) => {
  const parsed = ConversationStarterQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid query parameters",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const filters: SQL[] = []
  if (parsed.data.interestsId !== undefined) {
    filters.push(
      parsed.data.interestsId === "null"
        ? isNull(conversationStarters.interestsId)
        : eq(conversationStarters.interestsId, parsed.data.interestsId)
    )
  }
  if (parsed.data.triggerMinute !== undefined) {
    filters.push(
      eq(conversationStarters.triggerMinute, parsed.data.triggerMinute)
    )
  }

  const query = db
    .select({ ...getTableColumns(conversationStarters), interestName: interests.name })
    .from(conversationStarters)
    .leftJoin(interests, eq(conversationStarters.interestsId, interests.id))
  const starters = filters.length
    ? query.where(and(...filters)).all()
    : query.all()

  return sendSuccess(res, 200, { result: { conversationStarters: starters } })
})

router.get<{ id: string }>("/:id", (req, res) => {
  const starter = db
    .select({ ...getTableColumns(conversationStarters), interestName: interests.name })
    .from(conversationStarters)
    .leftJoin(interests, eq(conversationStarters.interestsId, interests.id))
    .where(eq(conversationStarters.id, req.params.id))
    .get()

  if (!starter) {
    return sendError(res, 404, { message: "Conversation starter not found" })
  }

  return sendSuccess(res, 200, { result: starter })
})

router.post("/", requireAuth, async (req, res) => {
  const parsed = ConversationStarterCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid conversation starter data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const starter = { id: uuidv4(), ...parsed.data }

  try {
    const [result] = await db
      .insert(conversationStarters)
      .values(starter)
      .returning()
    return sendSuccess(res, 201, { result })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "interestsId does not exist" })
    }
    return sendError(res, 500, {
      message: "Could not create conversation starter",
    })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const existingStarter = db
    .select()
    .from(conversationStarters)
    .where(eq(conversationStarters.id, req.params.id))
    .get()

  if (!existingStarter) {
    return sendError(res, 404, { message: "Conversation starter not found" })
  }

  const parsed = ConversationStarterUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid conversation starter data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  try {
    const [result] = await db
      .update(conversationStarters)
      .set(parsed.data)
      .where(eq(conversationStarters.id, req.params.id))
      .returning()

    return sendSuccess(res, 200, {
      result,
    })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "interestsId does not exist" })
    }
    console.error(error)
    return sendError(res, 500, {
      message: "Could not update conversation starter",
    })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const existingStarter = db
    .select()
    .from(conversationStarters)
    .where(eq(conversationStarters.id, req.params.id))
    .get()

  if (!existingStarter) {
    return sendError(res, 404, { message: "Conversation starter not found" })
  }

  try {
    db.delete(conversationStarters)
      .where(eq(conversationStarters.id, req.params.id))
      .run()
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not delete conversation starter" })
  }

  return sendSuccess(res, 204, { message: "Conversation starter deleted" })
})

export default router
