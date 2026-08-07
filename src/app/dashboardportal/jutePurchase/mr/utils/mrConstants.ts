/**
 * @file mrConstants.ts
 * @description Constants for Jute Material Receipt (MR) module.
 */

import type { ApprovalStatusId } from "@/components/ui/transaction";
import type { PartyBranchOption } from "../types/mrTypes";

/**
 * Extended status type for MR that includes Pending (13) which is not in standard ApprovalStatusId.
 */
export type MRStatusId = ApprovalStatusId | 13;

/**
 * Standard MR status identifiers used throughout the workflow.
 */
export const MR_STATUS_IDS: Record<string, MRStatusId> = {
	DRAFT: 21,
	OPEN: 1,
	PENDING: 13,
	PENDING_APPROVAL: 20,
	APPROVED: 3,
	REJECTED: 4,
	CLOSED: 5,
	CANCELLED: 6,
} as const;

/**
 * Friendly labels for each MR status identifier.
 */
export const MR_STATUS_LABELS: Record<MRStatusId, string> = {
	21: "Draft",
	1: "Open",
	13: "Pending",
	20: "Pending Approval",
	3: "Approved",
	4: "Rejected",
	5: "Closed",
	6: "Cancelled",
};

/**
 * Immutable fallbacks to avoid recreating empty arrays on every render.
 */
export const EMPTY_PARTY_BRANCHES: ReadonlyArray<PartyBranchOption> = Object.freeze([]);
