import { and, eq, type SQL } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import z from "zod"
import { db } from "@/db/client"
import { photos, playerGroups, sessionStops } from "@/db/schema"
import { sendError, sendSuccess } from "@/lib/response"
import { isForeignKeyError } from "@/lib/sql-error"
import { requireAuth } from "@/middleware/auth"
import {
  PhotoCreateSchema,
  PhotoParamsSchema,
  PhotoQuerySchema,
  PhotoUpdateSchema,
} from "@pub-hopper/schemas"

const router = express.Router()

function sessionStopExists(sessionStopId: string): boolean {
  return Boolean(
    db.select({ id: sessionStops.id })
      .from(sessionStops)
      .where(eq(sessionStops.id, sessionStopId))
      .get()
  )
}

function playerGroupExists(groupId: string): boolean {
  return Boolean(
    db.select({ id: playerGroups.id })
      .from(playerGroups)
      .where(eq(playerGroups.id, groupId))
      .get()
  )
}

function hasProofSource(photoUrl: string | null | undefined, localUri: string | null | undefined): boolean {
  return Boolean(photoUrl || localUri)
}

function validateReferences(sessionStopId?: string, uploadedByGroupId?: string | null) {
  if (sessionStopId !== undefined && !sessionStopExists(sessionStopId)) {
    return "sessionStopId does not exist"
  }

  if (uploadedByGroupId !== undefined && uploadedByGroupId !== null && !playerGroupExists(uploadedByGroupId)) {
    return "uploadedByGroupId does not exist"
  }

  return null
}

router.get("/", (req, res) => {
  const parsed = PhotoQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid photo query",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const filters: SQL[] = []

  if (parsed.data.sessionStopId !== undefined) {
    filters.push(eq(photos.sessionStopId, parsed.data.sessionStopId))
  }

  if (parsed.data.uploadedByGroupId !== undefined) {
    filters.push(eq(photos.uploadedByGroupId, parsed.data.uploadedByGroupId))
  }

  const query = db.select().from(photos)
  const items = filters.length ? query.where(and(...filters)).all() : query.all()

  return sendSuccess(res, 200, { result: { photos: items } })
})

router.get<{ id: string }>("/:id", (req, res) => {
  const params = PhotoParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid photo params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const photo = db
    .select()
    .from(photos)
    .where(eq(photos.id, params.data.id))
    .get()

  if (!photo) {
    return sendError(res, 404, { message: "Photo not found" })
  }

  return sendSuccess(res, 200, { result: photo })
})

router.post("/", requireAuth, async (req, res) => {
  const parsed = PhotoCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid photo data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const referenceError = validateReferences(parsed.data.sessionStopId, parsed.data.uploadedByGroupId)
  if (referenceError) {
    return sendError(res, 400, { message: referenceError })
  }

  const photo = { id: uuidv4(), ...parsed.data }

  try {
    const [result] = await db.insert(photos).values(photo).returning()
    return sendSuccess(res, 201, { result })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "sessionStopId or uploadedByGroupId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not create photo" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const params = PhotoParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid photo params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existingPhoto = db
    .select()
    .from(photos)
    .where(eq(photos.id, params.data.id))
    .get()

  if (!existingPhoto) {
    return sendError(res, 404, { message: "Photo not found" })
  }

  const parsed = PhotoUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid photo data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  const referenceError = validateReferences(parsed.data.sessionStopId, parsed.data.uploadedByGroupId)
  if (referenceError) {
    return sendError(res, 400, { message: referenceError })
  }

  const nextPhotoUrl = Object.hasOwn(parsed.data, "photoUrl")
    ? parsed.data.photoUrl
    : existingPhoto.photoUrl
  const nextLocalUri = Object.hasOwn(parsed.data, "localUri")
    ? parsed.data.localUri
    : existingPhoto.localUri

  if (!hasProofSource(nextPhotoUrl, nextLocalUri)) {
    return sendError(res, 400, { message: "photoUrl or localUri is required" })
  }

  try {
    const [result] = await db
      .update(photos)
      .set(parsed.data)
      .where(eq(photos.id, params.data.id))
      .returning()

    return sendSuccess(res, 200, { result })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "sessionStopId or uploadedByGroupId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not update photo" })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const params = PhotoParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid photo params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existingPhoto = db
    .select()
    .from(photos)
    .where(eq(photos.id, params.data.id))
    .get()

  if (!existingPhoto) {
    return sendError(res, 404, { message: "Photo not found" })
  }

  try {
    db.delete(photos).where(eq(photos.id, params.data.id)).run()
    return sendSuccess(res, 204, { message: "Photo deleted successfully" })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not delete photo" })
  }
})

export default router
