import z from "zod"

export const UserInterestParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const UserInterestCreateSchema = z.object({
  interestId: z.string().trim().min(1),
})

export const UserInterestUpdateSchema = z.object({
  interestId: z.string().trim().min(1),
})

export const UserInterestQuerySchema = z.object({
  interestId: z.string().trim().min(1).optional(),
})

export type UserInterestParams = z.infer<typeof UserInterestParamsSchema>
export type UserInterestCreate = z.infer<typeof UserInterestCreateSchema>
export type UserInterestUpdate = z.infer<typeof UserInterestUpdateSchema>
export type UserInterestQuery = z.infer<typeof UserInterestQuerySchema>
