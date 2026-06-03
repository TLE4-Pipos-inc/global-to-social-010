import bcrypt from "bcrypt"
import { eq } from "drizzle-orm"
import express from "express"
import { v4 as uuidv4 } from "uuid"
import { LoginUserSchema, RegisterUserSchema } from "@pub-hopper/schemas"
import { db } from "../db/client.js"
import { users } from "../db/schema.js"
import { requireAuth, signAccessToken } from "../middleware/auth.js"

const router = express.Router()

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    email: user.email,
    school: user.school,
    campus: user.campus,
    createdAt: user.createdAt,
  }
}

function setAuthCookie(res, token) {
  res.cookie("access_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 1000,
  })
}

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
      issues: result.error.issues,
    })
  }

  const { firstName, email, password, school, campus } = result.data
  const saltRounds = Number(process.env.SALT_ROUNDS ?? 12)
  const passwordHash = await bcrypt.hash(password, saltRounds)
  const user = {
    id: uuidv4(),
    firstName,
    email,
    password: passwordHash,
    school: school ?? null,
    campus: campus ?? null,
  }

  try {
    db.insert(users).values(user).run()
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return res.status(409).json({ message: "Email is already registered" })
    }
    console.error("User registration failed:", error)
    return res.status(500).json({ message: "Could not register user" })
  }

  const token = signAccessToken(user)
  setAuthCookie(res, token)

  return res.status(201).json({
    user: publicUser(user),
    token,
  })
})

router.post("/login", async (req, res) => {
  const result = LoginUserSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid login data",
      issues: result.error.issues,
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

  const token = signAccessToken(user)
  setAuthCookie(res, token)

  return res.json({
    user: publicUser(user),
    token,
  })
})

router.post("/logout", (_req, res) => {
  res.clearCookie("access_token")
  return res.json({ message: "Logged out" })
})

router.get("/me", requireAuth, (req, res) => {
  const user = db.select().from(users).where(eq(users.id, req.user.sub)).get()

  if (!user) {
    return res.status(404).json({ message: "User not found" })
  }

  return res.json({ user: publicUser(user) })
})

export default router
