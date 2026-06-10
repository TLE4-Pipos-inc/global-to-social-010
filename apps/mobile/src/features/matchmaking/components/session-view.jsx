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

export function SessionView() {
  const { match, stopStates, startStop, finishStop, starters, resetMatchmaking } =
    useMatchmaking()
  const [busy, run] = useBusyAction()

  const session = match?.session
  const route = match?.route
  const stops = match?.stops ?? []

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="title">{route?.name ?? "Your pub hop"}</ThemedText>
      <ThemedText style={styles.muted}>
        Start the timer when you arrive at each stop. Conversation starters appear
        below while a stop is running.
      </ThemedText>

      <View style={styles.section}>
        <ThemedText type="subtitle">Stops</ThemedText>
        {stops.length === 0 && (
          <ThemedText style={styles.mutedSmall}>
            No stops on this route.
          </ThemedText>
        )}
        {stops.map((stop) => {
          const state = stopStates[stop.id] ?? "not_started"
          return (
            <View key={stop.id} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <ThemedText type="defaultSemiBold">Stop {stop.order}</ThemedText>
                <ThemedText style={styles.badge}>{STATUS_LABEL[state]}</ThemedText>
              </View>
              <ThemedText style={styles.mutedSmall}>
                Planned {stop.plannedDurationMinutes} min
              </ThemedText>
              {state === "not_started" && (
                <PrimaryLightButton
                  title={busy ? "Working…" : "Start stop"}
                  disabled={busy}
                  onPress={() => run(() => startStop(session.id, stop.id))}
                />
              )}
              {state === "running" && (
                <PrimaryDarkButton
                  title={busy ? "Working…" : "Finish stop"}
                  disabled={busy}
                  onPress={() => run(() => finishStop(session.id, stop.id))}
                />
              )}
            </View>
          )
        })}
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle">Conversation starters</ThemedText>
        {starters.length === 0 ? (
          <ThemedText style={styles.mutedSmall}>
            Starters will appear here once a stop timer is running.
          </ThemedText>
        ) : (
          starters.map((entry) => (
            <View key={entry.receivedAt} style={styles.starterCard}>
              <ThemedText style={styles.starterMeta}>
                minute {entry.triggerMinute}
                {entry.starter?.category ? ` · ${entry.starter.category}` : ""}
              </ThemedText>
              <ThemedText type="defaultSemiBold">{entry.starter?.prompt}</ThemedText>
            </View>
          ))
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
})
