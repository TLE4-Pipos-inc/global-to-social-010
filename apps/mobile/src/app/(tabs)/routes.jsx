import { ScrollView, StyleSheet, View } from "react-native"
import { useLocalSearchParams } from "expo-router"

import { useRouteQuery } from "@/features/routes/hooks/query"
import { ThemedText } from "@/components/themed-text"
import { useStopQuery } from "@/features/routes/hooks/stop-query"

export default function Routes() {
  const { id } = useLocalSearchParams()

  const { data } = useRouteQuery(id)
  const { data: stopData } = useStopQuery()

  const allRoutes = data?.result?.routes ?? []

  const routes = allRoutes.filter((route) => route.themeId === id)

  const selectedRoute = routes[0]

  const allStops = stopData?.result?.routeStops ?? []

  const stops = allStops.filter((stop) => stop.routeId === selectedRoute?.id)

  console.log("Gekozen theme id:", id)
  console.log("Gefilterde routes:", routes)

  console.log("Alle stops:", allStops)
  console.log("Selected route id:", selectedRoute?.id)
  console.log("Eerste stop:", allStops[0])

  return (
    <View>
      <View style={styles.Button}>
        {routes.map((route) => (
          <View key={route.id}>
            <ThemedText>{route.name}</ThemedText>
            <ThemedText>{route.area}</ThemedText>
            <ThemedText>{route.city}</ThemedText>
          </View>
        ))}
      </View>

      <View>
        {stops.map((stop) => (
          <View key={stop.id}>
            <ThemedText>Stop {stop.routeOrder}</ThemedText>
            <ThemedText>{stop.walkLabel}</ThemedText>
            <ThemedText>{stop.plannedDurationMinutes} min</ThemedText>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  Button: {
    padding: 20,
    gap: 20,
  },
})
