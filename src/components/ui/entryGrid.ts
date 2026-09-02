import type { KeyboardEvent } from "react";
import { alpha } from "@mui/material";
import type { DialogProps, Theme } from "@mui/material";

/**
 * Cell editors of an entry grid, in column order. Excludes MUI's hidden Select
 * mirror inputs so Enter never lands on something the user cannot see.
 */
const CELL_INPUTS =
  "input:not([disabled]):not([readonly]):not([type='hidden']):not([aria-hidden='true'])";

/**
 * Enter jumps to the next cell of an entry grid — left to right, then on to the
 * first cell of the next row — the way the legacy Smart-Eye production screens
 * behaved. Attach to the element wrapping the grid (the TableContainer):
 * it walks the DOM, so no per-cell refs are needed and the auto-added trailing
 * row is picked up as soon as it renders.
 *
 * On an open Autocomplete MUI has already committed the highlighted option by
 * the time this bubbles, so a single Enter both picks the code and advances
 * (pair it with `autoHighlight` so the top match is the one picked).
 */
export function handleGridEnterKey(e: KeyboardEvent<HTMLElement>): void {
  if (e.key !== "Enter" || e.shiftKey) return;
  const cells = Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>(CELL_INPUTS));
  const current = cells.indexOf(document.activeElement as HTMLInputElement);
  if (current === -1) return;
  // Swallow the Enter either way — on the last cell it must not submit anything.
  e.preventDefault();
  const next = cells[current + 1];
  if (!next) return;
  next.focus();
  next.select();
}

const pickCellBg = (t: Theme) => alpha(t.palette.warning.main, 0.28);
const keyedCellBg = (t: Theme) => alpha(t.palette.success.main, 0.28);

/**
 * Legacy Smart-Eye colour coding, spread into the `sx` of the box wrapping a
 * data-entry screen: anything you pick from is orange, anything you key a value
 * into is green, and everything derived stays plain. In the grid the whole cell
 * takes the colour (as the legacy screens did); in the header only the field
 * does. Tinted from the warning/success tokens so text keeps its contrast, and
 * the gridlines are darkened to match.
 */
// Left unannotated on purpose: SxProps is a union, and a union cannot be spread
// into the caller's sx object.
export const entryGridCellColorsSx = {
  // Gridlines in the foreground colour, not `divider` — the legacy screens draw
  // hard black rules and the light default reads as no grid at all.
  "& table, & td, & th": { borderColor: (t: Theme) => t.palette.text.primary },
  "& td:has(.MuiAutocomplete-root)": { backgroundColor: pickCellBg },
  "& td:has(input[type='number'])": { backgroundColor: keyedCellBg },
  "& .MuiInputBase-root:has(.MuiSelect-select)": { backgroundColor: pickCellBg },
  "& .MuiInputBase-root:has(input[type='date'])": { backgroundColor: keyedCellBg },
};

/**
 * Dialog props for a data-entry screen that fills the window but leaves the
 * portal's left menu visible and clickable. `--portal-sidebar-w` is published
 * by ClassicSidebar and tracks its collapsed/expanded width.
 */
export const fullScreenBesideSidebar: Pick<DialogProps, "fullScreen" | "sx"> = {
  fullScreen: true,
  sx: { left: "var(--portal-sidebar-w, 0px)" },
};
