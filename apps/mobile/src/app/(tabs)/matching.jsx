import { Suspense, useEffect, useRef, useState } from "react"
import { router, useNavigation } from "expo-router"
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Colors } from "@/constants/theme"
import { useMatchmaking } from "@/features/matchmaking/socket-context"
import { PartyView } from "@/features/matchmaking/components/party-view"
import { SearchingView } from "@/features/matchmaking/components/searching-view"
import { LobbyView } from "@/features/matchmaking/components/lobby-view"
import { SessionView } from "@/features/matchmaking/components/session-view"
import { HeaderBackButton } from "@/components/header-back-button"
import { useLocalSearchParams } from "expo-router"
import {
  SessionHeaderTitle,
  SessionStopCounter,
  SessionTimer,
} from "@/features/matchmaking/components/session-header"

function derivePhase({ match, party, sessionStarted }) {
  if (match && sessionStarted) return "session"
  if (match) return "lobby"
  if (party?.status === "queued") return "searching"
  return "party"
}

// expo-router params are string | string[]; take the first value.
function firstParam(value) {
  return Array.isArray(value) ? value[0] : value
}

export default function Matching() {
  // Navigation carries the theme + route the user picked on the route screen.
  // `auto: "solo"` means "Quick queue this route" — queue solo on arrival
  // without the create/invite party flow.
  const params = useLocalSearchParams()
  const themeId = firstParam(params.themeId)
  const routeId = firstParam(params.routeId)
  const routeName = firstParam(params.routeName)
  const auto = firstParam(params.auto)

  const navigation = useNavigation()
  const mm = useMatchmaking()
  const { status, match, party, sessionStarted, lastError, clearError, quickMatch } = mm

  // true while the background party-create + queue is in flight; starts true
  // when auto=solo so the party screen is never shown even for a single frame.
  const [isAutoQueuing, setIsAutoQueuing] = useState(auto === "solo")

  // Surface socket / matchmaking errors as a toast, then clear them.
  useEffect(() => {
    if (!lastError) return
    Alert.alert("Matchmaking", lastError.message ?? "Something went wrong")
    clearError()
  }, [lastError, clearError])

  // "Quick queue this route": once connected and not already in a party/match,
  // create a solo party and queue it for the chosen theme+route. Fire once.
  const autoQueued = useRef(false)
  useEffect(() => {
    if (auto !== "solo" || autoQueued.current) return
    if (status !== "connected" || party || match) return
    autoQueued.current = true
    quickMatch(themeId ?? null, routeId ?? null)
      .catch(() => {})
      .finally(() => setIsAutoQueuing(false))
  }, [auto, status, party, match, themeId, routeId, quickMatch])

  const phase = derivePhase({ match, party, sessionStarted })

  // During a session, the app header carries the live stop counter, location
  // title, and timer; other phases fall back to the static "Matching" title.
  useEffect(() => {
    if (phase === "session") {
      navigation.setOptions({
        headerTitle: () => <SessionHeaderTitle />,
        headerLeft: () => <SessionStopCounter />,
        headerRight: () => <SessionTimer />,
      })
    } else if (phase === "party" && !party) {
      // Only the "find your group" screen (no party yet) gets a back button to
      // return to route selection. Once in a party, the "Leave party" button
      // handles backing out instead.
      navigation.setOptions({
        headerTitle: undefined,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() =>
              router.navigate({
                pathname: "/routes",
                params: themeId ? { id: themeId } : {},
              })
            }
          />
        ),
        headerRight: undefined,
      })
    } else {
      navigation.setOptions({
        headerTitle: undefined,
        headerLeft: undefined,
        headerRight: undefined,
      })
    }
  }, [phase, party, themeId, navigation])

  return (
    <ThemedView style={styles.container}>
      <ConnectionBanner status={status} />
      <Suspense
        fallback={
          <ActivityIndicator
            size="large"
            color={Colors.lightGreenColor}
            style={styles.loader}
          />
        }
      >
        {phase === "party" && !isAutoQueuing && (
          <PartyView themeId={themeId} routeId={routeId} routeName={routeName} />
        )}
        {phase === "party" && isAutoQueuing && (
          <ActivityIndicator
            size="large"
            color={Colors.lightGreenColor}
            style={styles.loader}
          />
        )}
        {phase === "searching" && <SearchingView />}
        {phase === "lobby" && <LobbyView />}
        {phase === "session" && <SessionView />}
      </Suspense>
    </ThemedView>
  )
}

function ConnectionBanner({ status }) {
  if (status === "connected") return null
  const label =
    status === "connecting"
      ? "Connecting…"
      : status === "error"
        ? "Connection error — retrying…"
        : "Offline"
  return (
    <View style={styles.banner}>
      <ThemedText style={styles.bannerText}>{label}</ThemedText>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    marginTop: 60,
  },
  banner: {
    backgroundColor: Colors.orangeColor,
    paddingVertical: 6,
    alignItems: "center",
  },
  bannerText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
})
