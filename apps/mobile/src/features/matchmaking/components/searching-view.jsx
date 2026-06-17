import { ActivityIndicator, StyleSheet, View } from "react-native"
import { ThemedText } from "@/components/themed-text"
import { DestructiveOutlineButton } from "@/components/buttons"
import { Colors } from "@/constants/theme"
import { useMatchmaking } from "@/features/matchmaking/socket-context"
import { useBusyAction } from "@/features/matchmaking/use-busy-action"

export function SearchingView() {
  const { party, queueStats, unqueueParty } = useMatchmaking()
  const [busy, run] = useBusyAction()

  const players = queueStats?.players ?? party?.members?.length ?? 0
  const parties = queueStats?.parties ?? 1

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.lightGreenColor} style={styles.loader} />
      <ThemedText type="title" style={styles.title}>Searching for a group…</ThemedText>
      <ThemedText style={styles.muted}>
        We&apos;re matching your party with other students in your time slot.
      </ThemedText>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <ThemedText style={styles.statValue}>{players}</ThemedText>
          <ThemedText style={styles.statLabel}>players waiting</ThemedText>
        </View>
      </View>

      <DestructiveOutlineButton
        title={busy ? "Cancelling…" : "Cancel search"}
        disabled={busy}
        onPress={() => run(unqueueParty)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    alignItems: "center",
    gap: 16,
  },
  loader: {
    transform: [{ scale: 1.4 }],
    marginBottom: 12,
  },
  muted: {
    color: "#555",
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 16,
  },
  stat: {
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  statValue: {
    padding: 12,
    fontSize: 36,
    fontWeight: "800",
    color: Colors.darkGreenColor,
  },
  statLabel: {
    color: "#777",
    fontSize: 13,
  },
  title: {
    textAlign: "center"
  }
})
