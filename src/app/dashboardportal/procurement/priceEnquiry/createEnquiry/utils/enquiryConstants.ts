import type { ApprovalStatusId } from "@/components/ui/transaction";
import type {
	EnquiryLineItem,
	EnquirySupplierEntry,
	EnquiryDetailItem,
	EnquirySupplierInfo,
	EnquiryResponseSummary,
	ComparisonResponseDetail,
} from "../types/enquiryTypes";

/**
 * Standard enquiry status identifiers used throughout the workflow.
 */
export const ENQUIRY_STATUS_IDS = {
	DRAFT: 21,
	OPEN: 1,
	PENDING_APPROVAL: 20,
	APPROVED: 3,
	REJECTED: 4,
	CLOSED: 5,
	CANCELLED: 6,
} as const satisfies Record<string, ApprovalStatusId>;

/**
 * Friendly labels for each enquiry status identifier.
 */
export const ENQUIRY_STATUS_LABELS: Record<ApprovalStatusId, string> = {
	[ENQUIRY_STATUS_IDS.DRAFT]: "Draft",
	[ENQUIRY_STATUS_IDS.OPEN]: "Open",
	[ENQUIRY_STATUS_IDS.PENDING_APPROVAL]: "Pending Approval",
	[ENQUIRY_STATUS_IDS.APPROVED]: "Approved",
	[ENQUIRY_STATUS_IDS.REJECTED]: "Rejected",
	[ENQUIRY_STATUS_IDS.CLOSED]: "Closed",
	[ENQUIRY_STATUS_IDS.CANCELLED]: "Cancelled",
};

/**
 * Discount mode identifiers supported by the enquiry response flow.
 */
export const DISCOUNT_MODE = {
	PERCENTAGE: 1,
	AMOUNT: 2,
} as const;

export type DiscountMode = (typeof DISCOUNT_MODE)[keyof typeof DISCOUNT_MODE];

/**
 * Immutable fallbacks to avoid recreating empty arrays on every render.
 */
export const EMPTY_LINE_ITEMS: ReadonlyArray<EnquiryLineItem> = Object.freeze([]);
export const EMPTY_SUPPLIERS: ReadonlyArray<EnquirySupplierEntry> = Object.freeze([]);
export const EMPTY_DETAIL_ITEMS: ReadonlyArray<EnquiryDetailItem> = Object.freeze([]);
export const EMPTY_SUPPLIER_INFO: ReadonlyArray<EnquirySupplierInfo> = Object.freeze([]);
export const EMPTY_RESPONSE_SUMMARIES: ReadonlyArray<EnquiryResponseSummary> = Object.freeze([]);
export const EMPTY_COMPARISON_RESPONSES: ReadonlyArray<ComparisonResponseDetail> = Object.freeze([]);

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
