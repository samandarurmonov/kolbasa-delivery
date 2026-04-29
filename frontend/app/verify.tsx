import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/auth";
import { Button } from "../src/components/Button";
import { colors, radii } from "../src/theme";

const CODE_LENGTH = 6;

export default function Verify() {
  const { phone, dev_code } = useLocalSearchParams<{ phone: string; dev_code?: string }>();
  const router = useRouter();
  const { verifyOtp, requestOtp } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(60);
  const [devCode, setDevCode] = useState<string | undefined>(dev_code);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const onVerify = async (value: string) => {
    setLoading(true);
    setError(null);
    try {
      const u = await verifyOtp(phone as string, value);
      if (u.role === "admin") router.replace("/(admin)");
      else if (u.role === "warehouse") router.replace("/(warehouse)");
      else router.replace("/(agent)");
    } catch (e: any) {
      const msg = e?.message || "Kodni tasdiqlashda xatolik";
      setError(msg);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const onChangeCode = (v: string) => {
    const cleaned = v.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(cleaned);
    if (cleaned.length === CODE_LENGTH) {
      onVerify(cleaned);
    }
  };

  const onResend = async () => {
    if (seconds > 0) return;
    try {
      const res = await requestOtp(phone as string);
      setDevCode(res.dev_code);
      setSeconds(60);
      Alert.alert("Yuborildi", "Yangi kod yuborildi");
    } catch (e: any) {
      Alert.alert("Xatolik", e?.message || "Qayta yuborishda xatolik");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-button">
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Tasdiqlash</Text>
          <Text style={styles.subtitle}>
            6 xonali kod{"\n"}
            <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{phone}</Text> raqamiga yuborildi
          </Text>

          {devCode ? (
            <View style={styles.devBox} testID="dev-code-banner">
              <Ionicons name="bug" size={14} color="#92400E" />
              <Text style={styles.devText}>DEV kod: {devCode}</Text>
            </View>
          ) : null}

          <View style={styles.codeRow}>
            {[...Array(CODE_LENGTH)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.codeCell,
                  code[i] ? styles.codeCellFilled : null,
                  i === code.length ? styles.codeCellActive : null,
                ]}
              >
                <Text style={styles.codeChar}>{code[i] || ""}</Text>
              </View>
            ))}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={onChangeCode}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              style={styles.hiddenInput}
              autoFocus
              testID="otp-input"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Tasdiqlash"
            onPress={() => onVerify(code)}
            loading={loading}
            disabled={code.length !== CODE_LENGTH}
            style={{ marginTop: 24 }}
            testID="verify-submit-button"
          />

          <TouchableOpacity onPress={onResend} disabled={seconds > 0} style={styles.resend}>
            <Text style={[styles.resendText, seconds > 0 && { color: colors.textMuted }]}>
              {seconds > 0 ? `Qayta yuborish ${seconds}s` : "Kodni qayta yuborish"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 8, paddingTop: 4 },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, padding: 24, alignItems: "stretch" },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.textPrimary },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 22,
  },
  devBox: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 16,
  },
  devText: { color: "#92400E", fontWeight: "700", fontSize: 13, marginLeft: 6 },
  codeRow: {
    flexDirection: "row",
    marginTop: 32,
    justifyContent: "space-between",
    position: "relative",
  },
  codeCell: {
    width: 48,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  codeCellFilled: { borderColor: colors.primary, backgroundColor: "#FFF1F2" },
  codeCellActive: { borderColor: colors.primary },
  codeChar: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: "100%",
    height: 56,
    color: "transparent",
  },
  error: { color: colors.danger, marginTop: 12, fontSize: 13 },
  resend: { alignItems: "center", marginTop: 24, padding: 12 },
  resendText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
});
