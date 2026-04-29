import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { colors, radii, shadows } from "../theme";

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  style?: any;
  testID?: string;
  icon?: React.ReactNode;
};

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
  testID,
  icon,
}: Props) {
  const isDisabled = disabled || loading;
  const v = variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      testID={testID}
      style={[
        styles.base,
        v.container,
        variant === "primary" && !isDisabled ? shadows.button : null,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <View style={styles.row}>
          {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
          <Text style={[styles.text, v.text]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const variantStyles = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: "#FFFFFF" },
  },
  secondary: {
    container: {
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: { color: colors.textPrimary },
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    text: { color: colors.primary },
  },
  danger: {
    container: { backgroundColor: colors.danger },
    text: { color: "#FFFFFF" },
  },
} as const;

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  text: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  disabled: { opacity: 0.5 },
});
