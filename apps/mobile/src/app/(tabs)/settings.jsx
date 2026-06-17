import { Image } from "expo-image"
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { Suspense } from "react"
import {
  useAccountQuery,
  useAccountForm,
  useLogoutMutation,
  useUpdateUserMutation,
} from "@/features/auth"
import {
  DestructiveOutlineButton,
  PrimaryLightButton,
  PrimaryLightOutlineButton,
} from "@/components/buttons"
import { ThemedView } from "@/components/themed-view"
import { ThemedText } from "@/components/themed-text"
import { UpdateUserSchema } from "@pub-hopper/schemas"

const schoolOptions = [
  { value: "Hogeschool Rotterdam", label: "Hogeschool Rotterdam" },
  { value: "EuroCollege Hogeschool", label: "EuroCollege Hogeschool" },
]

const campusOptions = [
  { value: "International Business", label: "International Business" },
  {
    value: "International Business & Entrepreneurship",
    label: "International Business & Entrepreneurship",
  },
]

function Settings() {
  const { data } = useAccountQuery()
  const logout = useLogoutMutation()
  const updateUser = useUpdateUserMutation()

  const user = data.result

  const form = useAccountForm({
    defaultValues: {
      name: user.name || "",
      school: user.school || "",
      campus: user.campus || "",
    },
    validators: { onSubmit: UpdateUserSchema },
    onSubmit: ({ value }) =>
      updateUser.mutate(value, {
        onSuccess: () => router.replace("/profile"),
      }),
  })

  return (
    <ScrollView>
      <ThemedView style={styles.screen}>
        <ThemedView style={styles.orangeSection}>
          {/*<View style={styles.avatarWrapper}>*/}
          {/*  <Image*/}
          {/*    source={require("../../../assets/images/emptyprofile.png")}*/}
          {/*    style={styles.image}*/}
          {/*    accessibleLabel="Profile avatar"*/}
          {/*  />*/}
          {/*</View>*/}

          <ThemedView style={styles.card}>
            <form.AppField name="name">
              {(field) => (
                <field.InputField
                  label="Name"
                  placeholder="Enter your name"
                  autoCapitalize="words"
                />
              )}
            </form.AppField>

            <form.AppField name="school">
              {(field) => (
                <field.DropdownField label="School" options={schoolOptions} />
              )}
            </form.AppField>

            <form.AppField name="campus">
              {(field) => (
                <field.DropdownField label="Campus" options={campusOptions} />
              )}
            </form.AppField>

            <PrimaryLightOutlineButton
              title="choose your interests"
              onPress={() => router.push("/interest")}
            />

            <PrimaryLightButton
              title={updateUser.isPending ? "Saving..." : "Save profile"}
              onPress={() => form.handleSubmit()}
              disabled={updateUser.isPending}
            />
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.actionsSection}>
          <ThemedText style={styles.actionsTitle}>Account</ThemedText>

          <PrimaryLightOutlineButton
            title={logout.isPending ? "Logging out..." : "Log out"}
            disabled={logout.isPending}
            onPress={() =>
              logout.mutate(undefined, {
                onSettled: () => router.replace("/(auth)/login"),
              })
            }
          />

          <DestructiveOutlineButton
            title="Delete account"
            onPress={() => console.log("Delete account pressed")}
          />
        </ThemedView>

        <ThemedView style={styles.bottomFill} />
      </ThemedView>
    </ScrollView>
  )
}

export default function SettingScreen() {
  return (
    <Suspense fallback={<ActivityIndicator style={styles.loader} />}>
      <Settings />
    </Suspense>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ECECEC",
  },

  orangeSection: {
    backgroundColor: "#ECAA3C",
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    alignItems: "center",
  },

  avatarWrapper: {
    marginBottom: 14,
  },

  image: {
    width: 160,
    height: 160,
    borderRadius: 100,
    backgroundColor: "#D9D9D9",
  },

  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  bottomFill: {
    flex: 1,
  },

  loader: {
    flex: 1,
  },

  actionsSection: {
    marginHorizontal: 22,
    marginTop: 22,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  actionsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
  },
})
