import express from "express"
import { db } from "@/db/client"
import { venues } from "@/db/schema"
import { sendError, sendSuccess } from "@/lib/response"

const router = express.Router()

// GET all venues
router.get("/venues", async (_req, res) => {
  try {
    const result = db.select().from(venues).all()
    return sendSuccess(res, 200, { result })
  } catch (error) {
    console.error("Failed to fetch venues:", error)
    return sendError(res, 500, { message: "Could not fetch venues" })
  }
})

export default router
