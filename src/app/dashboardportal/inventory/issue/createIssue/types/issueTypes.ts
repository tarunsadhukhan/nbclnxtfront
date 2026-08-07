/**
 * Issue-specific shared TypeScript definitions.
 * Keeping these in a dedicated module makes it easier to reuse them
 * across hooks, utils, and components without circular dependencies.
 */

/**
 * Basic label/value tuple used across Issue forms.
 */
export type Option = {
	label: string;
	value: string;
};

/**
 * Normalized representation of an Issue line item used in the UI.
 * Items come from InventorySearchTable (pre-populated from inventory view).
 * Item group/item are read-only display fields, not selectable.
 */
export type EditableLineItem = {
	id: string;
	// From inventory - read-only display fields
	grnNo: string; // SR number for display (proc_inward.sr_no)
	inwardDtlId: string; // Inward detail ID for backend reference
	itemId: string; // Item ID for backend
	itemName: string; // Item name for display (read-only)
	itemCode: string; // Item code for display (read-only)
	itemGrpId: string; // Item group ID for backend
	itemGrpName: string; // Item group name for display (read-only)
	uomId: string; // UOM ID for backend
	uomName: string; // UOM name for display (read-only)
	rate: string; // Rate from inward (read-only)
	availableQty: string; // Available qty from inventory (read-only)
	// Editable fields
	quantity: string; // Issue quantity (editable)
	expenseType: string; // Expense type ID
	costFactor: string; // Cost factor ID
	machine: string; // Machine ID
	remarks: string; // Remarks
};

/**
 * Department record as consumed by the Issue UI.
 */
export type DepartmentRecord = {
	id: string;
	name: string;
	branchId?: string;
};

/**
 * Project record as consumed by the Issue UI.
 */
export type ProjectRecord = {
	id: string;
	name: string;
	branchId?: string;
};

/**
 * Expense type option displayed in Issue line items.
 */
export type ExpenseRecord = {
	id: string;
	name: string;
};

/**
 * Cost factor record for cost allocation.
 */
export type CostFactorRecord = {
	id: string;
	name: string;
	branchId?: string;
	deptId?: string;
};

/**
 * Machine record for machine-based consumption tracking.
 * Includes departmentId for frontend filtering by selected department.
 */
export type MachineRecord = {
	id: string;
	name: string;
	departmentId?: string;
	mechCode?: string;
};

/**
 * Available inventory item from inward details (used by InventorySearchTable).
 */
export type AvailableInventoryItem = {
	inwardDtlId: string;
	inwardId: string;
	grnNo: string; // SR number (proc_inward.sr_no)
	inwardDate: string;
	branchId: string;
	branchName: string;
	itemId: string;
	itemName: string;
	itemCode: string;
	itemGrpId: string;
	itemGrpName: string;
	itemMakeId?: string;
	itemMakeName?: string;
	uomId: string;
	uomName: string;
	approvedQty: number;
	availableQty: number;
	rate: number;
	warehouseId?: string;
	warehouseName?: string;
};

/**
 * Normalized setup data returned by `fetchIssueSetup1`.
 * Note: item_groups removed - items now come from inventory search table.
 * cost_factors and machines are included for line item dropdowns.
 */
export type IssueSetupData = {
	departments: DepartmentRecord[];
	projects: ProjectRecord[];
	expenses: ExpenseRecord[];
	costFactors: CostFactorRecord[];
	machines: MachineRecord[];
};

/**
 * Label resolvers used in the Issue UI (simplified - no item group/item lookups).
 */
export type IssueLabelResolvers = {
	department: (id: string) => string;
	project: (id: string) => string;
	expense: (id: string) => string;
	costFactor: (id: string) => string;
	machine: (id: string) => string;
};

/**
 * Issue details returned from API (normalized).
 */
export type IssueDetails = {
	id: number | string;
	issueId?: number;
	issuePassNo?: string;
	date?: string;
	branchId?: number;
	branchName?: string;
	branchAddress1?: string;
	branchAddress2?: string;
	branchZipcode?: string | number;
	branchGstNo?: string;
	coId?: number;
	coName?: string;
	coLogo?: string;
	coAddress1?: string;
	coAddress2?: string;
	coZipcode?: string | number;
	coCinNo?: string;
	coPanNo?: string;
	coEmailId?: string;
	deptId?: number;
	deptName?: string;
	projectId?: number;
	projectName?: string;
	issuedTo?: string;
	reqBy?: string;
	internalNote?: string;
	status?: string;
	statusId?: number;
	approvalLevel?: number | null;
	maxApprovalLevel?: number | null;
	permissions?: import("@/components/ui/transaction").ApprovalActionPermissions;
	createdBy?: string;
	createdAt?: string;
	updatedBy?: string;
	updatedAt?: string;
	lineItems?: IssueLineDetails[];
};

/**
 * Issue line item details from API (normalized).
 */
export type IssueLineDetails = {
	id: number | string;
	itemId?: number;
	itemName?: string;
	itemCode?: string;
	itemGroupId?: number;
	itemGroupName?: string;
	uomId?: number;
	uomName?: string;
	qty?: number;
	rate?: number;
	expenseId?: number;
	expenseTypeName?: string;
	costFactorId?: number;
	costFactorName?: string;
	machineId?: number;
	machineName?: string;
	inwardDtlId?: number;
	srNo?: string;
	remarks?: string;
};
