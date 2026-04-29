import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../src/auth";
import { Input } from "../src/components/Input";
import { Button } from "../src/components/Button";
import { colors, radii } from "../src/theme";
import { Ionicons } from "@expo/vector-icons";

export default function Login() {
  const router = useRouter();
  const { requestOtp } = useAuth();
  const [digits, setDigits] = useState(""); // 9 digits after +998
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullPhone = "+998" + digits.replace(/\D/g, "").slice(0, 9);
  const isValid = digits.replace(/\D/g, "").length === 9;

  const onSubmit = async () => {
    if (!isValid) {
      setError("Telefon raqam to'liq emas");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await requestOtp(fullPhone);
      router.push({
        pathname: "/verify",
        params: { phone: fullPhone, dev_code: res.dev_code || "" },
      });
    } catch (e: any) {
      const msg = e?.message || "Xatolik yuz berdi";
      setError(msg);
      if (Platform.OS !== "web") Alert.alert("Xatolik", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Image
              source={{
                uri: "https://images.pexels.com/photos/5860937/pexels-photo-5860937.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
              }}
              style={styles.heroImg}
            />
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.brandPill}>
                <Ionicons name="cube" color="#fff" size={14} />
                <Text style={styles.brandPillText}>SAUSAGE TRADE UZ</Text>
              </View>
              <Text style={styles.heroTitle}>Agentlar{"\n"}boshqaruv tizimi</Text>
              <Text style={styles.heroSub}>
                Maxalliy do'konlardan zakazlarni qabul qiling va omborga yo'naltiring
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Tizimga kirish</Text>
            <Text style={styles.subtitle}>Telefon raqamingizni kiriting</Text>

            <Input
              label="Telefon raqam"
              prefix="+998"
              value={digits}
              onChangeText={(v) => setDigits(v.replace(/\D/g, "").slice(0, 9))}
              keyboardType="phone-pad"
              placeholder="90 123 45 67"
              maxLength={9}
              error={error || undefined}
              testID="login-phone-input"
            />

            <Button
              title="Kodni olish"
              onPress={onSubmit}
              loading={loading}
              disabled={!isValid}
              testID="login-submit-button"
            />

            <TouchableOpacity
              style={styles.helpRow}
              onPress={() =>
                Alert.alert(
                  "Yordam",
                  "Akkauntingiz bo'lmasa, administratorga murojaat qiling.\nDefault admin: +998940634110"
                )
              }
            >
              <Ionicons name="help-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.helpText}>Akkauntim yo'q</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: {
    height: 280,
    backgroundColor: colors.primaryDark,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroImg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.35,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryDark,
    opacity: 0.55,
  },
  heroContent: { padding: 24, paddingBottom: 36 },
  brandPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  brandPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  heroSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
    maxWidth: 320,
  },
  card: {
    backgroundColor: colors.surface,
    marginTop: -28,
    marginHorizontal: 16,
    borderRadius: radii.xl,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },
  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  helpText: { color: colors.textSecondary, fontSize: 13, marginLeft: 6 },
});
