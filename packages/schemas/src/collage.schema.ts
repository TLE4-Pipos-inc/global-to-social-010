import z from "zod"

const OptionalTextSchema = z.string().trim().min(1).max(160).optional()
const NullableTextSchema = z.string().trim().min(1).max(160).nullable().optional()

export const CollageCreateSchema = z.object({
  sessionId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160),
  collageUrl: NullableTextSchema,
  layoutType: z.string().trim().min(1).max(80).optional(),
  shareToken: NullableTextSchema,
})

export const CollageUpdateSchema = z.object({
  title: OptionalTextSchema,
  collageUrl: NullableTextSchema,
  layoutType: z.string().trim().min(1).max(80).optional(),
  shareToken: NullableTextSchema,
})

export const CollageQuerySchema = z.object({
  sessionId: z.string().trim().min(1).optional(),
  shareToken: z.string().trim().min(1).optional(),
})

export const CollageParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export type CollageCreate = z.infer<typeof CollageCreateSchema>
export type CollageUpdate = z.infer<typeof CollageUpdateSchema>
export type CollageQuery = z.infer<typeof CollageQuerySchema>
export type CollageParams = z.infer<typeof CollageParamsSchema>
