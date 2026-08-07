import type {
	CustomerRecord,
	CustomerRecordRaw,
	CustomerBranchRecord,
	CustomerBranchRecordRaw,
	CompanyBranchRecord,
	CompanyBranchRecordRaw,
	TransporterRecord,
	TransporterRecordRaw,
	BrokerRecord,
	BrokerRecordRaw,
	ApprovedSalesOrderRecord,
	ApprovedSalesOrderRecordRaw,
	InvoiceTypeRecord,
	InvoiceTypeRecordRaw,
	ItemGroupRecord,
	ItemGroupRecordRaw,
	ItemGroupCacheEntry,
	ItemOption,
	ItemOptionRaw,
	ItemMakeOptionRaw,
	ItemUomOptionRaw,
	UomConversionEntry,
	DOSetup1ResponseRaw,
	DOSetup2ResponseRaw,
	DOSetupData,
	Option,
} from "../types/deliveryOrderTypes";

export const mapCustomerBranchRecords = (records: unknown[]): CustomerBranchRecord[] =>
	records
		.map((row) => {
			const data = row as CustomerBranchRecordRaw;
			const id = data?.party_mst_branch_id ?? data?.id;
			if (!id) return null;
			const address = data?.address ?? data?.fatory_address ?? data?.branch_address1 ?? "";
			const addressAdditional = data?.address_additional ?? "";
			const zipCode = data?.zip_code ?? "";
			const stateName = data?.state_name ?? "";
			const addressParts = [address, addressAdditional, stateName, zipCode].filter(Boolean);
			const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : String(id);
			return {
				id: String(id),
				name: data?.party_branch_name ?? (address || String(id)),
				address: address || String(id),
				stateName: stateName || undefined,
				stateId: data?.state_id,
				gstNo: data?.gst_no,
				fullAddress,
			} satisfies CustomerBranchRecord;
		})
		.filter(Boolean) as CustomerBranchRecord[];

export const mapCustomerRecords = (records: unknown[]): CustomerRecord[] =>
	records
		.map((row) => {
			const data = row as CustomerRecordRaw;
			const id = data?.party_id ?? data?.id;
			if (!id) return null;
			const branchesRaw = (data?.branches as unknown[]) ?? [];
			const branches = mapCustomerBranchRecords(branchesRaw);
			return {
				id: String(id),
				name: data?.supp_name ?? data?.party_name ?? data?.name ?? String(id),
				code: data?.supp_code ?? data?.party_code,
				branches: branches.length > 0 ? branches : undefined,
			} satisfies CustomerRecord;
		})
		.filter(Boolean) as CustomerRecord[];

export const mapTransporterRecords = (records: unknown[]): TransporterRecord[] =>
	records
		.map((row) => {
			const data = row as TransporterRecordRaw;
			const id = data?.transporter_id ?? data?.party_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: data?.transporter_name ?? data?.name ?? String(id),
				code: data?.transporter_code,
			} satisfies TransporterRecord;
		})
		.filter(Boolean) as TransporterRecord[];

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

export const mapApprovedSalesOrders = (records: unknown[]): ApprovedSalesOrderRecord[] =>
	records
		.map((row) => {
			const data = row as ApprovedSalesOrderRecordRaw;
			const id = data?.sales_order_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				salesNo: data?.sales_no ?? data?.sales_order_no ?? String(id),
				salesOrderDate: data?.sales_order_date,
				partyId: data?.party_id != null ? String(data.party_id) : undefined,
				partyName: data?.party_name,
				netAmount: data?.net_amount,
				invoiceType: data?.invoice_type ? String(data.invoice_type) : undefined,
				brokerId: data?.broker_id != null ? String(data.broker_id) : undefined,
				billingToId: data?.billing_to_id != null ? String(data.billing_to_id) : undefined,
				shippingToId: data?.shipping_to_id != null ? String(data.shipping_to_id) : undefined,
				transporterId: data?.transporter_id != null ? String(data.transporter_id) : undefined,
				pcsoNo: data?.pcso_no ?? undefined,
				pcsoDate: data?.pcso_date ?? undefined,
			} satisfies ApprovedSalesOrderRecord;
		})
		.filter(Boolean) as ApprovedSalesOrderRecord[];

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

