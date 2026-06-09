import { and, count, eq } from "drizzle-orm"
import express from "express"
import {
  UserInterestCreateSchema,
  UserInterestParamsSchema,
  UserInterestQuerySchema,
  UserInterestUpdateSchema,
} from "@pub-hopper/schemas"
import { db } from "@/db/client.js"
import { interests, userInterests } from "@/db/schema.js"
import { requireAuth } from "@/middleware/auth.js"
import z from "zod"

const router = express.Router()

const minUserInterests = 3
const maxUserInterests = 5

class MaxUserInterestsError extends Error {}
class MinUserInterestsError extends Error {}
class UserInterestNotFoundError extends Error {}

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
  const message = String(error?.message ?? "").toLowerCase()

  return (
    error?.code === "SQLITE_CONSTRAINT_PRIMARYKEY" ||
    error?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    (error?.code === "SQLITE_CONSTRAINT" &&
      !message.includes("foreign key") &&
      (message.includes("unique") || message.includes("primary")))
  )
}

function getRowsChanged(result) {
  return result?.changes ?? result?.rowsAffected ?? 0
}

function getUserInterest(userId, interestId) {
  return db
    .select({
      userId: userInterests.userId,
      interestId: userInterests.interestId,
      interestName: interests.name,
    })
    .from(userInterests)
    .innerJoin(interests, eq(userInterests.interestId, interests.id))
    .where(
      and(
        eq(userInterests.userId, userId),
        eq(userInterests.interestId, interestId)
      )
    )
    .get()
}

function getUserInterestsByIds(userId, interestIds) {
  return interestIds.map((interestId) => getUserInterest(userId, interestId))
}

router.get("/", requireAuth, (req, res) => {
  const result = UserInterestQuerySchema.safeParse(req.query)

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid user interest query",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  const filters = [eq(userInterests.userId, res.locals.payload.userId)]

  if (result.data.interestId) {
    filters.push(eq(userInterests.interestId, result.data.interestId))
  }

  const items = db
    .select({
      userId: userInterests.userId,
      interestId: userInterests.interestId,
      interestName: interests.name,
    })
    .from(userInterests)
    .innerJoin(interests, eq(userInterests.interestId, interests.id))
    .where(and(...filters))
    .all()

  return res.json({ userInterests: items })
})

router.get("/:id", requireAuth, (req, res) => {
  const result = UserInterestParamsSchema.safeParse(req.params)

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid user interest parameters",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  const item = getUserInterest(res.locals.payload.userId, result.data.id)

  if (!item) {
    return res.status(404).json({ message: "User interest not found" })
  }

  return res.json({ userInterest: item })
})

router.post("/", requireAuth, (req, res) => {
  const result = UserInterestCreateSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid user interest data",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  const { interestIds } = result.data

  try {
    db.transaction((tx) => {
      const currentCount = tx
        .select({ value: count() })
        .from(userInterests)
        .where(eq(userInterests.userId, res.locals.payload.userId))
        .get()

      if ((currentCount?.value ?? 0) + interestIds.length > maxUserInterests) {
        throw new MaxUserInterestsError()
      }

      for (const interestId of interestIds) {
        tx.insert(userInterests)
          .values({
            userId: res.locals.payload.userId,
            interestId,
          })
          .run()
      }
    })
  } catch (error) {
    if (error instanceof MaxUserInterestsError) {
      return res.status(400).json({
        message: `A user can select a maximum of ${maxUserInterests} interests`,
      })
    }

    if (isForeignKeyError(error)) {
      return res.status(400).json({ message: "interestId does not exist" })
    }

    if (isUniqueError(error)) {
      return res.status(409).json({ message: "User interest already exists" })
    }

    console.error(error)
    return res.status(500).json({ message: "Could not create user interest" })
  }

  const createdUserInterests = getUserInterestsByIds(
    res.locals.payload.userId,
    interestIds
  )

  return res.status(201).json({
    userInterests: createdUserInterests,
  })
})

router.patch("/:id", requireAuth, (req, res) => {
  const paramsResult = UserInterestParamsSchema.safeParse(req.params)

  if (!paramsResult.success) {
    return res.status(400).json({
      message: "Invalid user interest parameters",
      errors: z.flattenError(paramsResult.error).fieldErrors,
    })
  }

  const bodyResult = UserInterestUpdateSchema.safeParse(req.body)

  if (!bodyResult.success) {
    return res.status(400).json({
      message: "Invalid user interest data",
      errors: z.flattenError(bodyResult.error).fieldErrors,
    })
  }

  if (paramsResult.data.id === bodyResult.data.interestId) {
    const existing = getUserInterest(
      res.locals.payload.userId,
      paramsResult.data.id
    )

    if (!existing) {
      return res.status(404).json({ message: "User interest not found" })
    }

    return res.json({ userInterest: existing })
  }

  try {
    db.transaction((tx) => {
      const deleteResult = tx
        .delete(userInterests)
        .where(
          and(
            eq(userInterests.userId, res.locals.payload.userId),
            eq(userInterests.interestId, paramsResult.data.id)
          )
        )
        .run()

      if (getRowsChanged(deleteResult) === 0) {
        throw new UserInterestNotFoundError()
      }

      tx.insert(userInterests)
        .values({
          userId: res.locals.payload.userId,
          interestId: bodyResult.data.interestId,
        })
        .run()
    })
  } catch (error) {
    if (error instanceof UserInterestNotFoundError) {
      return res.status(404).json({ message: "User interest not found" })
    }

    if (isForeignKeyError(error)) {
      return res.status(400).json({ message: "interestId does not exist" })
    }

    if (isUniqueError(error)) {
      return res.status(409).json({ message: "User interest already exists" })
    }

    console.error(error)
    return res.status(500).json({ message: "Could not update user interest" })
  }

  return res.json({
    userInterest: getUserInterest(
      res.locals.payload.userId,
      bodyResult.data.interestId
    ),
  })
})

router.delete("/:id", requireAuth, (req, res) => {
  const result = UserInterestParamsSchema.safeParse(req.params)

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid user interest parameters",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  try {
    db.transaction((tx) => {
      const existing = tx
        .select({
          userId: userInterests.userId,
          interestId: userInterests.interestId,
        })
        .from(userInterests)
        .where(
          and(
            eq(userInterests.userId, res.locals.payload.userId),
            eq(userInterests.interestId, result.data.id)
          )
        )
        .get()

      if (!existing) {
        throw new UserInterestNotFoundError()
      }

      const currentCount = tx
        .select({ value: count() })
        .from(userInterests)
        .where(eq(userInterests.userId, res.locals.payload.userId))
        .get()

      if ((currentCount?.value ?? 0) <= minUserInterests) {
        throw new MinUserInterestsError()
      }

      tx.delete(userInterests)
        .where(
          and(
            eq(userInterests.userId, res.locals.payload.userId),
            eq(userInterests.interestId, result.data.id)
          )
        )
        .run()
    })
  } catch (error) {
    if (error instanceof UserInterestNotFoundError) {
      return res.status(404).json({ message: "User interest not found" })
    }

    if (error instanceof MinUserInterestsError) {
      return res.status(400).json({
        message: `A user must keep at least ${minUserInterests} interests`,
      })
    }

    console.error(error)
    return res.status(500).json({ message: "Could not delete user interest" })
  }

  return res.status(204).send()
})

export default router
