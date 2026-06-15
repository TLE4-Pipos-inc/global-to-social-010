import { EventEmitter } from "node:events"
import { randomBytes, randomUUID } from "node:crypto"
import { MATCHMAKING_CONFIG } from "../../config/matchmaking.js"
import { scoreGroup, scorePair, scoreUserAgainstGroup } from "./scoring.js"

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
 * @property {"public"|"private"} visibility     // public = listed in the team browser
 * @property {number | null} maxSize             // leader-chosen final team size; null = system defaults
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
      visibility: "private",
      maxSize: null,
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
    if (party.members.length >= this.#manualJoinCap(party)) {
      throw new Error("Party is full")
    }
    party.members.push(player)
    this.byUser.set(player.userId, party.id)
    this.emit("party:updated", party)
    return party
  }

  /**
   * Join a PUBLIC team directly from the browser, keyed by party id. Unlike
   * joinByInvite this also allows joining a team that is already searching
   * (status "queued"); private teams can only be joined with their invite code.
   *
   * @param {string} partyId
   * @param {QueuedPlayer} player
   * @returns {Party}
   */
  joinByPartyId(partyId, player) {
    if (this.byUser.has(player.userId)) {
      throw new Error("You are already in a party")
    }
    const party = this.parties.get(partyId)
    if (!party) throw new Error("Team no longer exists")
    if (party.visibility !== "public") {
      throw new Error("This team is private — join with its invite code")
    }
    if (party.status === "matched") {
      throw new Error("This team is no longer accepting members")
    }
    if (party.members.length >= this.#manualJoinCap(party)) {
      throw new Error("Team is full")
    }

    // Joining a searching team: inherit its wait basis so scoring stays fair.
    if (party.status === "queued") player.enqueuedAt = party.enqueuedAt ?? Date.now()
    party.members.push(player)
    this.byUser.set(player.userId, party.id)
    this.emit("party:updated", party)

    // A new member can complete a searching team, so re-evaluate its slot.
    if (party.status === "queued" && party.selectedTimeSlot) {
      this.evaluateSlot(party.selectedTimeSlot)
    }
    return party
  }

  /**
   * Leader-only: configure team visibility and/or max team size. Only allowed
   * while the party is idle (configure before queueing).
   *
   * @param {string} leaderId
   * @param {{ visibility?: "public"|"private", maxSize?: number|null }} opts
   * @returns {Party}
   */
  setPartyOptions(leaderId, opts = {}) {
    const party = this.getPartyOfUser(leaderId)
    if (!party) throw new Error("You are not in a party")
    if (party.leaderId !== leaderId) throw new Error("Only the leader can change team settings")
    if (party.status !== "idle") throw new Error("Team settings can only be changed before queueing")

    if (opts.visibility !== undefined) {
      if (opts.visibility !== "public" && opts.visibility !== "private") {
        throw new Error("visibility must be 'public' or 'private'")
      }
      party.visibility = opts.visibility
    }

    if (opts.maxSize !== undefined && opts.maxSize !== null) {
      const requested = Math.floor(Number(opts.maxSize))
      if (!Number.isFinite(requested)) throw new Error("maxSize must be a number")
      const min = Math.max(party.members.length, this.config.MIN_GROUP_SIZE)
      party.maxSize = Math.min(this.config.MAX_GROUP_SIZE, Math.max(min, requested))
    } else if (opts.maxSize === null) {
      party.maxSize = null
    }

    // A public team needs a concrete size to fill toward; default to the cap.
    if (party.visibility === "public" && party.maxSize === null) {
      party.maxSize = Math.max(party.members.length, this.config.MAX_GROUP_SIZE)
    }

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

    if (party.status === "matched") {
      throw new Error("Cannot leave a party that has already been matched")
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
    if (party.status === "matched") throw new Error("Cannot kick from a party that has already been matched")
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

  /**
   * Public teams with open slots that a user can join from the browser. Includes
   * both idle teams (still assembling) and queued teams (actively searching).
   *
   * @returns {Party[]}
   */
  listJoinableTeams() {
    const out = []
    for (const party of this.parties.values()) {
      if (party.visibility !== "public") continue
      if (party.status === "matched") continue
      if (party.members.length >= this.#manualJoinCap(party)) continue
      out.push(party)
    }
    return out
  }

  /**
   * Release all members of a matched party back into the pool so they can
   * create or join a new party. Call this when the associated session
   * activates or is aborted.
   *
   * @param {string} partyId
   */
  releaseParty(partyId) {
    const party = this.parties.get(partyId)
    if (!party) return
    for (const m of party.members) this.byUser.delete(m.userId)
    this.parties.delete(partyId)
    this.byInvite.delete(party.inviteCode)
  }

  // --- matchmaking core ---------------------------------------------------

  evaluateAll() {
    for (const slot of [...this.buckets.keys()]) this.evaluateSlot(slot)
  }

  /**
   * Try to form one or more groups out of the parties currently in `slot`.
   * Emits `match` for each formed group.
   *
   * Two phases, in order:
   *   1. Fill public host teams from the random queue (progressive absorption),
   *      forming each once it reaches its max size or relaxes past the window.
   *   2. The classic greedy matcher over the remaining non-public parties.
   * With no public teams in the slot, phase 1 is a no-op and behaviour is
   * identical to the original single-phase matcher.
   *
   * @param {string} slot
   */
  evaluateSlot(slot) {
    let set = this.buckets.get(slot)
    if (!set || set.size === 0) return

    const now = Date.now()

    // --- Phase 1: public host teams (oldest first for fairness) ---
    const hosts = [...set]
      .map((pid) => this.parties.get(pid))
      .filter((p) => p && p.visibility === "public")
      .sort((a, b) => (a.enqueuedAt ?? Infinity) - (b.enqueuedAt ?? Infinity))

    for (const host of hosts) {
      this.#fillHostTeam(host, slot, now)
      this.#maybeFormHost(host, slot, now)
    }

    // --- Phase 2: classic greedy over the remaining NON-public parties ---
    set = this.buckets.get(slot)
    while (set && set.size > 0) {
      const parties = [...set]
        .map((pid) => this.parties.get(pid))
        .filter((p) => p && p.visibility !== "public")
      if (parties.length === 0) break
      const group = tryFormGroup(parties, this.config)
      if (!group) break

      // Remove matched parties from the bucket. byUser entries are kept
      // pointing at the matched party (status "matched") so users cannot
      // re-enroll until the session activates and releaseParty() is called.
      for (const party of group.parties) {
        set.delete(party.id)
        party.status = "matched"
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

  /** Max members a party accepts via manual join (invite or browser). */
  #manualJoinCap(party) {
    return party.maxSize ?? this.config.MAX_PARTY_SIZE
  }

  /**
   * Progressively absorb the most compatible non-public queued parties in `slot`
   * into `host`, up to its max size, honouring the decaying compatibility bar.
   * Absorbed parties are dissolved into the host (their members move over).
   * Emits `party:absorbed` once if anything was absorbed.
   */
  #fillHostTeam(host, slot, now) {
    const set = this.buckets.get(slot)
    if (!set) return
    const cap = host.maxSize ?? this.config.MAX_GROUP_SIZE

    const absorbedUserIds = []
    const dissolvedPartyIds = []

    while (host.members.length < cap) {
      const open = cap - host.members.length

      // Best-scoring non-public party that still fits in the open slots.
      let bestCand = null
      let bestScore = -1
      for (const pid of set) {
        const cand = this.parties.get(pid)
        if (!cand || cand === host) continue
        if (cand.visibility === "public") continue
        if (cand.members.length > open) continue
        const avg = avgScoreBetweenParties(cand.members, host.members)
        if (avg > bestScore) {
          bestScore = avg
          bestCand = cand
        }
      }
      if (!bestCand) break

      // Compatibility bar decays with how long either side has waited.
      const waitedMs = Math.max(
        now - (host.enqueuedAt ?? now),
        now - (bestCand.enqueuedAt ?? now),
      )
      if (bestScore < requiredScoreForWait(waitedMs, this.config)) break

      // Absorb: move members into the host and dissolve the source party.
      for (const m of bestCand.members) {
        m.enqueuedAt = host.enqueuedAt
        this.byUser.set(m.userId, host.id)
        host.members.push(m)
        absorbedUserIds.push(m.userId)
      }
      set.delete(bestCand.id)
      this.parties.delete(bestCand.id)
      this.byInvite.delete(bestCand.inviteCode)
      dissolvedPartyIds.push(bestCand.id)
    }

    if (absorbedUserIds.length > 0) {
      this.emit("party:absorbed", { host, absorbedUserIds, dissolvedPartyIds })
    }
  }

  /**
   * Form `host` into a group if it is full, or if it has reached MIN_GROUP_SIZE
   * and waited past the relax window. Otherwise it holds (stays queued) so more
   * compatible players can still join. Emits `match` and marks it matched.
   */
  #maybeFormHost(host, slot, now) {
    const set = this.buckets.get(slot)
    if (!set || !set.has(host.id)) return false

    const cap = host.maxSize ?? this.config.MAX_GROUP_SIZE
    const waitedMs = now - (host.enqueuedAt ?? now)
    const full = host.members.length >= cap
    const relaxed =
      host.members.length >= this.config.MIN_GROUP_SIZE &&
      waitedMs >= this.config.RELAX_AFTER_MS

    if (!full && !relaxed) return false
    if (host.members.length < this.config.MIN_GROUP_SIZE) return false

    set.delete(host.id)
    host.status = "matched"
    if (set.size === 0) this.buckets.delete(slot)

    this.emit("match", {
      selectedTimeSlot: slot,
      parties: [host],
      players: [...host.members],
      matchScore: scoreGroup(host.members),
    })
    return true
  }

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
 * Greedy clustering across **whole parties**, prioritising compatibility.
 *
 * 1. Try each party as the seed in wait-time order (oldest first, for fairness).
 * 2. For a given seed, repeatedly add the highest-scoring remaining party whose
 *    members fit inside MAX_GROUP_SIZE, but only if its compatibility clears the
 *    current bar (see requiredScoreForWait). Stop at TARGET_GROUP_SIZE, or when
 *    the best remaining candidate falls below the bar.
 * 3. Return the first seed that yields a group of >= MIN_GROUP_SIZE.
 *
 * Trying multiple seeds matters: the oldest waiter might be incompatible with
 * everyone currently in the slot, but a younger set of parties could form a
 * highly compatible group right now. Seeding only off the oldest party would
 * stall the whole slot until that party's bar relaxed to 0. We still prefer the
 * oldest seed (it's tried first), so this does not undermine fairness — the
 * oldest party's wait is still bounded by RELAX_AFTER_MS.
 *
 * The bar starts high (IDEAL_SCORE_THRESHOLD) and decays to 0 the longer the
 * group has waited, so the order of preference is:
 *   similar people  >  forming a group at all  >  matching with anybody.
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

  // Try each party as the seed, oldest first. If the oldest waiter cannot form
  // an acceptable group yet, fall through to the next so a single incompatible
  // early party does not block a compatible group in the same slot.
  for (const seed of sorted) {
    // The seed party must fit on its own (it cannot exceed MAX_GROUP_SIZE).
    if (seed.members.length > config.MAX_GROUP_SIZE) continue
    const group = growGroupFromSeed(seed, sorted, now, config)
    if (group) return group
  }

  return null
}

/**
 * Build the best group we can around a fixed seed party, or null if it cannot
 * reach MIN_GROUP_SIZE under the current compatibility bar.
 *
 * @param {Party} seed
 * @param {Party[]} sorted  All candidate parties (seed included), wait-sorted
 * @param {number} now
 * @param {typeof MATCHMAKING_CONFIG} config
 * @returns {{ parties: Party[], players: QueuedPlayer[], matchScore: number } | null}
 */
function growGroupFromSeed(seed, sorted, now, config) {
  const seedWaitedMs = now - (seed.enqueuedAt ?? now)

  // A seed may cap its own final size below the global max (a team that chose a
  // smaller maxSize). Default to MAX_GROUP_SIZE when unset.
  const effectiveMax = Math.min(
    seed.maxSize ?? config.MAX_GROUP_SIZE,
    config.MAX_GROUP_SIZE,
  )

  const cluster = [seed]
  let clusterPlayers = [...seed.members]
  const pool = sorted.filter((p) => p !== seed)

  while (clusterPlayers.length < effectiveMax && pool.length > 0) {
    let bestIdx = -1
    let bestScore = -1
    for (let i = 0; i < pool.length; i++) {
      const cand = pool[i]
      if (clusterPlayers.length + cand.members.length > effectiveMax) {
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

    // Compatibility bar decays with wait time. We let either the long-waiting
    // seed or a long-waiting candidate relax the bar, so nobody starves.
    const waitedMs = Math.max(seedWaitedMs, candWaitedMs)
    const requiredScore = requiredScoreForWait(waitedMs, config)

    // The best available candidate is not compatible enough yet. Since no other
    // candidate can score higher, stop here: keep what we have if it already
    // meets MIN, otherwise the null return below makes this seed give up.
    if (bestScore < requiredScore) break

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
 * Minimum pairwise compatibility (0..1) a candidate must clear right now, given
 * how long the group has already waited. Decays linearly from
 * IDEAL_SCORE_THRESHOLD (no waiting) to 0 (waited >= RELAX_AFTER_MS), so highly
 * compatible candidates match immediately and weak matches are deferred until
 * waiting longer no longer pays off.
 *
 * @param {number} waitedMs
 * @param {typeof MATCHMAKING_CONFIG} config
 * @returns {number}
 */
export function requiredScoreForWait(waitedMs, config = MATCHMAKING_CONFIG) {
  const window = config.RELAX_AFTER_MS
  if (window <= 0) return 0
  const progress = Math.min(1, Math.max(0, waitedMs / window))
  return config.IDEAL_SCORE_THRESHOLD * (1 - progress)
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
    visibility: party.visibility,
    maxSize: party.maxSize,
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

/**
 * Public, browser-facing view of a team, annotated with how compatible the
 * requesting user is with the current members. Never exposes the invite code
 * (joining a public team is by id, not code).
 *
 * @param {Party} party
 * @param {import("./scoring.js").QueuedPlayer} requester  Needs userId + interestIds
 * @param {typeof MATCHMAKING_CONFIG} [config]
 */
export function serializePublicParty(party, requester, config = MATCHMAKING_CONFIG) {
  const cap = party.maxSize ?? config.MAX_PARTY_SIZE
  return {
    id: party.id,
    leaderId: party.leaderId,
    status: party.status,
    visibility: party.visibility,
    selectedTimeSlot: party.selectedTimeSlot,
    maxSize: party.maxSize,
    memberCount: party.members.length,
    openSlots: Math.max(0, cap - party.members.length),
    compatibility:
      Math.round(scoreUserAgainstGroup(requester, party.members) * 100) / 100,
    members: party.members.map((m) => ({
      userId: m.userId,
      name: m.name,
      school: m.school,
      campus: m.campus,
    })),
  }
}

