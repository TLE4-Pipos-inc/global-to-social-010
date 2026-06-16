import { StatusBar } from "expo-status-bar"
import { ScrollView, StyleSheet } from "react-native"
import MapView, { Marker, Callout, Polyline } from "react-native-maps"
import { ThemedView } from "@/components/themed-view"
import { ThemedText } from "@/components/themed-text"
import { useEffect, useState } from "react"
import { API_URL } from "@/constants/api"
import { useOSRMRoute } from "@/features/matchmaking/use-osrm-route"

export default function App() {
  const [venues, setVenues] = useState([])
  const [selectedVenue, setSelectedVenue] = useState(null)

  // Use OSRM hook for route calculation
  const { route, location } = useOSRMRoute(
    selectedVenue?.latitude,
    selectedVenue?.longitude
  )

  useEffect(() => {
    async function loadVenues() {
      try {
        const response = await fetch(`${API_URL}/api/venues`, {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        })

        const contentType = response.headers.get("content-type") ?? ""

        if (!response.ok || !contentType.includes("application/json")) {
          const text = await response.text()
          throw new Error(text.slice(0, 120) || "Could not load venues")
        }

        const json = await response.json()
        const venueList = json.result?.venues ?? []
        setVenues(venueList)
      } catch (error) {
        console.error("Failed to load venues", error)
        setVenues([])
      }
    }

    loadVenues()
  }, [])


  return (
    <ThemedView style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={true}
        initialRegion={
          location
            ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : {
                latitude: 51.9244,
                longitude: 4.4777,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }
        }
      >
        {route.length > 0 && (
          <Polyline coordinates={route} strokeWidth={5} strokeColor="blue" />
        )}
        {venues.map((venue) => (
          <Marker
            key={venue.id}
            coordinate={{
              latitude: Number(venue.latitude),
              longitude: Number(venue.longitude),
            }}
            onPress={() => setSelectedVenue(venue)}
          >
            <Callout style={{ height: 100, width: 400 }}>
              <ThemedView style={styles.popup}>
                <ScrollView>
                  <ThemedText style={{ fontWeight: "bold" }}>
                    {venue.name}
                  </ThemedText>
                  <ThemedText>{venue.description}</ThemedText>
                </ScrollView>
              </ThemedView>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <StatusBar style="auto" />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  popup: {
    padding: 15,
    maxWidth: "80%",
  },
})
