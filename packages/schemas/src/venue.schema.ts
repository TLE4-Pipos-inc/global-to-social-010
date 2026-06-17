import z from "zod"

export const VenueCreateSchema = z.object({
  name: z.string().trim().min(1),
  venueType: z.string().trim().min(1),
  address: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  suggestedOrder: z.string().trim().min(1).optional(),
  vibe: z.string().trim().min(1).optional(),
})

export const VenueUpdateSchema = VenueCreateSchema.partial()

export const VenueResponseSchema = VenueCreateSchema.extend({
  id: z.string(),
})

export type VenueCreate = z.infer<typeof VenueCreateSchema>
export type VenueUpdate = z.infer<typeof VenueUpdateSchema>
export type VenueResponse = z.infer<typeof VenueResponseSchema>
