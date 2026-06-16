import { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { ThemedText } from "@/components/themed-text"
import { Colors } from "@/constants/theme"
import { fetchWithAuth } from "@/lib/api"

/**
 * End-of-crawl screen: a grid of every group selfie taken during the session.
 *
 * Photos are fetched per session stop (`?sessionStopId=`) rather than by group:
 * a stop only finishes after the server verifies a photo with that exact
 * `sessionStopId`, so this is guaranteed to find every selfie in crawl order.
 *
 * Each image is then pulled as a base64 data URI through the authenticated JSON
 * fetch and rendered directly — loading the raw `/file` URL in `expo-image`
 * proved unreliable on device, so we decode the bytes ourselves.
 */
export function SessionCollage({ stops = [] }) {
  const [state, setState] = useState({ status: "loading", photos: [] })

  // Stable key so the effect re-runs only when the set of stops changes.
  const stopIds = stops.map((s) => s.id).join(",")

  useEffect(() => {
    let active = true

    ;(async () => {
      const ids = stopIds ? stopIds.split(",") : []
      if (ids.length === 0) {
        if (active) setState({ status: "ready", photos: [] })
        return
      }
      try {
        // 1. Collect every photo id for this crawl, in crawl order.
        const perStop = await Promise.all(
          ids.map(async (id) => {
            const response = await fetchWithAuth(
              `/api/photos?sessionStopId=${encodeURIComponent(id)}`,
            )
            if (!response.ok) throw new Error("Could not load photos")
            const { result } = await response.json()
            return (result?.photos ?? []).sort((a, b) =>
              String(a.createdAt).localeCompare(String(b.createdAt)),
            )
          }),
        )

        // 2. Pull each image as a base64 data URI for direct rendering.
        const withData = await Promise.all(
          perStop.flat().map(async (photo) => {
            const response = await fetchWithAuth(
              `/api/photos/${encodeURIComponent(photo.id)}/base64`,
            )
            if (!response.ok) return null
            const { result } = await response.json()
            return result?.dataUri
              ? { id: photo.id, dataUri: result.dataUri }
              : null
          }),
        )

        if (active) {
          setState({ status: "ready", photos: withData.filter(Boolean) })
        }
      } catch {
        if (active) setState({ status: "error", photos: [] })
      }
    })()

    return () => {
      active = false
    }
  }, [stopIds])

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Your photos
      </ThemedText>

      {state.status === "loading" && (
        <ActivityIndicator color={Colors.lightGreenColor} style={styles.center} />
      )}

      {state.status === "error" && (
        <ThemedText style={styles.muted}>
          Could not load your photos. Pull up your memories later from your
          profile.
        </ThemedText>
      )}

      {state.status === "ready" && state.photos.length === 0 && (
        <ThemedText style={styles.muted}>
          No photos were taken on this crawl.
        </ThemedText>
      )}

      {state.status === "ready" && state.photos.length > 0 && (
        <View style={styles.grid}>
          {state.photos.map((photo) => (
            <Image
              key={photo.id}
              style={styles.tile}
              contentFit="cover"
              source={{ uri: photo.dataUri }}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  heading: {
    textAlign: "center",
    color: Colors.darkGreenColor,
  },
  center: {
    marginVertical: 24,
  },
  muted: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  tile: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: Colors.offWhite,
  },
})
