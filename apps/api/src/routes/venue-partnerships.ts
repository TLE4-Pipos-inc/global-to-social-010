import { and, eq, ne, type SQL } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import z from "zod"
import { db } from "@/db/client"
import { partners, venuePartnerships, venues } from "@/db/schema"
import { sendError, sendSuccess } from "@/lib/response"
import { isForeignKeyError } from "@/lib/sql-error"
import { requireAuth } from "@/middleware/auth"
import {
  VenuePartnershipCreateSchema,
  VenuePartnershipParamsSchema,
  VenuePartnershipQuerySchema,
  VenuePartnershipUpdateSchema,
} from "@pub-hopper/schemas"

const router = express.Router()

const venuePartnershipColumns = {
  id: venuePartnerships.id,
  venueId: venuePartnerships.venueId,
  partnerId: venuePartnerships.partnerId,
  dealTitle: venuePartnerships.dealTitle,
  dealDescription: venuePartnerships.dealDescription,
  startsAt: venuePartnerships.startsAt,
  endsAt: venuePartnerships.endsAt,
  active: venuePartnerships.active,
}

function venueExists(venueId: string): boolean {
  return Boolean(
    db.select({ id: venues.id })
      .from(venues)
      .where(eq(venues.id, venueId))
      .get()
  )
}

function partnerExists(partnerId: string): boolean {
  return Boolean(
    db.select({ id: partners.id })
      .from(partners)
      .where(eq(partners.id, partnerId))
      .get()
  )
}

function validateReferences(venueId?: string, partnerId?: string) {
  if (venueId !== undefined && !venueExists(venueId)) {
    return "venueId does not exist"
  }

  if (partnerId !== undefined && !partnerExists(partnerId)) {
    return "partnerId does not exist"
  }

  return null
}

function hasInvalidDateOrder(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  if (!startsAt || !endsAt) return false
  return Date.parse(endsAt) < Date.parse(startsAt)
}

function isCurrentlyActive(item: { active: boolean; startsAt: string | null; endsAt: string | null }) {
  const now = Date.now()
  return (
    item.active &&
    (!item.startsAt || Date.parse(item.startsAt) <= now) &&
    (!item.endsAt || Date.parse(item.endsAt) >= now)
  )
}

function duplicateDealExists(params: {
  venueId: string
  partnerId: string
  dealTitle: string
  excludeId?: string
}) {
  const filters: SQL[] = [
    eq(venuePartnerships.venueId, params.venueId),
    eq(venuePartnerships.partnerId, params.partnerId),
    eq(venuePartnerships.dealTitle, params.dealTitle),
  ]

  if (params.excludeId) {
    filters.push(ne(venuePartnerships.id, params.excludeId))
  }

  return db
    .select({ id: venuePartnerships.id })
    .from(venuePartnerships)
    .where(and(...filters))
    .get()
}

router.get("/", (req, res) => {
  const parsed = VenuePartnershipQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid venue partnership query",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const filters: SQL[] = []

  if (parsed.data.venueId !== undefined) {
    filters.push(eq(venuePartnerships.venueId, parsed.data.venueId))
  }

  if (parsed.data.partnerId !== undefined) {
    filters.push(eq(venuePartnerships.partnerId, parsed.data.partnerId))
  }

  if (parsed.data.active !== undefined) {
    filters.push(eq(venuePartnerships.active, parsed.data.active))
  }

  const query = db.select(venuePartnershipColumns).from(venuePartnerships)
  let items = filters.length ? query.where(and(...filters)).all() : query.all()

  if (parsed.data.currentlyActive === true) {
    items = items.filter(isCurrentlyActive)
  }

  return sendSuccess(res, 200, { result: { venuePartnerships: items } })
})

