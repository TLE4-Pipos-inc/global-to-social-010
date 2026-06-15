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
 * The score is the Jaccard similarity of the two interest sets:
 *   |A ∩ B| / |A ∪ B|
 * so two people with identical tags score 1.0 (100%), and people with no
 * overlap score 0. Campus and school are intentionally NOT factored in — the
 * product matches people on interests, and folding location into the score
 * capped a perfect tag match at a misleading 40%.
 *
 * @param {QueuedPlayer} a
 * @param {QueuedPlayer} b
 * @returns {number}
 */
export function scorePair(a, b) {
  if (!a || !b || a.userId === b.userId) return 0

  const setA = new Set(a.interestIds ?? [])
  const setB = new Set(b.interestIds ?? [])
  if (setA.size === 0 && setB.size === 0) return 0

  let intersection = 0
  for (const id of setA) if (setB.has(id)) intersection++
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
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

