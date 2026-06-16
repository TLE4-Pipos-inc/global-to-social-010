import { ScrollView, StyleSheet, View } from "react-native"
import { useLocalSearchParams } from "expo-router"

import { useRouteQuery } from "@/features/routes/hooks/query"
import { ThemedText } from "@/components/themed-text"
import { useStopQuery } from "@/features/routes/hooks/stop-query"

export default function Routes() {
  const { id } = useLocalSearchParams()

  const { data } = useRouteQuery(id)

  const routes = data?.result?.routes ?? []

  const selectedRoute = routes[0]

  const { data: stopData } = useStopQuery(selectedRoute?.id)

  const stops = stopData?.result?.routeStops ?? []

  return (
    <ScrollView>
      <View>
        <View style={styles.Button}>
          {routes.map((route) => (
            <View key={route.id}>
              <ThemedText>{route.name}</ThemedText>
              <ThemedText>{route.area}</ThemedText>
              <ThemedText>{route.city}</ThemedText>
            </View>
          ))}

          {/*{stops.map((stop) => (*/}
          {/*  <View key={stop.id}>*/}
          {/*    <ThemedText>Stop {stop.routeOrder}</ThemedText>*/}
          {/*    <ThemedText>Venue ID: {stop.venueId}</ThemedText>*/}
          {/*    <ThemedText>Duur: {stop.plannedDurationMinutes} min</ThemedText>*/}
          {/*    <ThemedText>{stop.walkLabel}</ThemedText>*/}
          {/*  </View>*/}
          {/*))}*/}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  Button: {
    padding: 20,
    gap: 20,
  },
})
