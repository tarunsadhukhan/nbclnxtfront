import type {
	BranchAddressRecord,
	BranchAddressRecordRaw,
	BrokerRecord,
	BrokerRecordRaw,
	ItemGroupCacheEntry,
	ItemGroupRecord,
	ItemGroupRecordRaw,
	ItemLastPurchaseInfo,
	ItemOption,
	ItemOptionRaw,
	ItemUomOptionRaw,
	ItemMakeOptionRaw,
	POSetup1ResponseRaw,
	POSetup2ResponseRaw,
	POSetupData,
	ProjectRecord,
	ProjectRecordRaw,
	ExpenseRecord,
	ExpenseRecordRaw,
	SupplierBranchRecord,
	SupplierBranchRecordRaw,
	SupplierRecord,
	SupplierRecordRaw,
	Option,
} from "../types/poTypes";

/**
 * Adapter that normalizes raw supplier records returned from the API.
 */
export const mapSupplierRecords = (records: unknown[]): SupplierRecord[] =>
	records
		.map((row) => {
			const data = row as SupplierRecordRaw;
			const id = data?.party_id ?? data?.id;
			if (!id) return null;

			const branchesRaw = (data?.branches as unknown[]) ?? [];
			const branches = mapSupplierBranchRecords(branchesRaw);

			return {
				id: String(id),
				name: data?.supplier_name ?? data?.supp_name ?? data?.name ?? String(id),
				code: data?.supplier_code ?? data?.supp_code,
				branches: branches.length > 0 ? branches : undefined,
			} satisfies SupplierRecord;
		})
		.filter(Boolean) as SupplierRecord[];

/**
 * Adapter for supplier branch records nested under suppliers.
 */
export const mapSupplierBranchRecords = (records: unknown[]): SupplierBranchRecord[] =>
	records
		.map((row) => {
			const data = row as SupplierBranchRecordRaw;
			const id = data?.party_mst_branch_id ?? data?.id;
			if (!id) return null;
			const addr1 = data?.branch_address1 ?? "";
			const addr2 = data?.branch_address2 ?? "";
			const address = [addr1, addr2].filter(Boolean).join(", ");
			return {
				id: String(id),
				address: address || String(id),
				stateName: data?.state_name ?? data?.state,
			} satisfies SupplierBranchRecord;
		})
		.filter(Boolean) as SupplierBranchRecord[];

/**
 * Adapter that normalizes raw broker records returned from the API.
 */
export const mapBrokerRecords = (records: unknown[]): BrokerRecord[] =>
	records
		.map((row) => {
			const data = row as BrokerRecordRaw;
			const id = data?.broker_id ?? data?.party_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: data?.broker_name ?? data?.name ?? String(id),
				code: data?.broker_code,
			} satisfies BrokerRecord;
		})
		.filter(Boolean) as BrokerRecord[];

/**
 * Adapter for company branch/billing addresses.
 */
export const mapBranchAddressRecords = (records: unknown[]): BranchAddressRecord[] =>
	records
		.map((row) => {
			const data = row as BranchAddressRecordRaw;
			const id = data?.branch_id ?? data?.id;
			if (!id) return null;

			const address1 = data?.branch_address1 ?? "";
			const address2 = data?.branch_address2 ?? "";
			const zipcode = data?.branch_zipcode ?? "";
			const stateName = data?.state_name ?? "";

			const addressParts = [address1, address2, stateName, zipcode].filter(Boolean);
			const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : data?.branch_name ?? String(id);

			return {
				id: String(id),
				name: data?.branch_name ?? String(id),
				address1: address1 || undefined,
				address2: address2 || undefined,
				zipcode: zipcode || undefined,
				stateName: stateName || undefined,
				stateId: data?.state_id,
				fullAddress,
			} satisfies BranchAddressRecord;
		})
		.filter(Boolean) as BranchAddressRecord[];

/**
 * Adapter for project dropdown options.
 */
export const mapProjectRecords = (records: unknown[]): ProjectRecord[] =>
	records
		.map((row) => {
			const data = row as ProjectRecordRaw;
			const id = data?.project_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: data?.prj_name ?? data?.project_name ?? data?.name ?? String(id),
				branchId: data?.branch_id != null ? String(data.branch_id) : undefined,
			} satisfies ProjectRecord;
		})
		.filter(Boolean) as ProjectRecord[];

/**
 * Adapter for expense dropdown options.
 */
export const mapExpenseRecords = (records: unknown[]): ExpenseRecord[] =>
	records
		.map((row) => {
			const data = row as ExpenseRecordRaw;
			const id = data?.expense_type_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: data?.expense_type_name ?? data?.name ?? String(id),
			} satisfies ExpenseRecord;
		})
		.filter(Boolean) as ExpenseRecord[];

/**
 * Adapter for item group dropdown options.
 */
