import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { Input } from "../../src/components/Input";
import { Button } from "../../src/components/Button";
import { colors, radii, shadows } from "../../src/theme";

type AppUser = {
  id: string;
  name: string;
  phone: string;
  role: "admin" | "agent" | "warehouse";
  is_active: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  agent: "Agent",
  warehouse: "Omborchi",
};

const ROLE_COLOR: Record<string, string> = {
  admin: "#C81E1E",
  agent: "#1D4ED8",
  warehouse: "#047857",
};

export default function Users() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [digits, setDigits] = useState("");
  const [role, setRole] = useState<AppUser["role"]>("agent");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const u = await api<AppUser[]>("/users");
      setUsers(u);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const reset = () => {
    setName("");
    setDigits("");
    setRole("agent");
  };

  const onCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Xatolik", "Ismni kiriting");
      return;
    }
    if (digits.length !== 9) {
      Alert.alert("Xatolik", "Telefon raqamni to'liq kiriting");
      return;
    }
    setSaving(true);
    try {
      await api("/users", {
        method: "POST",
        body: { name: name.trim(), phone: "+998" + digits, role },
      });
      reset();
      setShowAdd(false);
      load();
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message || "Yaratishda xatolik");
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (u: AppUser) => {
    try {
      await api(`/users/${u.id}`, {
        method: "PATCH",
        body: { is_active: !u.is_active },
      });
      load();
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message);
    }
  };

  const onDelete = (u: AppUser) => {
    Alert.alert("O'chirish", `${u.name} ni o'chirishni xohlaysizmi?`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/users/${u.id}`, { method: "DELETE" });
            load();
          } catch (e: any) {
            Alert.alert("Xatolik", e?.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.titleSmall}>Hodimlar</Text>
          <Text style={styles.title}>{users.length} kishi</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAdd(true)}
          testID="add-user-button"
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Qo'shish</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={[styles.userCard, shadows.card]} testID={`user-card-${item.id}`}>
            <View style={[styles.avatar, { backgroundColor: ROLE_COLOR[item.role] + "22" }]}>
              <Ionicons name="person" size={20} color={ROLE_COLOR[item.role]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userMeta}>
                {item.phone} · {ROLE_LABEL[item.role]}
              </Text>
              {!item.is_active ? (
                <Text style={styles.blockedBadge}>BLOKLANGAN</Text>
              ) : null}
            </View>
            {item.role !== "admin" ? (
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TouchableOpacity
                  onPress={() => onToggle(item)}
                  style={styles.iconBtn}
                  testID={`toggle-${item.id}`}
                >
                  <Ionicons
                    name={item.is_active ? "lock-closed" : "lock-open"}
                    size={18}
                    color={item.is_active ? colors.warning : colors.success}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDelete(item)}
                  style={styles.iconBtn}
                  testID={`delete-${item.id}`}
                >
                  <Ionicons name="trash" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Ionicons name="people-outline" size={56} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, marginTop: 12, fontWeight: "700" }}>
              Hali hodim yo'q
            </Text>
          </View>
        }
      />

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAdd(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalSheet}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Yangi hodim</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
            <Input
              label="Ism familiya"
              value={name}
              onChangeText={setName}
              placeholder="Ali Valiyev"
              testID="new-user-name"
            />
            <Input
              label="Telefon raqam"
              prefix="+998"
              value={digits}
              onChangeText={(v) => setDigits(v.replace(/\D/g, "").slice(0, 9))}
              keyboardType="phone-pad"
              placeholder="90 123 45 67"
              testID="new-user-phone"
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: colors.textSecondary,
                marginBottom: 6,
                marginLeft: 4,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Rol
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {(["agent", "warehouse"] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  style={[styles.roleChip, role === r && styles.roleChipActive]}
                  testID={`role-${r}`}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      role === r && styles.roleChipTextActive,
                    ]}
                  >
                    {ROLE_LABEL[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button
              title="Saqlash"
              onPress={onCreate}
              loading={saving}
              testID="save-user-button"
            />
            <Button
              title="Bekor qilish"
              variant="secondary"
              onPress={() => setShowAdd(false)}
              style={{ marginTop: 8 }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
  titleSmall: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "900", color: colors.textPrimary, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  userMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  blockedBadge: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: 0.6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: colors.textPrimary, marginBottom: 12 },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleChipText: { fontSize: 13, fontWeight: "800", color: colors.textPrimary },
  roleChipTextActive: { color: "#fff" },
});
