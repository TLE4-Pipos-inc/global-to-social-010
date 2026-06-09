import { eq } from "drizzle-orm"
import express from "express"
import { UpdateUserSchema } from "@pub-hopper/schemas"
import { db } from "../db/client.js"
import { users } from "../db/schema.js"
import { requireAuth } from "../middleware/auth.js"
import z from "zod"

const router = express.Router()

router.patch("/me", requireAuth, (req, res) => {
  const result = UpdateUserSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      message: "Invalid user data",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }

  if (Object.keys(result.data).length === 0) {
    return res.status(400).json({ message: "No fields provided" })
  }

  const payload = Object.fromEntries(
    Object.entries(result.data).filter(([, value]) => value !== undefined)
  )

  try {
    db.update(users)
      .set(payload)
      .where(eq(users.id, res.locals.payload.userId))
      .run()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Could not update user" })
  }

  const updatedUser = db
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

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" })
  }

  return res.json({ user: updatedUser })
})

export default router
