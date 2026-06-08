import bcrypt from "bcrypt"
import { eq } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import { LoginUserSchema, RegisterUserSchema } from "@pub-hopper/schemas"
import { db } from "@/db/client.js"
import { users } from "@/db/schema.js"
import { requireAuth } from "@/middleware/auth.js"
import {
  setAuthCookie,
  signAccess,
  verifyAccess,
  verifyRefresh,
} from "@/lib/jwt-helper.js"
import z from "zod"

const router = express.Router()

function isUniqueEmailError(error) {
  return (
    error?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    (error?.code === "SQLITE_CONSTRAINT" &&
      String(error?.message ?? "").includes("users.email"))
  )
}

router.post("/register", async (req, res) => {
  const result = RegisterUserSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid registration data",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  const { name, email, password, school, campus } = result.data
  const saltRounds = Number(process.env.SALT_ROUNDS ?? 12)
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const user = {
    id: uuidv4(),
    name,
    email,
    password: passwordHash,
    school: school ?? null,
    campus: campus ?? null,
  }

  let insertedUser
  try {
    insertedUser = db
      .insert(users)
      .values(user)
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        school: users.school,
        campus: users.campus,
      })
      .get()
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return res.status(409).json({ message: "Email is already registered" })
    }
    console.error("User registration failed:", error)
    return res.status(500).json({ message: "Could not register user" })
  }

  const payload = {
    userId: insertedUser.id,
    email: insertedUser.email,
    role: insertedUser.role,
  }

  const token = signAccess(payload)
  setAuthCookie(res, payload)

  return res.status(201).json({
    user: insertedUser,
    token,
  })
})

router.post("/login", async (req, res) => {
  const result = LoginUserSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid login data",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  const { email, password } = result.data
  const user = db.select().from(users).where(eq(users.email, email)).get()

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" })
  }

  const passwordMatches = await bcrypt.compare(password, user.password)

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password" })
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  const returnUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    school: user.school,
    campus: user.campus,
  }

  const token = signAccess(payload)
  setAuthCookie(res, payload)

  return res.json({
    user: returnUser,
    token,
  })
})

router.post("/refresh", (req, res) => {
  const token = req.cookies?.refreshToken
  if (!token)
    return res.status(401).json({ message: "Refresh token is required" })

  try {
    const payload = verifyRefresh(token)
    return res.status(200).json({
      token: signAccess(payload),
      message: "Token refreshed successfully",
    })
  } catch {
    return res.status(401).json({ message: "Invalid or expired refresh token" })
  }
})

router.post("/logout", (_req, res) => {
  res.clearCookie("access_token")
  return res.json({ message: "Logged out" })
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
    .where(eq(users.id, res.locals.payload.userId))
    .get()

  if (!user) {
    return res.status(404).json({ message: "User not found" })
  }

  return res.json({ user })
})

export default router
