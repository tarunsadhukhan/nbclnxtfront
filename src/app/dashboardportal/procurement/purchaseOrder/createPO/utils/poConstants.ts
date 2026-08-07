import type { ApprovalStatusId } from "@/components/ui/transaction";
import type {
	AdditionalChargeOption,
	BranchAddressRecord,
	BrokerRecord,
	EditableLineItem,
	ExpenseRecord,
	ItemGroupRecord,
	Option,
	ProjectRecord,
	SupplierBranchRecord,
	SupplierRecord,
} from "../types/poTypes";

/**
 * Discount mode identifiers supported by the PO flow.
 */
export const DISCOUNT_MODE = {
	PERCENTAGE: 1,
	AMOUNT: 2,
} as const;

export type DiscountMode = (typeof DISCOUNT_MODE)[keyof typeof DISCOUNT_MODE];

/**
 * Standard PO status identifiers used throughout the workflow.
 */
export const PO_STATUS_IDS = {
	DRAFT: 21,
	OPEN: 1,
	PENDING_APPROVAL: 20,
	APPROVED: 3,
	REJECTED: 4,
	CLOSED: 5,
	CANCELLED: 6,
} as const satisfies Record<string, ApprovalStatusId>;

/**
 * Friendly labels for each PO status identifier.
 */
export const PO_STATUS_LABELS: Record<ApprovalStatusId, string> = {
	[PO_STATUS_IDS.DRAFT]: "Draft",
	[PO_STATUS_IDS.OPEN]: "Open",
	[PO_STATUS_IDS.PENDING_APPROVAL]: "Pending Approval",
	[PO_STATUS_IDS.APPROVED]: "Approved",
	[PO_STATUS_IDS.REJECTED]: "Rejected",
	[PO_STATUS_IDS.CLOSED]: "Closed",
	[PO_STATUS_IDS.CANCELLED]: "Cancelled",
};

/**
 * Immutable fallbacks to avoid recreating empty arrays on every render.
 */
export const EMPTY_SUPPLIERS: ReadonlyArray<SupplierRecord> = Object.freeze([]);
export const EMPTY_BROKERS: ReadonlyArray<BrokerRecord> = Object.freeze([]);
export const EMPTY_SUPPLIER_BRANCHES: ReadonlyArray<SupplierBranchRecord> = Object.freeze([]);
export const EMPTY_BRANCH_ADDRESSES: ReadonlyArray<BranchAddressRecord> = Object.freeze([]);
export const EMPTY_PROJECTS: ReadonlyArray<ProjectRecord> = Object.freeze([]);
export const EMPTY_EXPENSES: ReadonlyArray<ExpenseRecord> = Object.freeze([]);
export const EMPTY_ITEM_GROUPS: ReadonlyArray<ItemGroupRecord> = Object.freeze([]);
export const EMPTY_OPTIONS: ReadonlyArray<Option> = Object.freeze([]);
export const EMPTY_LINE_ITEMS: ReadonlyArray<EditableLineItem> = Object.freeze([]);
export const EMPTY_ADDITIONAL_CHARGE_OPTIONS: ReadonlyArray<AdditionalChargeOption> = Object.freeze([]);

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

/**
 * PO type identifiers used when determining validation logic.
 */
export const PO_TYPE = {
	REGULAR: "Regular",
	OPEN: "Open",
} as const;

export type POType = (typeof PO_TYPE)[keyof typeof PO_TYPE];

/**
 * Validation logic identifiers for direct PO line item validation.
 * Logic 1: Stock + max/min check (Regular + General/Maintenance/Production/Overhaul)
 * Logic 2: FY check + forced max qty (Open + General/Maintenance/Production)
 * Logic 3: No validation / free entry (Regular + Capital, and fallback)
 */
export const PO_VALIDATION_LOGIC = {
	LOGIC_1: 1,
	LOGIC_2: 2,
	LOGIC_3: 3,
} as const;

/**
 * Invalid PO Type + Expense Type name combinations that must be blocked at the header level.
 * Open PO with Capital or Overhaul expense is not a valid combination.
 */
export const INVALID_PO_TYPE_EXPENSE_COMBOS: ReadonlySet<string> = new Set([
	"Open|Capital",
	"Open|Overhaul",
]);

/**
 * Returns true if the given po_type + expense_type_name combination is valid.
 */
export const isValidPOTypeExpenseCombo = (poType: string, expenseTypeName: string): boolean =>
	!INVALID_PO_TYPE_EXPENSE_COMBOS.has(`${poType}|${expenseTypeName}`);

