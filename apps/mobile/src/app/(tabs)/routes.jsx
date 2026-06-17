import { useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"

import { useRouteQuery } from "@/features/routes"
import { ThemedText } from "@/components/themed-text"
import { useStopQuery } from "@/features/routes"
import { PrimaryDarkButton, PrimaryAccentButton } from "@/components/buttons"
import { Colors } from "@/constants/theme"
import { ThemedView } from "@/components/themed-view"
import { useUserInterestQuery } from "@/features/userInterest"

export default function Routes() {
  const { id } = useLocalSearchParams()
  const [selectedRoute, setSelectedRoute] = useState(null)

  const themeId = Array.isArray(id) ? id[0] : id

  const { data } = useRouteQuery(themeId)
  const { data: stopData } = useStopQuery()
  const { data: userInterestData } = useUserInterestQuery()

  const interests =
    userInterestData?.interests ||
    userInterestData?.result?.interests ||
    userInterestData?.result ||
    []
  const canMatch = interests.length >= 3

  // Navigate into matchmaking for a specific route, carrying theme + route so
  // the queue can match on them (route is now a hard matching constraint).
  // `solo: true` adds auto=solo, which makes the matching screen queue a
  // one-person party immediately, skipping the create/invite party flow.
  function goToMatching(route, { solo } = {}) {
    if (!canMatch) {
      alert(
        "You need to choose at least 3 interests in settings before matching."
      )
      return
    }
    router.push({
      pathname: "/matching",
      params: {
        themeId,
        routeId: route.id,
        routeName: route.name,
        ...(solo ? { auto: "solo" } : {}),
      },
    })
  }

  const allRoutes = data?.result?.routes ?? []
  const routes = allRoutes.filter((route) => route.themeId === themeId)

  const allStops = stopData?.result?.routeStops ?? []

  const selectedRouteStops = allStops
    .filter((stop) => stop.routeId === selectedRoute?.id)
    .sort((a, b) => a.routeOrder - b.routeOrder)

  const selectedTotalStops = selectedRouteStops.length

  const selectedTotalMinutes = selectedRouteStops.reduce((total, stop) => {
    return total + stop.plannedDurationMinutes
  }, 0)

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText style={styles.pageTitle}>Choose a route</ThemedText>

        {routes.map((route) => {
          const routeStops = allStops.filter(
            (stop) => stop.routeId === route.id
          )

          const totalStops = routeStops.length

          const totalMinutes = routeStops.reduce((total, stop) => {
            return total + stop.plannedDurationMinutes
          }, 0)

          return (
            <View key={route.id} style={styles.routeCard}>
              <ThemedText style={styles.routeTitle}>{route.name}</ThemedText>

              <ThemedText style={styles.routeSubtitle}>
                {route.area} • {route.city}
              </ThemedText>

              <View style={styles.infoBox}>
                <View style={styles.infoRoute}>
                  <ThemedText style={styles.infoText}>
                    {totalStops} stops
                  </ThemedText>
                </View>

                <View style={styles.infoRoute}>
                  <ThemedText style={styles.infoText}>
                    {totalMinutes} min
                  </ThemedText>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                  <PrimaryDarkButton
                    title="Match with friends"
                    onPress={() => goToMatching(route)}
                  />
                </View>
              </View>
              <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                  <PrimaryAccentButton
                    title="Quick queue solo"
                    onPress={() => goToMatching(route, { solo: true })}
                  />
                </View>
              </View>
              <Pressable
                style={styles.viewRouteButton}
                onPress={() => setSelectedRoute(route)}
              >
                <ThemedText style={styles.viewRouteButtonText}>
                  View Route
                </ThemedText>
              </Pressable>
            </View>
          )
        })}
      </ScrollView>

      <Modal
        visible={!!selectedRoute}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRoute(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <ThemedText style={styles.modalTitle}>
                  {selectedRoute?.name}
                </ThemedText>

                <ThemedText style={styles.modalSubtitle}>
                  {selectedRoute?.area} • {selectedRoute?.city}
                </ThemedText>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={() => setSelectedRoute(null)}
              >
                <ThemedText style={styles.closeText}>×</ThemedText>
              </Pressable>
            </View>

            <View style={styles.modalInfoRow}>
              <View style={styles.modalInfoBox}>
                <ThemedText style={styles.modalInfoText}>
                  {selectedTotalStops} stops
                </ThemedText>
              </View>

              <View style={styles.modalInfoBox}>
                <ThemedText style={styles.modalInfoText}>
                  {selectedTotalMinutes} min
                </ThemedText>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.stopsContainer}>
              <ThemedText style={styles.sectionTitle}>Stops</ThemedText>

              {selectedRouteStops.map((stop) => (
                <View key={stop.id} style={styles.stopCard}>
                  <View style={styles.stopHeader}>
                    <View style={styles.stopNumber}>
                      <ThemedText style={styles.stopNumberText}>
                        {stop.routeOrder}
                      </ThemedText>
                    </View>

                    <View style={styles.stopHeaderText}>
                      <ThemedText style={styles.venueName}>
                        {stop.venueName ?? "Venue name not found"}
                      </ThemedText>

                      <ThemedText style={styles.venueType}>
                        {stop.venueType ?? "No type"}
                      </ThemedText>
                    </View>
                  </View>

                  {stop.venueAddress && (
                    <ThemedText style={styles.address}>
                      {stop.venueAddress}
                    </ThemedText>
                  )}

                  {stop.venueDescription && (
                    <ThemedText style={styles.description}>
                      {stop.venueDescription}
                    </ThemedText>
                  )}

                  {stop.walkLabel && (
                    <ThemedText style={styles.description}>
                      {stop.walkLabel}
                    </ThemedText>
                  )}

                  <View style={styles.stopFooter}>
                    <ThemedText style={styles.footerText}>
                      {stop.plannedDurationMinutes} min
                    </ThemedText>
                  </View>
                </View>
              ))}

              <PrimaryDarkButton
                title="Match with friends"
                onPress={() => {
                  if (!selectedRoute) return
                  const routeToMatch = selectedRoute
                  setSelectedRoute(null)
                  goToMatching(routeToMatch)
                }}
              />
              <PrimaryAccentButton
                title="Quick queue solo"
                onPress={() => {
                  if (!selectedRoute) return
                  const routeToMatch = selectedRoute
                  setSelectedRoute(null)
                  goToMatching(route, { solo: true })
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 18,
  },

  pageTitle: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
  },

  routeCard: {
    backgroundColor: Colors.lightGreenColor,
    borderRadius: 22,
    padding: 20,
    gap: 14,
  },

  routeTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },

  routeSubtitle: {
    color: "#FFFFFF",
    fontSize: 14,
  },

  infoBox: {
    flexDirection: "row",
    gap: 10,
  },

  infoRoute: {
    backgroundColor: "rgba(255,255,255,0.34)",
    borderRadius: 70,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  infoText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  buttonWrapper: {
    flex: 1,
  },

  viewRouteButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },

  viewRouteButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    gap: 18,
    maxHeight: "88%",
  },

  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D9D9D9",
    alignSelf: "center",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  modalHeaderText: {
    flex: 1,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
  },

  modalSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F1F1",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontSize: 24,
    fontWeight: "700",
  },

  modalInfoRow: {
    flexDirection: "row",
    gap: 10,
  },

  modalInfoBox: {
    backgroundColor: Colors.lightGreenColor,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },

  modalInfoText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  stopsContainer: {
    gap: 14,
    paddingBottom: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  stopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  stopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  stopNumber: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.lightGreenColor,
    alignItems: "center",
    justifyContent: "center",
  },

  stopNumberText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  stopHeaderText: {
    flex: 1,
  },

  venueName: {
    fontSize: 17,
    fontWeight: "700",
  },

  venueType: {
    fontSize: 13,
    opacity: 0.7,
    textTransform: "capitalize",
  },

  address: {
    fontSize: 14,
    opacity: 0.8,
  },

  description: {
    fontSize: 14,
    lineHeight: 20,
  },

  stopFooter: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },

  footerText: {
    fontSize: 13,
    opacity: 0.8,
  },
})
