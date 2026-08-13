import { PaletteMode, ThemeOptions, createTheme } from "@mui/material/styles";
import "@mui/x-data-grid/themeAugmentation";
import { palette, typography, shape, tokens, shadows } from "./tokens";
import { classic } from "./brand";

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
  // Classic desktop-ERP fields — square, compact, light surface. Set on the
  // theme (not per screen) so every dashboard matches the employee database,
  // including dialogs/menus that render in a portal and can't inherit a
  // wrapper's sx. Covers Select, Autocomplete and the date pickers too, since
  // they all render an OutlinedInput.
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 0,
        fontSize: 12.5,
        ...(mode === "light" ? { backgroundColor: classic.surface } : null),
      },
      notchedOutline: mode === "light" ? { borderColor: classic.border } : {},
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        fontSize: 12.5,
      },
    },
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: {
        fontSize: 11,
      },
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
        // Column headers carry the brand navy across every grid in the app.
        // Set here rather than per-page so a grid can't miss the treatment;
        // the pinned/filler areas read --DataGrid-containerBackground, so it
        // has to be set too or the header row ends in a pale gap.
        "--DataGrid-containerBackground": tokens.brand.secondary,
        "& .MuiDataGrid-columnHeader": {
          backgroundColor: tokens.brand.secondary,
        },
        // The title sits in nested wrappers that don't reliably inherit the
        // header's colour, so every layer is named explicitly — otherwise dark
        // ink lands on the navy and the labels disappear.
        [`& .MuiDataGrid-columnHeader,
          & .MuiDataGrid-columnHeaderTitleContainer,
          & .MuiDataGrid-columnHeaderTitleContainerContent,
          & .MuiDataGrid-columnHeaderTitle,
          & .MuiDataGrid-columnHeaderCheckbox .MuiCheckbox-root`]: {
          color: "#FFFFFF",
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: 600,
        },
        // Sort/menu affordances default to dark ink and vanish on navy.
        "& .MuiDataGrid-columnHeader .MuiDataGrid-sortIcon, \
         & .MuiDataGrid-columnHeader .MuiDataGrid-menuIconButton, \
         & .MuiDataGrid-columnHeader .MuiDataGrid-filterIcon": {
          color: "#FFFFFF",
        },
        "& .MuiDataGrid-columnSeparator": {
          color: "rgba(255, 255, 255, 0.28)",
        },
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
