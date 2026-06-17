import { Image, StyleSheet, View } from "react-native"
import { API_URL } from "@/constants/api"
import { ThemedText } from "@/components/themed-text"
import { Colors } from "@/constants/theme"

function getPhotoUri(photo) {
  const source = photo?.photoUrl ?? photo?.localUri ?? null

  if (!source) return null
  if (source.startsWith("/")) return `${API_URL}${source}`

  return source
}

export function GroupPhotoCard({ photo }) {
  const uri = getPhotoUri(photo)

  if (!uri) {
    return (
      <View style={[styles.card, styles.emptyCard]}>
        <ThemedText style={styles.emptyText}>Photo unavailable</ThemedText>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="cover"
        accessibilityLabel={photo?.venue?.name || "Group memory photo"}
      />
      {photo?.venue?.name ? (
        <View style={styles.caption}>
          <ThemedText numberOfLines={1} style={styles.captionText}>
            {photo.venue.name}
          </ThemedText>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 112,
    height: 112,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: Colors.offWhite,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  caption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.darkGreenColor,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  captionText: {
    color: Colors.background,
    fontSize: 11,
    fontWeight: "700",
  },

  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },

  emptyText: {
    color: Colors.icon,
    fontSize: 12,
    textAlign: "center",
  },
})
