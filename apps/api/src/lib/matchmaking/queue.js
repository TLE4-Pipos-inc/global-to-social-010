import { EventEmitter } from "node:events"
import { randomBytes, randomUUID } from "node:crypto"
import { MATCHMAKING_CONFIG } from "../../config/matchmaking.js"
import { scoreGroup, scorePair } from "./scoring.js"

/**
 * @typedef {import("./scoring.js").QueuedPlayer} QueuedPlayer
 *
 * @typedef {Object} Party
 * @property {string} id
 * @property {string} inviteCode
 * @property {string} leaderId
 * @property {QueuedPlayer[]} members
 * @property {string | null} selectedTimeSlot   // null until queued
 * @property {"idle"|"queued"|"matched"} status
 * @property {number} createdAt
 * @property {number | null} enqueuedAt
 *
 * @typedef {Object} MatchResult
 * @property {string} selectedTimeSlot
 * @property {Party[]} parties
 * @property {QueuedPlayer[]} players
 * @property {number} matchScore
 */

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I

/**
 * Manager for parties + the cross-party matchmaking queue.
 *
 * - A user can belong to AT MOST one party at a time.
 * - A party of 1..MAX_PARTY_SIZE can be queued for a time slot.
 * - The queue buckets queued parties by selectedTimeSlot and emits `match`
 *   when it can stitch parties together into a final group of
 *   MIN_GROUP_SIZE..MAX_GROUP_SIZE players.
 */
export class PartyQueue extends EventEmitter {
  constructor(config = MATCHMAKING_CONFIG) {
    super()
    this.config = config
    /** @type {Map<string, Party>} partyId -> party */
    this.parties = new Map()
    /** @type {Map<string, string>} inviteCode -> partyId */
    this.byInvite = new Map()
    /** @type {Map<string, string>} userId -> partyId */
    this.byUser = new Map()
    /** @type {Map<string, Set<string>>} timeSlot -> set of queued partyIds */
    this.buckets = new Map()
    this.tickHandle = null
  }

  // --- lifecycle ----------------------------------------------------------

  start() {
    if (this.tickHandle) return
    this.tickHandle = setInterval(() => this.evaluateAll(), this.config.TICK_INTERVAL_MS)
    if (typeof this.tickHandle.unref === "function") this.tickHandle.unref()
  }

  stop() {
    if (this.tickHandle) clearInterval(this.tickHandle)
    this.tickHandle = null
  }

  // --- party operations ---------------------------------------------------

  /**
   * Create a new party with `leader` as the only member and leader.
   * Throws if the leader is already in a party.
   *
   * @param {QueuedPlayer} leader
   * @returns {Party}
   */
  createParty(leader) {
    if (this.byUser.has(leader.userId)) {
      throw new Error("You are already in a party")
    }
    const party = {
      id: randomUUID(),
      inviteCode: this.#freshInviteCode(),
      leaderId: leader.userId,
      members: [leader],
      selectedTimeSlot: null,
      status: "idle",
      createdAt: Date.now(),
      enqueuedAt: null,
    }
    this.parties.set(party.id, party)
    this.byInvite.set(party.inviteCode, party.id)
    this.byUser.set(leader.userId, party.id)
    this.emit("party:updated", party)
    return party
  }

  /**
   * Join an existing party by invite code.
   *
   * @param {string} inviteCode
   * @param {QueuedPlayer} player
   * @returns {Party}
   */
  joinByInvite(inviteCode, player) {
    if (this.byUser.has(player.userId)) {
      throw new Error("You are already in a party")
    }
    const partyId = this.byInvite.get(inviteCode?.toUpperCase?.() ?? "")
    const party = partyId ? this.parties.get(partyId) : null
    if (!party) throw new Error("Invite code is invalid")
    if (party.status !== "idle") {
      throw new Error("This party is no longer accepting members")
    }
    if (party.members.length >= this.config.MAX_PARTY_SIZE) {
      throw new Error("Party is full")
    }
    party.members.push(player)
    this.byUser.set(player.userId, party.id)
    this.emit("party:updated", party)
    return party
  }

  /**
   * Remove a user from their party. If they were the leader, promote the next
   * member; if the party becomes empty, delete it. If the party was queued,
   * leaving cancels the queue entry.
   *
   * @param {string} userId
   * @returns {{ party: Party | null, removed: boolean, dissolved: boolean }}
   */
  leaveParty(userId) {
    const partyId = this.byUser.get(userId)
    if (!partyId) return { party: null, removed: false, dissolved: false }
    const party = this.parties.get(partyId)
    if (!party) {
      this.byUser.delete(userId)
      return { party: null, removed: false, dissolved: false }
    }

    party.members = party.members.filter((m) => m.userId !== userId)
    this.byUser.delete(userId)

    // If party was queued, leaving always unqueues it (members changed).
    if (party.status === "queued") {
      this.#removeFromBucket(party)
      party.status = "idle"
      party.enqueuedAt = null
      party.selectedTimeSlot = null
    }

    if (party.members.length === 0) {
      this.parties.delete(party.id)
      this.byInvite.delete(party.inviteCode)
      this.emit("party:dissolved", { partyId: party.id })
      return { party: null, removed: true, dissolved: true }
    }

    if (party.leaderId === userId) {
      party.leaderId = party.members[0].userId
    }
    this.emit("party:updated", party)
    return { party, removed: true, dissolved: false }
  }

