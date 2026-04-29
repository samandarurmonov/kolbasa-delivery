import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
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

type Cat = { id: string; name: string };

export default function Categories() {
  const [items, setItems] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<Cat[]>("/categories");
      setItems(r);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await api("/categories", { method: "POST", body: { name: name.trim() } });
      setName("");
      load();
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message);
    } finally {
      setAdding(false);
    }
  };

  const onDelete = (c: Cat) => {
    Alert.alert("O'chirish", `"${c.name}" ni o'chirasizmi?`, [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/categories/${c.id}`, { method: "DELETE" });
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.titleSmall}>Mahsulot katalogi</Text>
            <Text style={styles.title}>Kategoriyalar</Text>
          </View>
        </View>

        <View style={styles.addBox}>
          <Input
            label="Yangi kategoriya"
            value={name}
            onChangeText={setName}
            placeholder="Masalan, Sosiska"
            testID="new-cat-input"
          />
          <Button
            title="Qo'shish"
            onPress={onAdd}
            loading={adding}
            disabled={!name.trim()}
            testID="add-cat-button"
          />
        </View>

        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={[styles.row, shadows.card]}>
              <View style={styles.rowIcon}>
                <Ionicons name="pricetag" size={18} color={colors.primary} />
              </View>
              <Text style={styles.rowText}>{item.name}</Text>
              <TouchableOpacity
                onPress={() => onDelete(item)}
                style={styles.delBtn}
                testID={`del-cat-${item.id}`}
              >
                <Ionicons name="trash" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>
                Hech qanday kategoriya yo'q
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  titleSmall: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "900", color: colors.textPrimary, marginTop: 2 },
  addBox: {
    backgroundColor: colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  delBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
});
