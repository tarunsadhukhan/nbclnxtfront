import type {
	DepartmentRecord,
	ProjectRecord,
	ExpenseRecord,
	CostFactorRecord,
	MachineRecord,
	IssueSetupData,
	AvailableInventoryItem,
	Option,
} from "../types/issueTypes";

/**
 * Maps raw department records from API to DepartmentRecord type.
 */
export const mapDepartmentRecords = (records: unknown[]): DepartmentRecord[] =>
	records
		.map((row) => {
			const data = row as Record<string, unknown>;
			const id = data?.dept_id ?? data?.department_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: String(data?.dept_desc ?? data?.dept_name ?? data?.name ?? id),
				branchId: data?.branch_id != null ? String(data.branch_id) : undefined,
			} satisfies DepartmentRecord;
		})
		.filter(Boolean) as DepartmentRecord[];

/**
 * Maps raw project records from API to ProjectRecord type.
 */
export const mapProjectRecords = (records: unknown[]): ProjectRecord[] =>
	records
		.map((row) => {
			const data = row as Record<string, unknown>;
			const id = data?.project_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: String(data?.prj_name ?? data?.project_name ?? data?.name ?? id),
				branchId: data?.branch_id != null ? String(data.branch_id) : undefined,
			} satisfies ProjectRecord;
		})
		.filter(Boolean) as ProjectRecord[];

/**
 * Maps raw expense type records from API to ExpenseRecord type.
 */
export const mapExpenseRecords = (records: unknown[]): ExpenseRecord[] =>
	records
		.map((row) => {
			const data = row as Record<string, unknown>;
			const id = data?.expense_type_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: String(data?.expense_type_name ?? data?.name ?? id),
			} satisfies ExpenseRecord;
		})
		.filter(Boolean) as ExpenseRecord[];

/**
 * Maps raw cost factor records from API to CostFactorRecord type.
 */
export const mapCostFactorRecords = (records: unknown[]): CostFactorRecord[] =>
	records
		.map((row) => {
			const data = row as Record<string, unknown>;
			const id = data?.cost_factor_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: String(data?.cost_factor_name ?? data?.name ?? id),
				branchId: data?.branch_id != null ? String(data.branch_id) : undefined,
				deptId: data?.dept_id != null ? String(data.dept_id) : undefined,
			} satisfies CostFactorRecord;
		})
		.filter(Boolean) as CostFactorRecord[];

/**
 * Maps raw machine records from API to MachineRecord type.
 */
export const mapMachineRecords = (records: unknown[]): MachineRecord[] =>
	records
		.map((row) => {
			const data = row as Record<string, unknown>;
			const id = data?.machine_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: String(data?.machine_name ?? data?.name ?? id),
				departmentId: data?.dept_id != null ? String(data.dept_id) : undefined,
				mechCode: data?.mech_code != null ? String(data.mech_code) : undefined,
			} satisfies MachineRecord;
		})
		.filter(Boolean) as MachineRecord[];

/**
 * Maps the issue setup API response to IssueSetupData.
 * Note: item_groups removed - items now come from inventory search table.
 */
export const mapIssueSetupResponse = (response: unknown): IssueSetupData => {
	const result = response as Record<string, unknown>;
	return {
		departments: mapDepartmentRecords((result?.departments as unknown[]) ?? []),
		projects: mapProjectRecords((result?.projects as unknown[]) ?? []),
		expenses: mapExpenseRecords((result?.expense_types as unknown[]) ?? []),
		costFactors: mapCostFactorRecords((result?.cost_factors as unknown[]) ?? []),
		machines: mapMachineRecords((result?.machines as unknown[]) ?? []),
	};
};

/**
 * Maps raw available inventory items from API.
 */
export const mapAvailableInventoryItems = (records: unknown[]): AvailableInventoryItem[] =>
	records
		.map((row) => {
			const data = row as Record<string, unknown>;
			const inwardDtlId = data?.inward_dtl_id;
			if (!inwardDtlId) return null;
			return {
				inwardDtlId: String(inwardDtlId),
				inwardId: String(data?.inward_id ?? ""),
				grnNo: String(data?.sr_no ?? data?.inward_no ?? ""),
				inwardDate: String(data?.inward_date ?? ""),
				branchId: String(data?.branch_id ?? ""),
				branchName: String(data?.branch_name ?? ""),
				itemId: String(data?.item_id ?? ""),
				itemName: String(data?.item_name ?? ""),
				itemCode: String(data?.full_item_code ?? data?.item_code ?? ""),
				itemGrpId: String(data?.item_grp_id ?? ""),
				itemGrpName: String(data?.item_grp_name ?? ""),
				itemMakeId: data?.item_make_id ? String(data.item_make_id) : undefined,
				itemMakeName: data?.item_make_name ? String(data.item_make_name) : undefined,
				uomId: String(data?.uom_id ?? ""),
				uomName: String(data?.uom_name ?? ""),
				approvedQty: Number(data?.approved_qty ?? 0),
				availableQty: Number(data?.available_qty ?? data?.balance_qty ?? 0),
				rate: Number(data?.rate ?? 0),
				warehouseId: data?.warehouse_id ? String(data.warehouse_id) : undefined,
				warehouseName: data?.warehouse_name ? String(data.warehouse_name) : undefined,
			} satisfies AvailableInventoryItem;
		})
		.filter(Boolean) as AvailableInventoryItem[];