  /**
   * Leader-only: kick a member.
   *
   * @param {string} leaderId
   * @param {string} targetUserId
   * @returns {Party}
   */
  kickMember(leaderId, targetUserId) {
    const party = this.getPartyOfUser(leaderId)
    if (!party) throw new Error("You are not in a party")
    if (party.leaderId !== leaderId) throw new Error("Only the leader can kick")
    if (leaderId === targetUserId) throw new Error("Leader cannot kick themselves")
    if (!party.members.some((m) => m.userId === targetUserId)) {
      throw new Error("Target user is not in your party")
    }
    this.leaveParty(targetUserId)
    return this.parties.get(party.id) ?? party
  }

  /**
   * Leader-only: place the party into the matchmaking queue for a time slot.
   *
   * @param {string} leaderId
   * @param {string} selectedTimeSlot
   * @returns {Party}
   */
  queueParty(leaderId, selectedTimeSlot) {
    const party = this.getPartyOfUser(leaderId)
    if (!party) throw new Error("You are not in a party")
    if (party.leaderId !== leaderId) throw new Error("Only the leader can queue the party")
    if (party.status === "queued") throw new Error("Party is already queued")
    if (party.status === "matched") throw new Error("Party is already matched")
    if (typeof selectedTimeSlot !== "string" || !selectedTimeSlot.trim()) {
      throw new Error("selectedTimeSlot is required")
    }
    if (party.members.length > this.config.MAX_GROUP_SIZE) {
      throw new Error("Party is larger than the maximum group size")
    }

    party.selectedTimeSlot = selectedTimeSlot.trim()
    party.status = "queued"
    party.enqueuedAt = Date.now()
    // Refresh per-member enqueuedAt so scoring "wait time" is meaningful.
    for (const m of party.members) m.enqueuedAt = party.enqueuedAt
    this.#addToBucket(party)
    this.emit("party:updated", party)
    this.evaluateSlot(party.selectedTimeSlot)
    return party
  }

  /**
   * Leader-only: pull the party out of the queue.
   *
   * @param {string} leaderId
   * @returns {Party}
   */
  unqueueParty(leaderId) {
    const party = this.getPartyOfUser(leaderId)
    if (!party) throw new Error("You are not in a party")
    if (party.leaderId !== leaderId) throw new Error("Only the leader can unqueue")
    if (party.status !== "queued") throw new Error("Party is not queued")
    this.#removeFromBucket(party)
    party.status = "idle"
    party.enqueuedAt = null
    const slot = party.selectedTimeSlot
    party.selectedTimeSlot = null
    this.emit("party:updated", party)
    if (slot) this.evaluateSlot(slot)
    return party
  }

  // --- queries ------------------------------------------------------------

  /**
   * @param {string} userId
   * @returns {Party | null}
   */
  getPartyOfUser(userId) {
    const partyId = this.byUser.get(userId)
    return partyId ? this.parties.get(partyId) ?? null : null
  }

  /**
   * @param {string} slot
   * @returns {{ parties: number, players: number }}
   */
  bucketStats(slot) {
    const set = this.buckets.get(slot)
    if (!set) return { parties: 0, players: 0 }
    let players = 0
    for (const pid of set) players += this.parties.get(pid)?.members.length ?? 0
    return { parties: set.size, players }
  }

  // --- matchmaking core ---------------------------------------------------

  evaluateAll() {
    for (const slot of [...this.buckets.keys()]) this.evaluateSlot(slot)
  }

  /**
   * Try to form one or more groups out of the parties currently in `slot`.
   * Emits `match` for each formed group.
   *
   * @param {string} slot
   */
  evaluateSlot(slot) {
    let set = this.buckets.get(slot)
    if (!set || set.size === 0) return

    while (set && set.size > 0) {
      const parties = [...set]
        .map((pid) => this.parties.get(pid))
        .filter(Boolean)
      const group = tryFormGroup(parties, this.config)
      if (!group) break

      // Remove matched parties from the bucket + user index.
      for (const party of group.parties) {
        set.delete(party.id)
        party.status = "matched"
        for (const m of party.members) this.byUser.delete(m.userId)
      }

      this.emit("match", {
        selectedTimeSlot: slot,
        parties: group.parties,
        players: group.players,
        matchScore: group.matchScore,
      })

      set = this.buckets.get(slot)
      if (set && set.size === 0) {
        this.buckets.delete(slot)
        set = undefined
      }
    }
  }

  // --- internal helpers ---------------------------------------------------

