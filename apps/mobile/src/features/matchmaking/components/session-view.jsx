import { useEffect, useRef, useState } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { ThemedText } from "@/components/themed-text"
import {
  PrimaryLightButton,
  PrimaryDarkButton,
  DestructiveOutlineButton,
} from "@/components/buttons"
import { Colors } from "@/constants/theme"
import { useMatchmaking } from "@/features/matchmaking/socket-context"
import { useBusyAction } from "@/features/matchmaking/use-busy-action"

const STATUS_LABEL = {
  not_started: "Not started",
  running: "In progress",
  finished: "Completed",
}

const STARTER_COUNTDOWN_SECONDS = 5 * 60

/** Re-renders every `intervalMs` so timestamp-based countdowns stay live. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Formats seconds as "M:SS", clamping negatives to 0:00. */
function formatMMSS(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function SessionView() {
  const {
    match,
    stopStates,
    startStop,
    finishStop,
    starters,
    resetMatchmaking,
  } = useMatchmaking()
  const [busy, run] = useBusyAction()
  const now = useNow()

  const session = match?.session
  const route = match?.route
  const stops = match?.stops ?? []

  // stopStates only carries a status string, so record when each stop began
  // running to drive the duration countdown (client-side, approximate).
  const startedAtRef = useRef({})
  useEffect(() => {
    for (const [stopId, state] of Object.entries(stopStates)) {
      if (state === "running" && !startedAtRef.current[stopId]) {
        startedAtRef.current[stopId] = Date.now()
      }
    }
  }, [stopStates])

  // Only the first not-yet-finished stop is shown at a time.
  const currentStop = stops.find(
    (stop) => (stopStates[stop.id] ?? "not_started") !== "finished",
  )
  const currentState = currentStop
    ? (stopStates[currentStop.id] ?? "not_started")
    : null

  const latestStarter = starters[0]
  const showStarter = currentState === "running" && latestStarter
  const starterRemaining = latestStarter
    ? STARTER_COUNTDOWN_SECONDS - (now - latestStarter.receivedAt) / 1000
    : 0

  const stopRemaining =
    currentStop && currentState === "running"
      ? currentStop.plannedDurationMinutes * 60 -
        (now - (startedAtRef.current[currentStop.id] ?? now)) / 1000
      : 0

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="title">{route?.name ?? "Your pub hop"}</ThemedText>
      <ThemedText style={styles.muted}>
        Start the timer when you arrive at each stop. A conversation starter
        appears here while the stop is running.
      </ThemedText>

      {showStarter && (
        <View style={styles.section}>
          <ThemedText type="subtitle">Conversation starter</ThemedText>
          <View style={styles.starterCard}>
            <ThemedText style={styles.starterMeta}>
              minute {latestStarter.triggerMinute}
              {latestStarter.starter?.category
                ? ` · ${latestStarter.starter.category}`
                : ""}
              {` · ${formatMMSS(starterRemaining)}`}
            </ThemedText>
            <ThemedText type="defaultSemiBold">
              {latestStarter.starter?.prompt}
            </ThemedText>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <ThemedText type="subtitle">Stops</ThemedText>
        {stops.length === 0 && (
          <ThemedText style={styles.mutedSmall}>
            No stops on this route.
          </ThemedText>
        )}
        {stops.length > 0 && !currentStop && (
          <ThemedText style={styles.mutedSmall}>All stops complete.</ThemedText>
        )}
        {currentStop && (
          <View style={styles.stopCard}>
            <View style={styles.stopHeader}>
              <ThemedText type="defaultSemiBold">
                Stop {currentStop.order}
              </ThemedText>
              <ThemedText style={styles.badge}>
                {STATUS_LABEL[currentState]}
              </ThemedText>
            </View>
            <ThemedText style={styles.mutedSmall}>
              Planned {currentStop.plannedDurationMinutes} min
            </ThemedText>
            {currentState === "running" && (
              <ThemedText style={styles.countdown}>
                {stopRemaining <= 0
                  ? "Time's up"
                  : `Time left ${formatMMSS(stopRemaining)}`}
              </ThemedText>
            )}
            {currentState === "not_started" && (
              <PrimaryLightButton
                title={busy ? "Working…" : "Start stop"}
                disabled={busy || !session}
                onPress={() => run(() => startStop(session.id, currentStop.id))}
              />
            )}
            {currentState === "running" && (
              <PrimaryDarkButton
                title={busy ? "Working…" : "Finish stop"}
                disabled={busy || !session}
                onPress={() =>
                  run(() => finishStop(session.id, currentStop.id))
                }
              />
            )}
          </View>
        )}
      </View>

      <DestructiveOutlineButton
        title="Finish & exit"
        disabled={busy}
        onPress={resetMatchmaking}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 18,
  },
  muted: {
    color: "#555",
  },
  mutedSmall: {
    color: "#777",
    fontSize: 13,
  },
  section: {
    gap: 12,
  },
  stopCard: {
    gap: 8,
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
  },
  stopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.darkGreenColor,
  },
  starterCard: {
    gap: 4,
    backgroundColor: "rgba(84,140,47,0.10)",
    borderRadius: 12,
    padding: 14,
  },
  starterMeta: {
    fontSize: 12,
    color: "#777",
  },
  countdown: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.darkGreenColor,
  },
})
