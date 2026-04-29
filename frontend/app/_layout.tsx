import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/auth";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="verify" />
          <Stack.Screen name="(agent)" />
          <Stack.Screen name="(warehouse)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="order/[id]" options={{ headerShown: false, presentation: "card" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
