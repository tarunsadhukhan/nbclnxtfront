/**
 * Pure mapping helpers for the Pay Scheme → Excel export.
 *
 * Kept free of any DOM / SheetJS dependency so the shaping logic can be unit
 * tested in isolation; the actual workbook write lives in `@/utils/exportToXlsx`.
 */

/** Minimal scheme shape needed for the export (subset of the by-id response). */
export interface PaySchemeExportScheme {
  payscheme_id: number;
  payscheme_code?: string | null;
  payscheme_name?: string | null;
}

/** Minimal component-detail shape needed for the export. */
export interface PaySchemeExportDetail {
  component_id: number;
  component_code?: string | null;
  component_name?: string | null;
  /** Component type — arrives as a number from JSON but tolerate strings. */
  type: number | string;
  default_value?: number | null;
  formula?: string | null;
}

/** One flat row in the exported sheet. Key order defines column order. */
export interface PaySchemeExportRow {
  "Pay Scheme ID": number;
  "Pay Scheme Code": string;
  "Pay Scheme Name": string;
  "Component ID": number;
  "Component Code": string;
  "Component Name": string;
  Type: number;
  "Type Description": string;
  "Default Value": number | string;
  Formula: string;
}

/** Component type → human label, matching the reference SQL `typedesc`. */
const TYPE_LABELS: Record<string, string> = {
  "0": "Input",
  "1": "Earnings",
  "2": "Deductions",
  "3": "Summary",
};

/**
 * Flatten a pay scheme + its component details into export rows — one row per
 * component, with the scheme identity repeated on each (parity with the SQL).
 */
export function buildExportRows(
  scheme: PaySchemeExportScheme,
  details: PaySchemeExportDetail[],
): PaySchemeExportRow[] {
  return details.map((d) => ({
    "Pay Scheme ID": scheme.payscheme_id,
    "Pay Scheme Code": scheme.payscheme_code ?? "",
    "Pay Scheme Name": scheme.payscheme_name ?? "",
    "Component ID": d.component_id,
    "Component Code": d.component_code ?? "",
    "Component Name": d.component_name ?? "",
    Type: Number(d.type),
    "Type Description": TYPE_LABELS[String(d.type)] ?? "",
    "Default Value": d.default_value ?? "",
    Formula: d.formula ?? "",
  }));
}

/**
 * Build a download filename for a scheme's export: prefers the code, falls back
 * to the name, then the id. Filesystem-unsafe characters become underscores.
 */
export function paySchemeExportFileName(scheme: PaySchemeExportScheme): string {
  const base =
    (scheme.payscheme_code && scheme.payscheme_code.trim()) ||
    (scheme.payscheme_name && scheme.payscheme_name.trim()) ||
    String(scheme.payscheme_id);
  const safe = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return `PayScheme_${safe}.xlsx`;
}
