import z from "zod"

export const InterestCreateSchema = z.object({
  name: z.string().trim().min(1),
})

export const InterestUpdateSchema = InterestCreateSchema.partial()

export type InterestCreate = z.infer<typeof InterestCreateSchema>
export type InterestUpdate = z.infer<typeof InterestUpdateSchema>
