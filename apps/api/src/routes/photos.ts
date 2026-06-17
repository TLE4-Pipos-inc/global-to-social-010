import { and, eq, type SQL } from "drizzle-orm"
import express from "express"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
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
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const photoUploadDir = path.resolve(__dirname, "../../uploads/photos")
const maxPhotoBytes = 5 * 1024 * 1024
const allowedMimeTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
])

type StoredPhoto = {
  localUri: string
  photoUrl: string
}

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

function parseImageBase64(value: string, fallbackMimeType?: string | null) {
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/u.exec(value)
  const mimeType = dataUrlMatch?.[1] ?? fallbackMimeType ?? "image/jpeg"
  const base64 = dataUrlMatch?.[2] ?? value
  const extension = allowedMimeTypes.get(mimeType)

  if (!extension) {
    throw new Error("Unsupported image type")
  }

  const buffer = Buffer.from(base64, "base64")

  if (buffer.length === 0) {
    throw new Error("Image data is empty")
  }

  if (buffer.length > maxPhotoBytes) {
    throw new Error("Image is too large")
  }

  return { buffer, extension, mimeType }
}

function sanitizeBaseName(value?: string | null): string {
  const parsedName = value ? path.parse(value).name : "photo"
  const safeName = parsedName.replace(/[^a-zA-Z0-9-]/gu, "-").replace(/-+/gu, "-")
  return safeName || "photo"
}

async function storePhotoFile(
  photoId: string,
  imageBase64: string,
  fileName?: string | null,
  mimeType?: string | null
): Promise<StoredPhoto> {
  const parsed = parseImageBase64(imageBase64, mimeType)
  const safeName = sanitizeBaseName(fileName)
  const storedFileName = `${photoId}-${uuidv4()}-${safeName}.${parsed.extension}`
  const localUri = path.join(photoUploadDir, storedFileName)

  await fs.mkdir(photoUploadDir, { recursive: true })
  await fs.writeFile(localUri, parsed.buffer)

  return {
    localUri,
    photoUrl: `/api/photos/${photoId}/file`,
  }
}

function isStoredPhotoPath(value: string | null | undefined): value is string {
  if (!value) return false

  const resolvedPath = path.resolve(value)
  return resolvedPath.startsWith(`${photoUploadDir}${path.sep}`)
}

async function removeStoredPhotoFile(value: string | null | undefined) {
  if (!isStoredPhotoPath(value)) return

  try {
    await fs.unlink(value)
  } catch (error) {
    const code = (error as Record<string, unknown> | null | undefined)?.code
    if (code !== "ENOENT") {
      console.error(error)
    }
  }
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

router.get<{ id: string }>("/:id/file", async (req, res) => {
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

  if (!isStoredPhotoPath(photo.localUri)) {
    return sendError(res, 404, { message: "Stored photo file not found" })
  }

  return res.sendFile(path.resolve(photo.localUri))
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

  const photoId = uuidv4()
  const { imageBase64, fileName, mimeType, ...photoData } = parsed.data
  let storedPhoto: StoredPhoto | null = null

  try {
    if (imageBase64) {
      storedPhoto = await storePhotoFile(photoId, imageBase64, fileName, mimeType)
    }

    const photo = {
      id: photoId,
      ...photoData,
      ...(storedPhoto ?? {}),
    }

    const [result] = await db.insert(photos).values(photo).returning()
    return sendSuccess(res, 201, { result })
  } catch (error) {
    await removeStoredPhotoFile(storedPhoto?.localUri)

    if (error instanceof Error && ["Unsupported image type", "Image data is empty", "Image is too large"].includes(error.message)) {
      return sendError(res, 400, { message: error.message })
    }

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

  const { imageBase64, fileName, mimeType, ...photoData } = parsed.data
  const referenceError = validateReferences(photoData.sessionStopId, photoData.uploadedByGroupId)
  if (referenceError) {
    return sendError(res, 400, { message: referenceError })
  }

  let storedPhoto: StoredPhoto | null = null

  try {
    if (imageBase64) {
      storedPhoto = await storePhotoFile(params.data.id, imageBase64, fileName, mimeType)
    }
  } catch (error) {
    if (error instanceof Error && ["Unsupported image type", "Image data is empty", "Image is too large"].includes(error.message)) {
      return sendError(res, 400, { message: error.message })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not store photo file" })
  }

  const updateData = {
    ...photoData,
    ...(storedPhoto ?? {}),
  }

  if (Object.keys(updateData).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  const nextPhotoUrl = Object.hasOwn(updateData, "photoUrl")
    ? updateData.photoUrl
    : existingPhoto.photoUrl
  const nextLocalUri = Object.hasOwn(updateData, "localUri")
    ? updateData.localUri
    : existingPhoto.localUri

  if (!hasProofSource(nextPhotoUrl, nextLocalUri)) {
    if (storedPhoto?.localUri !== existingPhoto.localUri) {
      await removeStoredPhotoFile(storedPhoto?.localUri)
    }
    return sendError(res, 400, { message: "photoUrl or localUri is required" })
  }

  try {
    const [result] = await db
      .update(photos)
      .set(updateData)
      .where(eq(photos.id, params.data.id))
      .returning()

    if (storedPhoto && storedPhoto.localUri !== existingPhoto.localUri) {
      await removeStoredPhotoFile(existingPhoto.localUri)
    }

    return sendSuccess(res, 200, { result })
  } catch (error) {
    if (storedPhoto?.localUri !== existingPhoto.localUri) {
      await removeStoredPhotoFile(storedPhoto?.localUri)
    }

    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "sessionStopId or uploadedByGroupId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not update photo" })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, async (req, res) => {
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
    await removeStoredPhotoFile(existingPhoto.localUri)
    return sendSuccess(res, 204, { message: "Photo deleted successfully" })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not delete photo" })
  }
})

export default router
