import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from "../../components/haptic-tab";
import { IconSymbol } from '../../components/ui/icon-symbol';
import { Colors } from '../../constants/theme';
import { Montserrat_700Bold } from "@expo-google-fonts/montserrat"
 
export default function TabLayout() {
  return (
    <Tabs
      style={{ backgroundColor: Colors.yellowColor }}
      screenOptions={{
        tabBarActiveTintColor: Colors.darkGreenColor,
        tabBarInactiveTintColor: '#000000',
        tabBarButton: HapticTab,
        headerShown: true,
        headerStyle: { backgroundColor: Colors.yellowColor },
        tabBarStyle: {
            backgroundColor: Colors.yellowColor, // bottom tab color
            borderTopWidth: 0,
          },
        headerTitleStyle: {
          fontSize: 24,
          fontFamily: "Montserrat_700Bold",
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="map.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
