import { StatusBar } from "expo-status-bar"
import { ScrollView, StyleSheet } from "react-native"
import MapView, { Marker, Callout, Polyline } from "react-native-maps"
import { ThemedView } from "@/components/themed-view"
import { ThemedText } from "@/components/themed-text"
import { useEffect, useState } from "react"
import * as Location from "expo-location"
import { API_URL } from "@/constants/api"

export default function App() {
  const [location, setLocation] = useState(null)
  const [venues, setVenues] = useState([])
  const [route, setRoute] = useState([])
  const [selectedVenue, setSelectedVenue] = useState(null)

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

        console.log("Full response:", json)

        const venueList = json.result?.venues ?? []

        console.log("Venues:", venueList)

        setVenues(venueList)
      } catch (error) {
        console.error("Failed to load venues", error)
        setVenues([])
      }
    }

    loadVenues()
  }, [])

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

  async function getRoute(venue) {
    if (!location) return

    const startLat = location.coords.latitude
    const startLng = location.coords.longitude

    const endLat = Number(venue.latitude)
    const endLng = Number(venue.longitude)

    // OSRM (Open Source Routing Machine) free api for routes
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
      );
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
      setSelectedVenue(venue)
    } catch (error) {
      console.error("Route error:", error)
      setRoute([])
      setSelectedVenue(null)
    }
  }

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
            onPress={() => getRoute(venue)}
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
