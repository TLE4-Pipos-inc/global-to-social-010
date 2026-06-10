import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import type { ConversationStarter } from "@pub-hopper/schemas"
import { Link } from "@tanstack/react-router"

function ConversationStarterCard({
  starter,
  interestId,
}: {
  starter: ConversationStarter
  interestId?: string
}) {
  const content = (
    <Card className="hover:scale-105 hover:shadow-md h-full">
      <CardHeader>
        <CardTitle>
          <h2>{starter.interestName ?? "General"}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2">{starter.prompt}</p>
        <p className="text-muted-foreground text-sm ">
          Trigger minute: {starter.triggerMinute}
        </p>
      </CardContent>
    </Card>
  )

  if (interestId) {
    return (
      <Link
        to="/interests/$id/conversation-starters/$starterId"
        params={{ id: interestId, starterId: starter.id }}
      >
        {content}
      </Link>
    )
  }

  return (
    <Link to="/conversation-starters/$id" params={{ id: starter.id }}>
      {content}
    </Link>
  )
}

export { ConversationStarterCard }
