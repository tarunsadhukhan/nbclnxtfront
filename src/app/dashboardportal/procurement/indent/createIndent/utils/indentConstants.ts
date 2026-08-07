import type { ApprovalStatusId } from "@/components/ui/transaction";
import type {
	DepartmentRecord,
	EditableLineItem,
	ExpenseRecord,
	ItemGroupRecord,
	Option,
	ProjectRecord,
} from "../types/indentTypes";

/**
 * Standard Indent status identifiers used throughout the workflow.
 */
export const INDENT_STATUS_IDS = {
	DRAFT: 21,
	OPEN: 1,
	PENDING_APPROVAL: 20,
	APPROVED: 3,
	REJECTED: 4,
	CLOSED: 5,
	CANCELLED: 6,
} as const satisfies Record<string, ApprovalStatusId>;

/**
 * Friendly labels for each Indent status identifier.
 */
export const INDENT_STATUS_LABELS: Record<ApprovalStatusId, string> = {
	[INDENT_STATUS_IDS.DRAFT]: "Draft",
	[INDENT_STATUS_IDS.OPEN]: "Open",
	[INDENT_STATUS_IDS.PENDING_APPROVAL]: "Pending Approval",
	[INDENT_STATUS_IDS.APPROVED]: "Approved",
	[INDENT_STATUS_IDS.REJECTED]: "Rejected",
	[INDENT_STATUS_IDS.CLOSED]: "Closed",
	[INDENT_STATUS_IDS.CANCELLED]: "Cancelled",
};

/**
 * Indent type options for the header dropdown.
 * 
 * IMPORTANT: This must stay in sync with the backend:
 *   vowerp3be/src/procurement/constants.py
 * 
 * Labels match values for 100% frontend-backend consistency.
 */
export const INDENT_TYPES = {
	Regular: { id: 1, label: "Regular", value: "Regular" },
	Open: { id: 2, label: "Open", value: "Open" },
	BOM: { id: 3, label: "BOM", value: "BOM" },
} as const;

export const INDENT_TYPE_OPTIONS: ReadonlyArray<Option> = Object.freeze(
	Object.values(INDENT_TYPES).map(({ label, value }) => ({ label, value }))
);

export const VALID_INDENT_TYPE_VALUES = Object.keys(INDENT_TYPES) as Array<keyof typeof INDENT_TYPES>;

/**
 * Immutable fallbacks to avoid recreating empty arrays on every render.
 */
export const EMPTY_DEPARTMENTS: ReadonlyArray<DepartmentRecord> = Object.freeze([]);
export const EMPTY_PROJECTS: ReadonlyArray<ProjectRecord> = Object.freeze([]);
export const EMPTY_EXPENSES: ReadonlyArray<ExpenseRecord> = Object.freeze([]);
export const EMPTY_ITEM_GROUPS: ReadonlyArray<ItemGroupRecord> = Object.freeze([]);
export const EMPTY_INDENT_TITLES: ReadonlyArray<string> = Object.freeze([]);
export const EMPTY_OPTIONS: ReadonlyArray<Option> = Object.freeze([]);
export const EMPTY_LINE_ITEMS: ReadonlyArray<EditableLineItem> = Object.freeze([]);

/**
 * Default empty params used by setup hooks to prevent needless re-renders.
 */
export const EMPTY_SETUP_PARAMS: Readonly<{ branchId?: string }> = Object.freeze({});

/**
 * Expense type IDs allowed for "Open" indent type.
 */
export const OPEN_INDENT_ALLOWED_EXPENSE_IDS = new Set(["3", "5", "6"]);

/**
 * Mirrors the backend VALIDATION_LOGIC_MAP in indent.py.
 * Maps (indent_type, expense_type_name) → validation logic (1 | 2 | 3).
 *
 * Logic 1: Max/Min Quantity Validation (with stock check)
 * Logic 2: FY Check + max qty as forced value (requires min/max)
 * Logic 3: No Validation / Free Entry
 */
const VALIDATION_LOGIC_MAP: Record<string, Record<string, 1 | 2 | 3>> = {
	Regular: {
		General: 1,
		Maintenance: 1,
		Production: 1,
		Overhaul: 1,
		Capital: 2,
	},
	Open: {
		General: 3,
		Maintenance: 3,
		Production: 3,
	},
	BOM: {
		General: 1,
		Maintenance: 1,
		Production: 1,
		Capital: 2,
		Overhaul: 2,
	},
};

/**
 * Determine the validation logic for a given indent_type + expense_type_name.
 * Returns 3 (no validation) for unknown combinations.
 */
export function getValidationLogic(
	indentType: string,
	expenseTypeName: string | undefined
): 1 | 2 | 3 {
	if (!indentType || !expenseTypeName) return 3;
	return VALIDATION_LOGIC_MAP[indentType]?.[expenseTypeName] ?? 3;
}
