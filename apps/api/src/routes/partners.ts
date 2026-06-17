import { and, eq, ne, type SQL } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import z from "zod"
import { db } from "@/db/client"
import { partners, users, venuePartnerships } from "@/db/schema"
import { sendError, sendSuccess } from "@/lib/response"
import { isForeignKeyError, isUniquePartnerUserError } from "@/lib/sql-error"
import { requireAuth } from "@/middleware/auth"
import {
  PartnerCreateSchema,
  PartnerParamsSchema,
  PartnerQuerySchema,
  PartnerUpdateSchema,
} from "@pub-hopper/schemas"

const router = express.Router()

const safePartnerColumns = {
  id: partners.id,
  userId: partners.userId,
  organizationName: partners.organizationName,
  contactEmail: partners.contactEmail,
  partnershipType: partners.partnershipType,
  status: partners.status,
  createdAt: partners.createdAt,
}

function userExists(userId: string): boolean {
  return Boolean(
    db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .get()
  )
}

function getPartnerByUserId(userId: string, excludePartnerId?: string) {
  const filters: SQL[] = [eq(partners.userId, userId)]

  if (excludePartnerId) {
    filters.push(ne(partners.id, excludePartnerId))
  }

  return db
    .select({ id: partners.id })
    .from(partners)
    .where(and(...filters))
    .get()
}

function validatePartnerUser(userId: string | null | undefined, excludePartnerId?: string) {
  if (userId === undefined || userId === null) return null

  if (!userExists(userId)) {
    return { statusCode: 400, message: "userId does not exist" }
  }

  if (getPartnerByUserId(userId, excludePartnerId)) {
    return { statusCode: 409, message: "User already has a partner profile" }
  }

  return null
}

router.get("/", (req, res) => {
  const parsed = PartnerQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid partner query",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const filters: SQL[] = []

  if (parsed.data.userId !== undefined) {
    filters.push(eq(partners.userId, parsed.data.userId))
  }

  if (parsed.data.status !== undefined) {
    filters.push(eq(partners.status, parsed.data.status))
  }

  if (parsed.data.partnershipType !== undefined) {
    filters.push(eq(partners.partnershipType, parsed.data.partnershipType))
  }

  const query = db.select(safePartnerColumns).from(partners)
  const items = filters.length ? query.where(and(...filters)).all() : query.all()

  return sendSuccess(res, 200, { result: { partners: items } })
})

router.get<{ id: string }>("/:id", (req, res) => {
  const params = PartnerParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid partner params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const partner = db
    .select(safePartnerColumns)
    .from(partners)
    .where(eq(partners.id, params.data.id))
    .get()

  if (!partner) {
    return sendError(res, 404, { message: "Partner not found" })
  }

  const partnerships = db
    .select({
      id: venuePartnerships.id,
      venueId: venuePartnerships.venueId,
      partnerId: venuePartnerships.partnerId,
    })
    .from(venuePartnerships)
    .where(eq(venuePartnerships.partnerId, params.data.id))
    .all()

  return sendSuccess(res, 200, { result: { partner, venuePartnerships: partnerships } })
})

router.post("/", requireAuth, async (req, res) => {
  const parsed = PartnerCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid partner data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const userError = validatePartnerUser(parsed.data.userId)
  if (userError) {
    return sendError(res, userError.statusCode, { message: userError.message })
  }

  try {
    const [result] = await db
      .insert(partners)
      .values({
        id: uuidv4(),
        ...parsed.data,
      })
      .returning(safePartnerColumns)

    return sendSuccess(res, 201, { result })
  } catch (error) {
    if (isUniquePartnerUserError(error)) {
      return sendError(res, 409, { message: "User already has a partner profile" })
    }

    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "userId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not create partner" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const params = PartnerParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid partner params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existingPartner = db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.id, params.data.id))
    .get()

  if (!existingPartner) {
    return sendError(res, 404, { message: "Partner not found" })
  }

  const parsed = PartnerUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid partner data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  const userError = validatePartnerUser(parsed.data.userId, params.data.id)
  if (userError) {
    return sendError(res, userError.statusCode, { message: userError.message })
  }

  try {
    const [result] = await db
      .update(partners)
      .set(parsed.data)
      .where(eq(partners.id, params.data.id))
      .returning(safePartnerColumns)

    return sendSuccess(res, 200, { result })
  } catch (error) {
    if (isUniquePartnerUserError(error)) {
      return sendError(res, 409, { message: "User already has a partner profile" })
    }

    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "userId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not update partner" })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const params = PartnerParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid partner params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existingPartner = db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.id, params.data.id))
    .get()

  if (!existingPartner) {
    return sendError(res, 404, { message: "Partner not found" })
  }

  try {
    db.delete(partners).where(eq(partners.id, params.data.id)).run()
    return sendSuccess(res, 204, { message: "Partner deleted successfully" })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not delete partner" })
  }
})

export default router
