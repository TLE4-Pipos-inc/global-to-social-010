import { and, eq } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import { db } from "../db/client.js"
import { conversationStarters } from "../db/schema.js"
import { requireAuth } from "../middleware/auth.js"
import {
  ConversationStarterQuerySchema,
  ConversationStarterCreateSchema,
  ConversationStarterUpdateSchema,
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

router.get("/", (req, res) => {
  const parsed = ConversationStarterQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const filters = []
  if (parsed.data.interestsId !== undefined) {
    filters.push(eq(conversationStarters.interestsId, parsed.data.interestsId))
  }
  if (parsed.data.triggerMinute !== undefined) {
    filters.push(
      eq(conversationStarters.triggerMinute, parsed.data.triggerMinute)
    )
  }

  const query = db.select().from(conversationStarters)
  const starters = filters.length
    ? query.where(and(...filters)).all()
    : query.all()

  return res.json({ conversationStarters: starters })
})

router.get("/:id", (req, res) => {
  const starter = db
    .select()
    .from(conversationStarters)
    .where(eq(conversationStarters.id, req.params.id))
    .get()

  if (!starter) {
    return res.status(404).json({ message: "Conversation starter not found" })
  }

  return res.json({ conversationStarter: starter })
})

router.post("/", requireAuth, (req, res) => {
  const parsed = ConversationStarterCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid conversation starter data",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const starter = { id: uuidv4(), ...parsed.data }

  try {
    db.insert(conversationStarters).values(starter).run()
    return res.status(201).json({ conversationStarter: starter })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return res.status(400).json({ message: "interestsId does not exist" })
    }
    return res
      .status(500)
      .json({ message: "Could not create conversation starter" })
  }
})

router.patch("/:id", requireAuth, (req, res) => {
  const existingStarter = db
    .select()
    .from(conversationStarters)
    .where(eq(conversationStarters.id, req.params.id))
    .get()

  if (!existingStarter) {
    return res.status(404).json({ message: "Conversation starter not found" })
  }

  const parsed = ConversationStarterUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid conversation starter data",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ message: "No fields provided" })
  }

  try {
    db.update(conversationStarters)
      .set(parsed.data)
      .where(eq(conversationStarters.id, req.params.id))
      .run()

    const updatedStarter = db
      .select()
      .from(conversationStarters)
      .where(eq(conversationStarters.id, req.params.id))
      .get()

    return res.json({ conversationStarter: updatedStarter })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return res.status(400).json({ message: "interestsId does not exist" })
    }
    console.error(error)
    return res
      .status(500)
      .json({ message: "Could not update conversation starter" })
  }
})

router.delete("/:id", requireAuth, (req, res) => {
  const existingStarter = db
    .select()
    .from(conversationStarters)
    .where(eq(conversationStarters.id, req.params.id))
    .get()

  if (!existingStarter) {
    return res.status(404).json({ message: "Conversation starter not found" })
  }

  db.delete(conversationStarters)
    .where(eq(conversationStarters.id, req.params.id))
    .run()

  return res.status(204).send()
})

export default router
