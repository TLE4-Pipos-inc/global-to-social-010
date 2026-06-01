import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().int().min(18).optional(),
  role: z.enum(["admin", "member", "guest"]).default("member"),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ role: true });

export const UserSchema = CreateUserSchema.extend({
  id: z.uuidv4(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Inferred types
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type User = z.infer<typeof UserSchema>;
