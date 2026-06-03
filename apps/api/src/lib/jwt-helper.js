import jwt from "jsonwebtoken"

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined")
if (!process.env.JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET is not defined")

const SECRET = process.env.JWT_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

export const signAccess = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: "1h" })

export const signRefresh = (payload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" })

export const verifyAccess = (token) =>
  jwt.verify(token, SECRET) 

export const verifyRefresh = (token) =>
  jwt.verify(token, REFRESH_SECRET)

export function setAuthCookie(res, payload) {
  res.cookie("access_token", signRefresh(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}