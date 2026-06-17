import { useState } from "react"
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Check, ChevronDown, ChevronUp } from "lucide-react-native"
import { ThemedText } from "@/components/themed-text"
import {
  PrimaryLightButton,
  DestructiveOutlineButton,
} from "@/components/buttons"
import { Colors } from "@/constants/theme"
import { useAccountQuery } from "@/features/auth"
import { useMatchmaking } from "@/features/matchmaking/socket-context"
import { useBusyAction } from "@/features/matchmaking/use-busy-action"
import {
  useActiveStop,
  formatMMSS,
} from "@/features/matchmaking/use-active-stop"
import { useOSRMRoute } from "@/features/matchmaking/use-osrm-route"
import { useStopPresence } from "@/features/matchmaking/use-stop-presence"
import { StopPhotoPrompt } from "@/features/matchmaking/components/stop-photo-prompt"
import { SessionCollage } from "@/features/matchmaking/components/session-collage"
import { StopMap } from "@/features/matchmaking/components/stop-map"
import { StopDeals } from "@/features/matchmaking/components/stop-deals"

const STARTER_COUNTDOWN_SECONDS = 5 * 60

export function SessionView() {
  const { match, startStop, finishStop, starters, resetMatchmaking, photoRequest } =
    useMatchmaking()
  const { data: account } = useAccountQuery()
  const myId = account?.result?.id ?? account?.id ?? account?.user?.id
  const insets = useSafeAreaInsets()
  const [busy, run] = useBusyAction()
  const { now, stops, currentStop, currentState } = useActiveStop()

  const session = match?.session

  // Geofence gate: members stream their location and the server reports who is
  // within range. A stop only starts once everyone is present. Venues without
  // coordinates can't be fenced, so they fall back to the prior behaviour.
  const presence = useStopPresence({
    session,
    stop: currentStop,
    active: currentState === "not_started",
  })
  const requiresPresence = currentStop?.latitude != null && currentStop?.longitude != null
  const allPresent = !requiresPresence || (presence?.allPresent ?? false)

  const latestStarter = currentStop
    ? starters.find((starter) => starter.stopId === currentStop.id)
    : null
  const showStarter = currentState === "running" && Boolean(latestStarter)
  const starterRemaining = latestStarter
    ? STARTER_COUNTDOWN_SECONDS - (now - latestStarter.receivedAt) / 1000
    : 0

  function confirmFinishAndExit() {
    Alert.alert(
      "Finish & exit?",
      "This leaves the session and returns you to matchmaking.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish & exit",
          style: "destructive",
          onPress: resetMatchmaking,
        },
      ],
    )
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {stops.length === 0 && (
        <ThemedText style={styles.mutedSmall}>
          No stops on this route.
        </ThemedText>
      )}
      {stops.length > 0 && !currentStop && (
        <SessionCollage stops={stops} />
      )}

      {showStarter && (
        <View style={styles.starterCard}>
          <ThemedText style={styles.starterInterest}>
            {latestStarter.starter?.interestName ?? "General"}
          </ThemedText>
          <View style={styles.starterBody}>
            <ThemedText type="defaultSemiBold" style={styles.starterPrompt}>
              {latestStarter.starter?.prompt}
            </ThemedText>
          </View>
          <View style={styles.starterFooter}>
            <ThemedText style={styles.footerTime}>
              {formatMMSS(starterRemaining)}
            </ThemedText>
          </View>
        </View>
      )}

      {currentStop && currentState === "not_started" && (
        <StopMap stop={currentStop} />
      )}

      {currentStop && currentState !== "awaiting_photo" && (
        <StopDeals deals={currentStop.activeDeals ?? []} />
      )}

      {currentStop && currentState !== "awaiting_photo" && (
        <InformationBox stop={currentStop} />
      )}

      {currentState === "not_started" && (
        <>
          {requiresPresence && !allPresent && (
            <ThemedText style={styles.mutedSmall}>
              {presence
                ? `Waiting for all members — ${presence.present.length}/${presence.total} at this stop`
                : "Waiting for all members to arrive…"}
            </ThemedText>
          )}
          <PrimaryLightButton
            title={busy ? "Working…" : "Start stop"}
            disabled={busy || !session || !allPresent}
            onPress={() => run(() => startStop(session.id, currentStop.id))}
          />
        </>
      )}
      {currentState === "running" && (
        <PrimaryLightButton
          title={busy ? "Working…" : "Finish stop"}
          disabled={busy || !session}
          onPress={() => run(() => finishStop(session.id, currentStop.id))}
        />
      )}
      {currentState === "awaiting_photo" && (
        <StopPhotoPrompt
          stop={currentStop}
          photoRequest={photoRequest}
          myId={myId}
          match={match}
        />
      )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>
        <DestructiveOutlineButton
          title="Finish & exit"
          disabled={busy}
          onPress={confirmFinishAndExit}
        />
      </View>
    </View>
  )
}

/** Collapsible card revealing venue details for the active stop. */
function InformationBox({ stop }) {
  const [open, setOpen] = useState(stop.isPartner)
  const Chevron = open ? ChevronDown : ChevronUp
  const details = [
    ["Type", stop.venueType],
    ["Address", stop.address],
    ["Vibe", stop.vibe],
  ].filter(([, value]) => Boolean(value))

  return (
    <View style={styles.stopCard}>
      <Pressable style={styles.infoHeader} onPress={() => setOpen((v) => !v)}>
        <View style={styles.infoHeaderSide}>
          {stop.isPartner && (
            <View style={styles.partnerBadge}>
              <Check size={14} color="#fff" />
              <ThemedText style={styles.partnerBadgeText}>Partner</ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="subtitle">Information</ThemedText>
        <View style={[styles.infoHeaderSide, styles.infoHeaderRight]}>
          <Chevron size={22} color={Colors.darkGreenColor} />
        </View>
      </Pressable>
      {open && (
        <View style={styles.infoBody}>
          {details.map(([label, value]) => (
            <ThemedText key={label} style={styles.infoLine}>
              <ThemedText style={styles.infoLabel}>{label}: </ThemedText>
              {value}
            </ThemedText>
          ))}
          {stop.description && (
            <ThemedText style={styles.infoLine}>{stop.description}</ThemedText>
          )}
          {details.length === 0 && !stop.description && (
            <ThemedText style={styles.mutedSmall}>
              No venue details available.
            </ThemedText>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.offWhite,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    gap: 18,
  },
  mutedSmall: {
    color: "#777",
    fontSize: 13,
  },
  stopCard: {
    gap: 8,
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoHeaderSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  infoHeaderRight: {
    justifyContent: "flex-end",
  },
  partnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.lightGreenColor,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  partnerBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  infoBody: {
    gap: 6,
  },
  infoLine: {
    fontSize: 14,
  },
  infoLabel: {
    fontWeight: "700",
  },
  starterCard: {
    borderWidth: 2,
    borderColor: Colors.lightGreenColor,
    borderRadius: 16,
    backgroundColor: Colors.background,
    overflow: "hidden",
  },
  starterInterest: {
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.lightGreenColor,
  },
  starterBody: {
    minHeight: 160,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  starterPrompt: {
    textAlign: "center",
    fontSize: 18,
  },
  starterFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.orangeColor,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerTime: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
})
