import { Tabs } from "expo-router"
import { Home, Map, User } from "lucide-react-native"
import { HapticTab } from "@/components/haptic-tab"
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
    </Tabs>
  )
}
