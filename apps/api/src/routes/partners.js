import express from "express"
import { db } from "../db/client.js"
import { venues } from "../db/schema.js"

const router = express.Router()

// GET all venues
router.get("/venues", async (req, res) => {
  try {
    const data = db.select().from(venues).all()
    return res.json(data)
  } catch (error) {
    console.error("Failed to fetch venues:", error)
    return res.status(500).json({ message: "Could not fetch venues" })
  }
})

export default router