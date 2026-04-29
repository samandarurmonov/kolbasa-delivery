import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { Button } from "../../src/components/Button";
import { colors, radii, shadows } from "../../src/theme";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  agent: "Agent",
  warehouse: "Omborchi",
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const onLogout = () => {
    Alert.alert("Chiqish", "Akkauntdan chiqishni xohlaysizmi?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Chiqish",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      <View style={[styles.card, shadows.card]}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color="#fff" />
        </View>
        <Text style={styles.name} testID="profile-name">
          {user?.name}
        </Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>
            {ROLE_LABELS[user?.role || ""] || user?.role}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.rowText}>{user?.phone}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} testID="logout-button">
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Akkauntdan chiqish</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>SausageTrade Uz · v1.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20 },
  title: { fontSize: 24, fontWeight: "900", color: colors.textPrimary },
  card: {
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 14,
  },
  rolePill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  roleText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: colors.borderLight,
    marginVertical: 18,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { fontSize: 15, color: colors.textPrimary, fontWeight: "600" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radii.md,
    paddingVertical: 16,
    gap: 8,
  },
  logoutText: { color: colors.danger, fontWeight: "800", fontSize: 15 },
  footer: { alignItems: "center", marginTop: "auto", paddingBottom: 24 },
  footerText: { color: colors.textMuted, fontSize: 12 },
});
