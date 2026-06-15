import z from "zod"

const NullableCaptionSchema = z.string().trim().min(1).max(240).nullable().optional()

export const CollagePhotoCreateSchema = z.object({
  collageId: z.string().trim().min(1),
  photoId: z.string().trim().min(1),
  displayOrder: z.number().int().positive(),
  caption: NullableCaptionSchema,
})

export const CollagePhotoUpdateSchema = z.object({
  displayOrder: z.number().int().positive().optional(),
  caption: NullableCaptionSchema,
})

export const CollagePhotoQuerySchema = z.object({
  collageId: z.string().trim().min(1).optional(),
  photoId: z.string().trim().min(1).optional(),
})

export const CollagePhotoParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export type CollagePhotoCreate = z.infer<typeof CollagePhotoCreateSchema>
export type CollagePhotoUpdate = z.infer<typeof CollagePhotoUpdateSchema>
export type CollagePhotoQuery = z.infer<typeof CollagePhotoQuerySchema>
export type CollagePhotoParams = z.infer<typeof CollagePhotoParamsSchema>
