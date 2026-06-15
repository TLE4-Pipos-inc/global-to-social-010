import { useState, useEffect } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import MapView, { Marker, Polyline } from "react-native-maps"
import * as Location from "expo-location"
import { ChevronDown, ChevronUp } from "lucide-react-native"
import { ThemedText } from "@/components/themed-text"
import {
  PrimaryLightButton,
  DestructiveOutlineButton,
} from "@/components/buttons"
import { Colors } from "@/constants/theme"
import { useMatchmaking } from "@/features/matchmaking/socket-context"
import { useBusyAction } from "@/features/matchmaking/use-busy-action"
import {
  useActiveStop,
  formatMMSS,
} from "@/features/matchmaking/use-active-stop"

const STARTER_COUNTDOWN_SECONDS = 5 * 60

export function SessionView() {
  const { match, startStop, finishStop, starters, resetMatchmaking } =
    useMatchmaking()
  const [busy, run] = useBusyAction()
  const { now, stops, currentStop, currentState } = useActiveStop()

  const session = match?.session

  const latestStarter = currentStop
    ? starters.find((starter) => starter.stopId === currentStop.id)
    : null
  const showStarter = currentState === "running" && Boolean(latestStarter)
  const starterRemaining = latestStarter
    ? STARTER_COUNTDOWN_SECONDS - (now - latestStarter.receivedAt) / 1000
    : 0

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {stops.length === 0 && (
        <ThemedText style={styles.mutedSmall}>
          No stops on this route.
        </ThemedText>
      )}
      {stops.length > 0 && !currentStop && (
        <ThemedText style={styles.mutedSmall}>All stops complete.</ThemedText>
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

      {currentStop && <InformationBox stop={currentStop} />}

      {currentState === "not_started" && (
        <PrimaryLightButton
          title={busy ? "Working…" : "Start stop"}
          disabled={busy || !session}
          onPress={() => run(() => startStop(session.id, currentStop.id))}
        />
      )}
      {currentState === "running" && (
        <PrimaryLightButton
          title={busy ? "Working…" : "Finish stop"}
          disabled={busy || !session}
          onPress={() => run(() => finishStop(session.id, currentStop.id))}
        />
      )}

      <DestructiveOutlineButton
        title="Finish & exit"
        disabled={busy}
        onPress={resetMatchmaking}
      />
    </ScrollView>
  )
}

/** Collapsible card revealing venue details for the active stop. */
function InformationBox({ stop }) {
  const [open, setOpen] = useState(false)
  const [location, setLocation] = useState(null)
  const [route, setRoute] = useState([])
  const Chevron = open ? ChevronDown : ChevronUp
  const details = [
    ["Type", stop.venueType],
    ["Address", stop.address],
    ["Vibe", stop.vibe],
  ].filter(([, value]) => Boolean(value))

  // Watch user's current location
  useEffect(() => {
    let subscription
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        console.error("Permission to access location was denied")
        return
      }
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Low,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (newLocation) => {
          setLocation(newLocation)
        }
      )
    }
    getCurrentLocation()
    return () => subscription?.remove()
  }, [])

  useEffect(() => {
    if (!location || !stop.latitude || !stop.longitude) {
      setRoute([])
      return
    }

    async function getRoute() {
      try {
        const startLat = location.coords.latitude
        const startLng = location.coords.longitude
        const endLat = Number(stop.latitude)
        const endLng = Number(stop.longitude)

        const response = await fetch(
          `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
        )
        if (!response.ok) {
          throw new Error(`OSRM request failed: ${response.status}`)
        }
        const data = await response.json()
        if (!data?.routes?.length) {
          throw new Error("No route returned by OSRM")
        }
        const coordinates = data.routes[0].geometry.coordinates.map((coord) => ({
          latitude: coord[1],
          longitude: coord[0],
        }))
        setRoute(coordinates)
      } catch (error) {
        console.error("Route error:", error)
        setRoute([])
      }
    }

    getRoute()
  }, [location, stop.latitude, stop.longitude])

  return (
    <View style={styles.stopCard}>
      <Pressable style={styles.infoHeader} onPress={() => setOpen((v) => !v)}>
        <ThemedText type="subtitle">Information</ThemedText>
        <Chevron size={22} color={Colors.darkGreenColor} />
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
          {stop.latitude && stop.longitude && (
            <View style={{ marginTop: 12 }}>
              <MapView
                style={styles.miniMap}
                initialRegion={{
                  latitude: Number(stop.latitude),
                  longitude: Number(stop.longitude),
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
                loadingEnabled={true}
              >
                {route.length > 0 && (
                  <Polyline coordinates={route} strokeWidth={5} strokeColor="blue" />
                )}
                <Marker
                  coordinate={{
                    latitude: Number(stop.latitude),
                    longitude: Number(stop.longitude),
                  }}
                  title={stop.name || "Destination"}
                />
              </MapView>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
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
  miniMap: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
  },
})
