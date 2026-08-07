import type { ApprovalStatusId } from "@/components/ui/transaction";
import type {
	DepartmentRecord,
	EditableLineItem,
	ExpenseRecord,
	Option,
	ProjectRecord,
	CostFactorRecord,
	MachineRecord,
} from "../types/issueTypes";

/**
 * Standard Issue status identifiers used throughout the workflow.
 */
export const ISSUE_STATUS_IDS = {
	DRAFT: 21,
	OPEN: 1,
	PENDING_APPROVAL: 20,
	APPROVED: 3,
	REJECTED: 4,
	CLOSED: 5,
	CANCELLED: 6,
} as const satisfies Record<string, ApprovalStatusId>;

/**
 * Friendly labels for each Issue status identifier.
 */
export const ISSUE_STATUS_LABELS: Record<ApprovalStatusId, string> = {
	[ISSUE_STATUS_IDS.DRAFT]: "Draft",
	[ISSUE_STATUS_IDS.OPEN]: "Open",
	[ISSUE_STATUS_IDS.PENDING_APPROVAL]: "Pending Approval",
	[ISSUE_STATUS_IDS.APPROVED]: "Approved",
	[ISSUE_STATUS_IDS.REJECTED]: "Rejected",
	[ISSUE_STATUS_IDS.CLOSED]: "Closed",
	[ISSUE_STATUS_IDS.CANCELLED]: "Cancelled",
};

/**
 * Immutable fallbacks to avoid recreating empty arrays on every render.
 */
export const EMPTY_DEPARTMENTS: ReadonlyArray<DepartmentRecord> = Object.freeze([]);
export const EMPTY_PROJECTS: ReadonlyArray<ProjectRecord> = Object.freeze([]);
export const EMPTY_EXPENSES: ReadonlyArray<ExpenseRecord> = Object.freeze([]);
export const EMPTY_COST_FACTORS: ReadonlyArray<CostFactorRecord> = Object.freeze([]);
export const EMPTY_MACHINES: ReadonlyArray<MachineRecord> = Object.freeze([]);
export const EMPTY_OPTIONS: ReadonlyArray<Option> = Object.freeze([]);
export const EMPTY_LINE_ITEMS: ReadonlyArray<EditableLineItem> = Object.freeze([]);

/**
 * Default empty params used by setup hooks to prevent needless re-renders.
 */
export const EMPTY_SETUP_PARAMS: Readonly<{ branchId?: string }> = Object.freeze({});
