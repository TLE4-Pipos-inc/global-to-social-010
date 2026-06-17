import { Pressable, StyleSheet, Text, View } from "react-native"
import { PrimaryLightOutlineButton } from "@/components/buttons"
import { router } from "expo-router"
import { useThemeQuery } from "@/features/themes"
import { ThemedText } from "@/components/themed-text"

export default function Theme() {
  const { data } = useThemeQuery()
  const themes = data?.result ?? []

  return (
    <>
      <ThemedText type="title" style={styles.title}>
        Choose a theme for your route
      </ThemedText>
      <ThemedText style={styles.text}>
        Decide which kind of places you want to visit. During your route, there
        is something for everyone!
      </ThemedText>
      <View style={styles.buttonContainer}>
        {themes.map((theme) => (
          <View key={theme.id} style={styles.buttonWrapper}>
            <PrimaryLightOutlineButton
              title={theme.name}
              onPress={() => {
                router.push({
                  pathname: "/routes",
                  params: {
                    id: theme.id,
                  },
                })
              }}
            />
          </View>
        ))}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingTop: 60,
    padding: 16,
  },
  buttonWrapper: {
    width: "48%",
    marginBottom: 16,
  },
  title: {
    paddingTop: 60,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  text: {
    paddingTop: 16,
    paddingHorizontal: 16,
    textAlign: "center",
  },
})
