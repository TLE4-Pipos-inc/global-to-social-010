import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import type { InterestResponse } from "@pub-hopper/schemas"
import { Link } from "@tanstack/react-router"

function InterestCard({ interest }: { interest: InterestResponse }) {
  return (
    <Link to="/interests/$id" params={{ id: interest.id }}>
      <Card className="hover:scale-105 hover:shadow-md">
        <CardHeader>
          <CardTitle>
            <h2>{interest.name}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent />
      </Card>
    </Link>
  )
}

function InterestGeneralCard() {
  return (
    <Link to="/conversation-starters">
      <Card className="hover:scale-105 hover:shadow-md">
        <CardHeader>
          <CardTitle>
            <h2>General</h2>
          </CardTitle>
        </CardHeader>
        <CardContent />
      </Card>
    </Link>
  )
}

export { InterestCard, InterestGeneralCard }
