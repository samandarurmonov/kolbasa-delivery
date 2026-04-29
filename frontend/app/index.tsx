import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../src/auth";
import { colors } from "../src/theme";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center} testID="splash-screen">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (user.role === "admin") return <Redirect href="/(admin)" />;
  if (user.role === "warehouse") return <Redirect href="/(warehouse)" />;
  return <Redirect href="/(agent)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
