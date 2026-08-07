import type {
	DepartmentRecord,
	ExpenseRecord,
	IndentSetupData,
	ItemGroupCacheEntry,
	ItemGroupRecord,
	ItemOption,
	Option,
	ProjectRecord,
} from "../types/indentTypes";

/**
 * Maps raw department records from the API response.
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
 * Maps raw project records from the API response.
 */
export const mapProjectRecords = (records: unknown[]): ProjectRecord[] =>
	records
		.map((row) => {
			const data = row as Record<string, unknown>;
			const id = data?.project_id ?? data?.prj_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: String(data?.prj_name ?? data?.project_name ?? data?.name ?? id),
				branchId: data?.branch_id != null ? String(data.branch_id) : undefined,
			} satisfies ProjectRecord;
		})
		.filter(Boolean) as ProjectRecord[];

/**
 * Maps raw expense type records from the API response.
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
 * Maps raw item group records from the API response.
 */
export const mapItemGroupRecords = (records: unknown[]): ItemGroupRecord[] =>
	records
		.map((row) => {
			const data = row as Record<string, unknown>;
			const id = data?.item_grp_id ?? data?.id;
			if (!id) return null;
			const code = data?.item_grp_code_display ?? data?.code;
			const name = data?.item_grp_name_display ?? data?.name;
			const labelParts = [code, name].filter(Boolean);
			return {
				id: String(id),
				label: labelParts.length ? labelParts.join(" — ") : String(id),
			} satisfies ItemGroupRecord;
		})
		.filter(Boolean) as ItemGroupRecord[];

/**
 * Maps the complete setup response from `fetchIndentSetup1`.
 */
export const mapIndentSetupResponse = (response: unknown): IndentSetupData => {
	const result = response as Record<string, unknown>;
	const rawTitles = Array.isArray(result?.indent_titles) ? result.indent_titles : [];
	return {
		departments: mapDepartmentRecords((result?.departments as unknown[]) ?? []),
		projects: mapProjectRecords((result?.projects as unknown[]) ?? []),
		expenses: mapExpenseRecords((result?.expense_types as unknown[]) ?? []),
		itemGroups: mapItemGroupRecords((result?.item_groups as unknown[]) ?? []),
		indentTitles: rawTitles.filter((t): t is string => typeof t === "string" && t.trim() !== ""),
	} satisfies IndentSetupData;
};

/**
 * Maps the item group detail response from `fetchIndentSetup2`.
 */
export const mapItemGroupDetailResponse = (response: unknown): ItemGroupCacheEntry => {
	const result = response as Record<string, unknown>;
	const itemsRaw = Array.isArray(result.items) ? result.items : [];
	const makesRaw = Array.isArray(result.makes) ? result.makes : [];
	const uomsRaw = Array.isArray(result.uoms) ? result.uoms : [];

	const items: ItemOption[] = itemsRaw
		.map((row) => {
			const data = row as Record<string, unknown>;
			const id = data?.item_id ?? data?.id;
			if (!id) return null;
			const value = String(id);
			const rawCode = data?.full_item_code ?? data?.item_code;
			const rawName = data?.item_name;
			const code = rawCode != null ? String(rawCode) : undefined;
			const name = rawName != null ? String(rawName) : undefined;
			const labelParts = [code, name].filter(Boolean);
			return {
				value,
				label: labelParts.length ? labelParts.join(" — ") : value,
				defaultUomId: data?.uom_id != null ? String(data.uom_id) : undefined,
				defaultUomLabel: data?.uom_name ? String(data.uom_name) : undefined,
				itemCode: code,
				itemName: name,
			} satisfies ItemOption;
		})
		.filter(Boolean) as ItemOption[];

	const makes: Option[] = makesRaw
		.map((row) => {
			const data = row as Record<string, unknown>;
			const id = data?.item_make_id ?? data?.id;
			if (!id) return null;
			return {
				value: String(id),
				label: String(data?.item_make_name ?? data?.name ?? id),
			} satisfies Option;
		})
		.filter(Boolean) as Option[];

	const uomsByItemId: Record<string, Option[]> = {};
	const uomLabelByItemId: Record<string, Record<string, string>> = {};

	uomsRaw.forEach((row) => {
		const data = row as Record<string, unknown>;
		const itemId = data?.item_id ?? data?.id;
		const uomId = data?.map_to_id ?? data?.uom_id ?? data?.mapToId;
		if (!itemId || !uomId) return;
		const itemKey = String(itemId);
		const uomKey = String(uomId);
		const label = data?.uom_name ? String(data.uom_name) : uomKey;
		if (!uomsByItemId[itemKey]) uomsByItemId[itemKey] = [];
		if (!uomLabelByItemId[itemKey]) uomLabelByItemId[itemKey] = {};
		if (!uomsByItemId[itemKey].some((opt) => opt.value === uomKey)) {
			uomsByItemId[itemKey].push({ value: uomKey, label });
		}
		uomLabelByItemId[itemKey][uomKey] = label;
	});

	// Ensure default UOM is in the options list
	items.forEach((item) => {
		if (!item.defaultUomId) return;
		const bucket = uomsByItemId[item.value] ?? [];
		if (!bucket.some((opt) => opt.value === item.defaultUomId)) {
			bucket.unshift({
				value: item.defaultUomId,
				label: item.defaultUomLabel ?? item.defaultUomId,
			});
		}
		uomsByItemId[item.value] = bucket;
		if (!uomLabelByItemId[item.value]) uomLabelByItemId[item.value] = {};
		uomLabelByItemId[item.value][item.defaultUomId] =
			item.defaultUomLabel ?? item.defaultUomId ?? item.defaultUomId;
	});

	const itemLabelById: Record<string, string> = {};
	const itemCodeById: Record<string, string> = {};
	const itemNameById: Record<string, string> = {};
	items.forEach((item) => {
		itemLabelById[item.value] = item.label;
		if (item.itemCode) itemCodeById[item.value] = item.itemCode;
		if (item.itemName) itemNameById[item.value] = item.itemName;
	});

	const makeLabelById: Record<string, string> = {};
	makes.forEach((make) => {
		makeLabelById[make.value] = make.label;
	});

	return {
		items,
		makes,
		uomsByItemId,
		itemLabelById,
		itemCodeById,
		itemNameById,
		makeLabelById,
		uomLabelByItemId,
	} satisfies ItemGroupCacheEntry;
};
