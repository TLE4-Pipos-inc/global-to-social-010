import z from "zod"

export const InterestCreateSchema = z.object({
  name: z.string().trim().min(1).max(255),
})

export const InterestUpdateSchema = InterestCreateSchema

export type InterestCreate = z.infer<typeof InterestCreateSchema>
export type InterestUpdate = z.infer<typeof InterestUpdateSchema>
