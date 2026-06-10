import z from "zod"

export const RouteStopCreateSchema = z.object({
  routeId: z.string().trim().min(1),
  venueId: z.string().trim().min(1),
  routeOrder: z.number().int().positive(),
  plannedDurationMinutes: z.number().int().positive().max(45).optional(),
  walkLabel: z.string().trim().min(1).max(120).optional(),
})

export const RouteStopUpdateSchema = RouteStopCreateSchema.partial()

export const RouteStopQuerySchema = z.object({
  routeId: z.string().trim().min(1).optional(),
  venueId: z.string().trim().min(1).optional(),
})

export type RouteStopCreate = z.infer<typeof RouteStopCreateSchema>
export type RouteStopUpdate = z.infer<typeof RouteStopUpdateSchema>
export type RouteStopQuery = z.infer<typeof RouteStopQuerySchema>
