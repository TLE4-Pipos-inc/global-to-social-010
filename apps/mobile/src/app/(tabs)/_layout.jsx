import { router, Tabs } from "expo-router"
import { Home, Map, User } from "lucide-react-native"
import { HapticTab } from "@/components/haptic-tab"
import { HeaderBackButton } from "@/components/header-back-button"
import { Colors, Fonts } from "@/constants/theme"

export default function TabLayout() {
  return (
    <Tabs
      style={{ backgroundColor: Colors.yellowColor }}
      screenOptions={{
        tabBarActiveTintColor: Colors.darkGreenColor,
        tabBarInactiveTintColor: Colors.text,
        tabBarButton: HapticTab,
        headerShown: true,
        headerStyle: { backgroundColor: Colors.yellowColor },
        tabBarStyle: {
          backgroundColor: Colors.yellowColor,
          borderTopWidth: 0,
        },
        headerTitleStyle: {
          fontSize: 24,
          fontFamily: Fonts.bold,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => <Map size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: "Settings",
        }}
      />

      <Tabs.Screen
        name="interest"
        options={{
          href: null,
          title: "Interests",
        }}
      />

      <Tabs.Screen
        name="matching"
        options={{
          href: null,
          title: "Matching",
        }}
      />

      <Tabs.Screen
        name="theme"
        options={{
          href: null,
          title: "theme",
          headerLeft: () => (
            <HeaderBackButton onPress={() => router.navigate("/")} />
          ),
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          href: null,
          title: "routes",
          headerLeft: () => (
            <HeaderBackButton onPress={() => router.navigate("/theme")} />
          ),
        }}
      />
    </Tabs>
  )
}
