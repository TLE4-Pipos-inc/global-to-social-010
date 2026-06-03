import { and, eq } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import { db } from "../db/client.js"
import { conversationStarters } from "../db/schema.js"
import { requireAuth } from "../middleware/auth.js"

const router = express.Router()
const allowedTriggerMinutes = new Set([0, 5, 10, 15, 20, 25, 30, 35, 40, 45])

function parseStarterBody(body, partial = false) {
  const payload = {}
  const errors = []

  if (!partial || body.interestsId !== undefined) {
    payload.interestsId = body.interestsId
      ? String(body.interestsId).trim()
      : null
  }

  if (!partial || body.category !== undefined) {
    const category = String(body.category ?? "").trim()
    if (!category) errors.push("category is required")
    payload.category = category
  }

  if (!partial || body.prompt !== undefined) {
    const prompt = String(body.prompt ?? "").trim()
    if (!prompt) errors.push("prompt is required")
    payload.prompt = prompt
  }

  if (!partial || body.triggerMinute !== undefined) {
    const triggerMinute = Number(body.triggerMinute)
    if (!allowedTriggerMinutes.has(triggerMinute)) {
      errors.push(
        "triggerMinute must be one of 0, 5, 10, 15, 20, 25, 30, 35, 40, 45"
      )
    }
    payload.triggerMinute = triggerMinute
  }

  return { payload, errors }
}

function buildFilters(query) {
  const filters = []
  const errors = []

  if (query.interestsId) {
    filters.push(
      eq(conversationStarters.interestsId, String(query.interestsId))
    )
  }

  if (query.triggerMinute !== undefined) {
    const triggerMinute = Number(query.triggerMinute)
    if (allowedTriggerMinutes.has(triggerMinute)) {
      filters.push(eq(conversationStarters.triggerMinute, triggerMinute))
    } else {
      errors.push(
        "triggerMinute must be one of 0, 5, 10, 15, 20, 25, 30, 35, 40, 45"
      )
    }
  }

  return { filters, errors }
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

router.get("/", (req, res) => {
  const { filters, errors } = buildFilters(req.query)

  if (errors.length) {
    return res.status(400).json({ message: "Invalid query parameters", errors })
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
  const { payload, errors } = parseStarterBody(req.body)

  if (errors.length) {
    return res
      .status(400)
      .json({ message: "Invalid conversation starter data", errors })
  }

  const starter = {
    id: uuidv4(),
    ...payload,
  }

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

  const { payload, errors } = parseStarterBody(req.body, true)

  if (errors.length) {
    return res
      .status(400)
      .json({ message: "Invalid conversation starter data", errors })
  }

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ message: "No fields provided" })
  }

  try {
    db.update(conversationStarters)
      .set(payload)
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

    return res
      .status(500)
      .json({ message: "Could not update conversation starter", error })
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
