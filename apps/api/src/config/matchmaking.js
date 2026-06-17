/**
 * Matchmaking tuning knobs.
 *
 * A "party" is a manually-formed group of players (1..MAX_PARTY_SIZE) that
 * queues together. The queue tries to combine parties from the same time slot
 * until a viable group is formed.
 */
export const MATCHMAKING_CONFIG = Object.freeze({
  /** Minimum players in a final matched group (must satisfy the DB check 4..8). */
  MIN_GROUP_SIZE: 4,
  /** Preferred final group size — once reached, stop adding more. */
  TARGET_GROUP_SIZE: 5,
  /** Hard cap, enforced by the DB. */
  MAX_GROUP_SIZE: 8,

  /** Max players a party can hold before it queues. */
  MAX_PARTY_SIZE: 4,

  /**
   * Compatibility score (0..1) a candidate must clear to be added to a group
   * immediately, with no waiting. This is the bar at the *start* of the wait:
   * only genuinely similar people are grouped right away. The bar then decays
   * toward 0 over RELAX_AFTER_MS (see queue.js#requiredScoreForWait), so weaker
   * matches are only accepted after the group has waited a while, and matching
   * with anybody is the last resort.
   */
  IDEAL_SCORE_THRESHOLD: 0.6,
  /**
   * Length of the relaxation window. The required compatibility decays linearly
   * from IDEAL_SCORE_THRESHOLD (at 0ms waited) down to 0 (at RELAX_AFTER_MS),
   * which also bounds the worst-case time anyone waits before being matched
   * with whoever is available. Raise this to demand compatibility for longer.
   */
  RELAX_AFTER_MS: 90_000,
  /** Periodic re-evaluation cadence for "patient" parties waiting in a slot. */
  TICK_INTERVAL_MS: 2_000,

  /** Invite code charset / length for parties. */
  INVITE_CODE_LENGTH: 6,
})

