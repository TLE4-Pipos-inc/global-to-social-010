import z from "zod"

export const VenuePartnershipCreateSchema = z.object({
  venueId: z.string().trim().min(1),
  partnerId: z.string().trim().min(1),
})

export const VenuePartnershipResponseSchema = z.object({
  id: z.string(),
  venueId: z.string(),
  partnerId: z.string(),
})

export const VenuePartnershipParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const VenuePartnershipQuerySchema = z.object({
  venueId: z.string().trim().min(1).optional(),
  partnerId: z.string().trim().min(1).optional(),
})

export type VenuePartnershipCreate = z.infer<typeof VenuePartnershipCreateSchema>
export type VenuePartnershipResponse = z.infer<typeof VenuePartnershipResponseSchema>
export type VenuePartnershipParams = z.infer<typeof VenuePartnershipParamsSchema>
export type VenuePartnershipQuery = z.infer<typeof VenuePartnershipQuerySchema>
