/**
 * Standalone unit tests for the matchmaking queue.
 * Run with:  node tests/socket.io/queue.test.mjs
 *
 * No DB and no server are required — we test the PartyQueue directly.
 */
import assert from "node:assert/strict"
import {
  PartyQueue,
  requiredScoreForWait,
  serializePublicParty,
  tryFormGroup,
} from "../../src/lib/matchmaking/queue.js"

const config = {
  MIN_GROUP_SIZE: 4,
  TARGET_GROUP_SIZE: 5,
  MAX_GROUP_SIZE: 8,
  MAX_PARTY_SIZE: 4,
  IDEAL_SCORE_THRESHOLD: 0.0, // accept any score so the base tests are deterministic
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

// --- compatibility-first matching -----------------------------------------

// A player sharing nothing with the default profile -> scorePair === 0.
function loner(id) {
  return player(id, {
    campus: `campus-${id}`,
    school: `school-${id}`,
    interestIds: [`interest-${id}`],
  })
}

// Backdate a queued party (and its members) so it looks like it has waited `ms`.
function backdateWait(queue, leaderId, ms) {
  const party = queue.getPartyOfUser(leaderId)
  const enqueuedAt = Date.now() - ms
  party.enqueuedAt = enqueuedAt
  for (const m of party.members) m.enqueuedAt = enqueuedAt
}

test("requiredScoreForWait decays from IDEAL to 0 across the relax window", () => {
  const c = { ...config, IDEAL_SCORE_THRESHOLD: 0.6, RELAX_AFTER_MS: 30_000 }
  assert.equal(requiredScoreForWait(0, c), 0.6)
  assert.ok(Math.abs(requiredScoreForWait(15_000, c) - 0.3) < 1e-9)
  assert.equal(requiredScoreForWait(30_000, c), 0)
  assert.equal(requiredScoreForWait(60_000, c), 0) // clamps, never negative
})

test("compatible solos still match immediately", () => {
  const c = { ...config, IDEAL_SCORE_THRESHOLD: 0.6 }
  const q = new PartyQueue(c)
  let matched = null
  q.on("match", (m) => (matched = m))

  // 2 shared interests -> score 0.75 >= 0.6, so they group right away.
  const shared = ["music", "sports"]
  for (const id of ["a", "b", "c", "d"]) {
    q.createParty(player(id, { interestIds: shared }))
    q.queueParty(id, "19:00")
  }
  assert.ok(matched, "highly compatible group should form right away")
  assert.equal(matched.players.length, 4)
})

test("incompatible solos do NOT match immediately", () => {
  const c = { ...config, IDEAL_SCORE_THRESHOLD: 0.6, RELAX_AFTER_MS: 30_000 }
  const q = new PartyQueue(c)
  let matched = null
  q.on("match", (m) => (matched = m))

  for (const id of ["a", "b", "c", "d"]) {
    q.createParty(loner(id))
    q.queueParty(id, "19:00")
  }
  assert.equal(matched, null, "score 0 is below the initial bar -> keep waiting")
})

test("incompatible solos match once the relax window elapses (last resort)", () => {
  const c = { ...config, IDEAL_SCORE_THRESHOLD: 0.6, RELAX_AFTER_MS: 30_000 }
  const q = new PartyQueue(c)
  let matched = null
  q.on("match", (m) => (matched = m))

  for (const id of ["a", "b", "c", "d"]) {
    q.createParty(loner(id))
    q.queueParty(id, "19:00")
  }
  assert.equal(matched, null)

  // Simulate everyone having waited past the relax window, then re-evaluate.
  for (const id of ["a", "b", "c", "d"]) backdateWait(q, id, 31_000)
  q.evaluateSlot("19:00")

  assert.ok(matched, "after relaxing, an incompatible group forms as last resort")
  assert.equal(matched.players.length, 4)
})

test("an incompatible oldest party does not block a compatible group", () => {
  const c = { ...config, IDEAL_SCORE_THRESHOLD: 0.6, RELAX_AFTER_MS: 30_000 }
  const q = new PartyQueue(c)
  let matched = null
  q.on("match", (m) => (matched = m))

  // Oldest waiter shares no interests with anyone, and is nowhere near relaxing.
  q.createParty(loner("old"))
  q.queueParty("old", "19:00")
  backdateWait(q, "old", 5_000)

  // Four mutually compatible solos arrive afterwards (2 shared tags -> 0.75).
  const shared = ["music", "sports"]
  for (const id of ["a", "b", "c", "d"]) {
    q.createParty(player(id, { interestIds: shared }))
    q.queueParty(id, "19:00")
  }

  assert.ok(matched, "compatible group must form despite the incompatible elder")
  const ids = matched.players.map((m) => m.userId).sort()
  assert.deepEqual(ids, ["a", "b", "c", "d"], "elder is skipped as seed, not matched")
})

test("tryFormGroup prefers compatible parties over incompatible ones", () => {
  const c = { ...config, IDEAL_SCORE_THRESHOLD: 0.6, MAX_GROUP_SIZE: 4, TARGET_GROUP_SIZE: 4 }
  const now = Date.now()
  const mk = (leader, p) => ({
    id: leader,
    leaderId: leader,
    members: [{ ...p, enqueuedAt: now }],
    enqueuedAt: now,
    status: "queued",
  })

  // Seed + compatible parties share 2 interests -> 0.75 >= 0.6; loners share none.
  const shared = ["music", "sports"]
  const seed = mk("seed", player("seed", { interestIds: shared }))
  const compatible = [
    mk("c1", player("c1", { interestIds: shared })),
    mk("c2", player("c2", { interestIds: shared })),
    mk("c3", player("c3", { interestIds: shared })),
  ]
  const incompatible = [mk("x1", loner("x1")), mk("x2", loner("x2"))]

  const group = tryFormGroup([seed, ...incompatible, ...compatible], c)
  assert.ok(group)
  const ids = group.players.map((m) => m.userId).sort()
  assert.deepEqual(ids, ["c1", "c2", "c3", "seed"], "fills with compatible parties only")
})

// --- public teams + queue auto-fill ---------------------------------------

test("going public defaults maxSize to the max group size", () => {
  const q = new PartyQueue(config)
  q.createParty(player("a"))
  q.setPartyOptions("a", { visibility: "public" })
  const p = q.getPartyOfUser("a")
  assert.equal(p.visibility, "public")
  assert.equal(p.maxSize, config.MAX_GROUP_SIZE)
})

test("setPartyOptions is leader-only and clamps maxSize", () => {
  const q = new PartyQueue(config)
  const p = q.createParty(player("a"))
  q.joinByInvite(p.inviteCode, player("b"))
  assert.throws(() => q.setPartyOptions("b", { maxSize: 6 }), /leader/)

  q.setPartyOptions("a", { maxSize: 99 })
  assert.equal(q.getPartyOfUser("a").maxSize, config.MAX_GROUP_SIZE) // clamped down
  q.setPartyOptions("a", { maxSize: 1 })
  assert.equal(q.getPartyOfUser("a").maxSize, config.MIN_GROUP_SIZE) // clamped up to MIN
})

test("team settings cannot change after queueing", () => {
  const q = new PartyQueue(config)
  q.createParty(player("a"))
  q.setPartyOptions("a", { visibility: "public", maxSize: 6 })
  q.queueParty("a", "19:00")
  assert.throws(() => q.setPartyOptions("a", { maxSize: 8 }), /before queueing/)
})

test("joinByPartyId: public only, fills to maxSize then full", () => {
  const q = new PartyQueue(config)
  const t = q.createParty(player("a"))
  assert.throws(() => q.joinByPartyId(t.id, player("z")), /private/)

  q.setPartyOptions("a", { visibility: "public", maxSize: 4 })
  q.joinByPartyId(t.id, player("b"))
  q.joinByPartyId(t.id, player("c"))
  q.joinByPartyId(t.id, player("d"))
  assert.equal(q.getPartyOfUser("a").members.length, 4)
  assert.throws(() => q.joinByPartyId(t.id, player("e")), /full/)
})

test("listJoinableTeams shows public teams with open slots only", () => {
  const q = new PartyQueue(config)
  q.createParty(player("pub"))
  q.setPartyOptions("pub", { visibility: "public", maxSize: 4 })
  q.createParty(player("priv")) // stays private

  let list = q.listJoinableTeams()
  assert.equal(list.length, 1)
  assert.equal(list[0].leaderId, "pub")

  q.joinByPartyId(list[0].id, player("x"))
  q.joinByPartyId(list[0].id, player("y"))
  q.joinByPartyId(list[0].id, player("z"))
  assert.equal(q.listJoinableTeams().length, 0) // now full
})

test("serializePublicParty annotates compatibility and hides the invite code", () => {
  const q = new PartyQueue(config)
  const shared = ["music", "sports"]
  const t = q.createParty(player("a", { interestIds: shared }))
  q.joinByInvite(t.inviteCode, player("b", { interestIds: shared }))
  q.setPartyOptions("a", { visibility: "public", maxSize: 6 })

  const team = q.listJoinableTeams()[0]
  const view = serializePublicParty(team, { userId: "req", interestIds: shared }, config)
  assert.equal(view.inviteCode, undefined)
  assert.equal(view.memberCount, 2)
  assert.equal(view.openSlots, 4)
  assert.equal(view.compatibility, 0.75) // 2 shared interests -> 0.75 with each member
})

test("a public team is filled from the queue and forms at max size", () => {
  const q = new PartyQueue(config)
  let matched = null
  q.on("match", (m) => (matched = m))

  const host = q.createParty(player("h1"))
  q.joinByInvite(host.inviteCode, player("h2"))
  q.setPartyOptions("h1", { visibility: "public", maxSize: 4 })
  q.queueParty("h1", "19:00")
  assert.equal(matched, null, "2/4 -> not full yet")

  q.createParty(player("s1"))
  q.queueParty("s1", "19:00") // absorbed -> 3/4, still holds
  assert.equal(matched, null)
  q.createParty(player("s2"))
  q.queueParty("s2", "19:00") // absorbed -> 4/4 -> forms

  assert.ok(matched, "host forms once filled to max")
  assert.equal(matched.parties.length, 1, "the host is the sole party")
  assert.equal(matched.parties[0].leaderId, "h1")
  assert.equal(matched.players.length, 4)
})

test("a public team below max holds, then forms after the relax window", () => {
  const c = { ...config, RELAX_AFTER_MS: 30_000 }
  const q = new PartyQueue(c)
  let matched = null
  q.on("match", (m) => (matched = m))

  const host = q.createParty(player("h1"))
  q.joinByInvite(host.inviteCode, player("h2"))
  q.joinByInvite(host.inviteCode, player("h3"))
  q.setPartyOptions("h1", { visibility: "public", maxSize: 6 })
  q.queueParty("h1", "20:00")

  q.createParty(player("s1"))
  q.queueParty("s1", "20:00") // -> 4/6, >= MIN but not full -> holds
  assert.equal(matched, null, "4/6 within window -> hold for more")
  assert.equal(q.getPartyOfUser("h1").members.length, 4)

  backdateWait(q, "h1", 31_000)
  q.evaluateSlot("20:00")
  assert.ok(matched, "forms with whoever's aboard after relaxing")
  assert.equal(matched.players.length, 4)
  assert.equal(matched.parties.length, 1)
})

test("queue-fill skips incompatible players until the window relaxes", () => {
  const c = { ...config, IDEAL_SCORE_THRESHOLD: 0.6, RELAX_AFTER_MS: 30_000 }
  const q = new PartyQueue(c)
  let matched = null
  q.on("match", (m) => (matched = m))

  const shared = ["music", "sports"]
  const host = q.createParty(player("h1", { interestIds: shared }))
  q.joinByInvite(host.inviteCode, player("h2", { interestIds: shared }))
  q.setPartyOptions("h1", { visibility: "public", maxSize: 4 })
  q.queueParty("h1", "21:00")

  q.createParty(loner("x1"))
  q.queueParty("x1", "21:00")
  q.createParty(loner("x2"))
  q.queueParty("x2", "21:00")
  assert.equal(q.getPartyOfUser("h1").members.length, 2, "incompatible not absorbed yet")
  assert.equal(matched, null)

  backdateWait(q, "h1", 31_000)
  q.evaluateSlot("21:00")
  assert.equal(matched?.players.length, 4, "bar hits 0 -> fills as a last resort")
})

test("compatible solos still form their own group while an incompatible public team waits", () => {
  const c = { ...config, IDEAL_SCORE_THRESHOLD: 0.6, RELAX_AFTER_MS: 30_000 }
  const q = new PartyQueue(c)
  let matched = null
  q.on("match", (m) => (matched = m))

  q.createParty(loner("host"))
  q.setPartyOptions("host", { visibility: "public", maxSize: 8 })
  q.queueParty("host", "23:00")

  const shared = ["music", "sports"]
  for (const id of ["a", "b", "c", "d"]) {
    q.createParty(player(id, { interestIds: shared }))
    q.queueParty(id, "23:00")
  }

  assert.ok(matched, "the compatible solos form via the classic matcher (phase 2)")
  const ids = matched.players.map((m) => m.userId).sort()
  assert.deepEqual(ids, ["a", "b", "c", "d"])
  assert.equal(q.getPartyOfUser("host").members.length, 1, "public host is untouched")
})

test("party:absorbed reports the absorbed users and dissolved parties", () => {
  const q = new PartyQueue(config)
  let absorbed = null
  q.on("party:absorbed", (e) => (absorbed = e))

  const host = q.createParty(player("h1"))
  q.joinByInvite(host.inviteCode, player("h2"))
  q.setPartyOptions("h1", { visibility: "public", maxSize: 6 })
  q.queueParty("h1", "19:30")

  const solo = q.createParty(player("s1"))
  q.queueParty("s1", "19:30")

  assert.ok(absorbed)
  assert.deepEqual(absorbed.absorbedUserIds, ["s1"])
  assert.deepEqual(absorbed.dissolvedPartyIds, [solo.id])
  assert.equal(absorbed.host.leaderId, "h1")
  // The solo's user is now routed to the host party.
  assert.equal(q.getPartyOfUser("s1").id, host.id)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)

