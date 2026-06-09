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
 * Pair compatibility score in [0, 1].
 *
 *  - +0.4 for same campus
 *  - +0.2 for same school
 *  - +0.4 * Jaccard(interest sets)
 *
 * @param {QueuedPlayer} a
 * @param {QueuedPlayer} b
 * @returns {number}
 */
export function scorePair(a, b) {
  if (!a || !b || a.userId === b.userId) return 0

  let score = 0
  if (a.campus && b.campus && a.campus === b.campus) score += 0.4
  if (a.school && b.school && a.school === b.school) score += 0.2

  const setA = new Set(a.interestIds ?? [])
  const setB = new Set(b.interestIds ?? [])
  if (setA.size > 0 || setB.size > 0) {
    let intersection = 0
    for (const id of setA) if (setB.has(id)) intersection++
    const union = setA.size + setB.size - intersection
    const jaccard = union === 0 ? 0 : intersection / union
    score += 0.4 * jaccard
  }

  return Math.min(1, score)
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

