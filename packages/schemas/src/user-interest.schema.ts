import { z } from "zod"

export const UserInterestCreateSchema = z.object({
  interestId: z.string().trim().min(1),
})

export const UserInterestParamsSchema = z.object({
  interestId: z.string().trim().min(1),
})

export const UserInterestsUpdateSchema = z.object({
  interestIds: z
    .array(z.string().trim().min(1))
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "interestIds must be unique",
    }),
})

export type UserInterestCreateInput = z.infer<typeof UserInterestCreateSchema>
export type UserInterestParams = z.infer<typeof UserInterestParamsSchema>
export type UserInterestsUpdateInput = z.infer<typeof UserInterestsUpdateSchema>
