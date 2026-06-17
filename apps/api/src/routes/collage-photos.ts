import { and, asc, eq, ne, type SQL } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import z from "zod"
import { db } from "@/db/client"
import { collagePhotos, collages, photos } from "@/db/schema"
import { sendError, sendSuccess } from "@/lib/response"
import {
  isForeignKeyError,
  isUniqueCollagePhotoOrderError,
  isUniqueCollagePhotoPhotoError,
} from "@/lib/sql-error"
import { requireAuth } from "@/middleware/auth"
import {
  CollagePhotoCreateSchema,
  CollagePhotoParamsSchema,
  CollagePhotoQuerySchema,
  CollagePhotoUpdateSchema,
} from "@pub-hopper/schemas"

const router = express.Router()

function collageExists(collageId: string): boolean {
  return Boolean(
    db.select({ id: collages.id })
      .from(collages)
      .where(eq(collages.id, collageId))
      .get()
  )
}

function photoExists(photoId: string): boolean {
  return Boolean(
    db.select({ id: photos.id })
      .from(photos)
      .where(eq(photos.id, photoId))
      .get()
  )
}

function getCollagePhoto(id: string) {
  return db
    .select()
    .from(collagePhotos)
    .where(eq(collagePhotos.id, id))
    .get()
}

function getDisplayOrderConflict(collageId: string, displayOrder: number, excludeId?: string) {
  const filters: SQL[] = [
    eq(collagePhotos.collageId, collageId),
    eq(collagePhotos.displayOrder, displayOrder),
  ]

  if (excludeId) {
    filters.push(ne(collagePhotos.id, excludeId))
  }

  return db.select({ id: collagePhotos.id }).from(collagePhotos).where(and(...filters)).get()
}

function getPhotoConflict(collageId: string, photoId: string, excludeId?: string) {
  const filters: SQL[] = [
    eq(collagePhotos.collageId, collageId),
    eq(collagePhotos.photoId, photoId),
  ]

  if (excludeId) {
    filters.push(ne(collagePhotos.id, excludeId))
  }

  return db.select({ id: collagePhotos.id }).from(collagePhotos).where(and(...filters)).get()
}

function getCollagePhotoConflict(error: unknown): string | null {
  if (isUniqueCollagePhotoOrderError(error)) {
    return "displayOrder already exists for this collage"
  }

  if (isUniqueCollagePhotoPhotoError(error)) {
    return "photoId already exists for this collage"
  }

  return null
}

function getCollagePhotoWithPhoto(id: string) {
  const item = db
    .select({
      id: collagePhotos.id,
      collageId: collagePhotos.collageId,
      photoId: collagePhotos.photoId,
      displayOrder: collagePhotos.displayOrder,
      caption: collagePhotos.caption,
      photoSessionStopId: photos.sessionStopId,
      photoUploadedByGroupId: photos.uploadedByGroupId,
      photoUrl: photos.photoUrl,
      localUri: photos.localUri,
      proofType: photos.proofType,
      photoCreatedAt: photos.createdAt,
    })
    .from(collagePhotos)
    .innerJoin(photos, eq(collagePhotos.photoId, photos.id))
    .where(eq(collagePhotos.id, id))
    .get()

  if (!item) return null

  return {
    id: item.id,
    collageId: item.collageId,
    photoId: item.photoId,
    displayOrder: item.displayOrder,
    caption: item.caption,
    photo: {
      id: item.photoId,
      sessionStopId: item.photoSessionStopId,
      uploadedByGroupId: item.photoUploadedByGroupId,
      photoUrl: item.photoUrl,
      localUri: item.localUri,
      proofType: item.proofType,
      createdAt: item.photoCreatedAt,
    },
  }
}

router.get("/", (req, res) => {
  const parsed = CollagePhotoQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid collage photo query",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const filters: SQL[] = []

  if (parsed.data.collageId !== undefined) {
    filters.push(eq(collagePhotos.collageId, parsed.data.collageId))
  }

  if (parsed.data.photoId !== undefined) {
    filters.push(eq(collagePhotos.photoId, parsed.data.photoId))
  }

  const query = db.select().from(collagePhotos)
  const items = filters.length
    ? query.where(and(...filters)).orderBy(asc(collagePhotos.displayOrder)).all()
    : query.all()

  return sendSuccess(res, 200, { result: { collagePhotos: items } })
})

router.get<{ id: string }>("/:id", (req, res) => {
  const params = CollagePhotoParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid collage photo params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const item = getCollagePhotoWithPhoto(params.data.id)

  if (!item) {
    return sendError(res, 404, { message: "Collage photo not found" })
  }

  return sendSuccess(res, 200, { result: item })
})

router.post("/", requireAuth, async (req, res) => {
  const parsed = CollagePhotoCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid collage photo data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (!collageExists(parsed.data.collageId)) {
    return sendError(res, 404, { message: "collageId does not exist" })
  }

  if (!photoExists(parsed.data.photoId)) {
    return sendError(res, 404, { message: "photoId does not exist" })
  }

  if (getDisplayOrderConflict(parsed.data.collageId, parsed.data.displayOrder)) {
    return sendError(res, 409, { message: "displayOrder already exists for this collage" })
  }

  if (getPhotoConflict(parsed.data.collageId, parsed.data.photoId)) {
    return sendError(res, 409, { message: "photoId already exists for this collage" })
  }

  try {
    const [result] = await db
      .insert(collagePhotos)
      .values({ id: uuidv4(), ...parsed.data })
      .returning()

    return sendSuccess(res, 201, { result })
  } catch (error) {
    const conflict = getCollagePhotoConflict(error)
    if (conflict) {
      return sendError(res, 409, { message: conflict })
    }

    if (isForeignKeyError(error)) {
      return sendError(res, 404, { message: "collageId or photoId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not create collage photo" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const params = CollagePhotoParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid collage photo params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existingCollagePhoto = getCollagePhoto(params.data.id)

  if (!existingCollagePhoto) {
    return sendError(res, 404, { message: "Collage photo not found" })
  }

  const parsed = CollagePhotoUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid collage photo data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  if (
    parsed.data.displayOrder !== undefined &&
    getDisplayOrderConflict(existingCollagePhoto.collageId, parsed.data.displayOrder, params.data.id)
  ) {
    return sendError(res, 409, { message: "displayOrder already exists for this collage" })
  }

  try {
    const [result] = await db
      .update(collagePhotos)
      .set(parsed.data)
      .where(eq(collagePhotos.id, params.data.id))
      .returning()

    return sendSuccess(res, 200, { result })
  } catch (error) {
    const conflict = getCollagePhotoConflict(error)
    if (conflict) {
      return sendError(res, 409, { message: conflict })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not update collage photo" })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const params = CollagePhotoParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid collage photo params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existingCollagePhoto = getCollagePhoto(params.data.id)

  if (!existingCollagePhoto) {
    return sendError(res, 404, { message: "Collage photo not found" })
  }

  try {
    db.delete(collagePhotos).where(eq(collagePhotos.id, params.data.id)).run()
    return sendSuccess(res, 204, { message: "Collage photo deleted successfully" })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not delete collage photo" })
  }
})

export default router
