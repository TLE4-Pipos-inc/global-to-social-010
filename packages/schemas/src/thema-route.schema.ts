import { z } from "zod"

const ThemaRouteIdSchema = z.string().trim().min(1)
const ThemaRouteBooleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true")

export const ThemaRouteParamsSchema = z.object({
  id: ThemaRouteIdSchema,
})

export const ThemaRouteQuerySchema = z.object({
  active: ThemaRouteBooleanQuerySchema.optional(),
})

export const ThemaRouteCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500).optional(),
  mood: z.string().trim().min(1).max(120).optional(),
  active: z.boolean().optional(),
})

export const ThemaRouteUpdateSchema = ThemaRouteCreateSchema.partial()

export type ThemaRouteParams = z.infer<typeof ThemaRouteParamsSchema>
export type ThemaRouteQuery = z.infer<typeof ThemaRouteQuerySchema>
export type ThemaRouteCreate = z.infer<typeof ThemaRouteCreateSchema>
export type ThemaRouteUpdate = z.infer<typeof ThemaRouteUpdateSchema>
