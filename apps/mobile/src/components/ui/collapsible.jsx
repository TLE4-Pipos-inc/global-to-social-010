import { useState } from "react"
import { StyleSheet, TouchableOpacity } from "react-native"
import { ChevronRight } from "lucide-react-native"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Colors } from "@/constants/theme"

export function Collapsible({ children, title }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
      >
        <ChevronRight
          size={18}
          color={Colors.icon}
          style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
        />
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>
      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
})
