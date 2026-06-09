import z from "zod"

const triggerMinuteValues = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45] as const
const triggerMinuteMessage =
  "triggerMinute must be one of 0, 5, 10, 15, 20, 25, 30, 35, 40, 45"
const triggerMinuteRefine = (v: number) =>
  (triggerMinuteValues as readonly number[]).includes(v)

const triggerMinuteSchema = z
  .number()
  .refine(triggerMinuteRefine, { message: triggerMinuteMessage })

const triggerMinuteCoercedSchema = z.coerce
  .number()
  .refine(triggerMinuteRefine, { message: triggerMinuteMessage })

export const ConversationStarterSchema = z.object({
  id: z.uuidv4(),
  interestsId: z.uuidv4().nullable(),
  category: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  triggerMinute: triggerMinuteSchema,
})

export const ConversationStarterQuerySchema = z.object({
  interestsId: z.uuidv4().optional(),
  triggerMinute: triggerMinuteCoercedSchema.optional(),
})

export const ConversationStarterCreateSchema = z.object({
  interestsId: z.uuidv4().nullable().optional(),
  category: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  triggerMinute: triggerMinuteCoercedSchema,
})

export const ConversationStarterUpdateSchema =
  ConversationStarterCreateSchema.partial()

export type ConversationStarter = z.infer<typeof ConversationStarterSchema>
export type ConversationStarterQuery = z.infer<
  typeof ConversationStarterQuerySchema
>
export type ConversationStarterCreate = z.infer<
  typeof ConversationStarterCreateSchema
>
export type ConversationStarterUpdate = z.infer<
  typeof ConversationStarterUpdateSchema
>
