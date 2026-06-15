import { useEffect, useState } from "react"
import { useMatchmaking } from "@/features/matchmaking/socket-context"

/** Re-renders every `intervalMs` so timestamp-based countdowns stay live. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Formats seconds as "M:SS", clamping negatives to 0:00. */
export function formatMMSS(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

/**
 * Derives the currently active stop (the first not-yet-finished stop), its
 * position in the route, and a live countdown of its remaining duration.
 */
export function useActiveStop() {
  const { match, stopStates, stopStartedAt } = useMatchmaking()
  const now = useNow()

  const stops = match?.stops ?? []
  const currentStop = stops.find(
    (stop) => (stopStates[stop.id] ?? "not_started") !== "finished"
  )
  const currentState = currentStop
    ? (stopStates[currentStop.id] ?? "not_started")
    : null
  const stopIndex = currentStop ? stops.indexOf(currentStop) : -1
  const totalStops = stops.length

  const startedAt = currentStop ? stopStartedAt[currentStop.id] : undefined
  const stopRemaining =
    currentStop && currentState === "running" && startedAt
      ? currentStop.plannedDurationMinutes * 60 - (now - startedAt) / 1000
      : 0

  return {
    now,
    stops,
    currentStop,
    currentState,
    stopIndex,
    totalStops,
    stopRemaining,
  }
}
