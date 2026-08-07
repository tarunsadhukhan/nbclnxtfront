import { type MuiFormMode } from "@/components/ui/muiform";

/**
 * Generates page title based on mode.
 */
export function getTransactionTitle(mode: MuiFormMode, titles: {
  create: string;
  edit: string;
  view: string;
}): string {
  switch (mode) {
    case "create":
      return titles.create;
    case "edit":
      return titles.edit;
    case "view":
      return titles.view;
    default:
      return titles.create;
  }
}

/**
 * Generates page subtitle based on mode.
 */
export function getTransactionSubtitle(mode: MuiFormMode, subtitles: {
  create: string;
  edit: string;
  view: string;
}): string {
  switch (mode) {
    case "create":
      return subtitles.create;
    case "edit":
      return subtitles.edit;
    case "view":
      return subtitles.view;
    default:
      return subtitles.create;
  }
}

/**
 * Validates if a line item has any data filled in.
 */
export function lineItemHasData<T extends Record<string, unknown>>(
  line: T,
  fields: (keyof T)[]
): boolean {
  return fields.some((field) => {
    const value = line[field];
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return Boolean(value);
  });
}

/**
 * Validates if a line item is complete (all required fields filled).
 */
export function lineItemIsComplete<T extends Record<string, unknown>>(
  line: T,
  requiredFields: (keyof T)[],
  validators?: Partial<Record<keyof T, (value: unknown) => boolean>>
): boolean {
  for (const field of requiredFields) {
    const value = line[field];
    if (value === null || value === undefined) return false;
    if (typeof value === "string" && value.trim().length === 0) return false;

    // Run custom validator if provided
    const validator = validators?.[field];
    if (validator && !validator(value)) return false;
  }
  return true;
}

/**
 * Sanitizes numeric input (removes non-numeric characters except decimal point).
 */
export function sanitizeNumericInput(value: string): string {
  return value.replace(/[^0-9.]/g, "");
}

/**
 * Generates a unique line item ID.
 */
let lineIdSeed = 0;
export function generateLineItemId(prefix: string = "line"): string {
  lineIdSeed += 1;
  return `${prefix}-${lineIdSeed}`;
}

/**
 * Resets the line ID seed (useful for testing).
 */
export function resetLineIdSeed(): void {
  lineIdSeed = 0;
}

