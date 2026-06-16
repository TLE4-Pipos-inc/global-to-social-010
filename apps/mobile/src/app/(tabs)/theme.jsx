import { Pressable, StyleSheet, View } from "react-native"
import { PrimaryLightOutlineButton } from "@/components/buttons"
import { router } from "expo-router"
import { useThemeQuery } from "@/features/themes/hooks/query"

export default function Theme() {
  const { data } = useThemeQuery()
  const themes = data?.result ?? []

  return (
    <View>
      <View style={styles.buttonContainer}>
        {themes.map((theme) => (
          <View key={theme.id} style={styles.buttonWrapper}>
            <Pressable>
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
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingTop: 100,
    padding: 20,
  },
  buttonWrapper: {
    width: "48%",
    marginBottom: 20,
  },
})