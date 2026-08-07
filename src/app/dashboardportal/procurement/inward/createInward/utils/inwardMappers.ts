import type {
	InwardSetupData,
	SupplierRecord,
	ItemGroupRecord,
	ItemGroupCacheEntry,
	ItemOption,
	Option,
} from "../types/inwardTypes";

/**
 * Raw supplier representation from API responses.
 */
type SupplierRecordRaw = {
	id?: string | number;
	party_id?: string | number;
	supplier_name?: string;
	supp_name?: string;
	name?: string;
	supplier_code?: string;
	supp_code?: string;
};

/**
 * Raw item group representation from API responses.
 */
type ItemGroupRecordRaw = {
	id?: string | number;
	item_grp_id?: string | number;
	item_grp_code_display?: string;
	code?: string;
	item_grp_name_display?: string;
	name?: string;
};

/**
 * Raw item option as returned by setup API.
 */
type ItemOptionRaw = {
	id?: string | number;
	item_id?: string | number;
	item_code?: string;
	item_name?: string;
	uom_id?: string | number | null;
	uom_name?: string | null;
	rate?: number | string | null;
	tax_percentage?: number | string | null;
};

/**
 * Raw item make option as returned by setup API.
 */
type ItemMakeOptionRaw = {
	id?: string | number;
	item_make_id?: string | number;
	item_make_name?: string;
	name?: string;
};

/**
 * Raw UOM mapping as returned by setup API.
 */
type ItemUomOptionRaw = {
	id?: string | number;
	item_id?: string | number;
	map_to_id?: string | number;
	mapToId?: string | number;
	uom_id?: string | number;
	uom_name?: string;
};

/**
 * Raw response for inward setup (reusing PO setup).
 */
type InwardSetup1ResponseRaw = {
	suppliers?: SupplierRecordRaw[];
	item_groups?: ItemGroupRecordRaw[];
	co_config?: Record<string, unknown>;
};

/**
 * Raw response for item group detail.
 */
type InwardSetup2ResponseRaw = {
	item_grp_code?: string;
	item_grp_name?: string;
	items?: ItemOptionRaw[];
	makes?: ItemMakeOptionRaw[];
	uoms?: ItemUomOptionRaw[];
};

/**
 * Map raw supplier records to normalized SupplierRecord.
 */
export const mapSupplierRecords = (records: SupplierRecordRaw[]): SupplierRecord[] =>
	records
		.map((row) => {
			const id = row?.party_id ?? row?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: String(row?.supplier_name ?? row?.supp_name ?? row?.name ?? id),
				code: row?.supplier_code ?? row?.supp_code ?? undefined,
			} satisfies SupplierRecord;
		})
		.filter(Boolean) as SupplierRecord[];

/**
 * Map raw item group records to normalized ItemGroupRecord.
 */
export const mapItemGroupRecords = (records: ItemGroupRecordRaw[]): ItemGroupRecord[] =>
	records
		.map((row) => {
			const id = row?.item_grp_id ?? row?.id;
			if (!id) return null;
			const code = row?.item_grp_code_display ?? row?.code ?? "";
			const name = row?.item_grp_name_display ?? row?.name ?? "";
			const label = code && name ? `${code} — ${name}` : code || name || String(id);
			return {
				id: String(id),
				label,
			} satisfies ItemGroupRecord;
		})
		.filter(Boolean) as ItemGroupRecord[];

/**
 * Map raw inward setup1 response to normalized InwardSetupData.
 */
export const mapInwardSetupResponse = (response: unknown): InwardSetupData => {
	const result = response as InwardSetup1ResponseRaw;
	return {
		suppliers: mapSupplierRecords((result?.suppliers as SupplierRecordRaw[]) ?? []),
		itemGroups: mapItemGroupRecords((result?.item_groups as ItemGroupRecordRaw[]) ?? []),
		coConfig: {
			india_gst: typeof result?.co_config?.india_gst === "number" ? result.co_config.india_gst : undefined,
			po_required:
				result?.co_config?.po_required != null && result.co_config.po_required !== ""
					? Number(result.co_config.po_required)
					: undefined,
		},
	};
};

/**
 * Map raw item group detail response to ItemGroupCacheEntry.
 */
