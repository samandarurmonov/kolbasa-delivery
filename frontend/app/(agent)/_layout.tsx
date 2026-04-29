import React from "react";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { colors } from "../../src/theme";

export default function AgentLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== "agent") {
    if (user.role === "admin") return <Redirect href="/(admin)" />;
    if (user.role === "warehouse") return <Redirect href="/(warehouse)" />;
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Zakazlar",
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="new-order"
        options={{
          title: "Yangi",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size + 6} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
