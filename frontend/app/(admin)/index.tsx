import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { api } from "../../src/api";
import { colors, radii, shadows } from "../../src/theme";

type Stats = {
  total_orders: number;
  today_orders: number;
  new_orders: number;
  preparing_orders: number;
  delivered_orders: number;
  active_agents: number;
  active_warehouses: number;
};

const StatCard = ({
  icon,
  value,
  label,
  color,
  testID,
}: {
  icon: any;
  value: number;
  label: string;
  color: string;
  testID?: string;
}) => (
  <View style={[styles.statCard, shadows.card]} testID={testID}>
    <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api<Stats>("/stats/admin");
      setStats(s);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.body}
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
      >
        <Text style={styles.hello}>Salom, {user?.name}</Text>
        <Text style={styles.title}>Boshqaruv paneli</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.heroCard}>
              <View>
                <Text style={styles.heroLabel}>BUGUNGI ZAKAZLAR</Text>
                <Text style={styles.heroValue}>{stats?.today_orders ?? 0}</Text>
                <Text style={styles.heroSub}>Jami: {stats?.total_orders ?? 0}</Text>
              </View>
              <View style={styles.heroIcon}>
                <Ionicons name="trending-up" size={36} color="#fff" />
              </View>
            </View>

            <View style={styles.grid}>
              <StatCard
                icon="add-circle"
                value={stats?.new_orders ?? 0}
                label="Yangi"
                color="#3B82F6"
                testID="stat-new"
              />
              <StatCard
                icon="time"
                value={stats?.preparing_orders ?? 0}
                label="Tayyorlanmoqda"
                color="#F59E0B"
                testID="stat-preparing"
              />
              <StatCard
                icon="checkmark-done"
                value={stats?.delivered_orders ?? 0}
                label="Yetkazildi"
                color="#10B981"
                testID="stat-delivered"
              />
              <StatCard
                icon="person"
                value={stats?.active_agents ?? 0}
                label="Aktiv agentlar"
                color="#8B5CF6"
                testID="stat-agents"
              />
            </View>

            <Text style={styles.sectionTitle}>Tezkor amallar</Text>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push("/(admin)/users")}
              testID="quick-users"
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Hodimlarni boshqarish</Text>
                <Text style={styles.actionSub}>Agent va omborchi qo'shish</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push("/(admin)/categories")}
              testID="quick-categories"
            >
              <View style={[styles.actionIcon, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="pricetags" size={20} color="#1D4ED8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Kategoriyalar</Text>
                <Text style={styles.actionSub}>Mahsulot katalogini sozlash</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push("/(admin)/orders")}
              testID="quick-orders"
            >
              <View style={[styles.actionIcon, { backgroundColor: "#D1FAE5" }]}>
                <Ionicons name="receipt" size={20} color="#047857" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Barcha zakazlar</Text>
                <Text style={styles.actionSub}>Filterlash va kuzatish</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { padding: 20, paddingBottom: 40 },
  hello: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "900", color: colors.textPrimary, marginTop: 4 },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: 20,
    marginTop: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 5,
  },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  heroValue: { color: "#fff", fontSize: 42, fontWeight: "900", marginTop: 4 },
  heroSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4, fontWeight: "600" },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: { fontSize: 24, fontWeight: "900", color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: "600" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textSecondary,
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 8,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  actionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
