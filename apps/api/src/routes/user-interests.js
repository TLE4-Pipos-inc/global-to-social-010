import { and, eq, inArray } from "drizzle-orm"
import express from "express"
import {
  UserInterestCreateSchema,
  UserInterestParamsSchema,
  UserInterestsUpdateSchema,
} from "@pub-hopper/schemas"
import { db } from "../db/client.js"
import { interests, userInterests } from "../db/schema.js"
import { requireAuth } from "../middleware/auth.js"
import z from "zod"

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

function isUniqueError(error) {
  return (
    error?.code === "SQLITE_CONSTRAINT_PRIMARYKEY" ||
    error?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    error?.code === "SQLITE_CONSTRAINT"
  )
}

function getUserInterests(userId) {
  const selected = db
    .select()
    .from(userInterests)
    .where(eq(userInterests.userId, userId))
    .all()

  const interestIds = selected.map((item) => item.interestId)
  if (interestIds.length === 0) return []

  return db
    .select()
    .from(interests)
    .where(inArray(interests.id, interestIds))
    .all()
}

router.get("/me", requireAuth, (_req, res) => {
  return res.json({
    interests: getUserInterests(res.locals.payload.userId),
  })
})

router.post("/me", requireAuth, (req, res) => {
  const result = UserInterestCreateSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid user interest data",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  try {
    db.insert(userInterests)
      .values({
        userId: res.locals.payload.userId,
        interestId: result.data.interestId,
      })
      .run()
  } catch (error) {
    if (isForeignKeyError(error)) {
      return res.status(400).json({ message: "interestId does not exist" })
    }

    if (isUniqueError(error)) {
      return res.status(409).json({ message: "Interest already added" })
    }

    console.error(error)
    return res.status(500).json({ message: "Could not add user interest" })
  }

  return res.status(201).json({
    interests: getUserInterests(res.locals.payload.userId),
  })
})

router.put("/me", requireAuth, (req, res) => {
  const result = UserInterestsUpdateSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid user interests data",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  const existingInterests = result.data.interestIds.length
    ? db
        .select({ id: interests.id })
        .from(interests)
        .where(inArray(interests.id, result.data.interestIds))
        .all()
    : []

  if (existingInterests.length !== result.data.interestIds.length) {
    return res
      .status(400)
      .json({ message: "One or more interestIds do not exist" })
  }

  try {
    db.delete(userInterests)
      .where(eq(userInterests.userId, res.locals.payload.userId))
      .run()

    for (const interestId of result.data.interestIds) {
      db.insert(userInterests)
        .values({
          userId: res.locals.payload.userId,
          interestId,
        })
        .run()
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Could not update user interests" })
  }

  return res.json({
    interests: getUserInterests(res.locals.payload.userId),
  })
})

router.delete("/me/:interestId", requireAuth, (req, res) => {
  const result = UserInterestParamsSchema.safeParse(req.params)

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid user interest parameters",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  db.delete(userInterests)
    .where(
      and(
        eq(userInterests.userId, res.locals.payload.userId),
        eq(userInterests.interestId, result.data.interestId)
      )
    )
    .run()

  return res.status(204).send()
})

export default router
