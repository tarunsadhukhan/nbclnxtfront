"use client";
import * as React from "react";
import type { GridColDef, GridValidRowModel } from "@mui/x-data-grid";

/**
 * Shared column sizing + hover-tooltip behaviour for every DataGrid in the app.
 *
 * Columns widen to fit their content, measured in characters and capped at
 * MAX_CHARS. Anything longer wraps onto more lines (see `wrappingGridSx` +
 * `autoRowHeight`) instead of being cut off with "...", and hovering a cell shows
 * its full text as a native tooltip.
 *
 * Deliberately only sets `minWidth`: `flex`, `width` and `renderCell` are left as
 * the page authored them, so nothing here can suppress a built-in column type
 * (actions, boolean) or break a page's flex layout.
 *
 * Two things it cannot see: width is measured from `row[field]`, so a column whose
 * `renderCell` shows a label for an id (a status Chip) is sized from the id and
 * relies on wrapping — give those a `minWidth` on the page if you want them wider.
 * And a `renderCell` that sets its own `white-space: nowrap` (`<Typography noWrap>`)
 * will still ellipse; don't use `noWrap` inside a grid cell.
 */

const CHAR_PX = 8; // ~average glyph width at the grid's 14px font
const CHROME_PX = 34; // cell padding + room for the sort / menu icon
const MIN_PX = 50; // MUI's own default floor — don't add width a column never needed
const MAX_CHARS = 30; // past this a column stops growing and its cells wrap

export const MAX_COLUMN_PX = MAX_CHARS * CHAR_PX + CHROME_PX;

const asText = (value: unknown): string => {
  if (value == null || typeof value === "object") return "";
  return String(value);
};

/**
 * Widen each column to fit the longest value it carries (header included), capped
 * at MAX_CHARS characters. Columns with an explicit `width` are left untouched —
 * those are deliberately sized by their page (icon columns, fixed numerics).
 */
export function sizeColumnsToContent<R extends GridValidRowModel>(
  columns: GridColDef<R>[],
  rows: readonly R[]
): GridColDef<R>[] {
  return columns.map((col) => {
    if (col.width != null) return col;

    let chars = asText(col.headerName ?? col.field).length;
    for (const row of rows) {
      const len = asText((row as Record<string, unknown>)[col.field]).length;
      if (len > chars) {
        chars = len;
        if (chars >= MAX_CHARS) break;
      }
    }

    const contentWidth = Math.min(chars, MAX_CHARS) * CHAR_PX + CHROME_PX;
    const minWidth = Math.max(col.minWidth ?? 0, MIN_PX, contentWidth);
    return minWidth === col.minWidth ? col : { ...col, minWidth };
  });
}

/**
 * Size columns from the first batch of rows that arrives and then hold those
 * widths. Re-measuring on every rows change would make columns jump on each page
 * of a server-paginated grid and would fight the user's own column resizing.
 */
export function useColumnsSizedToContent<R extends GridValidRowModel>(
  columns: GridColDef<R>[],
  rows: readonly R[]
): GridColDef<R>[] {
  const cache = React.useRef<{ source: unknown; sized: GridColDef<R>[] } | null>(null);

  if (rows.length > 0 && cache.current?.source !== columns) {
    cache.current = { source: columns, sized: sizeColumnsToContent(columns, rows) };
  }
  return cache.current?.source === columns ? cache.current.sized : columns;
}

/**
 * Let cells and headers wrap instead of ellipsing. Pair with
 * `getRowHeight={autoRowHeight}` so rows grow to fit the wrapped lines, and with
 * a taller `columnHeaderHeight` so two-line headers aren't clipped.
 */
export const wrappingGridSx = {
  "& .MuiDataGrid-cell": {
    whiteSpace: "normal",
    wordBreak: "break-word",
    lineHeight: 1.4,
    paddingTop: "8px",
    paddingBottom: "8px",
  },
  // Chips set their own nowrap/ellipsis on the label, so the cell rule above can't
  // reach them — a status Chip would still truncate inside a wrapping cell.
  "& .MuiDataGrid-cell .MuiChip-root": {
    height: "auto",
    minHeight: 24,
  },
  "& .MuiDataGrid-cell .MuiChip-label": {
    whiteSpace: "normal",
    overflow: "visible",
    textOverflow: "clip",
    paddingTop: "3px",
    paddingBottom: "3px",
  },
  "& .MuiDataGrid-columnHeaderTitleContainer": {
    whiteSpace: "normal",
    overflow: "visible",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    whiteSpace: "normal",
    wordBreak: "break-word",
    lineHeight: 1.25,
    overflow: "visible",
    textOverflow: "clip",
  },
};

/** Header row tall enough for a wrapped two-line title. */
export const WRAPPED_HEADER_HEIGHT = 60;

export const autoRowHeight = () => "auto" as const;

/** Height guess for rows not yet measured — keeps the scrollbar stable while scrolling. */
export const estimatedRowHeight = () => 52;

/**
 * Delegated hover tooltip: stamp the hovered cell with its own rendered text as a
 * native `title`. Read from the DOM rather than by wrapping every renderCell, so it
 * is correct for formatted values and custom cell content and cannot suppress
 * built-in column types. Cells whose content is non-textual (the action icons) have
 * no text and get no tooltip, leaving their own MUI <Tooltip> alone.
 */
export function showCellTooltip(event: React.MouseEvent<HTMLElement>) {
  const cell = (event.target as HTMLElement | null)?.closest<HTMLElement>(".MuiDataGrid-cell");
  if (!cell) return;
  const text = cell.textContent?.trim() ?? "";
  if (text) {
    cell.title = text;
  } else {
    cell.removeAttribute("title");
  }
}
