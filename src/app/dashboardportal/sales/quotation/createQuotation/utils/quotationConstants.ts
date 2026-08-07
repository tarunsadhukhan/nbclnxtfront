import type { CustomerRecord, BrokerRecord, ItemGroupRecord, BranchAddressRecord, CustomerBranchRecord } from "../types/quotationTypes";

export const QUOTATION_STATUS_IDS = {
  DRAFT: 21,
  OPEN: 1,
  PENDING_APPROVAL: 20,
  APPROVED: 3,
  REJECTED: 4,
  CLOSED: 5,
  CANCELLED: 6,
} as const;

export type QuotationStatusId = (typeof QUOTATION_STATUS_IDS)[keyof typeof QUOTATION_STATUS_IDS];

export const QUOTATION_STATUS_LABELS: Record<QuotationStatusId, string> = {
  [QUOTATION_STATUS_IDS.DRAFT]: "Draft",
  [QUOTATION_STATUS_IDS.OPEN]: "Open",
  [QUOTATION_STATUS_IDS.PENDING_APPROVAL]: "Pending Approval",
  [QUOTATION_STATUS_IDS.APPROVED]: "Approved",
  [QUOTATION_STATUS_IDS.REJECTED]: "Rejected",
  [QUOTATION_STATUS_IDS.CLOSED]: "Closed",
  [QUOTATION_STATUS_IDS.CANCELLED]: "Cancelled",
};

export const DISCOUNT_MODE = {
  NONE: 0,
  PERCENTAGE: 1,
  AMOUNT: 2,
} as const;

export type DiscountMode = (typeof DISCOUNT_MODE)[keyof typeof DISCOUNT_MODE];

/**
 * Immutable fallbacks to avoid recreating empty arrays on every render.
 */
export const EMPTY_CUSTOMERS: ReadonlyArray<CustomerRecord> = Object.freeze([]);
export const EMPTY_CUSTOMER_BRANCHES: ReadonlyArray<CustomerBranchRecord> = Object.freeze([]);
export const EMPTY_BROKERS: ReadonlyArray<BrokerRecord> = Object.freeze([]);
export const EMPTY_ITEM_GROUPS: ReadonlyArray<ItemGroupRecord> = Object.freeze([]);
export const EMPTY_BRANCH_ADDRESSES: ReadonlyArray<BranchAddressRecord> = Object.freeze([]);

/**
 * Default empty params used by setup hooks to prevent needless re-renders.
 */
export const EMPTY_SETUP_PARAMS: Readonly<{ branchId?: string }> = Object.freeze({});

/**
 * Utility to determine if a discount mode expects percentage logic.
 */
export const isPercentageDiscountMode = (mode?: number | null): mode is typeof DISCOUNT_MODE.PERCENTAGE =>
  mode === DISCOUNT_MODE.PERCENTAGE;

/**
 * Utility to determine if a discount mode expects flat amount logic.
 */
export const isAmountDiscountMode = (mode?: number | null): mode is typeof DISCOUNT_MODE.AMOUNT =>
  mode === DISCOUNT_MODE.AMOUNT;
