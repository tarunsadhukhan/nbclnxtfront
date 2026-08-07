import type { PaletteOptions, ThemeOptions } from "@mui/material/styles";

const brandPrimary = "#95C11F"; // matches btn-primary in globals.css
const brandPrimaryHover = "#85AD1B";
const brandSecondary = "#69ACC3";
const neutral900 = "#111827";
const neutral700 = "#374151";
const neutral500 = "#6B7280";
const neutral200 = "#E5E7EB";
const neutral100 = "#F3F4F6";
const surfaceDefault = "#FFFFFF";
const surfaceMuted = "#F9FAFB";
const surfaceDark = "#0A0A0A";

export const palette: Record<"light" | "dark", PaletteOptions> = {
  light: {
    mode: "light",
    primary: {
      main: brandPrimary,
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: brandSecondary,
      contrastText: neutral900,
    },
    background: {
      default: surfaceDefault,
      paper: surfaceDefault,
    },
    text: {
      primary: neutral900,
      secondary: neutral700,
    },
    divider: neutral200,
    success: {
      main: "#22C55E",
    },
    warning: {
      main: "#F59E0B",
    },
    error: {
      main: "#DC2626",
    },
    info: {
      main: brandSecondary,
    },
  },
  dark: {
    mode: "dark",
    primary: {
      main: brandPrimary,
      contrastText: "#0B1215",
    },
    secondary: {
      main: brandSecondary,
      contrastText: "#022C3A",
    },
    background: {
      default: surfaceDark,
      paper: "#121212",
    },
    text: {
      primary: "#F3F4F6",
      secondary: "#D1D5DB",
    },
    divider: "#1F2937",
    success: {
      main: "#22C55E",
    },
    warning: {
      main: "#F59E0B",
    },
    error: {
      main: "#F97316",
    },
    info: {
      main: brandSecondary,
    },
  },
};

export const typography: ThemeOptions["typography"] = {
  fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif",
  h1: {
    fontSize: "2.25rem",
    fontWeight: 700,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: "1.875rem",
    fontWeight: 600,
    lineHeight: 1.25,
  },
  h3: {
    fontSize: "1.5rem",
    fontWeight: 600,
    lineHeight: 1.3,
  },
  body1: {
    fontSize: "1rem",
    lineHeight: 1.5,
  },
  body2: {
    fontSize: "0.875rem",
    lineHeight: 1.5,
  },
  button: {
    textTransform: "none",
    fontWeight: 600,
  },
};

export const shape = {
  borderRadius: 10,
};

export const shadows = {
  brandButton: `0 8px 16px rgba(149, 193, 31, 0.24)`,
};

export const tokens = {
  brand: {
    primary: brandPrimary,
    primaryHover: brandPrimaryHover,
    secondary: brandSecondary,
  },
  neutral: {
    900: neutral900,
    700: neutral700,
    500: neutral500,
    200: neutral200,
    100: neutral100,
  },
  surface: {
    default: surfaceDefault,
    muted: surfaceMuted,
    dark: surfaceDark,
  },
};
