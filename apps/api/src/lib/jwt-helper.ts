import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined")
if (!process.env.JWT_REFRESH_SECRET)
  throw new Error("JWT_REFRESH_SECRET is not defined")

const SECRET = process.env.JWT_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

export type JwtPayload = {
  userId: string
  email: string
  role: string
}

export const signAccess = (payload: JwtPayload) =>
  jwt.sign(payload, SECRET, { expiresIn: "30m" })

export const signRefresh = (payload: JwtPayload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" })

export const verifyAccess = (token: string) =>
  jwt.verify(token, SECRET) as JwtPayload

export const verifyRefresh = (token: string) =>
  jwt.verify(token, REFRESH_SECRET) as JwtPayload

export async function encryptPassword(password: string) {
  const saltRounds = Number(process.env.SALT_ROUNDS ?? 12)
  return await bcrypt.hash(password, saltRounds)
}

export const comparePassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash)

export function setAuthCookie(res, payload: JwtPayload) {
  res.cookie("access_token", signRefresh(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}