// ---------------------------------------------------------------------------
// Invoice type mapping
// ---------------------------------------------------------------------------

export const mapInvoiceTypeRecords = (records: unknown[]): InvoiceTypeRecord[] =>
	records
		.map((row) => {
			const data = row as InvoiceTypeRecordRaw;
			const id = data?.invoice_type_id;
			if (!id) return null;
			return {
				id: String(id),
				name: data?.invoice_type_name ?? String(id),
			} satisfies InvoiceTypeRecord;
		})
		.filter(Boolean) as InvoiceTypeRecord[];

export const mapCompanyBranchRecords = (records: unknown[]): CompanyBranchRecord[] =>
	records
		.map((row) => {
			const data = row as CompanyBranchRecordRaw;
			const id = data?.branch_id;
			if (id == null) return null;
			return {
				id: String(id),
				name: data?.branch_name,
				address1: data?.branch_address1,
				address2: data?.branch_address2,
				zipcode: data?.branch_zipcode != null ? String(data.branch_zipcode) : undefined,
				stateName: data?.state_name,
				stateCode: data?.state_code,
				gstNo: data?.gst_no,
			} satisfies CompanyBranchRecord;
		})
		.filter(Boolean) as CompanyBranchRecord[];

export const mapDOSetupResponse = (response: unknown): DOSetupData => {
	try {
		const result = response as DOSetup1ResponseRaw;
		return {
			customers: mapCustomerRecords(result?.customers ?? []),
			transporters: mapTransporterRecords(result?.transporters ?? []),
			brokers: mapBrokerRecords(result?.brokers ?? []),
			approvedSalesOrders: mapApprovedSalesOrders(result?.approved_sales_orders ?? []),
			itemGroups: mapItemGroupRecords(result?.item_groups ?? []),
			invoiceTypes: mapInvoiceTypeRecords(result?.invoice_types ?? []),
			branches: mapCompanyBranchRecords(result?.branches ?? []),
		} satisfies DOSetupData;
	} catch (error) {
		console.error("Failed to map DO setup response", error);
		throw error;
	}
};

export const mapItemGroupDetailResponse = (response: unknown): ItemGroupCacheEntry => {
	const result = response as DOSetup2ResponseRaw;

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
				rateRounding: data?.rate_rounding != null ? Number(data.rate_rounding) : undefined,
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
	const itemRateRoundingById: Record<string, number> = {};

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

	// Build UOM conversion data per item
	const uomConversionsByItemId: Record<string, UomConversionEntry[]> = {};

	uomsRaw.forEach((row) => {
		const data = row as ItemUomOptionRaw;
		const itemId = data?.item_id ?? data?.id;
		const mapFromId = data?.map_from_id;
		const mapToId = data?.map_to_id ?? data?.uom_id ?? data?.mapToId;
		const relationValue = data?.relation_value;

		if (!itemId || !mapFromId || !mapToId || relationValue == null || relationValue === 0) return;

		const itemKey = String(itemId);
		if (!uomConversionsByItemId[itemKey]) uomConversionsByItemId[itemKey] = [];

		const fromKey = String(mapFromId);
		const toKey = String(mapToId);
		if (uomConversionsByItemId[itemKey].some(
			(c) => c.mapFromId === fromKey && c.mapToId === toKey
		)) return;

		uomConversionsByItemId[itemKey].push({
			mapFromId: fromKey,
			mapFromName: data?.map_from_name ?? fromKey,
			mapToId: toKey,
			mapToName: data?.uom_name ?? toKey,
			relationValue: Number(relationValue),
			rounding: Number(data?.rounding ?? 2),
		});
	});

	items.forEach((item) => {
		if (item.defaultUomId) {
			const bucket = uomsByItemId[item.value] ?? [];
			if (!bucket.some((opt) => opt.value === item.defaultUomId)) {
				bucket.unshift({ value: item.defaultUomId, label: item.defaultUomLabel ?? item.defaultUomId });
			}
			uomsByItemId[item.value] = bucket;
			if (!uomLabelByItemId[item.value]) uomLabelByItemId[item.value] = {};
			uomLabelByItemId[item.value][item.defaultUomId] = item.defaultUomLabel ?? item.defaultUomId;
		}
		if (item.defaultRate != null) itemRateById[item.value] = item.defaultRate;
		if (item.taxPercentage != null) itemTaxById[item.value] = item.taxPercentage;
		if (item.rateRounding != null) itemRateRoundingById[item.value] = item.rateRounding;
	});

	const itemLabelById: Record<string, string> = {};
	items.forEach((item) => { itemLabelById[item.value] = item.label; });

	const makeLabelById: Record<string, string> = {};
	makes.forEach((make) => { makeLabelById[make.value] = make.label; });

	return { groupLabel, items, makes, uomsByItemId, itemLabelById, makeLabelById, uomLabelByItemId, itemRateById, itemTaxById, itemRateRoundingById, uomConversionsByItemId };
};

