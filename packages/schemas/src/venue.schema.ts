import z from "zod"

export const VenueParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const VenueCreateSchema = z.object({
  name: z.string().trim().min(1),
  venueType: z.string().trim().min(1),
  address: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  suggestedOrder: z.string().trim().min(1).optional(),
  vibe: z.string().trim().min(1).optional(),
})

export const VenueUpdateSchema = VenueCreateSchema.partial()

export type VenueParams = z.infer<typeof VenueParamsSchema>
export type VenueCreate = z.infer<typeof VenueCreateSchema>
export type VenueUpdate = z.infer<typeof VenueUpdateSchema>
