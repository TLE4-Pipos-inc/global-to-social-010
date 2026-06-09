import bcrypt from "bcrypt"
import { eq } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import { UserLoginSchema, UserRegisterSchema } from "@pub-hopper/schemas"
import { db } from "@/db/client.js"
import { users } from "@/db/schema.js"
import { requireAuth } from "@/middleware/auth.js"
import {
  encryptPassword,
  comparePassword,
  setAuthCookie,
  signAccess,
  verifyRefresh,
} from "@/lib/jwt-helper.js"
import z from "zod"
import { isUniqueEmailError } from "@/lib/sql-error.js"
import { sendError, sendSuccess } from "@/lib/response"

const router = express.Router()

router.post("/register", async (req, res) => {
  const result = UserRegisterSchema.omit({ confirmPassword: true }).safeParse(
    req.body
  )

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid registration data",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  const passwordHash = await encryptPassword(result.data.password)

  const user = {
    id: uuidv4(),
    name: result.data.name,
    email: result.data.email,
    password: passwordHash,
    school: result.data.school,
    campus: result.data.campus,
  }

  try {
    const insertedUser = db
      .insert(users)
      .values(user)
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        school: users.school,
        campus: users.campus,
        role: users.role,
      })
      .get()
    const payload = {
      userId: insertedUser.id,
      email: insertedUser.email,
      role: insertedUser.role,
    }

    setAuthCookie(res, payload)

    return sendSuccess(res, 201, {
      result: { user: insertedUser, token: signAccess(payload) },
    })
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return sendError(res, 409, { message: "Email is already registered" })
    }
    console.error("User registration failed:", error)
    return sendError(res, 500, { message: "Could not register user" })
  }
})

router.post("/login", async (req, res) => {
  const result = UserLoginSchema.safeParse(req.body)

  if (!result.success) {
    return sendError(res, 400, {
      message: "Invalid login data",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.email, result.data.email))
    .get()

  if (!user || !(await comparePassword(result.data.password, user.password))) {
    return sendError(res, 401, { message: "Invalid email or password" })
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  const token = signAccess(payload)
  setAuthCookie(res, payload)

  const returnUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    school: user.school,
    campus: user.campus,
  }

  return sendSuccess(res, 200, { result: { user: returnUser, token } })
})

router.post("/refresh", (req, res) => {
  const token = req.cookies.access_token
  if (!token)
    return sendError(res, 401, { message: "Refresh token is required" })

  try {
    const { userId, email, role } = verifyRefresh(token)
    return sendSuccess(res, 200, {
      result: {
        token: signAccess({ userId, email, role }),
      },
      message: "Token refreshed successfully",
    })
  } catch (error) {
    console.log("Invalid refresh token:", error)
    return sendError(res, 401, { message: "Invalid or expired refresh token" })
  }
})

router.get("/me", requireAuth, (req, res) => {
  const user = db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      school: users.school,
      campus: users.campus,
    })
    .from(users)
    .where(eq(users.id, res.locals.userId))
    .get()

  if (!user) {
    return sendError(res, 404, { message: "User not found" })
  }

  return sendSuccess(res, 200, { result: { user } })
})

router.post("/logout", (_req, res) => {
  res.clearCookie("access_token")
  return sendSuccess(res, 200, { message: "Logged out" })
})

router.delete("/me", requireAuth, (_req, res) => {
  const userId = res.locals.userId

  const deleted = db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id })
    .get()

  if (!deleted) {
    return sendError(res, 404, { message: "User not found" })
  }

  res.clearCookie("access_token")
  return sendSuccess(res, 200, { message: "Account deleted successfully" })
})

export default router
