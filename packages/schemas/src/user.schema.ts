import { z } from "zod"

export const RegisterUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
  school: z.string().trim().max(120).optional(),
  campus: z.string().trim().max(120).optional(),
})

export const LoginUserSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
})

export const PublicUserSchema = z.object({
  id: z.uuidv4(),
  name: z.string(),
  email: z.email(),
  school: z.string().nullable().optional(),
  campus: z.string().nullable().optional(),
  createdAt: z.string(),
})

export const UserRoleSchema = z.enum(["user", "partner", "admin"])

export const UpdateUserSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  school: z.string().trim().max(120).nullable().optional(),
  campus: z.string().trim().max(120).nullable().optional(),
})

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>
export type LoginUserInput = z.infer<typeof LoginUserSchema>
export type PublicUser = z.infer<typeof PublicUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
