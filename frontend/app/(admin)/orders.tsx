import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "../../src/api";
import { OrderCard, OrderItem } from "../../src/components/OrderCard";
import { colors, radii } from "../../src/theme";

const STATUSES: { key: string; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "new", label: "Yangi" },
  { key: "preparing", label: "Tayyorlanmoqda" },
  { key: "delivered", label: "Yetkazildi" },
];

export default function AdminOrders() {
  const router = useRouter();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = filter !== "all" ? `?status=${filter}` : "";
      const r = await api<OrderItem[]>(`/orders${q}`);
      setItems(r);
    } catch {}
    setRefreshing(false);
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.titleSmall}>Hammasi</Text>
        <Text style={styles.title}>Zakazlar</Text>
      </View>

      <View style={styles.chipsRow}>
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setFilter(s.key)}
            style={[styles.chip, filter === s.key && styles.chipActive]}
            testID={`admin-filter-${s.key}`}
          >
            <Text style={[styles.chipText, filter === s.key && styles.chipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            showAgent
            testID={`admin-order-${item.id}`}
            onPress={() => router.push(`/order/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>
              Zakaz topilmadi
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  titleSmall: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "900", color: colors.textPrimary, marginTop: 2 },
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 4,
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
});
