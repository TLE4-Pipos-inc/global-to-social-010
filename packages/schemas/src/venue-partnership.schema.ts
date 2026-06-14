import z from "zod"

const BooleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true")
const OptionalTextSchema = z.string().trim().min(1).max(160).optional()
const NullableLongTextSchema = z.string().trim().min(1).max(500).nullable().optional()
const NullableDateTimeSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Must be a valid date/time")
  .nullable()
  .optional()

function validateDateOrder(
  data: { startsAt?: string | null; endsAt?: string | null },
  ctx: z.RefinementCtx
) {
  if (!data.startsAt || !data.endsAt) return

  if (Date.parse(data.endsAt) < Date.parse(data.startsAt)) {
    ctx.addIssue({
      code: "custom",
      message: "endsAt cannot be before startsAt",
      path: ["endsAt"],
    })
  }
}

export const VenuePartnershipCreateSchema = z
  .object({
    venueId: z.string().trim().min(1),
    partnerId: z.string().trim().min(1),
    dealTitle: z.string().trim().min(1).max(160),
    dealDescription: NullableLongTextSchema,
    startsAt: NullableDateTimeSchema,
    endsAt: NullableDateTimeSchema,
    active: z.boolean().optional(),
  })
  .superRefine(validateDateOrder)

export const VenuePartnershipUpdateSchema = z
  .object({
    venueId: z.string().trim().min(1).optional(),
    partnerId: z.string().trim().min(1).optional(),
    dealTitle: OptionalTextSchema,
    dealDescription: NullableLongTextSchema,
    startsAt: NullableDateTimeSchema,
    endsAt: NullableDateTimeSchema,
    active: z.boolean().optional(),
  })
  .superRefine(validateDateOrder)

export const VenuePartnershipParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const VenuePartnershipQuerySchema = z.object({
  venueId: z.string().trim().min(1).optional(),
  partnerId: z.string().trim().min(1).optional(),
  active: BooleanQuerySchema.optional(),
  currentlyActive: BooleanQuerySchema.optional(),
})

export type VenuePartnershipCreate = z.infer<typeof VenuePartnershipCreateSchema>
export type VenuePartnershipUpdate = z.infer<typeof VenuePartnershipUpdateSchema>
export type VenuePartnershipParams = z.infer<typeof VenuePartnershipParamsSchema>
export type VenuePartnershipQuery = z.infer<typeof VenuePartnershipQuerySchema>
