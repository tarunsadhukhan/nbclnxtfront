/**
 * InfoSky Global brand palette — navy + green, taken from the company mark.
 *
 * Single source for the portal's desktop chrome: the `classic` window palette
 * (ClassicWindow), the navigation rail (ClassicSidebar), the menu bar
 * (ClassicTopBar) and the logo (InfoSkyMark) all derive their colours from
 * here, so retinting the app means editing this file only.
 */
export const brand = {
  /** Deepest navy — top bar, window title bars, rail header */
  navy900: "#0f1e3a",
  /** Primary navy — navigation rail body */
  navy800: "#14274a",
  /** Raised navy — active rows, dividers on dark surfaces */
  navy700: "#24406b",
  /** Navy used for text/borders on light surfaces */
  navyInk: "#1b2a4e",

  /** Logo green — accents, active markers, success */
  green: "#22a05a",
  /** Lighter green for hover states on dark surfaces */
  greenLight: "#34c26f",

  /** Text on navy surfaces */
  onNavy: "#e8eef7",
  onNavyMuted: "#93a4c0",
} as const;

/**
 * Classic Win32 desktop-ERP chrome palette (title bar, toolbar, grid, fields).
 *
 * The app theme tokens describe the modern web look and have no desktop-chrome
 * equivalents, so this palette is defined once here and every classic surface
 * reads it — ClassicWindow, ClassicSidebar, ClassicTopBar, and the MUI theme's
 * field styling in `styles/theme.ts`.
 */
export const classic = {
  face: "#eef1f6",
  faceEdge: "#dde3ec",
  border: "#a9b6c9",
  highlight: "#ffffff",
  /** Title bars are navy now, so their text needs a light colour */
  titleFrom: brand.navy800,
  titleTo: brand.navy900,
  titleBorder: brand.navy700,
  titleText: brand.onNavy,
  /** Hover wash for controls on LIGHT surfaces — title* is navy and would
      invert the text, so buttons must not reuse it. */
  hoverFrom: "#f4f8fd",
  hoverTo: "#dbe7f6",
  hoverBorder: "#8fa6c4",
  text: "#1b2330",
  textMuted: "#5a6678",
  /** Grid column headers — navy, matching the logo */
  headerFrom: brand.navy700,
  headerTo: brand.navyInk,
  headerText: "#ffffff",
  gridLine: "#c4cddb",
  rowHover: "#eef4fb",
  selection: "#d5e6f8",
  surface: "#ffffff",
  accent: brand.navyInk,
  ok: brand.green,
  warn: "#b26a00",
  danger: "#c1272d",
} as const;

export default brand;