export const mapItemGroupDetailResponse = (response: unknown): ItemGroupCacheEntry => {
	const raw = response as InwardSetup2ResponseRaw;

	const groupLabel = (() => {
		const code = raw?.item_grp_code ?? "";
		const name = raw?.item_grp_name ?? "";
		if (code && name) return `${code} — ${name}`;
		return code || name || undefined;
	})();

	const items: ItemOption[] = (raw?.items ?? []).map((item) => {
		const id = item?.item_id ?? item?.id;
		const code = item?.item_code ?? "";
		const name = item?.item_name ?? "";
		const label = name || code || String(id ?? "");
		const defaultRate = item?.rate != null ? Number(item.rate) : undefined;
		const taxPct = item?.tax_percentage != null ? Number(item.tax_percentage) : undefined;
		return {
			value: String(id ?? ""),
			label,
			defaultUomId: item?.uom_id != null ? String(item.uom_id) : undefined,
			defaultUomLabel: item?.uom_name ?? undefined,
			defaultRate: Number.isFinite(defaultRate) ? defaultRate : undefined,
			taxPercentage: Number.isFinite(taxPct) ? taxPct : undefined,
		} satisfies ItemOption;
	});

	const makes: Option[] = (raw?.makes ?? []).map((make) => {
		const id = make?.item_make_id ?? make?.id;
		const name = make?.item_make_name ?? make?.name ?? "";
		return {
			value: String(id ?? ""),
			label: name || String(id ?? ""),
		} satisfies Option;
	});

	const uomsByItemId: Record<string, Option[]> = {};
	const uomLabelByItemId: Record<string, Record<string, string>> = {};

	// First, add the default UOM from each item
	items.forEach((item) => {
		if (!item.value || !item.defaultUomId) return;
		const key = item.value;
		if (!uomsByItemId[key]) uomsByItemId[key] = [];
		uomsByItemId[key].push({ value: item.defaultUomId, label: item.defaultUomLabel ?? "" });
		if (!uomLabelByItemId[key]) uomLabelByItemId[key] = {};
		uomLabelByItemId[key][item.defaultUomId] = item.defaultUomLabel ?? "";
	});

	// Then, add additional UOMs from the uoms array
	(raw?.uoms ?? []).forEach((uom) => {
		const itemId = uom?.item_id;
		const uomId = uom?.map_to_id ?? uom?.mapToId ?? uom?.uom_id ?? uom?.id;
		const uomName = uom?.uom_name ?? "";
		if (!itemId || !uomId) return;
		const key = String(itemId);
		const uomValue = String(uomId);
		// Avoid duplicates
		if (!uomsByItemId[key]) uomsByItemId[key] = [];
		const exists = uomsByItemId[key].some((opt) => opt.value === uomValue);
		if (!exists) {
			uomsByItemId[key].push({ value: uomValue, label: uomName });
		}
		if (!uomLabelByItemId[key]) uomLabelByItemId[key] = {};
		if (!uomLabelByItemId[key][uomValue]) {
			uomLabelByItemId[key][uomValue] = uomName;
		}
	});

	const itemLabelById: Record<string, string> = {};
	const itemRateById: Record<string, number> = {};
	const itemTaxById: Record<string, number> = {};
	items.forEach((item) => {
		itemLabelById[item.value] = item.label;
		if (item.defaultRate != null) itemRateById[item.value] = item.defaultRate;
		if (item.taxPercentage != null) itemTaxById[item.value] = item.taxPercentage;
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
	};
};

/**
 * Map inward details response to form values.
 */
export const mapInwardDetailsToFormValues = (
	details: Record<string, unknown>,
	defaults: Record<string, unknown>
): Record<string, unknown> => {
	return {
		...defaults,
		branch: details.branch_id ?? details.branch ?? details.branchId ?? defaults.branch,
		supplier: details.supplier_id ?? details.supplier ?? details.supplierId ?? defaults.supplier,
		challan_no: details.challan_no ?? details.challanNo ?? defaults.challan_no,
		challan_date: details.challan_date ?? details.challanDate ?? defaults.challan_date,
		invoice_no: details.invoice_no ?? details.invoiceNo ?? defaults.invoice_no,
		invoice_date: details.invoice_date ?? details.invoiceDate ?? defaults.invoice_date,
		inward_no: details.inward_no ?? details.inwardNo ?? defaults.inward_no,
		inward_date: details.inward_date ?? details.inwardDate ?? defaults.inward_date,
		vehicle_no: details.vehicle_no ?? details.vehicleNo ?? defaults.vehicle_no,
		driver_name: details.driver_name ?? details.driverName ?? defaults.driver_name,
		driver_contact_no: details.driver_contact_no ?? details.driverContactNo ?? defaults.driver_contact_no,
		invoice_recvd_date: details.invoice_recvd_date ?? details.invoiceRecvdDate ?? defaults.invoice_recvd_date,
		consignment_no: details.consignment_no ?? details.consignmentNo ?? defaults.consignment_no,
		consignment_date: details.consignment_date ?? details.consignmentDate ?? defaults.consignment_date,
		ewaybillno: details.ewaybillno ?? defaults.ewaybillno,
		ewaybill_date: details.ewaybill_date ?? details.ewaybillDate ?? defaults.ewaybill_date,
		despatch_remarks: details.despatch_remarks ?? details.despatchRemarks ?? defaults.despatch_remarks,
		receipts_remarks: details.receipts_remarks ?? details.receiptsRemarks ?? defaults.receipts_remarks,
	};
};
