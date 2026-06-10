import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native"
import { router } from "expo-router"
import { useMutation } from "@tanstack/react-query"
import { RegisterUserSchema } from "@pub-hopper/schemas"
import { useAccountForm } from "@/features/auth"
import { setAccessToken } from "@/lib/token"
import { API_URL } from "@/constants/api"
import { PrimaryDarkButton } from "@/components/buttons"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Colors } from "@/constants/theme"

export default function RegisterScreen() {
  const mutation = useMutation({
    mutationFn: async (value) => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(value),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Registration failed")
      return json
    },
    onSuccess: ({ result }) => {
      setAccessToken(result.token)
      router.replace("/(tabs)")
    },
    onError: (err) => Alert.alert("Registration failed", err.message),
  })

  const form = useAccountForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: { onSubmit: RegisterUserSchema },
    onSubmit: async ({ value }) => mutation.mutate(value),
  })

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ThemedView style={styles.inner}>
        <ThemedText type="title">Create Account</ThemedText>

        <ThemedView style={styles.fields}>
          <form.AppField name="name">
            {(field) => (
              <field.InputField
                label="Name"
                autoCapitalize="words"
                autoComplete="name"
              />
            )}
          </form.AppField>

          <form.AppField name="email">
            {(field) => (
              <field.InputField
                label="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            )}
          </form.AppField>

          <form.AppField name="password">
            {(field) => (
              <field.InputField
                label="Password"
                secureTextEntry
                autoComplete="new-password"
              />
            )}
          </form.AppField>
        </ThemedView>

        <PrimaryDarkButton
          title={mutation.isPending ? "Creating account…" : "Create Account"}
          disabled={mutation.isPending}
          onPress={() => form.handleSubmit()}
        />
      </ThemedView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  fields: {
    gap: 16,
  },
})
