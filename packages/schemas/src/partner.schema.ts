import z from "zod"

const OptionalTextSchema = z.string().trim().min(1).max(120).optional()

export const PartnerCreateSchema = z.object({
  userId: z.string().trim().min(1).nullable().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  organizationName: z.string().trim().min(1).max(120),
  contactEmail: z.email("Invalid email address").trim().toLowerCase().nullable().optional(),
  partnershipType: z.string().trim().min(1).max(80),
  status: z.string().trim().min(1).max(40).optional(),
})

export const PartnerUpdateSchema = z.object({
  userId: z.string().trim().min(1).nullable().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128).optional(),
  organizationName: OptionalTextSchema,
  contactEmail: z.email("Invalid email address").trim().toLowerCase().nullable().optional(),
  partnershipType: z.string().trim().min(1).max(80).optional(),
  status: z.string().trim().min(1).max(40).optional(),
})

export const PartnerParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const PartnerQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  partnershipType: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
})

export type PartnerCreate = z.infer<typeof PartnerCreateSchema>
export type PartnerUpdate = z.infer<typeof PartnerUpdateSchema>
export type PartnerParams = z.infer<typeof PartnerParamsSchema>
export type PartnerQuery = z.infer<typeof PartnerQuerySchema>
