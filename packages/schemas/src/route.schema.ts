import z from "zod"

const BooleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true")

export const RouteCreateSchema = z.object({
  themeId: z.string().trim().min(1).nullable().optional(),
  name: z.string().trim().min(1).max(120),
  area: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120).optional(),
  routeType: z.string().trim().min(1).max(80).optional(),
  active: z.boolean().optional(),
})

export const RouteUpdateSchema = RouteCreateSchema.partial()

export const RouteQuerySchema = z.object({
  themeId: z.string().trim().min(1).optional(),
  active: BooleanQuerySchema.optional(),
})

export type RouteCreate = z.infer<typeof RouteCreateSchema>
export type RouteUpdate = z.infer<typeof RouteUpdateSchema>
export type RouteQuery = z.infer<typeof RouteQuerySchema>
