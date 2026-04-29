import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { statusColors, radii } from "../theme";

export function StatusBadge({ status, testID }: { status: string; testID?: string }) {
  const cfg = statusColors[status] || { bg: "#E2E8F0", fg: "#475569", label: status };
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <View style={[styles.dot, { backgroundColor: cfg.fg }]} />
      <Text style={[styles.label, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
});