router.get<{ id: string }>("/:id", (req, res) => {
  const params = VenuePartnershipParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid venue partnership params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const item = db
    .select({
      id: venuePartnerships.id,
      dealTitle: venuePartnerships.dealTitle,
      dealDescription: venuePartnerships.dealDescription,
      startsAt: venuePartnerships.startsAt,
      endsAt: venuePartnerships.endsAt,
      active: venuePartnerships.active,
      venueId: venues.id,
      venueName: venues.name,
      venueAddress: venues.address,
      venueType: venues.venueType,
      partnerId: partners.id,
      partnerOrganizationName: partners.organizationName,
      partnerContactEmail: partners.contactEmail,
      partnerPartnershipType: partners.partnershipType,
      partnerStatus: partners.status,
    })
    .from(venuePartnerships)
    .innerJoin(venues, eq(venues.id, venuePartnerships.venueId))
    .innerJoin(partners, eq(partners.id, venuePartnerships.partnerId))
    .where(eq(venuePartnerships.id, params.data.id))
    .get()

  if (!item) {
    return sendError(res, 404, { message: "Venue partnership not found" })
  }

  return sendSuccess(res, 200, {
    result: {
      id: item.id,
      dealTitle: item.dealTitle,
      dealDescription: item.dealDescription,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      active: item.active,
      venue: {
        id: item.venueId,
        name: item.venueName,
        address: item.venueAddress,
        venueType: item.venueType,
      },
      partner: {
        id: item.partnerId,
        organizationName: item.partnerOrganizationName,
        contactEmail: item.partnerContactEmail,
        partnershipType: item.partnerPartnershipType,
        status: item.partnerStatus,
      },
    },
  })
})

router.post("/", requireAuth, async (req, res) => {
  const parsed = VenuePartnershipCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid venue partnership data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const referenceError = validateReferences(parsed.data.venueId, parsed.data.partnerId)
  if (referenceError) {
    return sendError(res, 400, { message: referenceError })
  }

  if (duplicateDealExists(parsed.data)) {
    return sendError(res, 409, { message: "Venue partnership already exists" })
  }

  try {
    const [result] = await db
      .insert(venuePartnerships)
      .values({ id: uuidv4(), ...parsed.data })
      .returning()

    return sendSuccess(res, 201, { result })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "venueId or partnerId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not create venue partnership" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const params = VenuePartnershipParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid venue partnership params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existingPartnership = db
    .select()
    .from(venuePartnerships)
    .where(eq(venuePartnerships.id, params.data.id))
    .get()

  if (!existingPartnership) {
    return sendError(res, 404, { message: "Venue partnership not found" })
  }

  const parsed = VenuePartnershipUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid venue partnership data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  const referenceError = validateReferences(parsed.data.venueId, parsed.data.partnerId)
  if (referenceError) {
    return sendError(res, 400, { message: referenceError })
  }

  const nextStartsAt = Object.hasOwn(parsed.data, "startsAt")
    ? parsed.data.startsAt
    : existingPartnership.startsAt
  const nextEndsAt = Object.hasOwn(parsed.data, "endsAt")
    ? parsed.data.endsAt
    : existingPartnership.endsAt

  if (hasInvalidDateOrder(nextStartsAt, nextEndsAt)) {
    return sendError(res, 400, { message: "endsAt cannot be before startsAt" })
  }

  const nextVenueId = parsed.data.venueId ?? existingPartnership.venueId
  const nextPartnerId = parsed.data.partnerId ?? existingPartnership.partnerId
  const nextDealTitle = parsed.data.dealTitle ?? existingPartnership.dealTitle

  if (
    duplicateDealExists({
      venueId: nextVenueId,
      partnerId: nextPartnerId,
      dealTitle: nextDealTitle,
      excludeId: params.data.id,
    })
  ) {
    return sendError(res, 409, { message: "Venue partnership already exists" })
  }

  try {
    const [result] = await db
      .update(venuePartnerships)
      .set(parsed.data)
      .where(eq(venuePartnerships.id, params.data.id))
      .returning()

    return sendSuccess(res, 200, { result })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "venueId or partnerId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not update venue partnership" })
  }
})

router.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const params = VenuePartnershipParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid venue partnership params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existingPartnership = db
    .select({ id: venuePartnerships.id })
    .from(venuePartnerships)
    .where(eq(venuePartnerships.id, params.data.id))
    .get()

  if (!existingPartnership) {
    return sendError(res, 404, { message: "Venue partnership not found" })
  }

  try {
    db.delete(venuePartnerships).where(eq(venuePartnerships.id, params.data.id)).run()
    return sendSuccess(res, 204, { message: "Venue partnership deleted successfully" })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not delete venue partnership" })
  }
})

export default router
