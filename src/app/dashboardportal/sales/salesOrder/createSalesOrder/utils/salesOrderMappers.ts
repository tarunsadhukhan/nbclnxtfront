import type {
	BranchAddressRecord,
	BranchAddressRecordRaw,
	BrokerRecord,
	BrokerRecordRaw,
	CustomerBranchRecord,
	CustomerBranchRecordRaw,
	CustomerRecord,
	CustomerRecordRaw,
	ApprovedQuotationRecord,
	ApprovedQuotationRecordRaw,
	InvoiceTypeRecord,
	InvoiceTypeRecordRaw,
	ItemGroupCacheEntry,
	ItemGroupRecord,
	ItemGroupRecordRaw,
	ItemMakeOptionRaw,
	ItemOption,
	ItemOptionRaw,
	ItemUomOptionRaw,
	Option,
	SalesOrderSetup1ResponseRaw,
	SalesOrderSetup2ResponseRaw,
	SalesOrderSetupData,
	TransporterRecord,
	TransporterRecordRaw,
	UomConversionEntry,
} from "../types/salesOrderTypes";
import { resolveInvoiceTypeCode } from "./salesOrderConstants";

// ---------------------------------------------------------------------------
// Customer mapping
// ---------------------------------------------------------------------------

export const mapCustomerBranchRecords = (records: unknown[]): CustomerBranchRecord[] =>
	records
		.map((row) => {
			const data = row as CustomerBranchRecordRaw;
			const id = data?.party_mst_branch_id ?? data?.id;
			if (!id) return null;
			const addr = data?.address ?? "";
			const addrAdditional = data?.address_additional ?? "";
			const zipCode = data?.zip_code != null ? String(data.zip_code) : "";
			const stateName = data?.state_name ?? data?.state ?? "";
			const address = [addr, addrAdditional].filter(Boolean).join(", ");
			const fullAddress = [addr, addrAdditional, stateName, zipCode].filter(Boolean).join(", ") || String(id);
			return {
				id: String(id),
				address: address || String(id),
				stateName: stateName || undefined,
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
				name: data?.party_name ?? data?.name ?? String(id),
				code: data?.party_code,
				entityType: data?.entity_type,
				msmeStatus: data?.msme_status,
				branches: branches.length > 0 ? branches : undefined,
			} satisfies CustomerRecord;
		})
		.filter(Boolean) as CustomerRecord[];

// ---------------------------------------------------------------------------
// Broker / Transporter mapping
// ---------------------------------------------------------------------------

export const mapBrokerRecords = (records: unknown[]): BrokerRecord[] =>
	records
		.map((row) => {
			const data = row as BrokerRecordRaw;
			const id = data?.broker_id ?? data?.party_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: data?.broker_name ?? data?.party_name ?? data?.name ?? String(id),
			} satisfies BrokerRecord;
		})
		.filter(Boolean) as BrokerRecord[];

export const mapTransporterRecords = (records: unknown[]): TransporterRecord[] =>
	records
		.map((row) => {
			const data = row as TransporterRecordRaw;
			const id = data?.transporter_id ?? data?.party_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				name: data?.transporter_name ?? data?.party_name ?? data?.name ?? String(id),
			} satisfies TransporterRecord;
		})
		.filter(Boolean) as TransporterRecord[];

// ---------------------------------------------------------------------------
// Approved Quotation mapping
// ---------------------------------------------------------------------------

export const mapApprovedQuotationRecords = (records: unknown[]): ApprovedQuotationRecord[] =>
	records
		.map((row) => {
			const data = row as ApprovedQuotationRecordRaw;
			const id = data?.sales_quotation_id;
			if (!id) return null;
			return {
				id: String(id),
				quotationNo: data?.quotation_no ?? String(id),
				quotationDate: data?.quotation_date,
				partyName: data?.party_name,
				netAmount: data?.net_amount,
			} satisfies ApprovedQuotationRecord;
		})
		.filter(Boolean) as ApprovedQuotationRecord[];

// ---------------------------------------------------------------------------
// Branch address mapping
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Item group mapping
// ---------------------------------------------------------------------------

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
			const name = data?.invoice_type_name ?? String(id);
			return {
				id: String(id),
				name,
				typeCode: resolveInvoiceTypeCode(name),
			} satisfies InvoiceTypeRecord;
		})
		.filter(Boolean) as InvoiceTypeRecord[];

// ---------------------------------------------------------------------------
// Setup response mapper
// ---------------------------------------------------------------------------

