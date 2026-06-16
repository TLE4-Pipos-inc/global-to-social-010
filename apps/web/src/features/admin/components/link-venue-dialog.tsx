import { useState } from "react"
import { Button } from "#/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog"
import { FieldGroup } from "#/components/ui/field"
import { Spinner } from "#/components/ui/spinner"
import { useAdminForm } from "#/features/admin/hooks/form"
import { useLinkUserToVenue } from "#/features/admin/hooks/query"
import type { UserResponse } from "@pub-hopper/schemas"
import { toast } from "sonner"

function LinkVenueDialog({ user }: { user: UserResponse }) {
  const [open, setOpen] = useState(false)
  const linkUser = useLinkUserToVenue()

  const form = useAdminForm({
    defaultValues: {
      organizationName: "",
      partnershipType: "",
      venueId: "",
    },
    onSubmit: ({ value }) => {
      if (!value.organizationName.trim() || !value.partnershipType.trim()) {
        toast.error("Organization name and partnership type are required")
        return
      }

      if (!value.venueId) {
        toast.error("Please select a venue")
        return
      }

      linkUser.mutate(
        {
          userId: user.id,
          currentRole: user.role,
          organizationName: value.organizationName,
          partnershipType: value.partnershipType,
          venueId: value.venueId,
        },
        {
          onSuccess: () => {
            toast.success(`${user.name} linked to venue`)
            form.reset()
            setOpen(false)
          },
          onError: (error) =>
            toast.error(
              error instanceof Error ? error.message : "Failed to link user"
            ),
        }
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        Link to venue
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link {user.name} to a venue</DialogTitle>
          <DialogDescription>
            Creates a partner profile (if needed), a venue partnership, and sets
            the user's role to partner.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.AppField
              name="organizationName"
              children={(field) => (
                <field.InputField label="Organization name" placeholder="e.g. The Local Pub" />
              )}
            />
            <form.AppField
              name="partnershipType"
              children={(field) => (
                <field.InputField label="Partnership type" placeholder="e.g. venue" />
              )}
            />
            <form.AppField
              name="venueId"
              children={(field) => <field.VenueSelectField label="Venue" />}
            />
            <Button type="submit" disabled={linkUser.isPending}>
              {linkUser.isPending && <Spinner />}
              {linkUser.isPending ? "Linking..." : "Link to venue"}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { LinkVenueDialog }
