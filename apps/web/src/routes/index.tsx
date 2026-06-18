import { createFileRoute } from "@tanstack/react-router"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "#/components/ui/card"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <div className="my-auto flex flex-col items-center justify-center space-y-8 p-8">
      <img src="/logo.png" alt="Global To Social" className="h-24 w-auto" />
      <h1 className="text-4xl font-bold">Global To Social</h1>

      <div className="flex w-full max-w-2xl flex-col gap-4">
        <Card className="w-2/3 self-start">
          <CardHeader>
            <CardTitle>Download the Global To Social app now</CardTitle>
            <CardDescription>Discover routes, meet people</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Go out with your group, discover the coolest spots in the city and
              collect memories at every stop. With the app you follow routes,
              get conversation starters and save your photos as beautiful group
              moments.
            </p>
          </CardContent>
        </Card>

        <Card className="w-2/3 self-end">
          <CardHeader>
            <CardTitle>Become a Global To Social partner</CardTitle>
            <CardDescription>Promote your location</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Want to make your bar, cafe, restaurant or event location visible
              to new groups of visitors?{" "}
              <a
                href="mailto:partners@globaltosocial010.nl"
                className="font-semibold underline underline-offset-2"
              >
                Contact us
              </a>{" "}
              to become a partner and promote deals through the app the moment
              groups visit your location.
            </p>
            <p className="mt-3 font-medium">
              Your deal appears when groups visit your location.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
