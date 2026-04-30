import React, { useCallback, useState, useMemo, useEffect } from "react";
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
import { FullscreenImage } from "../../src/components/FullscreenImage";
import { SECTIONS } from "../../src/sections";
import { colors, radii, shadows } from "../../src/theme";

type Product = {
  id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  image?: string;
  price?: number;
  weight_options?: number[];
};
type Cat = { id: string; name: string };

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [section, setSection] = useState(SECTIONS[0].key);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [weights, setWeights] = useState<number[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [fsImage, setFsImage] = useState<string | undefined>();

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

  const filtered = useMemo(
    () => items.filter((p) => (p.category_name || "") === section),
    [items, section]
  );

  const sectionCounts = useMemo(() => {
    const m: Record<string, number> = {};
    SECTIONS.forEach((s) => {
      m[s.key] = items.filter((p) => p.category_name === s.key).length;
    });
    return m;
  }, [items]);

  const reset = () => {
    setEditing(null);
    setName("");
    setPrice("");
    setWeights([]);
    setWeightInput("");
    setImage(undefined);
  };

  const startCreate = () => {
    reset();
    setShowForm(true);
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setPrice(p.price != null ? String(p.price) : "");
    setWeights(p.weight_options || []);
    setWeightInput("");
    setImage(p.image);
    setShowForm(true);
  };

  const addWeight = () => {
    const n = parseFloat(weightInput.replace(/[^\d.]/g, ""));
    if (!n || n <= 0) return;
    if (weights.includes(n)) {
      setWeightInput("");
      return;
    }
    setWeights([...weights, n].sort((a, b) => a - b));
    setWeightInput("");
  };

  const removeWeight = (w: number) => {
    setWeights(weights.filter((x) => x !== w));
  };

  const pickFromGallery = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") return Alert.alert("Ruxsat berilmadi");
      }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.6,
        // allowsEditing/aspect don't work reliably on web — skip there
        ...(Platform.OS !== "web" ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : {}),
      });
      if (!r.canceled && r.assets && r.assets[0]) {
        const a = r.assets[0];
        if (a.base64) {
          setImage(`data:image/jpeg;base64,${a.base64}`);
        } else if (a.uri && a.uri.startsWith("data:")) {
          setImage(a.uri);
        } else if (a.uri) {
          // Fallback: fetch and convert to base64 (web blob URIs)
          try {
            const resp = await fetch(a.uri);
            const blob = await resp.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === "string") setImage(reader.result);
            };
            reader.readAsDataURL(blob);
          } catch {
            Alert.alert("Xatolik", "Rasmni o'qib bo'lmadi");
          }
        }
      }
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message || "Rasm tanlashda xatolik");
    }
  };

  const takeFromCamera = async () => {
    try {
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
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message || "Kamera xatosi");
    }
  };

  const pickImage = () => {
    if (Platform.OS === "web") {
      // Alert buttons don't work reliably on web — go straight to gallery
      pickFromGallery();
      return;
    }
    Alert.alert("Rasm tanlash", "Manbani tanlang", [
      { text: "Kamera", onPress: takeFromCamera },
      { text: "Galereya", onPress: pickFromGallery },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const onSave = async () => {
    if (!name.trim()) return Alert.alert("Xatolik", "Mahsulot nomini kiriting");
    const cat = cats.find((c) => c.name === section);
    if (!cat)
      return Alert.alert("Xatolik", "Bo'lim topilmadi, admin bilan bog'laning");
    setSaving(true);
    try {
      const body: any = {
        name: name.trim(),
        category_id: cat.id,
        image,
        price: price.trim() ? parseFloat(price.replace(/[^\d.]/g, "")) : null,
        weight_options: weights,
      };
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.titleSmall}>Katalog</Text>
          <Text style={styles.title}>{filtered.length} mahsulot</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={startCreate} testID="add-product-button">
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Qo'shish</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsRow}
      >
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setSection(s.key)}
            style={[styles.tab, section === s.key && styles.tabActive]}
            testID={`section-${s.key}`}
          >
            <Ionicons
              name={s.icon as any}
              size={14}
              color={section === s.key ? "#fff" : colors.textSecondary}
            />
            <Text style={[styles.tabText, section === s.key && styles.tabTextActive]}>
              {s.label}
            </Text>
            <View style={[styles.tabCount, section === s.key && styles.tabCountActive]}>
              <Text
                style={[
                  styles.tabCountText,
                  section === s.key && { color: colors.primary },
                ]}
              >
                {sectionCounts[s.key] || 0}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.gridCard, shadows.card]}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => item.image && setFsImage(item.image)}
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.gridImg} />
              ) : (
                <View style={[styles.gridImg, styles.imgPh]}>
                  <Ionicons name="image" size={32} color={colors.textMuted} />
                </View>
              )}
              {item.image ? (
                <View style={styles.expandIcon}>
                  <Ionicons name="expand" size={14} color="#fff" />
                </View>
              ) : null}
            </TouchableOpacity>
            <View style={styles.gridBody}>
              <Text style={styles.gridName} numberOfLines={2}>
                {item.name}
              </Text>
              {item.price != null || (item.weight_options && item.weight_options.length > 0) ? (
                <View style={styles.priceRow}>
                  {item.price != null ? (
                    <Text style={styles.priceText}>
                      {item.price.toLocaleString("ru-RU")} so'm
                    </Text>
                  ) : null}
                  {item.weight_options && item.weight_options.length > 0
                    ? item.weight_options.map((w) => (
                        <Text key={w} style={styles.gramsText}>
                          {w >= 1000 ? `${w / 1000}kg` : `${w}g`}
                        </Text>
                      ))
                    : null}
                </View>
              ) : null}
              <View style={styles.gridActions}>
                <TouchableOpacity onPress={() => startEdit(item)} style={styles.gridActionBtn}>
                  <Ionicons name="create" size={16} color={colors.info} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDelete(item)}
                  style={[styles.gridActionBtn, { backgroundColor: "#FEF2F2" }]}
                >
                  <Ionicons name="trash" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40, paddingHorizontal: 24 }}>
            <Ionicons name="cube-outline" size={56} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, marginTop: 12, fontWeight: "700" }}>
              Bu bo'limda mahsulot yo'q
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              "Qo'shish" tugmasini bosib birinchi mahsulot qo'shing
            </Text>
          </View>
        }
      />

      {/* Add/Edit modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowForm(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalSheet}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>
            {editing ? "Mahsulotni tahrirlash" : `Yangi mahsulot · ${section}`}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage} testID="image-picker">
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
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Narxi (so'm)"
                  value={price}
                  onChangeText={(v) => setPrice(v.replace(/[^\d]/g, ""))}
                  keyboardType="numeric"
                  placeholder="50000"
                  testID="product-price-field"
                />
              </View>
            </View>
            <Text style={styles.miniLabel}>VAZN VARIANTLARI (gram)</Text>
            <View style={styles.weightRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label=""
                  value={weightInput}
                  onChangeText={(v) => setWeightInput(v.replace(/[^\d]/g, ""))}
                  keyboardType="numeric"
                  placeholder="masalan: 500"
                  onSubmitEditing={addWeight}
                  testID="weight-input"
                />
              </View>
              <TouchableOpacity
                onPress={addWeight}
                style={styles.addWeightBtn}
                testID="add-weight-button"
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            {weights.length > 0 ? (
              <View style={styles.weightChips}>
                {weights.map((w) => (
                  <TouchableOpacity
                    key={w}
                    onPress={() => removeWeight(w)}
                    style={styles.weightChip}
                  >
                    <Text style={styles.weightChipText}>
                      {w >= 1000 ? `${w / 1000} kg` : `${w} g`}
                    </Text>
                    <Ionicons name="close-circle" size={16} color={colors.danger} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.weightHint}>
                Bir nechta vazn variantini qo'shing (masalan: 300, 500, 800)
              </Text>
            )}
            <View
              style={{
                backgroundColor: colors.surfaceMuted,
                padding: 12,
                borderRadius: radii.md,
                marginBottom: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="folder" size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "700" }}>
                Bo'lim: {section}
              </Text>
            </View>
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

      <FullscreenImage uri={fsImage} visible={!!fsImage} onClose={() => setFsImage(undefined)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
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
  tabsScroll: { maxHeight: 50, marginBottom: 4 },
  tabsRow: { paddingHorizontal: 16, gap: 8, alignItems: "center", paddingVertical: 4 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: "700" },
  tabTextActive: { color: "#fff" },
  tabCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
  },
  tabCountActive: { backgroundColor: "#fff" },
  tabCountText: { fontSize: 10, color: colors.textSecondary, fontWeight: "800" },
  gridCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  gridImg: { width: "100%", aspectRatio: 1, backgroundColor: colors.surfaceMuted },
  imgPh: { alignItems: "center", justifyContent: "center" },
  expandIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridBody: { padding: 10 },
  gridName: { fontSize: 14, fontWeight: "800", color: colors.textPrimary, minHeight: 36 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.primary,
  },
  gramsText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  gridActions: { flexDirection: "row", gap: 6, marginTop: 8 },
  gridActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#DBEAFE",
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
    height: 200,
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
  weightRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 },
  addWeightBtn: {
    width: 54,
    height: 54,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  weightChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  weightChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  weightChipText: { fontSize: 13, fontWeight: "800", color: "#92400E" },
  weightHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
    marginBottom: 14,
    marginLeft: 4,
  },
});
