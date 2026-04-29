import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Input } from "../../src/components/Input";
import { Button } from "../../src/components/Button";
import { FullscreenImage } from "../../src/components/FullscreenImage";
import { SECTIONS } from "../../src/sections";
import { api } from "../../src/api";
import { colors, radii, shadows } from "../../src/theme";

type Cat = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  image?: string;
  price?: number;
  weight_grams?: number;
};

export default function NewOrder() {
  const router = useRouter();
  const [categories, setCategories] = useState<Cat[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productModal, setProductModal] = useState(false);
  const [productSection, setProductSection] = useState(SECTIONS[0].key);
  const [fsProductImage, setFsProductImage] = useState<string | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [catModal, setCatModal] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [customCat, setCustomCat] = useState("");
  const [productName, setProductName] = useState("");
  const [quantityValue, setQuantityValue] = useState("");
  const [quantityUnit, setQuantityUnit] = useState<"dona" | "kg" | "g">("kg");
  const [note, setNote] = useState("");
  const [clientPhoneDigits, setClientPhoneDigits] = useState("");
  const [clientName, setClientName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<Cat[]>("/categories").then(setCategories).catch(() => {});
    api<Product[]>("/products").then(setProducts).catch(() => {});
  }, []);

  // Client autofill: when phone is fully entered, look up last order
  useEffect(() => {
    if (clientPhoneDigits.length !== 9) return;
    const phone = "+998" + clientPhoneDigits;
    let cancelled = false;
    api<any>(`/clients/lookup?phone=${encodeURIComponent(phone)}`)
      .then((data) => {
        if (cancelled || !data) return;
        if (!clientName && data.client_name) setClientName(data.client_name);
        if (!storeAddress && data.store_address) setStoreAddress(data.store_address);
        if (latitude == null && data.latitude != null) setLatitude(data.latitude);
        if (longitude == null && data.longitude != null) setLongitude(data.longitude);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientPhoneDigits]);

  const onPickProduct = (p: Product) => {
    setSelectedProduct(p);
    setProductName(p.name);
    if (p.category_id) {
      const c = categories.find((c) => c.id === p.category_id);
      if (c) setSelectedCat(c);
    }
    setProductModal(false);
  };

  const filteredProducts = products.filter(
    (p) => (p.category_name || "") === productSection
  );

  const detectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ruxsat berilmadi", "Lokatsiyaga ruxsat bering");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (places && places.length > 0) {
          const p = places[0];
          const addr = [p.street, p.name, p.city || p.subregion, p.region]
            .filter(Boolean)
            .join(", ");
          if (addr && !storeAddress) setStoreAddress(addr);
        }
      } catch {
        // reverse geocode optional
      }
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message || "Lokatsiyani aniqlashda xatolik");
    } finally {
      setLocating(false);
    }
  };

  const pickFromGallery = async () => {
    if (photos.length >= 2) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Ruxsat berilmadi", "Galereyaga ruxsat bering");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.6,
      allowsEditing: false,
    });
    if (!r.canceled && r.assets[0]?.base64) {
      setPhotos((p) => [...p, `data:image/jpeg;base64,${r.assets[0].base64}`]);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 2) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Ruxsat berilmadi", "Kameraga ruxsat bering");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.6,
      allowsEditing: false,
    });
    if (!r.canceled && r.assets[0]?.base64) {
      setPhotos((p) => [...p, `data:image/jpeg;base64,${r.assets[0].base64}`]);
    }
  };

  const addPhoto = () => {
    if (photos.length >= 2) return;
    Alert.alert("Foto qo'shish", "Manbani tanlang", [
      { text: "Kamera", onPress: takePhoto },
      { text: "Galereya", onPress: pickFromGallery },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const removePhoto = (i: number) => {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    if (!selectedCat && !customCat.trim()) {
      Alert.alert("Xatolik", "Kategoriyani tanlang yoki kiriting");
      return;
    }
    if (!productName.trim()) {
      Alert.alert("Xatolik", "Mahsulot nomini kiriting");
      return;
    }
    if (clientPhoneDigits.length !== 9) {
      Alert.alert("Xatolik", "Klient telefonini to'liq kiriting");
      return;
    }
    if (!storeAddress.trim()) {
      Alert.alert("Xatolik", "Do'kon manzilini kiriting");
      return;
    }
    setSubmitting(true);
    try {
      await api("/orders", {
        method: "POST",
        body: {
          product_id: selectedProduct?.id,
          category_id: selectedCat?.id,
          category_name: selectedCat?.name,
          custom_category: customCat.trim() || null,
          product_name: productName.trim(),
          quantity: quantityValue.trim()
            ? `${quantityValue.trim()} ${quantityUnit}`
            : null,
          note: note.trim() || null,
          client_phone: "+998" + clientPhoneDigits,
          client_name: clientName.trim() || null,
          store_address: storeAddress.trim(),
          latitude,
          longitude,
          photos,
        },
      });
      Alert.alert("Muvaffaqiyatli", "Zakaz omborga yuborildi", [
        { text: "OK", onPress: () => router.replace("/(agent)") },
      ]);
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message || "Yuborilmadi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Yangi zakaz</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* --- Mahsulot --- */}
          <Text style={styles.section}>Mahsulot</Text>
          <View style={styles.card}>
            <Text style={styles.miniLabel}>KATALOGDAN TANLASH</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setProductModal(true)}
              testID="select-product-button"
            >
              {selectedProduct?.image ? (
                <Image
                  source={{ uri: selectedProduct.image }}
                  style={{ width: 36, height: 36, borderRadius: 8, marginRight: 10 }}
                />
              ) : null}
              <Text
                style={[
                  styles.selectText,
                  { flex: 1 },
                  !selectedProduct && { color: colors.textMuted },
                ]}
              >
                {selectedProduct ? selectedProduct.name : "Mahsulotni katalogdan tanlash"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.miniLabel}>KATEGORIYA</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setCatModal(true)}
              testID="select-category-button"
            >
              <Text
                style={[
                  styles.selectText,
                  !selectedCat && { color: colors.textMuted },
                ]}
              >
                {selectedCat ? selectedCat.name : "Kategoriya tanlash"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Input
              label="Yoki erkin kategoriya"
              value={customCat}
              onChangeText={setCustomCat}
              placeholder="Masalan, Maxsus buyurtma"
              testID="custom-category-input"
            />
            <Input
              label="Mahsulot nomi *"
              value={productName}
              onChangeText={setProductName}
              placeholder="Masalan, Doktorskaya kolbasa"
              testID="product-name-input"
            />
            <Text style={styles.miniLabel}>MIQDOR / VAZN</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label=""
                  value={quantityValue}
                  onChangeText={setQuantityValue}
                  keyboardType="numeric"
                  placeholder="0"
                  testID="quantity-value-input"
                />
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {(["dona", "kg", "g"] as const).map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setQuantityUnit(u)}
                    style={[
                      styles.unitChip,
                      quantityUnit === u && styles.unitChipActive,
                    ]}
                    testID={`unit-${u}`}
                  >
                    <Text
                      style={[
                        styles.unitText,
                        quantityUnit === u && styles.unitTextActive,
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Input
              label="Qo'shimcha izoh"
              value={note}
              onChangeText={setNote}
              placeholder="Eslatma..."
              multiline
              style={{ height: 80, textAlignVertical: "top", paddingTop: 12 }}
            />
          </View>

          {/* --- Klient --- */}
          <Text style={styles.section}>Klient ma'lumotlari</Text>
          <View style={styles.card}>
            <Input
              label="Klient telefon *"
              prefix="+998"
              value={clientPhoneDigits}
              onChangeText={(v) => setClientPhoneDigits(v.replace(/\D/g, "").slice(0, 9))}
              keyboardType="phone-pad"
              placeholder="90 123 45 67"
              testID="client-phone-input"
            />
            <Input
              label="Klient ismi"
              value={clientName}
              onChangeText={setClientName}
              placeholder="Ixtiyoriy"
            />
          </View>

          {/* --- Manzil --- */}
          <Text style={styles.section}>Do'kon manzili</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.locBtn}
              onPress={detectLocation}
              disabled={locating}
              testID="detect-location-button"
            >
              {locating ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="navigate" size={18} color={colors.primary} />
                  <Text style={styles.locText}>
                    {latitude
                      ? `Joylashuv aniqlandi (${latitude.toFixed(5)}, ${longitude?.toFixed(5)})`
                      : "GPS orqali joylashuvni aniqlash"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Input
              label="Manzil *"
              value={storeAddress}
              onChangeText={setStoreAddress}
              placeholder="Toshkent, Chilonzor 5..."
              multiline
              style={{ height: 80, textAlignVertical: "top", paddingTop: 12 }}
              testID="store-address-input"
            />
          </View>

          {/* --- Photos --- */}
          <Text style={styles.section}>Rasmlar (1-2 ta)</Text>
          <View style={styles.card}>
            <View style={styles.photosRow}>
              {photos.map((p, i) => (
                <View key={i} style={styles.photoSlot}>
                  <Image source={{ uri: p }} style={styles.photoImg} />
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() => removePhoto(i)}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 2 ? (
                <TouchableOpacity
                  style={styles.addPhoto}
                  onPress={addPhoto}
                  testID="add-photo-button"
                >
                  <Ionicons name="camera" size={28} color={colors.textSecondary} />
                  <Text style={styles.addPhotoText}>Foto qo'shish</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <Button
            title="Zakazni yuborish"
            onPress={submit}
            loading={submitting}
            style={{ marginTop: 8 }}
            testID="submit-order-button"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category modal */}
      <Modal
        visible={catModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCatModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCatModal(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Kategoriya tanlash</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.catItem}
                onPress={() => {
                  setSelectedCat(c);
                  setCatModal(false);
                }}
              >
                <Text style={styles.catItemText}>{c.name}</Text>
                {selectedCat?.id === c.id ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Button
            title="Yopish"
            variant="secondary"
            onPress={() => setCatModal(false)}
            style={{ marginTop: 12 }}
          />
        </View>
      </Modal>

      {/* Product modal */}
      <Modal
        visible={productModal}
        transparent
        animationType="slide"
        onRequestClose={() => setProductModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setProductModal(false)} />
        <View style={[styles.modalSheet, { maxHeight: "85%" }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Katalogdan tanlang</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            style={{ marginBottom: 8, maxHeight: 50 }}
          >
            {SECTIONS.map((s) => (
              <TouchableOpacity
                key={s.key}
                onPress={() => setProductSection(s.key)}
                style={[
                  styles.modSecTab,
                  productSection === s.key && styles.modSecTabActive,
                ]}
                testID={`agent-section-${s.key}`}
              >
                <Text
                  style={[
                    styles.modSecText,
                    productSection === s.key && styles.modSecTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView style={{ maxHeight: 460 }}>
            {filteredProducts.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
                  Bu bo'limda mahsulot yo'q. Boshqa bo'limni tanlang yoki nomni qo'lda yozing.
                </Text>
              </View>
            ) : (
              filteredProducts.map((p) => (
                <View key={p.id} style={styles.prodItem}>
                  <TouchableOpacity
                    onPress={() => p.image && setFsProductImage(p.image)}
                  >
                    {p.image ? (
                      <Image source={{ uri: p.image }} style={styles.prodImg} />
                    ) : (
                      <View
                        style={[
                          styles.prodImg,
                          { alignItems: "center", justifyContent: "center" },
                        ]}
                      >
                        <Ionicons name="cube" size={20} color={colors.textMuted} />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => onPickProduct(p)}
                  >
                    <Text style={styles.catItemText}>{p.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                      {p.price != null ? (
                        <Text style={{ fontSize: 13, fontWeight: "900", color: colors.primary }}>
                          {p.price.toLocaleString("ru-RU")} so'm
                        </Text>
                      ) : null}
                      {p.weight_grams != null ? (
                        <Text style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: colors.textSecondary,
                          backgroundColor: colors.surfaceMuted,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: 999,
                        }}>
                          {p.weight_grams >= 1000 ? `${p.weight_grams / 1000} kg` : `${p.weight_grams} g`}
                        </Text>
                      ) : null}
                      {p.category_name ? (
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          · {p.category_name}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  {selectedProduct?.id === p.id ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : (
                    <TouchableOpacity onPress={() => onPickProduct(p)}>
                      <Ionicons
                        name="add-circle"
                        size={26}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>
          <Button
            title="Yopish"
            variant="secondary"
            onPress={() => setProductModal(false)}
            style={{ marginTop: 12 }}
          />
        </View>
      </Modal>

      <FullscreenImage
        uri={fsProductImage}
        visible={!!fsProductImage}
        onClose={() => setFsProductImage(undefined)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    justifyContent: "space-between",
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  body: { padding: 16, paddingBottom: 60 },
  section: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
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
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: radii.md,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  locText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  photosRow: { flexDirection: "row", gap: 12 },
  photoSlot: {
    width: 120,
    height: 120,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
    position: "relative",
  },
  photoImg: { width: "100%", height: "100%" },
  removePhoto: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhoto: {
    width: 120,
    height: 120,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.surfaceMuted,
  },
  addPhotoText: { fontSize: 11, color: colors.textSecondary, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
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
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  catItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  catItemText: { fontSize: 15, color: colors.textPrimary, fontWeight: "600" },
  prodItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  prodImg: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
  },
  unitChip: {
    minHeight: 54,
    minWidth: 50,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  unitChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitText: { fontSize: 13, fontWeight: "800", color: colors.textPrimary },
  unitTextActive: { color: "#fff" },
  modSecTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modSecTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modSecText: { fontSize: 12, fontWeight: "800", color: colors.textSecondary },
  modSecTextActive: { color: "#fff" },
});
