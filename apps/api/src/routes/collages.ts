import { and, asc, eq, ne, type SQL } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import z from "zod"
import { db } from "@/db/client"
import { collagePhotos, collages, gameSessions, photos } from "@/db/schema"
import { sendError, sendSuccess } from "@/lib/response"
import {
  isForeignKeyError,
  isUniqueCollageSessionError,
  isUniqueCollageShareTokenError,
} from "@/lib/sql-error"
import { requireAuth } from "@/middleware/auth"
import {
  CollageCreateSchema,
  CollageParamsSchema,
  CollageQuerySchema,
  CollageUpdateSchema,
} from "@pub-hopper/schemas"

const router = express.Router()

function gameSessionExists(sessionId: string): boolean {
  return Boolean(
    db.select({ id: gameSessions.id })
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .get()
  )
}

function getCollageBySessionId(sessionId: string, excludeCollageId?: string) {
  const filters: SQL[] = [eq(collages.sessionId, sessionId)]

  if (excludeCollageId) {
    filters.push(ne(collages.id, excludeCollageId))
  }

  return db.select({ id: collages.id }).from(collages).where(and(...filters)).get()
}

function getCollageByShareToken(shareToken: string, excludeCollageId?: string) {
  const filters: SQL[] = [eq(collages.shareToken, shareToken)]

  if (excludeCollageId) {
    filters.push(ne(collages.id, excludeCollageId))
  }

  return db.select({ id: collages.id }).from(collages).where(and(...filters)).get()
}

function getCollagePhotos(collageId: string) {
  return db
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
    .where(eq(collagePhotos.collageId, collageId))
    .orderBy(asc(collagePhotos.displayOrder))
    .all()
    .map((item) => ({
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
    }))
}

function getCollageConflict(error: unknown): string | null {
  if (isUniqueCollageSessionError(error)) {
    return "Session already has a collage"
  }

  if (isUniqueCollageShareTokenError(error)) {
    return "shareToken already exists"
  }

  return null
}

router.get("/", (req, res) => {
  const parsed = CollageQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid collage query",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const filters: SQL[] = []

  if (parsed.data.sessionId !== undefined) {
    filters.push(eq(collages.sessionId, parsed.data.sessionId))
  }

  if (parsed.data.shareToken !== undefined) {
    filters.push(eq(collages.shareToken, parsed.data.shareToken))
  }

  const query = db.select().from(collages)
  const items = filters.length ? query.where(and(...filters)).all() : query.all()

  return sendSuccess(res, 200, { result: { collages: items } })
})

router.get<{ id: string }>("/:id", (req, res) => {
  const params = CollageParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid collage params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const collage = db
    .select()
    .from(collages)
    .where(eq(collages.id, params.data.id))
    .get()

  if (!collage) {
    return sendError(res, 404, { message: "Collage not found" })
  }

  return sendSuccess(res, 200, {
    result: { collage, photos: getCollagePhotos(params.data.id) },
  })
})

router.post("/", requireAuth, async (req, res) => {
  const parsed = CollageCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid collage data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (!gameSessionExists(parsed.data.sessionId)) {
    return sendError(res, 404, { message: "sessionId does not exist" })
  }

  if (getCollageBySessionId(parsed.data.sessionId)) {
    return sendError(res, 409, { message: "Session already has a collage" })
  }

  if (parsed.data.shareToken && getCollageByShareToken(parsed.data.shareToken)) {
    return sendError(res, 409, { message: "shareToken already exists" })
  }

  try {
    const [result] = await db
      .insert(collages)
      .values({ id: uuidv4(), ...parsed.data })
      .returning()

    return sendSuccess(res, 201, { result })
  } catch (error) {
    const conflict = getCollageConflict(error)
    if (conflict) {
      return sendError(res, 409, { message: conflict })
    }

    if (isForeignKeyError(error)) {
      return sendError(res, 404, { message: "sessionId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not create collage" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const params = CollageParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid collage params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existingCollage = db
    .select()
    .from(collages)
    .where(eq(collages.id, params.data.id))
    .get()

  if (!existingCollage) {
    return sendError(res, 404, { message: "Collage not found" })
  }

  const parsed = CollageUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid collage data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  if (
    parsed.data.shareToken !== undefined &&
    parsed.data.shareToken !== null &&
    getCollageByShareToken(parsed.data.shareToken, params.data.id)
  ) {
    return sendError(res, 409, { message: "shareToken already exists" })
  }

  try {
    const [result] = await db
      .update(collages)
      .set(parsed.data)
      .where(eq(collages.id, params.data.id))
      .returning()

    return sendSuccess(res, 200, { result })
  } catch (error) {
    const conflict = getCollageConflict(error)
    if (conflict) {
      return sendError(res, 409, { message: conflict })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not update collage" })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const params = CollageParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid collage params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existingCollage = db
    .select({ id: collages.id })
    .from(collages)
    .where(eq(collages.id, params.data.id))
    .get()

  if (!existingCollage) {
    return sendError(res, 404, { message: "Collage not found" })
  }

  try {
    db.delete(collages).where(eq(collages.id, params.data.id)).run()
    return sendSuccess(res, 204, { message: "Collage deleted successfully" })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not delete collage" })
  }
})

export default router
