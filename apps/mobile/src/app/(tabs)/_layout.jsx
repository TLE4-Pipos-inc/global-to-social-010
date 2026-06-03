import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from "../../components/haptic-tab";
import { IconSymbol } from '../../components/ui/icon-symbol';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      style={{ backgroundColor: Colors.yellowColor }}
      screenOptions={{
        tabBarActiveTintColor: Colors.tint,
        tabBarButton: HapticTab,
        headerShown: true,
        headerStyle: { backgroundColor: Colors.yellowColor },
        tabBarStyle: {
            backgroundColor: Colors.yellowColor, // bottom tab color
            borderTopWidth: 0,
          },
        headerTitleStyle: {
          fontSize: 24,
          fontFamily: "Montserrat-Bold"
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="map.fill" color={Colors.text} />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={Colors.text} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.fill" color={Colors.text} />
          ),
        }}
      />
    </Tabs>
  );
}
