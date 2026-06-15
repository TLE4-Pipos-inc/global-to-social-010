/**
 * @typedef {Object} QueuedPlayer
 * @property {string} userId
 * @property {string} name
 * @property {string | null} school
 * @property {string | null} campus
 * @property {string[]} interestIds
 * @property {string} selectedTimeSlot
 * @property {number} enqueuedAt
 */

/**
 * Pair compatibility score in [0, 1], driven purely by shared interests.
 *
 * Uses a diminishing-returns curve on the *count* of shared interests rather
 * than Jaccard similarity. Each shared tag halves the remaining gap to a
 * perfect match:
 *
 *   score = 1 - 0.5 ** sharedCount
 *     0 shared -> 0.00
 *     1 shared -> 0.50
 *     2 shared -> 0.75
 *     3 shared -> 0.875
 *     4 shared -> 0.9375 ...
 *
 * This gives any common ground a generous buffer (a single shared interest is
 * already a 50% match) while still rewarding more overlap. Set sizes are not
 * penalised — having extra non-shared interests no longer drags the score down,
 * which is why plain Jaccard felt harsh. Campus and school are intentionally
 * NOT factored in: the product matches people on interests.
 *
 * @param {QueuedPlayer} a
 * @param {QueuedPlayer} b
 * @returns {number}
 */
export function scorePair(a, b) {
  if (!a || !b || a.userId === b.userId) return 0

  const setA = new Set(a.interestIds ?? [])
  const setB = new Set(b.interestIds ?? [])

  let shared = 0
  for (const id of setA) if (setB.has(id)) shared++
  if (shared === 0) return 0

  return 1 - Math.pow(0.5, shared)
}

/**
 * Compatibility of a single user against an existing group, as the average of
 * the user's pair score with each member. Used to annotate browseable public
 * teams with "how compatible are you with this team" (0..1).
 *
 * @param {QueuedPlayer} user
 * @param {QueuedPlayer[]} members
 * @returns {number}
 */
export function scoreUserAgainstGroup(user, members) {
  if (!user || !members || members.length === 0) return 0
  let total = 0
  let counted = 0
  for (const m of members) {
    if (m.userId === user.userId) continue
    total += scorePair(user, m)
    counted++
  }
  return counted === 0 ? 0 : total / counted
}

/**
 * Average pair score across every distinct pair in the cluster.
 *
 * @param {QueuedPlayer[]} cluster
 * @returns {number}
 */
export function scoreGroup(cluster) {
  if (!cluster || cluster.length < 2) return 0
  let total = 0
  let pairs = 0
  for (let i = 0; i < cluster.length; i++) {
    for (let j = i + 1; j < cluster.length; j++) {
      total += scorePair(cluster[i], cluster[j])
      pairs++
    }
  }
  return pairs === 0 ? 0 : total / pairs
}

