import z from "zod"

const triggerMinuteSchema = z
  .number()
  .refine((v) => [0, 5, 10, 15, 20, 25, 30, 35, 40, 45].includes(v), {
    message:
      "triggerMinute must be one of 0, 5, 10, 15, 20, 25, 30, 35, 40, 45",
  })

export const ConversationStarterQuerySchema = z.object({
  interestsId: z.string().trim().min(1).nullable().optional(),
  triggerMinute: z.coerce.number().pipe(triggerMinuteSchema).optional(),
})

export const ConversationStarterCreateSchema = z.object({
  interestsId: z.string().trim().min(1).nullable(),
  category: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  triggerMinute: z.coerce.number().pipe(triggerMinuteSchema),
})

export const ConversationStarterUpdateSchema =
  ConversationStarterCreateSchema.partial()

export type ConversationStarterQuery = z.infer<
  typeof ConversationStarterQuerySchema
>
export type ConversationStarterCreate = z.infer<
  typeof ConversationStarterCreateSchema
>
export type ConversationStarterUpdate = z.infer<
  typeof ConversationStarterUpdateSchema
>
