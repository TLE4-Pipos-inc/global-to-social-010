import { Pressable, StyleSheet } from "react-native"
import { ArrowLeft } from "lucide-react-native"
import { router } from "expo-router"
import * as Haptics from "expo-haptics"
import { Colors } from "@/constants/theme"

// Green lucide back arrow for the top-left of the header. Pass `onPress` to
// navigate to a specific previous screen — these screens live in the tab
// navigator, so router.back() falls back to the default tab instead of the
// logical previous page. Triggers light haptic feedback on press, mirroring
// the tab bar buttons.
export function HeaderBackButton({ onPress }) {
  function handlePressIn() {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPress={onPress ?? (() => router.back())}
      hitSlop={12}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <ArrowLeft size={26} color={Colors.lightGreenColor} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
  },
})
