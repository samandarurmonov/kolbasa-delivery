import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { OrderCard, OrderItem } from "../../src/components/OrderCard";
import { colors, radii } from "../../src/theme";

const STATUSES = [
  { key: "new", label: "Yangi", color: "#3B82F6" },
  { key: "preparing", label: "Tayyorlanmoqda", color: "#F59E0B" },
  { key: "delivered", label: "Yetkazildi", color: "#10B981" },
];

export default function WarehouseQueue() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [filter, setFilter] = useState<string>("new");
  const [counts, setCounts] = useState<Record<string, number>>({
    new: 0,
    preparing: 0,
    delivered: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const all = await api<OrderItem[]>("/orders");
        const c: Record<string, number> = { new: 0, preparing: 0, delivered: 0 };
        all.forEach((o) => {
          c[o.status] = (c[o.status] || 0) + 1;
        });
        setCounts(c);
        setOrders(all.filter((o) => o.status === filter));
      } catch {}
      setLoading(false);
      setRefreshing(false);
    },
    [filter]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Ombor</Text>
          <Text style={styles.title}>Zakazlar navbati</Text>
        </View>
        <TouchableOpacity
          onPress={() => load()}
          style={styles.refreshBtn}
          testID="refresh-button"
        >
          <Ionicons name="refresh" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsRow}>
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setFilter(s.key)}
            style={[styles.tab, filter === s.key && styles.tabActive]}
            testID={`warehouse-tab-${s.key}`}
          >
            <View style={[styles.tabBadge, { backgroundColor: s.color }]}>
              <Text style={styles.tabBadgeText}>{counts[s.key] || 0}</Text>
            </View>
            <Text style={[styles.tabText, filter === s.key && styles.tabTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              showAgent
              testID={`wh-order-${item.id}`}
              onPress={() => router.push(`/order/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Bu yerda zakaz yo'q</Text>
              <Text style={styles.emptySub}>
                Yangi zakazlar agentlar tomonidan yuborilsa bu yerda ko'rinadi
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hello: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "900", color: colors.textPrimary, marginTop: 2 },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tab: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { borderColor: colors.primary, backgroundColor: "#FEF2F2" },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    minWidth: 28,
    alignItems: "center",
    marginBottom: 6,
  },
  tabBadgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  tabText: { fontSize: 11, color: colors.textSecondary, fontWeight: "700" },
  tabTextActive: { color: colors.primary },
  list: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 24 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 14,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});
