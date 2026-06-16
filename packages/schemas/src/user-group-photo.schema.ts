import z from "zod"

const BooleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true")

export const UserGroupPhotosQuerySchema = z.object({
  status: z.string().trim().min(1).max(80).optional(),
  groupId: z.string().trim().min(1).optional(),
  sessionId: z.string().trim().min(1).optional(),
  includeEmptyGroups: BooleanQuerySchema.optional(),
})

export type UserGroupPhotosQuery = z.infer<typeof UserGroupPhotosQuerySchema>
