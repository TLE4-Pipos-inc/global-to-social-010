import type { DealResponse } from "@pub-hopper/schemas"
import { DealCard } from "#/features/partner/components/deal-card"
import { getDealStatus } from "#/features/partner/lib/deal-status"

function DealSection({
  title,
  deals,
  emptyText,
}: {
  title: string
  deals: DealResponse[]
  emptyText?: string
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-lg font-medium">
        {title} ({deals.length})
      </h3>
      {deals.length === 0
        ? emptyText && (
            <p className="text-sm text-accent-foreground bg-accent w-fit py-1 px-2 rounded-md">
              {emptyText}
            </p>
          )
        : deals.map((deal) => <DealCard key={deal.id} deal={deal} />)}
    </section>
  )
}

function DealList({ deals }: { deals: DealResponse[] }) {
  const active = deals.filter((deal) => getDealStatus(deal) === "active")
  const expired = deals.filter((deal) => getDealStatus(deal) === "expired")
  // Scheduled (future start) or inactive deals — kept visible so they stay editable.
  const other = deals.filter((deal) => {
    const status = getDealStatus(deal)
    return status === "scheduled" || status === "inactive"
  })

  return (
    <div className="flex flex-col gap-6">
      <DealSection
        title="Active deals"
        deals={active}
        emptyText="No active deals yet."
      />
      {other.length > 0 && (
        <DealSection title="Scheduled & inactive deals" deals={other} />
      )}
      {expired.length > 0 && (
        <DealSection title="Expired deals" deals={expired} />
      )}
    </div>
  )
}

export { DealList }
