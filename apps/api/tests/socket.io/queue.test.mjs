/**
 * Standalone unit tests for the matchmaking queue.
 * Run with:  node tests/socket.io/queue.test.mjs
 *
 * No DB and no server are required — we test the PartyQueue directly.
 */
import assert from "node:assert/strict"
import { PartyQueue } from "../../src/lib/matchmaking/queue.js"

const config = {
  MIN_GROUP_SIZE: 4,
  TARGET_GROUP_SIZE: 5,
  MAX_GROUP_SIZE: 8,
  MAX_PARTY_SIZE: 4,
  EAGER_SCORE_THRESHOLD: 0.0, // accept any score so tests are deterministic
  RELAX_AFTER_MS: 30_000,
  TICK_INTERVAL_MS: 60_000,
  INVITE_CODE_LENGTH: 6,
}

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ok  ${name}`)
    passed++
  } catch (err) {
    failed++
    console.error(`  FAIL  ${name}`)
    console.error(err)
  }
}

function player(id, overrides = {}) {
  return {
    userId: id,
    name: `Player ${id}`,
    school: overrides.school ?? "EUR",
    campus: overrides.campus ?? "Woudestein",
    interestIds: overrides.interestIds ?? ["music"],
    selectedTimeSlot: "",
    enqueuedAt: 0,
  }
}

console.log("Party + Queue tests")

test("create / join / leave", () => {
  const q = new PartyQueue(config)
  const a = q.createParty(player("a"))
  assert.equal(a.members.length, 1)
  assert.equal(a.leaderId, "a")

  const joined = q.joinByInvite(a.inviteCode, player("b"))
  assert.equal(joined.members.length, 2)

  const res = q.leaveParty("a")
  // Leader leaves -> b becomes leader
  assert.equal(res.dissolved, false)
  assert.equal(res.party.leaderId, "b")

  const res2 = q.leaveParty("b")
  assert.equal(res2.dissolved, true)
})

test("a user can only be in one party at a time", () => {
  const q = new PartyQueue(config)
  q.createParty(player("a"))
  assert.throws(() => q.createParty(player("a")), /already in a party/)
})

test("invite codes are 6 chars and unique-ish", () => {
  const q = new PartyQueue(config)
  const a = q.createParty(player("a"))
  const b = q.createParty(player("b"))
  assert.equal(a.inviteCode.length, 6)
  assert.notEqual(a.inviteCode, b.inviteCode)
})

test("party cannot exceed MAX_PARTY_SIZE", () => {
  const q = new PartyQueue({ ...config, MAX_PARTY_SIZE: 2 })
  const p = q.createParty(player("a"))
  q.joinByInvite(p.inviteCode, player("b"))
  assert.throws(() => q.joinByInvite(p.inviteCode, player("c")), /full/)
})

test("only leader can queue / unqueue", () => {
  const q = new PartyQueue(config)
  const p = q.createParty(player("a"))
  q.joinByInvite(p.inviteCode, player("b"))
  assert.throws(() => q.queueParty("b", "19:00"), /leader/)
  q.queueParty("a", "19:00")
  assert.throws(() => q.unqueueParty("b"), /leader/)
  q.unqueueParty("a")
})

test("two parties of 2 (same slot) -> 1 match of 4", () => {
  const q = new PartyQueue(config)
  let matched = null
  q.on("match", (m) => (matched = m))

  const p1 = q.createParty(player("a1"))
  q.joinByInvite(p1.inviteCode, player("a2"))
  const p2 = q.createParty(player("b1"))
  q.joinByInvite(p2.inviteCode, player("b2"))

  q.queueParty("a1", "19:00")
  q.queueParty("b1", "19:00")

  assert.ok(matched, "expected a match")
  assert.equal(matched.players.length, 4)
  assert.equal(matched.selectedTimeSlot, "19:00")
})

test("different time slots never match", () => {
  const q = new PartyQueue(config)
  let matched = null
  q.on("match", (m) => (matched = m))

  for (const id of ["a", "b", "c", "d"]) q.createParty(player(id))
  q.queueParty("a", "19:00")
  q.queueParty("b", "19:00")
  q.queueParty("c", "20:00")
  q.queueParty("d", "20:00")

  assert.equal(matched, null, "must not cross time slots")
})

test("solo queue: 4 solo parties same slot -> 1 match of 4", () => {
  const q = new PartyQueue(config)
  let matched = null
  q.on("match", (m) => (matched = m))

  for (const id of ["a", "b", "c", "d"]) {
    q.createParty(player(id))
    q.queueParty(id, "21:00")
  }
  assert.ok(matched)
  assert.equal(matched.players.length, 4)
})

test("party of 3 + solo of 2 would overflow -> match is solo-of-1 (rejected by MAX) and the trio gets the next solo", () => {
  const q = new PartyQueue({ ...config, MAX_GROUP_SIZE: 4 })
  let matched = null
  q.on("match", (m) => (matched = m))

  // Trio
  const trio = q.createParty(player("t1"))
  q.joinByInvite(trio.inviteCode, player("t2"))
  q.joinByInvite(trio.inviteCode, player("t3"))
  q.queueParty("t1", "22:00")

  // Duo would overflow (3+2 > 4) so it must NOT be combined.
  const duo = q.createParty(player("d1"))
  q.joinByInvite(duo.inviteCode, player("d2"))
  q.queueParty("d1", "22:00")
  assert.equal(matched, null, "no match yet: 3+2 > MAX_GROUP_SIZE 4")

  // A solo party fits: 3+1=4 -> match
  q.createParty(player("s1"))
  q.queueParty("s1", "22:00")
  assert.ok(matched)
  assert.equal(matched.players.length, 4)
})

test("leaving a queued party removes it from the bucket", () => {
  const q = new PartyQueue(config)
  const p = q.createParty(player("a"))
  q.joinByInvite(p.inviteCode, player("b"))
  q.queueParty("a", "23:00")
  assert.equal(q.bucketStats("23:00").parties, 1)
  q.leaveParty("b")
  // Member change cancels the queue entry.
  assert.equal(q.bucketStats("23:00").parties, 0)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)

