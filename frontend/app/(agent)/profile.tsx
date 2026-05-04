import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/auth";
import { Input } from "../../src/components/Input";
import { Button } from "../../src/components/Button";
import { api } from "../../src/api";
import { colors, radii, shadows } from "../../src/theme";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  agent: "Agent",
  warehouse: "Omborchi",
};

export default function Profile() {
  const { user, signOut, refreshMe } = useAuth();
  const router = useRouter();
  const [editName, setEditName] = useState(false);
  const [editPin, setEditPin] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const [confirmLogout, setConfirmLogout] = useState(false);

  const doLogout = async () => {
    try {
      await signOut();
    } finally {
      setConfirmLogout(false);
      router.replace("/login");
    }
  };

  const onLogout = () => {
    setConfirmLogout(true);
  };

  const onSaveName = async () => {
    if (!name.trim()) return Alert.alert("Xatolik", "Ism bo'sh bo'lmasin");
    setSaving(true);
    try {
      await api("/auth/me", { method: "PATCH", body: { name: name.trim() } });
      await refreshMe();
      setEditName(false);
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message);
    } finally {
      setSaving(false);
    }
  };

  const onSavePin = async () => {
    if (pin.length < 4 || pin.length > 6) {
      return Alert.alert("Xatolik", "PIN 4-6 raqamdan iborat bo'lishi kerak");
    }
    if (pin !== pinConfirm) {
      return Alert.alert("Xatolik", "PIN-kodlar mos kelmadi");
    }
    setSaving(true);
    try {
      await api("/auth/me", { method: "PATCH", body: { pin } });
      setEditPin(false);
      setPin("");
      setPinConfirm("");
      Alert.alert("Saqlandi", "PIN-kod o'zgartirildi");
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message);
    } finally {
      setSaving(false);
    }
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
          <Text style={styles.roleText}>{ROLE_LABELS[user?.role || ""] || user?.role}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.rowText}>{user?.phone}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 8 }}>
        {user?.role === "admin" ? (
          <>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                setName(user?.name || "");
                setEditName(true);
              }}
              testID="edit-name-button"
            >
              <View style={[styles.actionIcon, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="create" size={18} color="#1D4ED8" />
              </View>
              <Text style={styles.actionText}>Ismni o'zgartirish</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                setPin("");
                setPinConfirm("");
                setEditPin(true);
              }}
              testID="change-pin-button"
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="key" size={18} color="#B45309" />
              </View>
              <Text style={styles.actionText}>PIN-kodni o'zgartirish</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color={colors.info} />
            <Text style={styles.infoText}>
              Ism, telefon va PIN-kodni faqat administrator o'zgartira oladi.
              O'zgartirish kerak bo'lsa, admin bilan bog'laning.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} testID="logout-button">
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Akkauntdan chiqish</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>SausageTrade Uz · v1.0</Text>
      </View>

      {/* Edit name modal */}
      <Modal visible={editName} transparent animationType="slide" onRequestClose={() => setEditName(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditName(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <Text style={styles.modalTitle}>Ismni tahrirlash</Text>
          <Input label="Ism familiya" value={name} onChangeText={setName} testID="name-input" />
          <Button title="Saqlash" onPress={onSaveName} loading={saving} testID="save-name" />
          <Button
            title="Bekor qilish"
            variant="secondary"
            onPress={() => setEditName(false)}
            style={{ marginTop: 8 }}
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* Change PIN modal */}
      <Modal visible={editPin} transparent animationType="slide" onRequestClose={() => setEditPin(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditPin(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <Text style={styles.modalTitle}>PIN-kodni o'zgartirish</Text>
          <Input
            label="Yangi PIN (4-6 raqam)"
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            testID="new-pin"
          />
          <Input
            label="PIN ni qayta kiriting"
            value={pinConfirm}
            onChangeText={(v) => setPinConfirm(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            testID="confirm-pin"
          />
          <Button title="Saqlash" onPress={onSavePin} loading={saving} testID="save-pin" />
          <Button
            title="Bekor qilish"
            variant="secondary"
            onPress={() => setEditPin(false)}
            style={{ marginTop: 8 }}
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* Logout confirmation modal */}
      <Modal
        visible={confirmLogout}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmLogout(false)}
      >
        <Pressable
          style={styles.confirmBackdrop}
          onPress={() => setConfirmLogout(false)}
        />
        <View style={styles.confirmWrap} pointerEvents="box-none">
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="log-out-outline" size={28} color={colors.danger} />
            </View>
            <Text style={styles.confirmTitle}>Akkauntdan chiqish</Text>
            <Text style={styles.confirmMsg}>
              Haqiqatan ham tizimdan chiqmoqchimisiz?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmCancel]}
                onPress={() => setConfirmLogout(false)}
                testID="logout-cancel"
              >
                <Text style={styles.confirmCancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmDanger]}
                onPress={doLogout}
                testID="logout-confirm"
              >
                <Text style={styles.confirmDangerText}>Chiqish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  name: { fontSize: 20, fontWeight: "800", color: colors.textPrimary, marginTop: 14 },
  rolePill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  roleText: { color: colors.primary, fontWeight: "800", fontSize: 12, letterSpacing: 0.4 },
  divider: { height: 1, width: "100%", backgroundColor: colors.borderLight, marginVertical: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { fontSize: 15, color: colors.textPrimary, fontWeight: "600" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.textPrimary },
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
    marginTop: 8,
  },
  logoutText: { color: colors.danger, fontWeight: "800", fontSize: 15 },
  footer: { alignItems: "center", marginTop: "auto", paddingBottom: 24 },
  footerText: { color: colors.textMuted, fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: colors.textPrimary, marginBottom: 12 },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  confirmWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 24,
    alignItems: "center",
  },
  confirmIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },
  confirmMsg: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancel: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmCancelText: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 14,
  },
  confirmDanger: {
    backgroundColor: colors.danger,
  },
  confirmDangerText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
});
