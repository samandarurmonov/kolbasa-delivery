import React from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { colors, radii } from "../theme";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  prefix?: string;
};

export function Input({ label, error, prefix, style, ...rest }: Props) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, error ? styles.errorBox : null]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          {...rest}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  errorBox: { borderColor: colors.danger },
  prefix: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "600",
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