export const mapItemGroupRecords = (records: unknown[]): ItemGroupRecord[] =>
	records
		.map((row) => {
			const data = row as ItemGroupRecordRaw;
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
 * Maps raw setup payload (fetchPOSetup1) into normalized UI data.
 */
export const mapPOSetupResponse = (response: unknown): POSetupData => {
	try {
		const result = response as POSetup1ResponseRaw;

		const suppliersRaw = result?.suppliers ?? [];
		const mappedSuppliers = mapSupplierRecords(suppliersRaw);

		// Map additional charges options
		const additionalChargesRaw = (result as Record<string, unknown>)?.additional_charges_options;
		const additionalChargeOptions = Array.isArray(additionalChargesRaw)
			? additionalChargesRaw.map((opt) => {
					const data = opt as Record<string, unknown>;
					return {
						additional_charges_id: Number(data?.additional_charges_id ?? 0),
						additional_charges_name: String(data?.additional_charges_name ?? ""),
						default_value: data?.default_value != null ? Number(data.default_value) : null,
					};
				})
			: [];

		const mapped = {
			suppliers: mappedSuppliers,
			brokers: mapBrokerRecords(result?.brokers ?? []),
			projects: mapProjectRecords(result?.projects ?? []),
			expenses: mapExpenseRecords(result?.expense_types ?? []),
			itemGroups: mapItemGroupRecords(result?.item_groups ?? []),
			coConfig: result?.co_config as POSetupData["coConfig"],
			branchAddresses: mapBranchAddressRecords(result?.branch_addresses ?? []),
			additionalChargeOptions,
		} satisfies POSetupData;

		return mapped;
	} catch (error) {
		console.error("Failed to map PO setup response", error);
		throw error;
	}
};

/**
 * Maps raw setup payload (fetchPOSetup2) into cached item group metadata.
 */
export const mapItemGroupDetailResponse = (response: unknown): ItemGroupCacheEntry => {
	const result = response as POSetup2ResponseRaw;
	
	// Extract group label from response if available
	const groupCode = result?.item_grp_code;
	const groupName = result?.item_grp_name;
	const groupLabelParts = [groupCode, groupName].filter(Boolean);
	const groupLabel = groupLabelParts.length ? groupLabelParts.join(" — ") : undefined;
	
	const itemsRaw = Array.isArray(result.items) ? result.items : [];
	const makesRaw = Array.isArray(result.makes) ? result.makes : [];
	const uomsRaw = Array.isArray(result.uoms) ? result.uoms : [];

	const items: ItemOption[] = itemsRaw
		.map((row) => {
			const data = row as ItemOptionRaw;
			const id = data?.item_id ?? data?.id;
			if (!id) return null;
			const value = String(id);
			const code = data?.item_code;
			const name = data?.item_name;
			const labelParts = [code, name].filter(Boolean);
			return {
				value,
				label: labelParts.length ? labelParts.join(" — ") : value,
				defaultUomId: data?.uom_id != null ? String(data.uom_id) : undefined,
				defaultUomLabel: data?.uom_name ? String(data.uom_name) : undefined,
				defaultRate: data?.rate != null ? Number(data.rate) : undefined,
				taxPercentage: data?.tax_percentage != null ? Number(data.tax_percentage) : undefined,
				hsnCode: data?.hsn_code ? String(data.hsn_code) : undefined,
				lastPurchaseRate: data?.last_purchase_rate != null ? Number(data.last_purchase_rate) : undefined,
				lastPurchaseDate: data?.last_purchase_date ?? undefined,
				lastSupplierName: data?.last_supplier_name ?? undefined,
			};
		})
		.filter(Boolean) as ItemOption[];

	const makes = makesRaw
		.map((row) => {
			const data = row as ItemMakeOptionRaw;
			const id = data?.item_make_id ?? data?.id;
			if (!id) return null;
			return { value: String(id), label: data?.item_make_name ?? data?.name ?? String(id) };
		})
		.filter(Boolean) as Option[];

	const uomsByItemId: Record<string, Option[]> = {};
	const uomLabelByItemId: Record<string, Record<string, string>> = {};
	const itemRateById: Record<string, number> = {};
	const itemTaxById: Record<string, number> = {};
	const itemHsnById: Record<string, string> = {};
	const itemLastPurchaseById: Record<string, ItemLastPurchaseInfo> = {};

	uomsRaw.forEach((row) => {
		const data = row as ItemUomOptionRaw;
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

	items.forEach((item) => {
		if (item.defaultUomId) {
			const bucket = uomsByItemId[item.value] ?? [];
			if (!bucket.some((opt) => opt.value === item.defaultUomId)) {
				bucket.unshift({ value: item.defaultUomId, label: item.defaultUomLabel ?? item.defaultUomId });
			}
			uomsByItemId[item.value] = bucket;
			if (!uomLabelByItemId[item.value]) uomLabelByItemId[item.value] = {};
			uomLabelByItemId[item.value][item.defaultUomId] = item.defaultUomLabel ?? item.defaultUomId ?? item.defaultUomId;
		}
		if (item.defaultRate != null) {
			itemRateById[item.value] = item.defaultRate;
		}
		if (item.taxPercentage != null) {
			itemTaxById[item.value] = item.taxPercentage;
		}
		if (item.hsnCode) {
			itemHsnById[item.value] = item.hsnCode;
		}
		if (item.lastPurchaseRate != null) {
			itemLastPurchaseById[item.value] = {
				rate: item.lastPurchaseRate,
				date: item.lastPurchaseDate ?? null,
				supplierName: item.lastSupplierName ?? null,
			};
		}
	});

	const itemLabelById: Record<string, string> = {};
	items.forEach((item) => {
		itemLabelById[item.value] = item.label;
	});

	const makeLabelById: Record<string, string> = {};
	makes.forEach((make) => {
		makeLabelById[make.value] = make.label;
	});

	return {
		groupLabel,
		items,
		makes,
		uomsByItemId,
		itemLabelById,
		makeLabelById,
		uomLabelByItemId,
		itemRateById,
		itemTaxById,
		itemHsnById,
		itemLastPurchaseById,
	};
};

/**
 * Helper to safely convert a value to string, returning empty string for null/undefined.
 */
const toStringValue = (value: unknown): string => {
	if (value === null || value === undefined) return "";
	return typeof value === "string" ? value : String(value);
};

/**
 * Normalize a date string by removing the time portion.
 */
const normalizeDate = (raw?: string): string => {
	if (!raw) return "";
	return raw.split("T")[0] || raw;
};

/**
 * Maps PO details from API response to form values.
 */
export const mapPODetailsToFormValues = (
	details: {
		branch?: unknown;
		poDate?: string;
		supplier?: unknown;
		supplierBranch?: unknown;
		billingAddress?: unknown;
		shippingAddress?: unknown;
		creditTerm?: number | null;
		deliveryTimeline?: number | null;
		project?: unknown;
		expenseType?: unknown;
		poType?: string;
		contactPerson?: string;
		contactNo?: string;
		footerNote?: string;
		internalNote?: string;
		termsConditions?: string;
		advancePercentage?: number | null;
		billingState?: string;
		shippingState?: string;
		taxType?: string;
	},
	defaultValues: Record<string, unknown>,
): Record<string, unknown> => {
	return {
		...defaultValues,
		branch: toStringValue(details.branch ?? defaultValues.branch),
		date: normalizeDate(details.poDate) || toStringValue(defaultValues.date),
		supplier: toStringValue(details.supplier ?? defaultValues.supplier),
		supplier_branch: toStringValue(details.supplierBranch ?? defaultValues.supplier_branch),
		billing_address: toStringValue(details.billingAddress ?? defaultValues.billing_address),
		shipping_address: toStringValue(details.shippingAddress ?? defaultValues.shipping_address),
		credit_term:
			details.creditTerm !== undefined && details.creditTerm !== null
				? String(details.creditTerm)
				: toStringValue(defaultValues.credit_term),
		delivery_timeline:
			details.deliveryTimeline !== undefined && details.deliveryTimeline !== null
				? String(details.deliveryTimeline)
				: toStringValue(defaultValues.delivery_timeline),
		project: toStringValue(details.project ?? defaultValues.project),
		expense_type: toStringValue(details.expenseType ?? defaultValues.expense_type),
		po_type: toStringValue(details.poType ?? defaultValues.po_type),
		contact_person: toStringValue(details.contactPerson ?? defaultValues.contact_person),
		contact_no: toStringValue(details.contactNo ?? defaultValues.contact_no),
		footer_note: toStringValue(details.footerNote ?? defaultValues.footer_note),
		internal_note: toStringValue(details.internalNote ?? defaultValues.internal_note),
		terms_conditions: toStringValue(details.termsConditions ?? defaultValues.terms_conditions),
		advance_percentage:
			details.advancePercentage !== undefined && details.advancePercentage !== null
				? String(details.advancePercentage)
				: toStringValue(defaultValues.advance_percentage),
		billing_state: toStringValue(details.billingState ?? defaultValues.billing_state),
		shipping_state: toStringValue(details.shippingState ?? defaultValues.shipping_state),
		tax_type: toStringValue(details.taxType ?? defaultValues.tax_type),
	};
};

/**
 * Finds the label for a given value in an array of options.
 */
export const getOptionLabelFromList = (
	options: ReadonlyArray<{ label: string; value: string }>,
	value?: unknown,
): string | undefined => {
	if (value === null || typeof value === "undefined") return undefined;
	const target = String(value);
	return options.find((opt) => opt.value === target)?.label;
};

