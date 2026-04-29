import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows } from "../theme";
import { StatusBadge } from "./StatusBadge";

export type OrderItem = {
  id: string;
  agent_name: string;
  agent_phone: string;
  category_name?: string;
  custom_category?: string;
  product_name: string;
  quantity?: string;
  client_phone: string;
  client_name?: string;
  store_address: string;
  photos: string[];
  status: string;
  created_at: string;
};

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function OrderCard({
  order,
  onPress,
  showAgent,
  testID,
}: {
  order: OrderItem;
  onPress?: () => void;
  showAgent?: boolean;
  testID?: string;
}) {
  const cat = order.category_name || order.custom_category || "—";
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, shadows.card]}
      testID={testID}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.product} numberOfLines={1}>
            {order.product_name}
          </Text>
          <Text style={styles.cat}>{cat}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      {order.photos && order.photos.length > 0 ? (
        <View style={styles.photoRow}>
          {order.photos.slice(0, 2).map((p, i) => (
            <Image key={i} source={{ uri: p }} style={styles.photo} />
          ))}
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.meta} numberOfLines={1}>
          {order.store_address}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.meta}>
          {order.client_phone}
          {order.client_name ? ` · ${order.client_name}` : ""}
        </Text>
      </View>

      <View style={styles.footerRow}>
        {showAgent ? (
          <View style={styles.agentChip}>
            <Ionicons name="person-circle" size={14} color={colors.primary} />
            <Text style={styles.agentText} numberOfLines={1}>
              {order.agent_name}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <Text style={styles.date}>{formatDate(order.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  product: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  cat: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "600",
  },
  photoRow: { flexDirection: "row", marginTop: 10, gap: 6 },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 },
  meta: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  agentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: 180,
  },
  agentText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  date: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
});
