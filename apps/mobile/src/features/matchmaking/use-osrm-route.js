import { useState, useEffect } from "react"
import * as Location from "expo-location"

/**
 * Hook to compute a walking route from the user's current location to a destination.
 * Uses OSRM (Open Source Routing Machine) free API.
 *
 * @param {number} destLatitude - Destination latitude
 * @param {number} destLongitude - Destination longitude
 * @returns {{ route: Array, location: Object | null, error: string | null }}
 */
export function useOSRMRoute(destLatitude, destLongitude) {
  const [location, setLocation] = useState(null)
  const [route, setRoute] = useState([])
  const [error, setError] = useState(null)

  // Watch user's current location
  useEffect(() => {
    let subscription
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        console.error("Permission to access location was denied")
        setError("Location permission denied")
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

  // Fetch route from OSRM when location or destination changes
  useEffect(() => {
    if (!location || !destLatitude || !destLongitude) {
      setRoute([])
      setError(null)
      return
    }

    async function fetchRoute() {
      try {
        setError(null)
        const startLat = location.coords.latitude
        const startLng = location.coords.longitude
        const endLat = Number(destLatitude)
        const endLng = Number(destLongitude)

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
      } catch (err) {
        console.error("Route error:", err)
        setError(err.message)
        setRoute([])
      }
    }

    fetchRoute()
  }, [location, destLatitude, destLongitude])

  return { route, location, error }
}

