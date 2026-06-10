import { useState } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { ThemedText } from "@/components/themed-text"
import { PrimaryLightButton } from "@/components/buttons"
import { Colors } from "@/constants/theme"
import { useMatchmaking } from "@/features/matchmaking/socket-context"
import { useBusyAction } from "@/features/matchmaking/use-busy-action"

export function LobbyView() {
  const { match, sessionReady: readyCounter, readyUp } = useMatchmaking()
  const [busy, run] = useBusyAction()
  const [readied, setReadied] = useState(false)

  const { group, route, members = [], matchScore, session } = match ?? {}
  const scorePct = Math.round(Math.min(100, Math.max(0, (matchScore ?? 0) * 100)))

  async function onReady() {
    await run(async () => {
      await readyUp(session.id)
      setReadied(true)
    })
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <ThemedText type="title">Match found! 🎉</ThemedText>
        <ThemedText style={styles.score}>{scorePct}% match</ThemedText>
      </View>

      {group?.groupName && (
        <ThemedText type="subtitle">{group.groupName}</ThemedText>
      )}

      {route ? (
        <View style={styles.card}>
          <ThemedText style={styles.muted}>Your route</ThemedText>
          <ThemedText type="defaultSemiBold">{route.name}</ThemedText>
          <ThemedText style={styles.mutedSmall}>
            {[route.area, route.city].filter(Boolean).join(", ")}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.card}>
          <ThemedText style={styles.mutedSmall}>
            You&apos;ve been matched, but no route is configured yet. Ask an admin
            to activate a route to start a session.
          </ThemedText>
        </View>
      )}

      <View style={styles.card}>
        <ThemedText type="subtitle">Group ({members.length})</ThemedText>
        {members.map((m) => (
          <View key={m.userId} style={styles.memberRow}>
            <ThemedText type="defaultSemiBold">{m.name}</ThemedText>
            <ThemedText style={styles.mutedSmall}>{m.role}</ThemedText>
          </View>
        ))}
      </View>

      {session ? (
        <View style={styles.actions}>
          <PrimaryLightButton
            title={readied ? "You're ready ✓" : busy ? "Working…" : "I'm ready"}
            disabled={busy || readied}
            onPress={onReady}
          />
          {readyCounter && (
            <ThemedText style={styles.readyText}>
              {readyCounter.ready} / {readyCounter.total} ready
            </ThemedText>
          )}
          <ThemedText style={styles.mutedSmall}>
            The pub hop starts automatically once everyone is ready.
          </ThemedText>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 18,
  },
  hero: {
    alignItems: "center",
    gap: 6,
  },
  score: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.lightGreenColor,
  },
  muted: {
    color: "#555",
  },
  mutedSmall: {
    color: "#777",
    fontSize: 13,
  },
  card: {
    gap: 8,
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
  },
  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  actions: {
    gap: 10,
    alignItems: "center",
  },
  readyText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.darkGreenColor,
  },
})
