import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { Button } from "#/components/ui/button"
import type { VenueResponse } from "@pub-hopper/schemas"
import { Link } from "@tanstack/react-router"

function VenueInfo({ venue }: { venue: VenueResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{venue.name}</h2>
        </CardTitle>
        <CardDescription>{venue.venueType}</CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                to="/partner/venue/$venueId/edit"
                params={{ venueId: venue.id }}
              />
            }
            nativeButton={false}
          >
            Edit venue
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <p>{venue.address}</p>
        {venue.description && (
          <p className="text-primary-foreground/80">{venue.description}</p>
        )}
        {venue.vibe && (
          <p className="text-primary-foreground/80">Vibe: {venue.vibe}</p>
        )}
      </CardContent>
    </Card>
  )
}

export { VenueInfo }
