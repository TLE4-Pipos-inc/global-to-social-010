import { desc, eq } from "drizzle-orm"
import express from "express"
import { db } from "@/db/client"
import { groupJoinMatches, playerGroups } from "@/db/schema"
import { requireAuth } from "@/middleware/auth"

const router = express.Router()

// GET /api/matches/me — match history for the authenticated user
router.get("/me", requireAuth, (_req, res) => {
  const userId = res.locals.userId
  console.log("Fetching matches for userId:", userId)

  const matches = db
    .select({
      id: groupJoinMatches.id,
      groupId: groupJoinMatches.groupId,
      sessionId: groupJoinMatches.sessionId,
      matchScore: groupJoinMatches.matchScore,
      status: groupJoinMatches.status,
      matchedAt: groupJoinMatches.matchedAt,
      groupName: playerGroups.groupName,
      groupSize: playerGroups.groupSize,
      selectedTimeSlot: playerGroups.selectedTimeSlot,
      matchStatus: playerGroups.matchStatus,
    })
    .from(groupJoinMatches)
    .innerJoin(playerGroups, eq(playerGroups.id, groupJoinMatches.groupId))
    .where(eq(groupJoinMatches.userId, userId))
    .orderBy(desc(groupJoinMatches.matchedAt))
    .all()

  return res.json({ matches })
})

export default router
