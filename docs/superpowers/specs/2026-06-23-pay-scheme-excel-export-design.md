# Pay Scheme Excel Export — Design

**Date:** 2026-06-23
**Author:** tarun (with Claude)
**Repo:** `vowerp3ui` (Next.js frontend) — **no backend changes**
**Page:** `src/app/dashboardadmin/paySchemeCreation/page.tsx` (Pay Scheme index)

## Goal

Add a **per-row "Export to Excel" icon** to the Pay Scheme index grid. Clicking the
icon on a pay scheme row downloads a genuine `.xlsx` workbook containing that scheme's
full component breakdown — one row per component, with the scheme identity repeated on
each row.

This is a purely client-side feature: every field is already returned by the existing
`fetchPaySchemeById` endpoint, so **no new backend endpoint is required**.

## Exported columns (one row per active component)

Matches the user's reference SQL exactly (`pay_scheme_master` ⋈ `pay_scheme_details` ⋈
`pay_components`, filtered to `STATUS = 1`):

| Column            | Source field                              |
|-------------------|-------------------------------------------|
| Pay Scheme ID     | `scheme.payscheme_id`                     |
| Pay Scheme Code   | `scheme.payscheme_code`                   |
| Pay Scheme Name   | `scheme.payscheme_name`                   |
| Component ID      | `detail.component_id`                     |
| Component Code    | `detail.component_code`                   |
| Component Name    | `detail.component_name`                   |
| Type              | `detail.type` (numeric: 0/1/2/3)          |
| Type Description  | mapped label (see below)                  |
| Default Value     | `detail.default_value`                    |
| Formula           | `detail.formula`                          |

**Type Description mapping** (the user's labels):

```
0 → Input
1 → Earnings
2 → Deductions
3 → Summary
```

## Data source (already exists — no backend work)

`fetchPaySchemeById(coId, paySchemeId)` in `src/utils/hrmsService.ts` calls
`GET /hrms/pay_scheme_by_id/{payscheme_id}` and returns:

```ts
{ data: { scheme: {...}, details: DetailItem[] } }
```

The backend query `get_pay_scheme_details_by_scheme_id()` already selects
`component_id, component_code, component_name, type, default_value, formula`, ordered by
`TYPE, ID`, filtered to active rows (`STATUS IS NULL OR STATUS = 1`). The `co_id` arg is
accepted but the by-id endpoint keys on `payscheme_id` only — pass `String(row.co_id ?? "")`.

## Components / changes

### 1. New dependency — `xlsx` (SheetJS)

The standard client-side Excel writer. `XLSX.writeFile(wb, fileName)` triggers the
download directly, so `file-saver` is **not** needed here. Install via `pnpm add xlsx`.

### 2. New util — `src/utils/exportToXlsx.ts`

Generic, mirrors the existing `src/utils/exportToCSV.ts`:

```ts
export function exportToXlsx<T extends Record<string, unknown>>(
  rows: T[],
  opts: { fileName?: string; sheetName?: string },
): void
```

- `XLSX.utils.json_to_sheet(rows)` → `XLSX.utils.book_append_sheet` → `XLSX.writeFile`.
- Default `fileName = "export.xlsx"`, `sheetName = "Sheet1"`.
- Column order follows the object key order of the row objects (so the mapping function
  controls header order).

### 3. Page change — `paySchemeCreation/page.tsx`

- **Export column** appended to the grid `columns` array: a `renderCell` rendering a
  lucide `FileSpreadsheet` (or `Download`) icon inside an MUI `IconButton` + `Tooltip`
  ("Export to Excel"). Column is `sortable: false`, `filterable: false`.
- **Per-row exporting state** (`exportingId: number | null`): while a row is exporting,
  its icon is disabled and shows a small `CircularProgress`, preventing double-clicks.
- **`handleExport(row)`** (a `useCallback`):
  1. `setExportingId(row.payscheme_id)`.
  2. `await fetchPaySchemeById(String(row.co_id ?? ""), String(row.payscheme_id))`.
  3. On error / no data → error snackbar; bail.
  4. Map `details` → flat rows via a pure `buildExportRows(scheme, details)` helper using
     the column table above and the type-label map.
  5. If zero rows → snackbar "No components found for this pay scheme."; bail.
  6. `exportToXlsx(rows, { fileName: 'PayScheme_<sanitized code>.xlsx', sheetName: 'Pay Scheme' })`.
  7. `finally setExportingId(null)`.
- **Filename:** `PayScheme_<payscheme_code>.xlsx`, falling back to `payscheme_name`/`id`;
  sanitize to strip filesystem-unsafe characters.

## Error handling

| Case                         | Behaviour                                             |
|------------------------------|------------------------------------------------------|
| Fetch error / no `data`      | Existing error snackbar with the message.            |
| Empty `details`              | Snackbar: "No components found for this pay scheme."  |
| Rapid double-click           | Icon disabled while `exportingId === row.payscheme_id`. |

## Testing

- **Vitest** unit test for the pure `buildExportRows(scheme, details)` helper:
  - correct type-label mapping for 0/1/2/3,
  - field order / header keys,
  - one output row per active component.
- The DOM-side `exportToXlsx` (which calls `XLSX.writeFile`) is left untested / thin,
  consistent with how `exportToCSV.ts` is treated.

## Out of scope

- Page-level "export all schemes" button (this design is per-row only).
- Editing or reordering components from the index page.
- Any backend change — the existing `pay_scheme_by_id` endpoint already returns all data.
- Replacing the existing server-side `.xlsx` report convention elsewhere in the app.

## Alternatives considered

- **CSV via existing `exportToCSV.ts`** — zero new deps, opens in Excel, but produces a
  `.csv` not a true `.xlsx`. Rejected: user wants a real Excel file.
- **Server-side `.xlsx` endpoint (openpyxl)** — matches the report-export convention but
  is redundant here since the data is already available client-side. Rejected as
  unnecessary cross-repo work.
- **Header block layout** (scheme info once at top, then component rows) instead of
  repeating scheme identity per row. Rejected for exact parity with the reference SQL;
  can revisit if preferred.
