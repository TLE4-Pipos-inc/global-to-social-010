import { eq } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/db/client.js"
import { interests } from "@/db/schema.js"
import { InterestCreateSchema, InterestUpdateSchema } from "@pub-hopper/schemas"
import { requireAuth } from "@/middleware/auth.js"

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

function isForeignKeyError(error) {
  return (
    error?.code === "SQLITE_CONSTRAINT_FOREIGNKEY" ||
    (error?.code === "SQLITE_CONSTRAINT" &&
      String(error?.message ?? "")
        .toLowerCase()
        .includes("foreign key"))
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
  const parsed = InterestCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid interest data",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const name = normalizeName(parsed.data.name)

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

  const parsed = InterestUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid interest data",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ message: "No fields provided" })
  }

  const name = normalizeName(parsed.data.name)

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

  try {
    db.delete(interests).where(eq(interests.id, req.params.id)).run()
  } catch (error) {
    if (isForeignKeyError(error)) {
      return res.status(409).json({ message: "Interest is currently in use" })
    }

    console.error(error)
    return res.status(500).json({ message: "Could not delete interest" })
  }

  return res.status(204).send()
})

export default router
