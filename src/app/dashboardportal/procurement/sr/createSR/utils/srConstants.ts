import type { ApprovalStatusId } from "@/components/ui/transaction";
import type { SRLineItem, Option } from "../types/srTypes";

/**
 * Discount mode identifiers supported by the SR flow.
 * Mirrors the PO discount mode convention.
 */
export const DISCOUNT_MODE = {
	PERCENTAGE: 1,
	AMOUNT: 2,
} as const;

export type DiscountMode = (typeof DISCOUNT_MODE)[keyof typeof DISCOUNT_MODE];

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

/**
 * Standard SR status identifiers used throughout the workflow.
 */
export const SR_STATUS_IDS = {
	DRAFT: 21,
	OPEN: 1,
	PENDING_APPROVAL: 20,
	APPROVED: 3,
	REJECTED: 4,
} as const satisfies Record<string, ApprovalStatusId>;

/**
 * Friendly labels for each SR status identifier.
 */
export const SR_STATUS_LABELS: Partial<Record<ApprovalStatusId, string>> = {
	[SR_STATUS_IDS.DRAFT]: "Draft",
	[SR_STATUS_IDS.OPEN]: "Open",
	[SR_STATUS_IDS.PENDING_APPROVAL]: "Pending Approval",
	[SR_STATUS_IDS.APPROVED]: "Approved",
	[SR_STATUS_IDS.REJECTED]: "Rejected",
};

/**
 * Immutable fallbacks to avoid recreating empty arrays on every render.
 */
export const EMPTY_LINE_ITEMS: ReadonlyArray<SRLineItem> = Object.freeze([]);
export const EMPTY_OPTIONS: ReadonlyArray<Option> = Object.freeze([]);

/**
 * Get status color for chips.
 */
export const getStatusColor = (
	statusId: number,
): "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info" => {
	switch (statusId) {
		case SR_STATUS_IDS.DRAFT:
			return "default";
		case SR_STATUS_IDS.OPEN:
			return "info";
		case SR_STATUS_IDS.PENDING_APPROVAL:
			return "warning";
		case SR_STATUS_IDS.APPROVED:
			return "success";
		case SR_STATUS_IDS.REJECTED:
			return "error";
		default:
			return "default";
	}
};
