import type { Request, Response, NextFunction } from "express"
import { eq } from "drizzle-orm"
import { verifyAccess } from "@/lib/jwt-helper"
import { sendError } from "@/lib/response"
import { db } from "@/db/client"
import { users } from "@/db/schema"

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

// Must run after requireAuth, which populates res.locals.userId.
export function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  const user = db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, res.locals.userId))
    .get()

  if (user?.role !== "admin") {
    return sendError(res, 403, { message: "Admin access required" })
  }

  next()
}
