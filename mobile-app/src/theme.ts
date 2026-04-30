export const darkTheme = {
  bg: "#050505",
  surface: "#121212",
  surfaceAlt: "#1A1A1A",
  border: "#262626",
  primary: "#6366F1",
  secondary: "#D946EF",
  accent: "#06B6D4",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#F43F5E",
  info: "#3B82F6",
  text: "#FFFFFF",
  textMuted: "#9CA3AF",
  textDim: "#6B7280",
  glass: "rgba(255, 255, 255, 0.03)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
};

export const lightTheme = {
  bg: "#F9FAFB",
  surface: "#FFFFFF",
  surfaceAlt: "#F3F4F6",
  border: "#E5E7EB",
  primary: "#4F46E5",
  secondary: "#C026D3",
  accent: "#0891B2",
  success: "#059669",
  warning: "#D97706",
  danger: "#E11D48",
  info: "#2563EB",
  text: "#111827",
  textMuted: "#4B5563",
  textDim: "#6B7280",
  glass: "rgba(0, 0, 0, 0.02)",
  glassBorder: "rgba(0, 0, 0, 0.05)",
};

// Keep legacy export for now to avoid breaking everything at once, 
// but we should use useTheme colors instead.
export const appColors = darkTheme;

export const appShadows = {
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  glow: {
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
};

export const appRadius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const appSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
