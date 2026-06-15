import { Pressable, StyleSheet, View } from "react-native"
import { PrimaryLightOutlineButton } from "@/components/buttons"
import { router } from "expo-router"
import { ThemedText } from "@/components/themed-text"
import { Colors } from "@/constants/theme"
import { useInterestQuery } from "@/features/intrests/hooks/query"
import { useThemeQuery } from "@/features/themes/hooks/query"
import { fetchWithAuth } from "@/lib/api"
import { useState } from "react"

export default function Theme() {
  const [errorMessage, setErrorMessage] = useState("")
  const { data } = useThemeQuery()

  const themes = data?.result ?? []

  return (
    <View>
      <View style={styles.Button}>
        {themes.map((theme) => (
          <Pressable key={theme.id}>
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
            ></PrimaryLightOutlineButton>
          </Pressable>
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
