import { eq } from "drizzle-orm"
import express from "express"
import { AdminUpdateUserSchema, UpdateUserSchema } from "@pub-hopper/schemas"
import { db } from "@/db/client"
import { users } from "@/db/schema"
import { requireAuth } from "@/middleware/auth"
import z from "zod"
import { sendError, sendSuccess } from "@/lib/response"

const router = express.Router()

const safeUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  school: users.school,
  campus: users.campus,
  createdAt: users.createdAt,
}

router.get("/", requireAuth, (_req, res) => {
  const items = db.select(safeUserColumns).from(users).all()
  return sendSuccess(res, 200, { result: { users: items } })
})

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = UpdateUserSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid user data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  try {
    const [result] = await db
      .update(users)
      .set(parsed.data)
      .where(eq(users.id, res.locals.userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        school: users.school,
        campus: users.campus,
      })

    return sendSuccess(res, 200, { result })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not update user" })
  }
})

router.patch<{ id: string }>("/:id", requireAuth, async (req, res) => {
  const parsed = AdminUpdateUserSchema.safeParse(req.body)

  if (!parsed.success) {
    return sendError(res, 400, {
      message: "Invalid user data",
      errors: z.flattenError(parsed.error).fieldErrors,
    })
  }

  if (Object.keys(parsed.data).length === 0) {
    return sendError(res, 400, { message: "No fields provided" })
  }

  const existingUser = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, req.params.id))
    .get()

  if (!existingUser) {
    return sendError(res, 404, { message: "User not found" })
  }

  try {
    const [result] = await db
      .update(users)
      .set(parsed.data)
      .where(eq(users.id, req.params.id))
      .returning(safeUserColumns)

    return sendSuccess(res, 200, { result })
  } catch (error) {
    console.error(error)
    return sendError(res, 500, { message: "Could not update user" })
  }
})

export default router