const toStringValue = (value: unknown): string => {
	if (value === null || value === undefined) return "";
	return typeof value === "string" ? value : String(value);
};

const normalizeDate = (raw?: string): string => {
	if (!raw) return "";
	return raw.split("T")[0] || raw;
};

export const mapDODetailsToFormValues = (
	details: {
		branch?: unknown;
		deliveryOrderDate?: string;
		expectedDeliveryDate?: string;
		party?: unknown;
		partyBranch?: unknown;
		salesOrder?: unknown;
		invoiceType?: unknown;
		billingTo?: unknown;
		shippingTo?: unknown;
		transporter?: unknown;
		vehicleNo?: string;
		driverName?: string;
		driverContact?: string;
		ewayBillNo?: string;
		ewayBillDate?: string;
		footerNote?: string;
		internalNote?: string;
		grossAmount?: number;
		netAmount?: number;
		freightCharges?: number;
		roundOffValue?: number;
	},
	defaultValues: Record<string, unknown>,
): Record<string, unknown> => ({
	...defaultValues,
	branch: toStringValue(details.branch ?? defaultValues.branch),
	date: normalizeDate(details.deliveryOrderDate) || toStringValue(defaultValues.date),
	expected_delivery_date: normalizeDate(details.expectedDeliveryDate) || toStringValue(defaultValues.expected_delivery_date),
	party: toStringValue(details.party ?? defaultValues.party),
	party_branch: toStringValue(details.partyBranch ?? defaultValues.party_branch),
	sales_order: toStringValue(details.salesOrder ?? defaultValues.sales_order),
	invoice_type: toStringValue(details.invoiceType ?? defaultValues.invoice_type),
	billing_to: toStringValue(details.billingTo ?? defaultValues.billing_to),
	shipping_to: toStringValue(details.shippingTo ?? defaultValues.shipping_to),
	transporter: toStringValue(details.transporter ?? defaultValues.transporter),
	vehicle_no: toStringValue(details.vehicleNo ?? defaultValues.vehicle_no),
	driver_name: toStringValue(details.driverName ?? defaultValues.driver_name),
	driver_contact: toStringValue(details.driverContact ?? defaultValues.driver_contact),
	eway_bill_no: toStringValue(details.ewayBillNo ?? defaultValues.eway_bill_no),
	eway_bill_date: normalizeDate(details.ewayBillDate) || toStringValue(defaultValues.eway_bill_date),
	footer_note: toStringValue(details.footerNote ?? defaultValues.footer_note),
	internal_note: toStringValue(details.internalNote ?? defaultValues.internal_note),
	freight_charges: details.freightCharges != null ? String(details.freightCharges) : toStringValue(defaultValues.freight_charges),
	round_off_value: details.roundOffValue != null ? String(details.roundOffValue) : toStringValue(defaultValues.round_off_value),
});