  #addToBucket(party) {
    if (!party.selectedTimeSlot) return
    let set = this.buckets.get(party.selectedTimeSlot)
    if (!set) {
      set = new Set()
      this.buckets.set(party.selectedTimeSlot, set)
    }
    set.add(party.id)
  }

  #removeFromBucket(party) {
    if (!party.selectedTimeSlot) return
    const set = this.buckets.get(party.selectedTimeSlot)
    if (!set) return
    set.delete(party.id)
    if (set.size === 0) this.buckets.delete(party.selectedTimeSlot)
  }

  #freshInviteCode() {
    for (let attempts = 0; attempts < 16; attempts++) {
      const code = generateInviteCode(this.config.INVITE_CODE_LENGTH)
      if (!this.byInvite.has(code)) return code
    }
    throw new Error("Failed to generate a unique invite code")
  }
}

/**
 * Greedy clustering across **whole parties**.
 *
 * 1. Seed with the party that has waited longest (fairness).
 * 2. Repeatedly add the highest-scoring remaining party whose members fit
 *    inside MAX_GROUP_SIZE.
 * 3. Stop once we hit TARGET_GROUP_SIZE, or once no candidate is acceptable
 *    (and the seed has not relaxed yet) — provided we already met MIN.
 *
 * Returns null if no acceptable group of >= MIN_GROUP_SIZE can be assembled.
 *
 * @param {Party[]} parties
 * @param {typeof MATCHMAKING_CONFIG} config
 * @returns {{ parties: Party[], players: QueuedPlayer[], matchScore: number } | null}
 */
export function tryFormGroup(parties, config = MATCHMAKING_CONFIG) {
  if (parties.length === 0) return null

  const now = Date.now()
  const sorted = [...parties].sort(
    (a, b) => (a.enqueuedAt ?? Infinity) - (b.enqueuedAt ?? Infinity),
  )

  // The seed party must fit on its own (it cannot exceed MAX_GROUP_SIZE).
  const seed = sorted.find((p) => p.members.length <= config.MAX_GROUP_SIZE)
  if (!seed) return null

  const seedWaitedMs = now - (seed.enqueuedAt ?? now)
  const relaxed = seedWaitedMs >= config.RELAX_AFTER_MS

  const cluster = [seed]
  let clusterPlayers = [...seed.members]
  const pool = sorted.filter((p) => p !== seed)

  while (clusterPlayers.length < config.MAX_GROUP_SIZE && pool.length > 0) {
    let bestIdx = -1
    let bestScore = -1
    for (let i = 0; i < pool.length; i++) {
      const cand = pool[i]
      if (clusterPlayers.length + cand.members.length > config.MAX_GROUP_SIZE) {
        continue
      }
      const avg = avgScoreBetweenParties(cand.members, clusterPlayers)
      if (avg > bestScore) {
        bestScore = avg
        bestIdx = i
      }
    }
    if (bestIdx === -1) break

    const candidate = pool[bestIdx]
    const candWaitedMs = now - (candidate.enqueuedAt ?? now)
    const candRelaxed = candWaitedMs >= config.RELAX_AFTER_MS

    const needToMeetMin = clusterPlayers.length < config.MIN_GROUP_SIZE
    const acceptable =
      relaxed ||
      candRelaxed ||
      bestScore >= config.EAGER_SCORE_THRESHOLD ||
      needToMeetMin

    if (!acceptable) break

    cluster.push(candidate)
    clusterPlayers = clusterPlayers.concat(candidate.members)
    pool.splice(bestIdx, 1)

    if (clusterPlayers.length >= config.TARGET_GROUP_SIZE) break
  }

  if (clusterPlayers.length < config.MIN_GROUP_SIZE) return null

  return {
    parties: cluster,
    players: clusterPlayers,
    matchScore: scoreGroup(clusterPlayers),
  }
}

/**
 * @param {QueuedPlayer[]} a
 * @param {QueuedPlayer[]} b
 * @returns {number}
 */
function avgScoreBetweenParties(a, b) {
  if (a.length === 0 || b.length === 0) return 0
  let total = 0
  let pairs = 0
  for (const x of a) {
    for (const y of b) {
      total += scorePair(x, y)
      pairs++
    }
  }
  return pairs === 0 ? 0 : total / pairs
}

function generateInviteCode(length) {
  const bytes = randomBytes(length)
  let out = ""
  for (let i = 0; i < length; i++) {
    out += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length]
  }
  return out
}

/**
 * Shape we send to clients. Hides server-only fields and exposes
 * what the UI needs to render the lobby.
 *
 * @param {Party} party
 */
export function serializeParty(party) {
  return {
    id: party.id,
    inviteCode: party.inviteCode,
    leaderId: party.leaderId,
    status: party.status,
    selectedTimeSlot: party.selectedTimeSlot,
    enqueuedAt: party.enqueuedAt,
    members: party.members.map((m) => ({
      userId: m.userId,
      name: m.name,
      school: m.school,
      campus: m.campus,
    })),
  }
}

