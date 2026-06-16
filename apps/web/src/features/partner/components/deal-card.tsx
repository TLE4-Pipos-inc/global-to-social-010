import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { Button } from "#/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog"
import { Spinner } from "#/components/ui/spinner"
import { useDeleteDeal } from "#/features/partner/hooks/query"
import { formatDateRange, getDealStatus } from "#/features/partner/lib/deal-status"
import type { DealResponse } from "@pub-hopper/schemas"
import { Link } from "@tanstack/react-router"
import { toast } from "sonner"

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
  inactive: "Inactive",
}

function DealCard({ deal }: { deal: DealResponse }) {
  const deleteDeal = useDeleteDeal(deal.id)
  const status = getDealStatus(deal)

  const handleDelete = () => {
    deleteDeal.mutate(undefined, {
      onSuccess: () => toast.success("Deal deleted"),
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Failed to delete deal"),
    })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{deal.title}</CardTitle>
        <CardDescription>
          {STATUS_LABELS[status]} · {formatDateRange(deal.startsAt, deal.endsAt)}
        </CardDescription>
      </CardHeader>
      {deal.description && (
        <CardContent className="text-sm">{deal.description}</CardContent>
      )}
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          render={
            <Link to="/partner/deals/$dealId/edit" params={{ dealId: deal.id }} />
          }
          nativeButton={false}
        >
          Edit
        </Button>
        <Dialog>
          <DialogTrigger render={<Button variant="ghost" size="sm" />}>
            Delete
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete deal</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deal.title}"? This cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter showCloseButton>
              <DialogClose
                render={<Button variant="destructive" />}
                onClick={handleDelete}
                disabled={deleteDeal.isPending}
              >
                {deleteDeal.isPending && <Spinner />}
                Delete
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}

export { DealCard }
