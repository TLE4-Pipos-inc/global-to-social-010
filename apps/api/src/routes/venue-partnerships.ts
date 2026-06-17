import { and, eq, type SQL } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import z from "zod"
import { db } from "@/db/client"
import { deals, partners, venuePartnerships, venues } from "@/db/schema"
import { sendError, sendSuccess } from "@/lib/response"
import {
  isForeignKeyError,
  isUniqueVenuePartnershipError,
} from "@/lib/sql-error"
import { requireAuth } from "@/middleware/auth"
import {
  DealCreateSchema,
  DealParamsSchema,
  DealQuerySchema,
  DealUpdateSchema,
  VenuePartnershipCreateSchema,
  VenuePartnershipParamsSchema,
  VenuePartnershipQuerySchema,
} from "@pub-hopper/schemas"

const router = express.Router()

const venuePartnershipColumns = {
  id: venuePartnerships.id,
  venueId: venuePartnerships.venueId,
  partnerId: venuePartnerships.partnerId,
}

function venueExists(venueId: string): boolean {
  return Boolean(
    db.select({ id: venues.id }).from(venues).where(eq(venues.id, venueId)).get()
  )
}

function partnerExists(partnerId: string): boolean {
  return Boolean(
    db.select({ id: partners.id }).from(partners).where(eq(partners.id, partnerId)).get()
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

// --- Partnerships (pure partner <-> venue link) ---

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

  const query = db.select(venuePartnershipColumns).from(venuePartnerships)
  const items = filters.length ? query.where(and(...filters)).all() : query.all()

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

  try {
    const [result] = await db
      .insert(venuePartnerships)
      .values({ id: uuidv4(), ...parsed.data })
      .returning(venuePartnershipColumns)

    return sendSuccess(res, 201, { result })
  } catch (error) {
    if (isUniqueVenuePartnershipError(error)) {
      return sendError(res, 409, { message: "Venue partnership already exists" })
    }

    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "venueId or partnerId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not create venue partnership" })
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

  const existing = db
    .select({ id: venuePartnerships.id })
    .from(venuePartnerships)
    .where(eq(venuePartnerships.id, params.data.id))
    .get()

  if (!existing) {
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

// --- Deals (belong to a partnership; many per partnership) ---

const dealsRouter = express.Router()

const dealColumns = {
  id: deals.id,
  partnershipId: deals.partnershipId,
  venueId: venuePartnerships.venueId,
  partnerId: venuePartnerships.partnerId,
  title: deals.title,
  description: deals.description,
  startsAt: deals.startsAt,
  endsAt: deals.endsAt,
  active: deals.active,
}

function partnershipExists(partnershipId: string): boolean {
  return Boolean(
    db
      .select({ id: venuePartnerships.id })
      .from(venuePartnerships)
      .where(eq(venuePartnerships.id, partnershipId))
      .get()
  )
}

function isCurrentlyActive(item: { active: boolean; startsAt: string | null; endsAt: string | null }) {
  const now = Date.now()
  return (
    item.active &&
    (!item.startsAt || Date.parse(item.startsAt) <= now) &&
    (!item.endsAt || Date.parse(item.endsAt) >= now)
  )
}

dealsRouter.get("/", (req, res) => {
  const parsed = DealQuerySchema.safeParse(req.query)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid deal query",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  const filters: SQL[] = []

  if (parsed.data.partnershipId !== undefined) {
    filters.push(eq(deals.partnershipId, parsed.data.partnershipId))
  }

  if (parsed.data.partnerId !== undefined) {
    filters.push(eq(venuePartnerships.partnerId, parsed.data.partnerId))
  }

  if (parsed.data.venueId !== undefined) {
    filters.push(eq(venuePartnerships.venueId, parsed.data.venueId))
  }

  if (parsed.data.active !== undefined) {
    filters.push(eq(deals.active, parsed.data.active))
  }

  const query = db
    .select(dealColumns)
    .from(deals)
    .innerJoin(venuePartnerships, eq(venuePartnerships.id, deals.partnershipId))

  let items = filters.length ? query.where(and(...filters)).all() : query.all()

  if (parsed.data.currentlyActive === true) {
    items = items.filter(isCurrentlyActive)
  }

  return sendSuccess(res, 200, { result: { deals: items } })
})

dealsRouter.get<{ id: string }>("/:id", (req, res) => {
  const params = DealParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid deal params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const item = db
    .select(dealColumns)
    .from(deals)
    .innerJoin(venuePartnerships, eq(venuePartnerships.id, deals.partnershipId))
    .where(eq(deals.id, params.data.id))
    .get()

  if (!item) {
    return sendError(res, 404, { message: "Deal not found" })
  }

  return sendSuccess(res, 200, { result: item })
})

dealsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = DealCreateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid deal data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (!partnershipExists(parsed.data.partnershipId)) {
    return sendError(res, 400, { message: "partnershipId does not exist" })
  }

  try {
    const [created] = await db
      .insert(deals)
      .values({ id: uuidv4(), ...parsed.data })
      .returning({ id: deals.id })

    const result = db
      .select(dealColumns)
      .from(deals)
      .innerJoin(venuePartnerships, eq(venuePartnerships.id, deals.partnershipId))
      .where(eq(deals.id, created.id))
      .get()

    return sendSuccess(res, 201, { result })
  } catch (error) {
    if (isForeignKeyError(error)) {
      return sendError(res, 400, { message: "partnershipId does not exist" })
    }

    console.error(error)
    return sendError(res, 500, { message: "Could not create deal" })
  }
})

dealsRouter.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const params = DealParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid deal params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existing = db
    .select()
    .from(deals)
    .where(eq(deals.id, params.data.id))
    .get()

  if (!existing) {
    return sendError(res, 404, { message: "Deal not found" })
  }

  const parsed = DealUpdateSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid deal data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  try {
    await db
      .update(deals)
      .set(parsed.data)
      .where(eq(deals.id, params.data.id))
      .run()

    const result = db
      .select(dealColumns)
      .from(deals)
      .innerJoin(venuePartnerships, eq(venuePartnerships.id, deals.partnershipId))
      .where(eq(deals.id, params.data.id))
      .get()

    return sendSuccess(res, 200, { result })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not update deal" })
  }
})

dealsRouter.delete<{ id: string }>("/:id", requireAuth, (req, res) => {
  const params = DealParamsSchema.safeParse(req.params)

  if (!params.success) {
    return sendError(res, 400, {
      message: "Invalid deal params",
      errors: z.flattenError(params.error).fieldErrors,
    })
  }

  const existing = db
    .select({ id: deals.id })
    .from(deals)
    .where(eq(deals.id, params.data.id))
    .get()

  if (!existing) {
    return sendError(res, 404, { message: "Deal not found" })
  }

  try {
    db.delete(deals).where(eq(deals.id, params.data.id)).run()
    return sendSuccess(res, 204, { message: "Deal deleted successfully" })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not delete deal" })
  }
})

export { dealsRouter }
export default router
