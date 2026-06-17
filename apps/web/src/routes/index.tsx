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
            <CardTitle>Download nu de Global To Social app</CardTitle>
            <CardDescription>Ontdek routes, ontmoet mensen</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Ga op pad met je groep, ontdek de leukste plekken in de stad en
              verzamel herinneringen tijdens elke stop. Met de app volg je
              routes, krijg je conversation starters en bewaar je jullie
              foto&apos;s als mooie groepsmomenten.
            </p>
          </CardContent>
        </Card>

        <Card className="w-2/3 self-end">
          <CardHeader>
            <CardTitle>Word partner van Global To Social</CardTitle>
            <CardDescription>Promoot jouw locatie</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Wil je jouw bar, cafe, restaurant of eventlocatie zichtbaar maken
              voor nieuwe groepen bezoekers?{" "}
              <a
                href="mailto:partners@globaltosocial010.nl"
                className="font-semibold underline underline-offset-2"
              >
                Mail ons
              </a>{" "}
              om partner te worden en promoot deals via de app op het moment
              dat groepen jouw locatie bezoeken.
            </p>
            <p className="mt-3 font-medium">
              Jouw deal komt in beeld op het moment dat groepen jouw locatie bezoeken.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
