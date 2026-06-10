import { and, count, eq } from "drizzle-orm"
import express from "express"
import {
  UserInterestBulkUpdateSchema,
  UserInterestCreateSchema,
  UserInterestParamsSchema,
  UserInterestQuerySchema,
  UserInterestUpdateSchema,
} from "@pub-hopper/schemas"
import { db } from "@/db/client"
import { interests, userInterests } from "@/db/schema"
import { requireAuth } from "@/middleware/auth"
import z from "zod"
import { isForeignKeyError } from "@/lib/sql-error"
import { sendSuccess, sendError } from "@/lib/response"

const router = express.Router()

const minUserInterests = 3
const maxUserInterests = 5

class MaxUserInterestsError extends Error {}
class MinUserInterestsError extends Error {}
class UserInterestNotFoundError extends Error {}


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
    return sendError(res, 400, {
      message: "Invalid user interest query",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  const userId = res.locals.userId
  const filters = [eq(userInterests.userId, userId)]

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

  return sendSuccess(res, 200, { result: items })
})

router.get("/:id", requireAuth, (req, res) => {
  const result = UserInterestParamsSchema.safeParse(req.params)

  if (!result.success) {
    return sendError(res, 400, {
      message: "Invalid user interest parameters",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  const item = getUserInterest(res.locals.userId, result.data.id)

  if (!item) {
    return sendError(res, 404, { message: "User interest not found" })
  }

  return sendSuccess(res, 200, { result: item })
})

router.post("/", requireAuth, (req, res) => {
  const result = UserInterestCreateSchema.safeParse(req.body)

  if (!result.success) {
    return sendError(res, 400, {
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
        .where(eq(userInterests.userId, res.locals.userId))
        .get()

      if ((currentCount?.value ?? 0) + interestIds.length > maxUserInterests) {
        throw new MaxUserInterestsError()
      }

      for (const interestId of interestIds) {
        tx.insert(userInterests)
          .values({
            userId: res.locals.userId,
            interestId,
          })
          .run()
      }
    })
  } catch (error) {
    if (error instanceof MaxUserInterestsError) {
      return sendError(res, 400, {
        message: `A user can select a maximum of ${maxUserInterests} interests`,
      })
    }

    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "interestId does not exist" })
    }

    if (isUniqueError(error)) {
      return sendError(res, 409, { message: "User interest already exists" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not create user interest" })
  }

  const createdUserInterests = getUserInterestsByIds(
    res.locals.userId,
    interestIds
  )

  return sendSuccess(res, 201, { result: createdUserInterests })
})

router.patch("/", requireAuth, (req, res) => {
  const result = UserInterestBulkUpdateSchema.safeParse(req.body)

  if (!result.success) {
    return sendError(res, 400, {
      message: "Invalid user interest data",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  const { interestIds } = result.data

  try {
    db.transaction((tx) => {
      tx.delete(userInterests)
        .where(eq(userInterests.userId, res.locals.userId))
        .run()

      for (const interestId of interestIds) {
        tx.insert(userInterests)
          .values({
            userId: res.locals.userId,
            interestId,
          })
          .run()
      }
    })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "interestId does not exist" })
    }

    if (isUniqueError(error)) {
      return sendError(res, 409, { message: "User interest already exists" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not update user interests" })
  }

  return sendSuccess(res, 200, {
    result: getUserInterestsByIds(res.locals.userId, interestIds),
  })
})

router.patch("/:id", requireAuth, (req, res) => {
  const paramsResult = UserInterestParamsSchema.safeParse(req.params)

  if (!paramsResult.success) {
    return sendError(res, 400, {
      message: "Invalid user interest parameters",
      errors: z.flattenError(paramsResult.error).fieldErrors,
    })
  }

  const bodyResult = UserInterestUpdateSchema.safeParse(req.body)

  if (!bodyResult.success) {
    return sendError(res, 400, {
      message: "Invalid user interest data",
      errors: z.flattenError(bodyResult.error).fieldErrors,
    })
  }

  if (paramsResult.data.id === bodyResult.data.interestId) {
    const existing = getUserInterest(
      res.locals.userId,
      paramsResult.data.id
    )

    if (!existing) {
      return sendError(res, 404, { message: "User interest not found" })
    }

    return sendSuccess(res, 200, { result: existing })
  }

  try {
    db.transaction((tx) => {
      const deleteResult = tx
        .delete(userInterests)
        .where(
          and(
            eq(userInterests.userId, res.locals.userId),
            eq(userInterests.interestId, paramsResult.data.id)
          )
        )
        .run()

      if (getRowsChanged(deleteResult) === 0) {
        throw new UserInterestNotFoundError()
      }

      tx.insert(userInterests)
        .values({
          userId: res.locals.userId,
          interestId: bodyResult.data.interestId,
        })
        .run()
    })
  } catch (error) {
    if (error instanceof UserInterestNotFoundError) {
      return sendError(res, 404, { message: "User interest not found" })
    }

    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "interestId does not exist" })
    }

    if (isUniqueError(error)) {
      return sendError(res, 409, { message: "User interest already exists" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not update user interest" })
  }

  return sendSuccess(res, 200, {
    result: getUserInterest(res.locals.userId, bodyResult.data.interestId),
  })
})

router.delete("/:id", requireAuth, (req, res) => {
  const result = UserInterestParamsSchema.safeParse(req.params)

  if (!result.success) {
    return sendError(res, 400, {
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
            eq(userInterests.userId, res.locals.userId),
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
        .where(eq(userInterests.userId, res.locals.userId))
        .get()

      if ((currentCount?.value ?? 0) <= minUserInterests) {
        throw new MinUserInterestsError()
      }

      tx.delete(userInterests)
        .where(
          and(
            eq(userInterests.userId, res.locals.userId),
            eq(userInterests.interestId, result.data.id)
          )
        )
        .run()
    })
  } catch (error) {
    if (error instanceof UserInterestNotFoundError) {
      return sendError(res, 404, { message: "User interest not found" })
    }

    if (error instanceof MinUserInterestsError) {
      return sendError(res, 400, {
        message: `A user must keep at least ${minUserInterests} interests`,
      })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not delete user interest" })
  }

  return sendSuccess(res, 204, {})
})

export default router
