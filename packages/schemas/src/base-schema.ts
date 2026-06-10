import z from "zod"

export const BaseSchema = z.object({
  id: z.uuidv4(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
