import z from "zod"

const OptionalTextSchema = z.string().trim().min(1).optional()
const NullableTextSchema = z.string().trim().min(1).nullable().optional()

export const PhotoCreateSchema = z
  .object({
    sessionStopId: z.string().trim().min(1),
    uploadedByGroupId: z.string().trim().min(1).nullable().optional(),
    photoUrl: OptionalTextSchema,
    localUri: OptionalTextSchema,
    imageBase64: OptionalTextSchema,
    fileName: OptionalTextSchema,
    mimeType: OptionalTextSchema,
    proofType: z.string().trim().min(1).max(80).optional(),
  })
  .refine((data) => data.photoUrl !== undefined || data.localUri !== undefined || data.imageBase64 !== undefined, {
    message: "photoUrl, localUri or imageBase64 is required",
    path: ["photoUrl"],
  })

export const PhotoUpdateSchema = z.object({
  sessionStopId: z.string().trim().min(1).optional(),
  uploadedByGroupId: z.string().trim().min(1).nullable().optional(),
  photoUrl: NullableTextSchema,
  localUri: NullableTextSchema,
  imageBase64: NullableTextSchema,
  fileName: NullableTextSchema,
  mimeType: NullableTextSchema,
  proofType: z.string().trim().min(1).max(80).optional(),
})

export const PhotoQuerySchema = z.object({
  sessionStopId: z.string().trim().min(1).optional(),
  uploadedByGroupId: z.string().trim().min(1).optional(),
})

export const PhotoParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export type PhotoCreate = z.infer<typeof PhotoCreateSchema>
export type PhotoUpdate = z.infer<typeof PhotoUpdateSchema>
export type PhotoQuery = z.infer<typeof PhotoQuerySchema>
export type PhotoParams = z.infer<typeof PhotoParamsSchema>