export const mapSalesOrderSetupResponse = (response: unknown): SalesOrderSetupData => {
	try {
		const result = response as SalesOrderSetup1ResponseRaw;
		const additionalChargesRaw = result?.additional_charges_master;
		const additionalChargesMaster = Array.isArray(additionalChargesRaw)
			? additionalChargesRaw.map((c: Record<string, unknown>) => ({
				additional_charges_id: Number(c.additional_charges_id ?? 0),
				additional_charges_name: String(c.additional_charges_name ?? ""),
				default_value: c.default_value != null ? Number(c.default_value) : null,
			}))
			: [];

		const transportChargeRatesRaw = result?.transport_charge_rates;
		const transportChargeRates = Array.isArray(transportChargeRatesRaw)
			? transportChargeRatesRaw.map((r: Record<string, unknown>) => ({
				id: Number(r.id ?? 0),
				mode_of_transport: String(r.mode_of_transport ?? ""),
				additional_charges_id: Number(r.additional_charges_id ?? 0),
				rate_per_100pcs: Number(r.rate_per_100pcs ?? 0),
				co_id: r.co_id != null ? Number(r.co_id) : null,
			}))
			: [];

		return {
			customers: mapCustomerRecords(result?.customers ?? []),
			brokers: mapBrokerRecords(result?.brokers ?? []),
			transporters: mapTransporterRecords(result?.transporters ?? []),
			approvedQuotations: mapApprovedQuotationRecords(result?.approved_quotations ?? []),
			itemGroups: mapItemGroupRecords(result?.item_groups ?? []),
			branchAddresses: mapBranchAddressRecords(result?.branches ?? []),
			invoiceTypes: mapInvoiceTypeRecords(result?.invoice_types ?? []),
			coConfig: result?.co_config as SalesOrderSetupData["coConfig"],
			additionalChargesMaster,
			transportChargeRates,
		} satisfies SalesOrderSetupData;
	} catch (error) {
		console.error("Failed to map sales order setup response", error);
		throw error;
	}
};

// ---------------------------------------------------------------------------
// Item group detail (setup 2) mapper
// ---------------------------------------------------------------------------

export const mapItemGroupDetailResponse = (response: unknown): ItemGroupCacheEntry => {
	const result = response as SalesOrderSetup2ResponseRaw;

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
			const name = data?.item_name;
			return {
				value,
				label: name || value,
				defaultUomId: data?.uom_id != null ? String(data.uom_id) : undefined,
				defaultUomLabel: data?.uom_name ? String(data.uom_name) : undefined,
				defaultRate: data?.rate != null ? Number(data.rate) : undefined,
				taxPercentage: data?.tax_percentage != null ? Number(data.tax_percentage) : undefined,
				uomRounding: data?.uom_rounding != null ? Number(data.uom_rounding) : undefined,
				rateRounding: data?.rate_rounding != null ? Number(data.rate_rounding) : undefined,
				fullItemCode: data?.full_item_code ? String(data.full_item_code) : undefined,
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

		const mapFromName = data?.map_from_name ?? fromKey;
		const mapToName = data?.uom_name ?? toKey;
		const rounding = data?.rounding ?? 2;

		uomConversionsByItemId[itemKey].push({
			mapFromId: fromKey,
			mapFromName,
			mapToId: toKey,
			mapToName,
			relationValue: Number(relationValue),
			rounding: Number(rounding),
		});
	});

	const itemUomRoundingById: Record<string, number> = {};
	const itemRateRoundingById: Record<string, number> = {};

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
		if (item.uomRounding != null) itemUomRoundingById[item.value] = item.uomRounding;
		// Default rate rounding to 2 if not specified
		itemRateRoundingById[item.value] = item.rateRounding ?? 2;
	});

	const itemLabelById: Record<string, string> = {};
	const itemFullCodeById: Record<string, string> = {};
	items.forEach((item) => {
		itemLabelById[item.value] = item.label;
		if (item.fullItemCode) itemFullCodeById[item.value] = item.fullItemCode;
	});

	const makeLabelById: Record<string, string> = {};
	makes.forEach((make) => { makeLabelById[make.value] = make.label; });

	return { groupLabel, items, makes, uomsByItemId, itemLabelById, makeLabelById, uomLabelByItemId, itemRateById, itemTaxById, uomConversionsByItemId, itemUomRoundingById, itemRateRoundingById, itemFullCodeById };
};

// ---------------------------------------------------------------------------
// Details → form values mapper
// ---------------------------------------------------------------------------

const toStringValue = (value: unknown): string => {
	if (value === null || value === undefined) return "";
	return typeof value === "string" ? value : String(value);
};

const normalizeDate = (raw?: string | null): string => {
	if (!raw) return "";
	return raw.split("T")[0] || raw;
};

