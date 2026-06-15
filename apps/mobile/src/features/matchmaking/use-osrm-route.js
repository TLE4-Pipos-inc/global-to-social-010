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
    let active = true
    async function getCurrentLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          if (active) setError("Location permission denied")
          return
        }
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Low,
            timeInterval: 2000,
            distanceInterval: 1,
          },
            (newLocation) => {
            if (active) setLocation(newLocation)
          }
        )
          if (!active) {
            sub.remove()
            return
          }
          subscription = sub
        } catch (err) {
          if (active) setError("Unable to start location tracking")
        }
    }
    getCurrentLocation()
    return () => {
      active = false
      subscription?.remove()
      }
  }, [])

  // Fetch route from OSRM when location or destination changes
  useEffect(() => {
    const endLat = Number(destLatitude)
    const endLng = Number(destLongitude)
    if (!location || !Number.isFinite(endLat) || !Number.isFinite(endLng)) {
      setRoute([])
      setError(null)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    let active = true

    async function fetchRoute() {
      try {
        setError(null)
        const startLat = location.coords.latitude
        const startLng = location.coords.longitude

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
        if (active) setRoute(coordinates)
      } catch (err) {
        if (err?.name === "AbortError") return
        if (active) {
          setError(err.message)
          setRoute([])
        }
      }
    }

    fetchRoute()
    return () => {
      active = false
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [location, destLatitude, destLongitude])

  return { route, location, error }
}

