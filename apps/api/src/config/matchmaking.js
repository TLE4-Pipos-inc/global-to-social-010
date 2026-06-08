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

  /** Compatibility score (0..1) above which any candidate is eagerly accepted. */
  EAGER_SCORE_THRESHOLD: 0.6,
  /** After this many ms of waiting we relax thresholds for the oldest waiter. */
  RELAX_AFTER_MS: 30_000,
  /** Periodic re-evaluation cadence for "patient" parties waiting in a slot. */
  TICK_INTERVAL_MS: 2_000,

  /** Invite code charset / length for parties. */
  INVITE_CODE_LENGTH: 6,
})