export const mapSalesOrderDetailsToFormValues = (
	details: {
		branch?: unknown;
		salesOrderDate?: string;
		salesOrderExpiryDate?: string | null;
		party?: unknown;
		partyBranch?: unknown;
		quotation?: unknown;
		invoiceType?: unknown;
		broker?: unknown;
		brokerCommissionPercent?: number | null;
		billingTo?: unknown;
		shippingTo?: unknown;
		transporter?: unknown;
		deliveryTerms?: string | null;
		paymentTerms?: string | null;
		buyerOrderNo?: string | null;
		buyerOrderDate?: string | null;
		deliveryDays?: number | null;
		committedDeliveryDate?: string | null;
		advanceAmount?: number | null;
		advanceNote?: string | null;
		freightCharges?: number | null;
		footerNote?: string | null;
		internalNote?: string | null;
		termsConditions?: string | null;
		jute?: {
			mr_no?: string | null;
			mukam_id?: string | number | null;
			claim_amount?: number | null;
			claim_description?: string | null;
		} | null;
		govtskg?: {
			pcso_no?: string | null;
			pcso_date?: string | null;
			administrative_office_address?: string | null;
			destination_rail_head?: string | null;
			loading_point?: string | null;
			mode_of_transport?: string | null;
		} | null;
		juteyarn?: {
			pcso_no?: string | null;
			container_no?: string | null;
			customer_ref_no?: string | null;
		} | null;
	},
	defaultValues: Record<string, unknown>,
): Record<string, unknown> => ({
	...defaultValues,
	branch: toStringValue(details.branch ?? defaultValues.branch),
	date: normalizeDate(details.salesOrderDate) || toStringValue(defaultValues.date),
	expiry_date: normalizeDate(details.salesOrderExpiryDate) || toStringValue(defaultValues.expiry_date),
	party: toStringValue(details.party ?? defaultValues.party),
	party_branch: toStringValue(details.partyBranch ?? defaultValues.party_branch),
	quotation: toStringValue(details.quotation ?? defaultValues.quotation),
	invoice_type: toStringValue(details.invoiceType ?? defaultValues.invoice_type),
	broker: toStringValue(details.broker ?? defaultValues.broker),
	broker_commission_percent: details.brokerCommissionPercent != null
		? String(details.brokerCommissionPercent)
		: toStringValue(defaultValues.broker_commission_percent),
	billing_to: toStringValue(details.billingTo ?? defaultValues.billing_to),
	shipping_to: toStringValue(details.shippingTo ?? defaultValues.shipping_to),
	transporter: toStringValue(details.transporter ?? defaultValues.transporter),
	delivery_terms: toStringValue(details.deliveryTerms ?? defaultValues.delivery_terms),
	payment_terms: toStringValue(details.paymentTerms ?? defaultValues.payment_terms),
	buyer_order_no: toStringValue(details.buyerOrderNo ?? defaultValues.buyer_order_no),
	buyer_order_date: normalizeDate(details.buyerOrderDate) || toStringValue(defaultValues.buyer_order_date),
	delivery_days: details.deliveryDays != null
		? String(details.deliveryDays)
		: toStringValue(defaultValues.delivery_days),
	committed_delivery_date: normalizeDate(details.committedDeliveryDate) || toStringValue(defaultValues.committed_delivery_date),
	advance_amount: details.advanceAmount != null
		? String(details.advanceAmount)
		: toStringValue(defaultValues.advance_amount),
	advance_note: toStringValue(details.advanceNote ?? defaultValues.advance_note),
	freight_charges: details.freightCharges != null
		? String(details.freightCharges)
		: toStringValue(defaultValues.freight_charges),
	footer_note: toStringValue(details.footerNote ?? defaultValues.footer_note),
	internal_note: toStringValue(details.internalNote ?? defaultValues.internal_note),
	terms_conditions: toStringValue(details.termsConditions ?? defaultValues.terms_conditions),
	// Jute header
	jute_mr_no: details.jute?.mr_no ?? "",
	jute_mukam_id: details.jute?.mukam_id ? String(details.jute.mukam_id) : "",
	jute_claim_amount: details.jute?.claim_amount != null ? String(details.jute.claim_amount) : "",
	jute_claim_description: details.jute?.claim_description ?? "",
	// Govt SKG header
	govtskg_pcso_no: details.govtskg?.pcso_no ?? "",
	govtskg_pcso_date: details.govtskg?.pcso_date ?? "",
	govtskg_admin_office: details.govtskg?.administrative_office_address ?? "",
	govtskg_rail_head: details.govtskg?.destination_rail_head ?? "",
	govtskg_loading_point: details.govtskg?.loading_point ?? "",
	govtskg_mode_of_transport: details.govtskg?.mode_of_transport ?? "",
	// Jute Yarn header
	juteyarn_pcso_no: details.juteyarn?.pcso_no ?? "",
	juteyarn_container_no: details.juteyarn?.container_no ?? "",
	juteyarn_customer_ref_no: details.juteyarn?.customer_ref_no ?? "",
});

export const getOptionLabelFromList = (
	options: ReadonlyArray<{ label: string; value: string }>,
	value?: unknown,
): string | undefined => {
	if (value === null || typeof value === "undefined") return undefined;
	const target = String(value);
	return options.find((opt) => opt.value === target)?.label;
};
