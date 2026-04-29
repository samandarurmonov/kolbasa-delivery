// Centralized theme tokens.
export const colors = {
  primary: "#C81E1E",
  primaryDark: "#9B1414",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  danger: "#DC2626",
  success: "#10B981",
  warning: "#F59E0B",
  info: "#3B82F6",
  surfaceMuted: "#F1F5F9",
};

export const statusColors: Record<string, { bg: string; fg: string; label: string }> = {
  new: { bg: "#DBEAFE", fg: "#1D4ED8", label: "Yangi" },
  preparing: { bg: "#FEF3C7", fg: "#B45309", label: "Tayyorlanmoqda" },
  delivered: { bg: "#D1FAE5", fg: "#047857", label: "Yetkazildi" },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C", label: "Bekor qilindi" },
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const shadows = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    shadowColor: "#C81E1E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};
