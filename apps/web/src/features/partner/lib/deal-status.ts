import type { DealResponse } from "@pub-hopper/schemas"

export type DealStatus = "active" | "scheduled" | "expired" | "inactive"

/**
 * Mirrors the API's `isCurrentlyActive` check in
 * apps/api/src/routes/venue-partnerships.ts: a deal is currently active when its
 * `active` flag is true and "now" sits within the (optional) start/end window.
 */
export function getDealStatus(deal: DealResponse): DealStatus {
  const now = Date.now()

  if (deal.endsAt && Date.parse(deal.endsAt) < now) {
    return "expired"
  }

  if (!deal.active) {
    return "inactive"
  }

  if (deal.startsAt && Date.parse(deal.startsAt) > now) {
    return "scheduled"
  }

  return "active"
}

export function isExpired(deal: DealResponse): boolean {
  return getDealStatus(deal) === "expired"
}

export function isCurrentlyActive(deal: DealResponse): boolean {
  return getDealStatus(deal) === "active"
}

export function formatDateRange(
  startsAt: string | null,
  endsAt: string | null
): string {
  const format = (value: string) => new Date(value).toLocaleDateString()

  if (startsAt && endsAt) return `${format(startsAt)} – ${format(endsAt)}`
  if (startsAt) return `From ${format(startsAt)}`
  if (endsAt) return `Until ${format(endsAt)}`
  return "No date limit"
}
