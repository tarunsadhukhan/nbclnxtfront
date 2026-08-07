/**
 * Shared display formatters for tables, reports, and detail views.
 * Mirrors the per-page Intl-based formatters used in
 * sales/salesOrder/page.tsx and sales/quotation/page.tsx so the same
 * "DD-Mmm-YYYY" date and "₹ X,XXX.XX" currency conventions render
 * everywhere.
 */

export const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const formatCurrency = (
  value: number | null | undefined,
): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (
  value: number | null | undefined,
  fractionDigits = 2,
): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

export const formatInt = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
