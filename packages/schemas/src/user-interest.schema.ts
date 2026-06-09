import { z } from "zod"

const UserInterestIdSchema = z.string().trim().min(1)

export const UserInterestParamsSchema = z.object({
  id: UserInterestIdSchema,
})

export const UserInterestCreateSchema = z
  .union([
    z.object({
      interestId: UserInterestIdSchema,
    }).strict(),
    z.object({
      interestIds: z.array(UserInterestIdSchema).min(1).max(5),
    }).strict(),
  ])
  .transform((data) => ({
    interestIds: "interestIds" in data ? data.interestIds : [data.interestId],
  }))
  .superRefine((data, ctx) => {
    if (new Set(data.interestIds).size !== data.interestIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "interestIds must be unique",
        path: ["interestIds"],
      })
    }
  })

export const UserInterestUpdateSchema = z.object({
  interestId: UserInterestIdSchema,
})

export const UserInterestQuerySchema = z.object({
  interestId: UserInterestIdSchema.optional(),
})

export type UserInterestParams = z.infer<typeof UserInterestParamsSchema>
export type UserInterestCreate = z.infer<typeof UserInterestCreateSchema>
export type UserInterestUpdate = z.infer<typeof UserInterestUpdateSchema>
export type UserInterestQuery = z.infer<typeof UserInterestQuerySchema>
