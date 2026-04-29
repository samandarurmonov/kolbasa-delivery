import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { StatusBadge } from "../../src/components/StatusBadge";
import { Button } from "../../src/components/Button";
import { colors, radii, shadows } from "../../src/theme";

type FullOrder = {
  id: string;
  agent_name: string;
  agent_phone: string;
  category_name?: string;
  custom_category?: string;
  product_name: string;
  quantity?: string;
  note?: string;
  client_phone: string;
  client_name?: string;
  store_address: string;
  latitude?: number;
  longitude?: number;
  photos: string[];
  status: "new" | "preparing" | "delivered";
  created_at: string;
  updated_at: string;
  status_history: { status: string; at: string; by_name?: string }[];
};

const NEXT_STATUS: Record<string, "new" | "preparing" | "delivered" | null> = {
  new: "preparing",
  preparing: "delivered",
  delivered: null,
};

const STATUS_LABEL: Record<string, string> = {
  new: "Yangi",
  preparing: "Tayyorlanmoqda",
  delivered: "Yetkazildi",
};

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const o = await api<FullOrder>(`/orders/${id}`);
      setOrder(o);
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const updateStatus = async (next: "preparing" | "delivered") => {
    setUpdating(true);
    try {
      const u = await api<FullOrder>(`/orders/${id}/status`, {
        method: "PATCH",
        body: { status: next },
      });
      setOrder(u);
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message);
    } finally {
      setUpdating(false);
    }
  };

  const callClient = () => {
    if (!order) return;
    Linking.openURL(`tel:${order.client_phone}`);
  };

  const openMap = () => {
    if (!order || !order.latitude || !order.longitude) {
      Alert.alert("Manzil", "GPS koordinatalari mavjud emas");
      return;
    }
    const lat = order.latitude;
    const lng = order.longitude;
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?q=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }
  if (!order) return null;

  const next = NEXT_STATUS[order.status];
  const canUpdate = user && (user.role === "warehouse" || user.role === "admin") && next !== null;
  const cat = order.category_name || order.custom_category || "—";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Zakaz</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.card, shadows.card]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.product}>{order.product_name}</Text>
              <Text style={styles.cat}>{cat}</Text>
              {order.quantity ? (
                <Text style={styles.quantity}>Miqdor: {order.quantity}</Text>
              ) : null}
            </View>
            <StatusBadge status={order.status} testID="order-status" />
          </View>
          {order.note ? (
            <View style={styles.noteBox}>
              <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.noteText}>{order.note}</Text>
            </View>
          ) : null}
        </View>

        {order.photos.length > 0 ? (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.sectionTitle}>Rasmlar</Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {order.photos.map((p, i) => (
                <Image key={i} source={{ uri: p }} style={styles.photo} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>Klient</Text>
          <View style={styles.row}>
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.rowText}>{order.client_name || "—"}</Text>
          </View>
          <TouchableOpacity style={styles.row} onPress={callClient} testID="call-client">
            <Ionicons name="call" size={16} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.primary, fontWeight: "800" }]}>
              {order.client_phone}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>Manzil</Text>
          <View style={styles.row}>
            <Ionicons name="location" size={16} color={colors.textSecondary} />
            <Text style={[styles.rowText, { flex: 1 }]}>{order.store_address}</Text>
          </View>
          {order.latitude && order.longitude ? (
            <TouchableOpacity style={styles.mapBtn} onPress={openMap} testID="open-map">
              <Ionicons name="navigate" size={16} color={colors.primary} />
              <Text style={styles.mapBtnText}>
                {order.latitude.toFixed(5)}, {order.longitude.toFixed(5)} · Xaritada ko'rish
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.sectionTitle}>Agent</Text>
          <View style={styles.row}>
            <Ionicons name="person-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.rowText}>{order.agent_name}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.rowText}>{order.agent_phone}</Text>
          </View>
        </View>

        {order.status_history.length > 0 ? (
          <View style={[styles.card, shadows.card]}>
            <Text style={styles.sectionTitle}>Holat tarixi</Text>
            {order.status_history.map((h, i) => (
              <View key={i} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineStatus}>
                    {STATUS_LABEL[h.status] || h.status}
                  </Text>
                  <Text style={styles.timelineMeta}>
                    {new Date(h.at).toLocaleString("uz-UZ")}
                    {h.by_name ? ` · ${h.by_name}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {canUpdate ? (
          <Button
            title={`Holatni o'zgartirish: ${STATUS_LABEL[next!]}`}
            onPress={() => updateStatus(next as any)}
            loading={updating}
            style={{ marginTop: 8 }}
            testID="update-status-button"
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  body: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radii.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  product: { fontSize: 20, fontWeight: "900", color: colors.textPrimary },
  cat: { fontSize: 13, color: colors.textSecondary, fontWeight: "700", marginTop: 2 },
  quantity: { fontSize: 13, color: colors.textPrimary, fontWeight: "700", marginTop: 6 },
  noteBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    padding: 10,
    borderRadius: radii.sm,
    marginTop: 12,
  },
  noteText: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  rowText: { fontSize: 14, color: colors.textPrimary, fontWeight: "600" },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: radii.md,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  mapBtnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  photo: { width: 100, height: 100, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 8 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  timelineStatus: { fontSize: 14, fontWeight: "800", color: colors.textPrimary },
  timelineMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
