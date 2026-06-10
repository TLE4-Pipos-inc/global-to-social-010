import { useState } from "react"
import { ScrollView, StyleSheet, TextInput, View } from "react-native"
import { ThemedText } from "@/components/themed-text"
import {
  PrimaryLightButton,
  PrimaryDarkButton,
  DestructiveOutlineButton,
} from "@/components/buttons"
import { Colors } from "@/constants/theme"
import { useAccountQuery } from "@/features/auth"
import { useMatchmaking } from "@/features/matchmaking/socket-context"

export function PartyView() {
  const { data: account } = useAccountQuery()
  // `/api/auth/me` returns the user wrapped as { result: user }; fall back to
  // other shapes defensively so leader detection still works.
  const myId = account?.result?.id ?? account?.id ?? account?.user?.id
  const { party, createParty, joinParty, leaveParty, kickMember, queueParty } =
    useMatchmaking()

  const [inviteCode, setInviteCode] = useState("")
  const [busy, setBusy] = useState(false)

  // Errors are surfaced globally via the provider's lastError → Alert, so we
  // only need to settle the busy flag here.
  async function call(fn) {
    setBusy(true)
    try {
      await fn()
    } catch {
      // already surfaced
    } finally {
      setBusy(false)
    }
  }

  if (!party) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Find your group</ThemedText>
        <ThemedText style={styles.muted}>
          Create a party and invite friends, or join one with a code. Then queue
          to get matched with other students.
        </ThemedText>

        <View style={styles.card}>
          <ThemedText type="subtitle">Start a party</ThemedText>
          <PrimaryLightButton
            title={busy ? "Working…" : "Create party"}
            disabled={busy}
            onPress={() => call(createParty)}
          />
        </View>

        <View style={styles.card}>
          <ThemedText type="subtitle">Join a party</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Invite code"
            autoCapitalize="characters"
            autoCorrect={false}
            value={inviteCode}
            onChangeText={setInviteCode}
          />
          <PrimaryDarkButton
            title="Join with code"
            disabled={busy || !inviteCode.trim()}
            onPress={() => call(() => joinParty(inviteCode.trim()))}
          />
        </View>
      </ScrollView>
    )
  }

  const isLeader = party.leaderId === myId

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="title">Your party</ThemedText>

      <View style={styles.card}>
        <ThemedText style={styles.muted}>Invite code</ThemedText>
        <ThemedText style={styles.code}>{party.inviteCode}</ThemedText>
        <ThemedText style={styles.mutedSmall}>
          Share this code so others can join your party.
        </ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText type="subtitle">
          Members ({party.members.length})
        </ThemedText>
        {party.members.map((m) => {
          const isMe = m.userId === myId
          const isHost = m.userId === party.leaderId
          return (
            <View key={m.userId} style={styles.memberRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">
                  {m.name}
                  {isMe ? " (you)" : ""}
                </ThemedText>
                <ThemedText style={styles.mutedSmall}>
                  {isHost ? "Host" : "Member"}
                  {m.campus ? ` · ${m.campus}` : ""}
                </ThemedText>
              </View>
              {isLeader && !isHost && (
                <DestructiveOutlineButtonSmall
                  title="Kick"
                  disabled={busy}
                  onPress={() => call(() => kickMember(m.userId))}
                />
              )}
            </View>
          )
        })}
      </View>

      <View style={styles.actions}>
        {isLeader ? (
          <PrimaryLightButton
            title={busy ? "Working…" : "Find a group"}
            disabled={busy}
            onPress={() => call(queueParty)}
          />
        ) : (
          <ThemedText style={styles.muted}>
            Waiting for the host to start matchmaking…
          </ThemedText>
        )}
        <DestructiveOutlineButton
          title="Leave party"
          disabled={busy}
          onPress={() => call(leaveParty)}
        />
      </View>
    </ScrollView>
  )
}

// A compact destructive button for inline use in member rows.
function DestructiveOutlineButtonSmall({ title, onPress, disabled }) {
  return (
    <View style={[styles.kickBtn, disabled && styles.kickBtnDisabled]}>
      <ThemedText style={styles.kickText} onPress={disabled ? undefined : onPress}>
        {title}
      </ThemedText>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 20,
  },
  muted: {
    color: "#555",
  },
  mutedSmall: {
    color: "#777",
    fontSize: 13,
  },
  card: {
    gap: 12,
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.darkGreenColor,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  code: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 4,
    color: Colors.darkGreenColor,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  actions: {
    gap: 12,
  },
  kickBtn: {
    borderWidth: 1,
    borderColor: Colors.dangerColor,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  kickBtnDisabled: {
    opacity: 0.5,
  },
  kickText: {
    color: Colors.dangerColor,
    fontWeight: "600",
  },
})
