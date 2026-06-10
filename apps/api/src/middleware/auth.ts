import type { Request, Response, NextFunction } from "express"
import { verifyAccess } from "@/lib/jwt-helper"
import { sendError } from "@/lib/response"

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    return sendError(res, 401, {
      message: "Missing or invalid Authorization header",
    })
  }

  try {
    const token = header.slice(7)
    const payload = verifyAccess(token)
    res.locals.userId = payload.userId
    next()
  } catch {
    return sendError(res, 401, { message: "Invalid or expired token" })
  }
}
