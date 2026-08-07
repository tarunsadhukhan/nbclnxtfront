/**
 * Constants for Jute Issue module.
 */

import type { EditableLineItem, Option } from "../types/juteIssueTypes";

// Status IDs matching backend workflow
export const JUTE_ISSUE_STATUS_IDS = {
  DRAFT: 21,
  OPEN: 1,
  APPROVED: 3,
  REJECTED: 4,
} as const;

// Status labels for UI display
export const JUTE_ISSUE_STATUS_LABELS: Record<number, string> = {
  [JUTE_ISSUE_STATUS_IDS.DRAFT]: "Draft",
  [JUTE_ISSUE_STATUS_IDS.OPEN]: "Open",
  [JUTE_ISSUE_STATUS_IDS.APPROVED]: "Approved",
  [JUTE_ISSUE_STATUS_IDS.REJECTED]: "Rejected",
};

// Immutable empty arrays to avoid re-renders
export const EMPTY_OPTIONS: ReadonlyArray<Option> = Object.freeze([]);
export const EMPTY_LINE_ITEMS: ReadonlyArray<EditableLineItem> = Object.freeze([]);
