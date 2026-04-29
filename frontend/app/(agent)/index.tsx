import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { api } from "../../src/api";
import { OrderCard, OrderItem } from "../../src/components/OrderCard";
import { colors, radii } from "../../src/theme";

const STATUSES: { key: string | "all"; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "new", label: "Yangi" },
  { key: "preparing", label: "Tayyorlanmoqda" },
  { key: "delivered", label: "Yetkazildi" },
];

export default function AgentOrders() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const q = filter !== "all" ? `?status=${filter}` : "";
        const data = await api<OrderItem[]>(`/orders${q}`);
        setOrders(data);
      } catch (e) {
        // silent fail
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Salom, {user?.name}</Text>
          <Text style={styles.title}>Mening zakazlarim</Text>
        </View>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/(agent)/new-order")}
          testID="agent-fab-new-order"
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.chipsRow}>
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setFilter(s.key)}
            style={[styles.chip, filter === s.key && styles.chipActive]}
            testID={`filter-${s.key}`}
          >
            <Text style={[styles.chipText, filter === s.key && styles.chipTextActive]}>
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
              testID={`order-card-${item.id}`}
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
              <Ionicons name="cube-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Hali zakazlar yo'q</Text>
              <Text style={styles.emptySub}>
                Yangi zakaz qo'shish uchun {"+"} tugmasini bosing
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push("/(agent)/new-order")}
              >
                <Text style={styles.emptyBtnText}>Yangi zakaz</Text>
              </TouchableOpacity>
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
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
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
  emptyBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  emptyBtnText: { color: "#fff", fontWeight: "800" },
});
