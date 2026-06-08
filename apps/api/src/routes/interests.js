import { eq } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import { db } from "../db/client.js"
import { interests } from "../db/schema.js"
import { requireAuth } from "../middleware/auth.js"

const router = express.Router()

function normalizeName(value) {
  if (typeof value !== "string") return null
  return value.trim().toLowerCase()
}

function isUniqueInterestError(error) {
  return (
    error?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    (error?.code === "SQLITE_CONSTRAINT" &&
      String(error?.message ?? "").includes("interests.name"))
  )
}

router.get("/", (_req, res) => {
  const items = db.select().from(interests).all()
  return res.json({ interests: items })
})

router.get("/:id", (req, res) => {
  const interest = db
    .select()
    .from(interests)
    .where(eq(interests.id, req.params.id))
    .get()

  if (!interest) {
    return res.status(404).json({ message: "Interest not found" })
  }

  return res.json({ interest })
})

router.post("/", requireAuth, (req, res) => {
  const name = normalizeName(req.body?.name)

  if (!name) {
    return res.status(400).json({ message: "name is required" })
  }

  const interest = {
    id: uuidv4(),
    name,
  }

  try {
    db.insert(interests).values(interest).run()
    return res.status(201).json({ interest })
  } catch (error) {
    if (isUniqueInterestError(error)) {
      return res.status(409).json({ message: "Interest already exists" })
    }

    return res.status(500).json({ message: "Could not create interest" })
  }
})

router.patch("/:id", requireAuth, (req, res) => {
  const existingInterest = db
    .select()
    .from(interests)
    .where(eq(interests.id, req.params.id))
    .get()

  if (!existingInterest) {
    return res.status(404).json({ message: "Interest not found" })
  }

  const name = normalizeName(req.body?.name)

  if (!name) {
    return res.status(400).json({ message: "name is required" })
  }

  try {
    db.update(interests)
      .set({ name })
      .where(eq(interests.id, req.params.id))
      .run()

    const updatedInterest = db
      .select()
      .from(interests)
      .where(eq(interests.id, req.params.id))
      .get()

    return res.json({ interest: updatedInterest })
  } catch (error) {
    if (isUniqueInterestError(error)) {
      return res.status(409).json({ message: "Interest already exists" })
    }

    return res.status(500).json({ message: "Could not update interest" })
  }
})

router.delete("/:id", requireAuth, (req, res) => {
  const existingInterest = db
    .select()
    .from(interests)
    .where(eq(interests.id, req.params.id))
    .get()

  if (!existingInterest) {
    return res.status(404).json({ message: "Interest not found" })
  }

  db.delete(interests).where(eq(interests.id, req.params.id)).run()

  return res.status(204).send()
})

export default router
