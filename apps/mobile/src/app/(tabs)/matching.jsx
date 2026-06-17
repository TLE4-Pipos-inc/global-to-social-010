import { Suspense, useEffect } from "react"
import { useNavigation } from "expo-router"
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Colors } from "@/constants/theme"
import { useMatchmaking } from "@/features/matchmaking/socket-context"
import { PartyView } from "@/features/matchmaking/components/party-view"
import { SearchingView } from "@/features/matchmaking/components/searching-view"
import { LobbyView } from "@/features/matchmaking/components/lobby-view"
import { SessionView } from "@/features/matchmaking/components/session-view"
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

export default function Matching() {
  const { id } = useLocalSearchParams()
  console.log(id)
  const navigation = useNavigation()
  const mm = useMatchmaking()
  const { status, match, party, sessionStarted, lastError, clearError } = mm

  // Surface socket / matchmaking errors as a toast, then clear them.
  useEffect(() => {
    if (!lastError) return
    Alert.alert("Matchmaking", lastError.message ?? "Something went wrong")
    clearError()
  }, [lastError, clearError])

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
    } else {
      navigation.setOptions({
        headerTitle: undefined,
        headerLeft: undefined,
        headerRight: undefined,
      })
    }
  }, [phase, navigation])

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
        {phase === "party" && <PartyView />}
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
