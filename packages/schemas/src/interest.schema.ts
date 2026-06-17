import z from "zod"

export const InterestCreateSchema = z.object({
  name: z.string().trim().min(1).max(255),
})

export const InterestUpdateSchema = InterestCreateSchema

export const InterestResponseSchema = InterestCreateSchema.extend({
  id: z.string(),
})

export type InterestCreate = z.infer<typeof InterestCreateSchema>
export type InterestUpdate = z.infer<typeof InterestUpdateSchema>
export type InterestResponse = z.infer<typeof InterestResponseSchema>
