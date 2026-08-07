# Bill Pass Print Preview — Design Spec

**Date:** 2026-04-21
**Scope:** Frontend-only (vowerp3ui)
**Target page:** `src/app/dashboardportal/procurement/billPass/edit/page.tsx`

## Problem

Users viewing a Procurement Bill Pass currently have no way to print a voucher-style document for internal records or approval signatures. They need a browser-printable version that mirrors the on-screen edit page content but adds a formal header, signature blocks, and a draft watermark for pending bill passes.

## Decisions (locked in during brainstorming)

1. **Layout format:** Hybrid — edit page sections retained, with a formal centered header (branch name + "BILL PASS VOUCHER" title + bill pass no/date) and three signature blocks at the bottom.
2. **Availability:** Always visible. Printout shows a diagonal **DRAFT** watermark when `billpass_status !== 1`; no watermark when complete.
3. **Header data:** Minimal — branch name only (from `detail.branch_name`), plus bill pass number and date. No extra backend fetch.
4. **Signatures:** Three blocks — `Prepared By` · `Checked By` · `Approved By`. Blank signature lines, no auto-filled names.
5. **UX flow:** Direct print — clicking "Print Preview" opens a new browser window with the formatted voucher and the native Print dialog immediately. No in-page modal, no separate route.

## Non-goals

- No backend changes. All data comes from the existing `fetchBillPassById` response.
- No company letterhead with address/GSTIN/PAN (can be added later).
- No server-side PDF generation.
- No "save as PDF" beyond the browser's native print-to-PDF.

## Architecture

### New files

**`src/app/dashboardportal/procurement/billPass/edit/components/BillPassPreview.tsx`**

Exports:
- `BillPassPreview` — React component that renders the printable voucher from `{ detail, formData, netPayable }` props.
- `renderBillPassPreviewHtml(props)` — helper that wraps `BillPassPreview` with `ReactDOMServer.renderToStaticMarkup` and returns an HTML string.
- `BILL_PASS_PRINT_CSS` — exported CSS string passed as the `extraCss` argument to `openStyledPrintWindow`.

This component follows the co-location pattern used by other modules (SRPreview, POPreview, InwardPreview, etc.), but the edit page currently has no `components/` folder — create it.

### Modified files

**`src/app/dashboardportal/procurement/billPass/edit/page.tsx`**
- Import `Printer` from `lucide-react` and the preview module.
- Add a "Print Preview" button to the top bar, always visible (both when pending and when complete).
- Add a `handlePrintPreview` callback that builds HTML via `renderBillPassPreviewHtml` and calls `openStyledPrintWindow(html, \`Bill Pass ${detail.bill_pass_no ?? "Draft"}\`, BILL_PASS_PRINT_CSS)`.

## Print layout (top → bottom)

1. **Header block (centered)**
   - Line 1: `detail.branch_name` — 18pt bold
   - Line 2: `BILL PASS VOUCHER` — 14pt, letter-spaced
   - Line 3 (two-column): left `Bill Pass No: …` + `SR Date: …` · right: status chip (amber `DRAFT` / green `COMPLETE`)

2. **Metadata strip** (4-column compact grid)
   - Supplier · Inward No / Date · Challan No / Date · (empty / spacer)

3. **SR Line Items table**
   - Columns: `PO No`, `Item Code`, `Item`, `HSN`, `Make`, `UOM`, `Qty`, `PO Rate`, `Accepted Rate`, `Amount`, `Tax`, `Total`
   - After each SR row, render DR/CR adjustment rows (indented, labelled `DEBIT` / `CREDIT`, with adjustment reason)
   - If a line has adjustments, append a `Line Net Payable: <amount>` row before the next SR line
   - Use `buildDrcrLinesByInwardDtl(detail.debit_notes, detail.credit_notes)` from `billPassService` — same grouping logic as the edit page

