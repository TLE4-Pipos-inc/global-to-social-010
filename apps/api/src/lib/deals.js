/**
 * A deal is "currently active" when its `active` flag is set and "now" sits within
 * its optional start/end window. Shared between the deals route and the match payload
 * builder so both agree on what counts as a live deal.
 *
 * @param {{ active: boolean, startsAt: string | null, endsAt: string | null }} deal
 * @returns {boolean}
 */
export function isDealCurrentlyActive({ active, startsAt, endsAt }) {
  const now = Date.now()
  return (
    active &&
    (!startsAt || Date.parse(startsAt) <= now) &&
    (!endsAt || Date.parse(endsAt) >= now)
  )
}
