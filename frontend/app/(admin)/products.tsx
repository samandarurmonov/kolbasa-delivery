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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../src/api";
import { Input } from "../../src/components/Input";
import { Button } from "../../src/components/Button";
import { colors, radii, shadows } from "../../src/theme";

type Product = {
  id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  image?: string;
};
type Cat = { id: string; name: string };

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [catId, setCatId] = useState<string | undefined>();
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [image, setImage] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api<Product[]>("/products"),
        api<Cat[]>("/categories"),
      ]);
      setItems(p);
      setCats(c);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const reset = () => {
    setEditing(null);
    setName("");
    setCatId(undefined);
    setImage(undefined);
  };

  const startCreate = () => {
    reset();
    setShowForm(true);
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setCatId(p.category_id);
    setImage(p.image);
    setShowForm(true);
  };

  const pickImage = async () => {
    Alert.alert("Rasm tanlash", "Manbani tanlang", [
      {
        text: "Kamera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") return Alert.alert("Ruxsat berilmadi");
          const r = await ImagePicker.launchCameraAsync({
            base64: true,
            quality: 0.6,
            allowsEditing: true,
            aspect: [1, 1],
          });
          if (!r.canceled && r.assets[0]?.base64) {
            setImage(`data:image/jpeg;base64,${r.assets[0].base64}`);
          }
        },
      },
      {
        text: "Galereya",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") return Alert.alert("Ruxsat berilmadi");
          const r = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            base64: true,
            quality: 0.6,
            allowsEditing: true,
            aspect: [1, 1],
          });
          if (!r.canceled && r.assets[0]?.base64) {
            setImage(`data:image/jpeg;base64,${r.assets[0].base64}`);
          }
        },
      },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const onSave = async () => {
    if (!name.trim()) return Alert.alert("Xatolik", "Mahsulot nomini kiriting");
    setSaving(true);
    try {
      const body: any = { name: name.trim(), category_id: catId, image };
      if (editing) {
        await api(`/products/${editing.id}`, { method: "PATCH", body });
      } else {
        await api("/products", { method: "POST", body });
      }
      setShowForm(false);
      reset();
      load();
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (p: Product) => {
    Alert.alert("O'chirish", `${p.name} ni o'chirasizmi?`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/products/${p.id}`, { method: "DELETE" });
            load();
          } catch (e: any) {
            Alert.alert("Xatolik", e?.message);
          }
        },
      },
    ]);
  };

  const selectedCat = cats.find((c) => c.id === catId);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.titleSmall}>Katalog</Text>
          <Text style={styles.title}>{items.length} mahsulot</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={startCreate} testID="add-product-button">
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Qo'shish</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={[styles.card, shadows.card]}>
            <TouchableOpacity onPress={() => startEdit(item)} style={styles.cardLeft}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPh]}>
                  <Ionicons name="image" size={24} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.pName}>{item.name}</Text>
                {item.category_name ? (
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{item.category_name}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item)} style={styles.delBtn}>
              <Ionicons name="trash" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Ionicons name="cube-outline" size={56} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, marginTop: 12, fontWeight: "700" }}>
              Hali mahsulot yo'q
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                marginTop: 6,
                textAlign: "center",
                paddingHorizontal: 30,
              }}
            >
              Birinchi mahsulotni rasmi bilan qo'shing — agentlar uni tezda tanlay olishadi
            </Text>
          </View>
        }
      />

      {/* Form modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowForm(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalSheet}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{editing ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.imagePreview} />
              ) : (
                <>
                  <Ionicons name="camera" size={32} color={colors.textSecondary} />
                  <Text style={styles.imagePickText}>Rasm qo'shish</Text>
                </>
              )}
            </TouchableOpacity>
            <Input
              label="Mahsulot nomi"
              value={name}
              onChangeText={setName}
              placeholder="Doktorskaya kolbasa"
              testID="product-name-field"
            />
            <Text style={styles.miniLabel}>KATEGORIYA</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setShowCatPicker(true)}
            >
              <Text
                style={[
                  styles.selectText,
                  !selectedCat && { color: colors.textMuted },
                ]}
              >
                {selectedCat ? selectedCat.name : "Tanlang"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Button
              title="Saqlash"
              onPress={onSave}
              loading={saving}
              testID="save-product"
            />
            <Button
              title="Bekor qilish"
              variant="secondary"
              onPress={() => setShowForm(false)}
              style={{ marginTop: 8 }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category picker */}
      <Modal visible={showCatPicker} transparent animationType="slide" onRequestClose={() => setShowCatPicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCatPicker(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Kategoriya</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            <TouchableOpacity
              style={styles.catItem}
              onPress={() => {
                setCatId(undefined);
                setShowCatPicker(false);
              }}
            >
              <Text style={[styles.catItemText, { color: colors.textMuted }]}>— Yo'q —</Text>
            </TouchableOpacity>
            {cats.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.catItem}
                onPress={() => {
                  setCatId(c.id);
                  setShowCatPicker(false);
                }}
              >
                <Text style={styles.catItemText}>{c.name}</Text>
                {catId === c.id ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  thumb: { width: 60, height: 60, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  thumbPh: { alignItems: "center", justifyContent: "center" },
  pName: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  catBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 4,
  },
  catBadgeText: { fontSize: 11, color: colors.textSecondary, fontWeight: "700" },
  delBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
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
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  imagePicker: {
    height: 160,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    marginBottom: 14,
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePickText: { fontSize: 13, color: colors.textSecondary, fontWeight: "700", marginTop: 8 },
  miniLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  selectText: { fontSize: 16, color: colors.textPrimary, fontWeight: "600" },
  catItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  catItemText: { fontSize: 15, color: colors.textPrimary, fontWeight: "600" },
});
