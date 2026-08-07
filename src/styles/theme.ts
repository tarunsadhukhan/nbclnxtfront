import { PaletteMode, ThemeOptions, createTheme } from "@mui/material/styles";
import "@mui/x-data-grid/themeAugmentation";
import { palette, typography, shape, tokens, shadows } from "./tokens";

const buildComponents = (mode: PaletteMode): ThemeOptions["components"] => ({
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius,
        fontWeight: 600,
        paddingInline: "1rem",
        paddingBlock: "0.5rem",
      },
      containedPrimary: {
        backgroundColor: tokens.brand.primary,
        color: "#FFFFFF",
        "&:hover": {
          backgroundColor: tokens.brand.primaryHover,
          boxShadow: shadows.brandButton,
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius,
        boxShadow: mode === "light"
          ? "0 1px 2px rgba(15, 23, 42, 0.08)"
          : "0 1px 2px rgba(15, 23, 42, 0.45)",
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius,
        boxShadow: mode === "light"
          ? "0 1px 2px rgba(15, 23, 42, 0.08)"
          : "0 1px 2px rgba(15, 23, 42, 0.45)",
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      size: "small",
    },
  },
  MuiFormLabel: {
    styleOverrides: {
      root: {
        fontWeight: 500,
      },
    },
  },
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: palette[mode].background?.default,
        color: palette[mode].text?.primary,
      },
      a: {
        color: tokens.brand.secondary,
      },
    },
  },
  MuiDataGrid: {
    styleOverrides: {
      root: {
        "--DataGrid-rowBorderColor": palette[mode].divider ?? "#E5E7EB",
      },
    },
  },
});

export const createAppTheme = (mode: PaletteMode = "light") =>
  createTheme({
    palette: palette[mode],
    typography,
    shape,
    components: buildComponents(mode),
  });

export const lightTheme = createAppTheme("light");
export const darkTheme = createAppTheme("dark");
