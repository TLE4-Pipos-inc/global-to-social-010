import { StyleSheet } from "react-native"
import { ThemedText } from "@/components/themed-text"
import { Colors, Fonts } from "@/constants/theme"
import { useMatchmaking } from "@/features/matchmaking/socket-context"
import { useActiveStop, formatMMSS } from "@/features/matchmaking/use-active-stop"

/** "Stop x/y" counter shown on the left of the app header during a session. */
export function SessionStopCounter() {
  const { stopIndex, totalStops } = useActiveStop()
  if (stopIndex < 0 || totalStops === 0) return null
  return (
    <ThemedText style={styles.left}>
      Stop {stopIndex + 1}/{totalStops}
    </ThemedText>
  )
}

/** Active venue (location) name shown as the centered app header title. */
export function SessionHeaderTitle() {
  const { match } = useMatchmaking()
  const { currentStop } = useActiveStop()
  const title = currentStop?.venueName ?? match?.route?.name ?? "Your pub hop"
  return (
    <ThemedText numberOfLines={1} style={styles.title}>
      {title}
    </ThemedText>
  )
}

/** Live countdown for the running stop, shown on the right of the app header. */
export function SessionTimer() {
  const { currentState, stopRemaining } = useActiveStop()
  if (currentState !== "running") return null
  return <ThemedText style={styles.right}>{formatMMSS(stopRemaining)}</ThemedText>
}

const styles = StyleSheet.create({
  left: {
    paddingLeft: 16,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.darkGreenColor,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.darkGreenColor,
  },
  right: {
    paddingRight: 16,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.darkGreenColor,
  },
})
