import z from "zod"

const BooleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true")
const OptionalTitleSchema = z.string().trim().min(1).max(160).optional()
const NullableLongTextSchema = z.string().trim().min(1).max(500).nullable().optional()
const NullableDateTimeSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Must be a valid date/time")
  .nullable()
  .optional()

function validateDateOrder(
  data: { startsAt?: string | null | undefined; endsAt?: string | null | undefined },
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

export const DealCreateSchema = z
  .object({
    partnershipId: z.string().trim().min(1),
    title: z.string().trim().min(1).max(160),
    description: NullableLongTextSchema,
    startsAt: NullableDateTimeSchema,
    endsAt: NullableDateTimeSchema,
    active: z.boolean().optional(),
  })
  .superRefine(validateDateOrder)

export const DealUpdateSchema = z
  .object({
    title: OptionalTitleSchema,
    description: NullableLongTextSchema,
    startsAt: NullableDateTimeSchema,
    endsAt: NullableDateTimeSchema,
    active: z.boolean().optional(),
  })
  .superRefine(validateDateOrder)

export const DealParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const DealQuerySchema = z.object({
  partnershipId: z.string().trim().min(1).optional(),
  partnerId: z.string().trim().min(1).optional(),
  venueId: z.string().trim().min(1).optional(),
  active: BooleanQuerySchema.optional(),
  currentlyActive: BooleanQuerySchema.optional(),
})

export const DealResponseSchema = z.object({
  id: z.string(),
  partnershipId: z.string(),
  venueId: z.string(),
  partnerId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  active: z.boolean(),
})

export type DealCreate = z.infer<typeof DealCreateSchema>
export type DealUpdate = z.infer<typeof DealUpdateSchema>
export type DealParams = z.infer<typeof DealParamsSchema>
export type DealQuery = z.infer<typeof DealQuerySchema>
export type DealResponse = z.infer<typeof DealResponseSchema>
