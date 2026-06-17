import { StyleSheet, View } from "react-native"
import { Tag } from "lucide-react-native"
import { ThemedText } from "@/components/themed-text"
import { Colors } from "@/constants/theme"

/** Human-readable start/end window for a deal. */
function formatDateRange(startsAt, endsAt) {
  const format = (value) => new Date(value).toLocaleDateString()
  if (startsAt && endsAt) return `${format(startsAt)} – ${format(endsAt)}`
  if (startsAt) return `From ${format(startsAt)}`
  if (endsAt) return `Until ${format(endsAt)}`
  return "No date limit"
}

/** Currently-active deals for the stop's venue. Renders nothing when empty. */
export function StopDeals({ deals }) {
  if (!deals || deals.length === 0) return null

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Tag size={18} color={Colors.darkGreenColor} />
        <ThemedText type="subtitle">Deals</ThemedText>
      </View>
      {deals.map((deal) => (
        <View key={deal.id} style={styles.deal}>
          <ThemedText type="defaultSemiBold">{deal.title}</ThemedText>
          {deal.description && (
            <ThemedText style={styles.description}>{deal.description}</ThemedText>
          )}
          <ThemedText style={styles.dateRange}>
            {formatDateRange(deal.startsAt, deal.endsAt)}
          </ThemedText>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deal: {
    gap: 2,
  },
  description: {
    fontSize: 14,
  },
  dateRange: {
    fontSize: 12,
    color: "#777",
  },
})
