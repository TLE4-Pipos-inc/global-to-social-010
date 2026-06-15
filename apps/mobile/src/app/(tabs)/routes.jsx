import { Pressable, StyleSheet, View } from "react-native"
import { PrimaryLightOutlineButton } from "@/components/buttons"
import { router, useLocalSearchParams } from "expo-router"
import { ThemedText } from "@/components/themed-text"
import { Colors } from "@/constants/theme"
import { useInterestQuery } from "@/features/intrests/hooks/query"
import { useThemeQuery } from "@/features/themes/hooks/query"
import { fetchWithAuth } from "@/lib/api"
import { useState } from "react"

export default function Routes() {
  const { id } = useLocalSearchParams()

  console.log("Gekozen theme id:", id)
}

const styles = StyleSheet.create({
  Button: {
    padding: 20,
    gap: 20,
  },
})
