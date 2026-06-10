import { z } from "zod"
import { BaseSchema } from "./base-schema.ts"

export const UserRoleSchema = z.enum(["user", "partner", "admin"])

export const UserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  role: UserRoleSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  school: z.string().trim().max(120).optional(),
  campus: z.string().trim().max(120).optional(),
})

export const UserRegisterSchema = UserSchema.extend({
  confirmPassword: z.string().min(1, "Confirm Password is required"),
}).omit({ role: true })

export const UserLoginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const UpdateUserSchema = UserSchema.partial().pick({
  name: true,
  school: true,
  campus: true,
})

export const UserResponseSchema = UserSchema.extend(BaseSchema.shape).omit({
  password: true,
})

export const LoginResponseSchema = UserResponseSchema.extend({
  token: z.string(),
})

export type User = z.infer<typeof UserSchema>
export type UserRegister = z.infer<typeof UserRegisterSchema>
export type UserLogin = z.infer<typeof UserLoginSchema>

export type LoginResponse = z.infer<typeof LoginResponseSchema>