4. **Additional Charges table** — only rendered when `detail.additional_charges.length > 0`. Render inline (not via `AdditionalChargesTable` MUI component, since MUI runtime isn't available in the print window — write a plain table that matches its columns: description, amount, CGST, SGST, IGST, total).

5. **Two-column footer (Invoice + Summary)**
   - Left: Invoice Date, Invoice Amount, Invoice Received Date, Payment Due Date, Round Off, Remarks — pulled from `formData` (so unsaved edits are reflected in the printout)
   - Right: SR Taxable · CGST/SGST/IGST (each shown only if > 0) · SR Total (bold) · Less Debit Notes (if count > 0, red, prefix `-`) · Add Credit Notes (if count > 0, green, prefix `+`) · Additional Charges + Add. CGST/SGST/IGST (if count > 0) · Round Off (if ≠ 0) · **NET PAYABLE** (bold, larger, uses the `netPayable` prop)

6. **Signature footer** — three equal-width blocks anchored near the bottom of the last page. Each: empty space for signature, a horizontal rule, and the label (`Prepared By` / `Checked By` / `Approved By`) below the rule.

7. **DRAFT watermark** — CSS-only, shown only when `billpass_status !== 1`. Diagonal grey text behind content, low opacity, rotated -30°, `position: fixed` so it appears on every printed page.

## Print CSS (key rules)

```css
@page { size: A4; margin: 10mm; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 10pt;
  color: #111;
}

.bp-numeric { font-family: "Courier New", monospace; }

.bp-header { text-align: center; margin-bottom: 12pt; }
.bp-branch { font-size: 18pt; font-weight: 700; }
.bp-title { font-size: 14pt; letter-spacing: 2pt; margin-top: 4pt; }

.bp-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
.bp-table th,
.bp-table td { border: 1px solid #666; padding: 4pt 6pt; }
.bp-table thead { display: table-header-group; background: #eee; }
.bp-table tr { page-break-inside: avoid; }

.bp-drcr-row { background: #fafafa; font-style: italic; }
.bp-drcr-row.debit { border-left: 3px solid #c62828; }
.bp-drcr-row.credit { border-left: 3px solid #2e7d32; }

.bp-signatures {
  display: flex;
  justify-content: space-between;
  gap: 16pt;
  margin-top: 40pt;
  page-break-inside: avoid;
}
.bp-signature { flex: 1; text-align: center; }
.bp-signature .line { border-top: 1px solid #333; margin-top: 40pt; padding-top: 4pt; }

.bp-watermark {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 120pt;
  color: rgba(200, 0, 0, 0.1);
  transform: rotate(-30deg);
  pointer-events: none;
  z-index: 0;
  font-weight: 700;
}

@media print {
  button, input, select { display: none; }
}
```

## Data flow

```
User clicks "Print Preview"
  ↓
handlePrintPreview() in edit/page.tsx
  ↓
renderBillPassPreviewHtml({ detail, formData, netPayable })
  ↓ (ReactDOMServer.renderToStaticMarkup)
html string
  ↓
openStyledPrintWindow(html, title, BILL_PASS_PRINT_CSS)
  ↓
New browser window opens with collected page styles + BILL_PASS_PRINT_CSS
  ↓
Browser print dialog appears
```

All data needed by the preview is already in the edit page's state: `detail`, `formData`, `netPayable`. No additional fetches.

## Testing

- Manual: open a pending bill pass → Print Preview → confirm DRAFT watermark visible and all sections render.
- Manual: open a completed bill pass (`billpass_status = 1`) → confirm no watermark and "COMPLETE" chip in header.
- Manual: confirm page breaks between sections do not split table rows.
- Manual: confirm signature block appears near the bottom of the final page (not mid-page).
- Manual: confirm numeric alignment (right-aligned monospace) across all amount columns.

No automated tests — the existing codebase has no tests for `*Preview.tsx` components (checked: `MRPreview.test.tsx` is the sole exception and covers data formatting, not rendering). Following existing practice.

## Risks / open questions

- **MUI components in the print window:** MUI/Emotion styles won't fully apply in the new window because components like `Chip`, `Paper`, `Card` rely on runtime class generation. Mitigation: write the preview using plain HTML tags (`<table>`, `<div>`, `<span>`) with explicit classes styled by `BILL_PASS_PRINT_CSS`. Do NOT reuse MUI components in the print component. (The existing `openStyledPrintWindow` collects page styles, which covers most MUI CSS — but using plain tags is safer and avoids class-name collisions.)
- **`ReactDOMServer` bundle size:** `react-dom/server` is already a transitive dep of Next.js. Importing it client-side adds a small bundle cost. Acceptable trade-off vs. the hidden-DOM approach, which requires mounting a component, reading `innerHTML`, then unmounting — more state complexity for the same result.
- **Watermark printing:** Chromium and Edge honor `position: fixed` across pages when printing; Firefox has historically been inconsistent. Out of scope for this iteration — users primarily use Chromium-based browsers.
