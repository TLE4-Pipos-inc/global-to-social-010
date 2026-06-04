/**
 * End-to-end smoke test for the websocket party + queue feature.
 *
 * Run with:
 *   pnpm --filter api dev   # in one terminal
 *   node --env-file=.env tests/e2e-party.mjs   # in another
 *
 * The script:
 *  1. Mints a short-lived JWT for each TEST_USER_ID using JWT_SECRET.
 *  2. Connects 4 sockets.
 *  3. User A creates a party; user B joins via invite code.
 *  4. User C creates a second party; user D joins.
 *  5. Both leaders queue for the same selectedTimeSlot.
 *  6. Asserts every socket receives `match:found` with the same group.id.
 *
 * IMPORTANT: TEST_USER_IDS must reference real `users.id` rows in your SQLite,
 * otherwise loadPlayerProfile() will return null and queueing will fail.
 */
import jwt from "jsonwebtoken"
import { io as ioc } from "socket.io-client"

const API_URL = process.env.API_URL ?? "http://localhost:3000"
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error("JWT_SECRET is required")
  process.exit(1)
}

// 4 real userIds from your `users` table.
const TEST_USER_IDS = (process.env.TEST_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
if (TEST_USER_IDS.length !== 4) {
  console.error("Set TEST_USER_IDS to a CSV of 4 real userIds, e.g. TEST_USER_IDS=u1,u2,u3,u4")
  process.exit(1)
}

const SLOT = process.env.SELECTED_TIME_SLOT ?? "2026-06-10T19:00"

const token = (userId) => jwt.sign({ userId, email: `${userId}@test.local` }, JWT_SECRET, { expiresIn: "1h" })

function connect(userId) {
  return new Promise((resolve, reject) => {
    const socket = ioc(API_URL, {
      auth: { token: token(userId) },
      transports: ["websocket"],
      reconnection: false,
    })
    socket.on("connect", () => resolve(socket))
    socket.on("connect_error", reject)
  })
}

function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ack timeout on ${event}`)), 5000)
    socket.emit(event, payload ?? {}, (ack) => {
      clearTimeout(timer)
      if (!ack?.ok) return reject(new Error(`${event} failed: ${JSON.stringify(ack)}`))
      resolve(ack)
    })
  })
}

function waitFor(socket, event, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs)
    socket.once(event, (payload) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}

async function main() {
  console.log("connecting 4 clients...")
  const [a, b, c, d] = await Promise.all(TEST_USER_IDS.map(connect))
  console.log("connected")

  // Party 1
  const partyA = await emit(a, "party:create")
  console.log("A created party", partyA.party.inviteCode)
  await emit(b, "party:join", { inviteCode: partyA.party.inviteCode })
  console.log("B joined party A")

  // Party 2
  const partyC = await emit(c, "party:create")
  console.log("C created party", partyC.party.inviteCode)
  await emit(d, "party:join", { inviteCode: partyC.party.inviteCode })
  console.log("D joined party C")

  // Listen first so we don't miss the broadcast
  const waits = [a, b, c, d].map((s) => waitFor(s, "match:found", 10_000))

  // Queue
  await emit(a, "party:queue", { selectedTimeSlot: SLOT })
  console.log("A queued party at", SLOT)
  await emit(c, "party:queue", { selectedTimeSlot: SLOT })
  console.log("C queued party at", SLOT)

  const matches = await Promise.all(waits)
  const groupIds = new Set(matches.map((m) => m.group.id))
  if (groupIds.size !== 1) throw new Error(`expected single group id, got ${[...groupIds].join(",")}`)
  console.log("MATCH FOUND — group:", matches[0].group.groupName, "size:", matches[0].group.groupSize)

  for (const s of [a, b, c, d]) s.disconnect()
  console.log("OK")
}

main().catch((err) => {
  console.error("FAILED:", err.message)
  process.exit(1)
})

