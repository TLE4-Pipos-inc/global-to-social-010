import { StyleSheet, View } from "react-native"
import MapView, { Marker, Polyline } from "react-native-maps"
import { ThemedText } from "@/components/themed-text"
import { useOSRMRoute } from "@/features/matchmaking/use-osrm-route"

/** Mini map showing the walking route from the user to the stop's venue. */
export function StopMap({ stop }) {
  const { route } = useOSRMRoute(Number(stop.latitude), Number(stop.longitude))

  if (!stop.latitude || !stop.longitude) return null

  return (
    <View>
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
      {stop.walkLabel && (
        <ThemedText style={styles.walkLabel}>{stop.walkLabel}</ThemedText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  miniMap: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
  },
  walkLabel: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
  },
})
