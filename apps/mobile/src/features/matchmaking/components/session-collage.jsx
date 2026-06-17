import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  View,
} from "react-native"
import { ThemedText } from "@/components/themed-text"
import { Colors } from "@/constants/theme"
import { fetchWithAuth } from "@/lib/api"
import { API_URL } from "@/constants/api"

// SessionView wraps the collage in a ScrollView with 24px padding; two columns
// plus an 8px gutter share the remaining width. A fixed numeric column width
// (rather than a percentage) keeps tiles laid out correctly on the new
// architecture, where percentage width + aspectRatio could collapse to 0 height.
const COLUMN_GAP = 8
const COLUMN_WIDTH = (Dimensions.get("window").width - 24 * 2 - COLUMN_GAP) / 2

/**
 * End-of-crawl screen: a masonry grid of every group selfie taken during the
 * session. Photos are fetched per session stop (`?sessionStopId=`) rather than
 * by group — a stop only finishes once the server verifies a photo with that
 * exact `sessionStopId`, so this finds every selfie, in crawl order.
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
        const perStop = await Promise.all(
          ids.map(async (id) => {
            const response = await fetchWithAuth(
              `/api/photos?sessionStopId=${encodeURIComponent(id)}`,
            )
            if (!response.ok) throw new Error("Could not load photos")
            const { result } = await response.json()
            // Crawl order across stops, createdAt order within a stop.
            return (result?.photos ?? [])
              .filter((p) => p.photoUrl)
              .sort((a, b) =>
                String(a.createdAt).localeCompare(String(b.createdAt)),
              )
          }),
        )
        if (active) setState({ status: "ready", photos: perStop.flat() })
      } catch {
        if (active) setState({ status: "error", photos: [] })
      }
    })()

    return () => {
      active = false
    }
  }, [stopIds])

  // Split into two columns so varied heights stack without leaving gaps.
  const columns = [[], []]
  state.photos.forEach((photo, index) => columns[index % 2].push(photo))

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
          {columns.map((column, columnIndex) => (
            <View key={columnIndex} style={styles.column}>
              {column.map((photo) => (
                <CollagePhoto
                  key={photo.id}
                  uri={`${API_URL}${photo.photoUrl}`}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

/**
 * A single collage tile that sizes its height to the photo's real proportions,
 * so portraits and landscapes aren't squashed into squares.
 */
function CollagePhoto({ uri }) {
  // Default to square until the natural dimensions arrive via onLoad.
  const [height, setHeight] = useState(COLUMN_WIDTH)

  return (
    <Image
      source={{ uri }}
      resizeMode="cover"
      onLoad={({ nativeEvent: { source } }) => {
        if (source?.width && source?.height) {
          setHeight((COLUMN_WIDTH * source.height) / source.width)
        }
      }}
      style={[styles.tile, { height }]}
    />
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
    justifyContent: "space-between",
  },
  column: {
    width: COLUMN_WIDTH,
    gap: COLUMN_GAP,
  },
  tile: {
    width: COLUMN_WIDTH,
    borderRadius: 12,
    backgroundColor: Colors.offWhite,
  },
})
