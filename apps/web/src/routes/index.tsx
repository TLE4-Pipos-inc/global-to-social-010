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
            <CardTitle>Lorem Ipsum</CardTitle>
            <CardDescription>Dolor sit amet</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </CardContent>
        </Card>

        <Card className="w-2/3 self-end">
          <CardHeader>
            <CardTitle>Consectetur</CardTitle>
            <CardDescription>Adipiscing elit</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Ut enim ad minim veniam, quis nostrud exercitation ullamco
              laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </CardContent>
        </Card>

        <Card className="w-2/3 self-start">
          <CardHeader>
            <CardTitle>Excepteur Sint</CardTitle>
            <CardDescription>Occaecat cupidatat</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
