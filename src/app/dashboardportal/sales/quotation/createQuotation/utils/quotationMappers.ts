import type {
	BranchAddressRecord,
	BranchAddressRecordRaw,
	BrokerRecord,
	BrokerRecordRaw,
	CustomerBranchRecord,
	CustomerBranchRecordRaw,
	CustomerRecord,
	CustomerRecordRaw,
	ItemGroupCacheEntry,
	ItemGroupRecord,
	ItemGroupRecordRaw,
	ItemOption,
	ItemOptionRaw,
	ItemUomOptionRaw,
	ItemMakeOptionRaw,
	QuotationSetup1ResponseRaw,
	QuotationSetup2ResponseRaw,
	QuotationSetupData,
	Option,
} from "../types/quotationTypes";

/**
 * Adapter that normalizes raw customer records returned from the API.
 */
export const mapCustomerRecords = (records: unknown[]): CustomerRecord[] =>
	records
		.map((row) => {
			const data = row as CustomerRecordRaw;
			const id = data?.party_id ?? data?.id;
			if (!id) return null;

			return {
				id: String(id),
				name: data?.supp_name ?? data?.party_name ?? data?.name ?? String(id),
				code: data?.supp_code ?? data?.party_code ?? data?.code,
			} satisfies CustomerRecord;
		})
		.filter(Boolean) as CustomerRecord[];

/**
 * Adapter for customer branch records.
 */
export const mapCustomerBranchRecords = (records: unknown[]): CustomerBranchRecord[] =>
	records
		.map((row) => {
			const data = row as CustomerBranchRecordRaw;
			const id = data?.party_mst_branch_id ?? data?.id;
			if (!id) return null;

			const partyId = data?.party_id;
			const branchName = data?.party_branch_name ?? data?.branch_name ?? String(id);
			// Note: production column is "fatory_address" (known typo, do NOT fix)
			const address = data?.fatory_address ?? data?.factory_address ?? data?.address ?? "";

			return {
				id: String(id),
				partyId: partyId != null ? String(partyId) : "",
				branchName,
				address,
				stateName: data?.state_name,
				stateId: data?.state_id,
				gstNo: data?.gst_no,
			} satisfies CustomerBranchRecord;
		})
		.filter(Boolean) as CustomerBranchRecord[];

/**
 * Adapter for broker records.
 */
export const mapBrokerRecords = (records: unknown[]): BrokerRecord[] =>
	records
		.map((row) => {
			const data = row as BrokerRecordRaw;
			const id = data?.broker_id ?? data?.id;
			if (!id) return null;

			return {
				id: String(id),
				name: data?.broker_name ?? data?.name ?? String(id),
				code: data?.broker_code ?? data?.code,
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
 * Maps raw setup payload (fetchQuotationSetup1) into normalized UI data.
 */
export const mapQuotationSetupResponse = (response: unknown): QuotationSetupData => {
	try {
		const result = response as QuotationSetup1ResponseRaw;

		const customersRaw = result?.customers ?? [];
		const mappedCustomers = mapCustomerRecords(customersRaw);

		const customerBranchesRaw = result?.customer_branches ?? [];
		const mappedCustomerBranches = mapCustomerBranchRecords(customerBranchesRaw);

		const brokersRaw = result?.brokers ?? [];
		const mappedBrokers = mapBrokerRecords(brokersRaw);

		const mapped = {
			customers: mappedCustomers,
			customerBranches: mappedCustomerBranches,
			brokers: mappedBrokers,
			itemGroups: mapItemGroupRecords(result?.item_groups ?? []),
			coConfig: result?.co_config as QuotationSetupData["coConfig"],
			branchAddresses: mapBranchAddressRecords(result?.branch_addresses ?? []),
		} satisfies QuotationSetupData;

		return mapped;
	} catch (error) {
		console.error("Failed to map quotation setup response", error);
		throw error;
	}
};

/**
 * Maps raw setup payload (fetchQuotationSetup2) into cached item group metadata.
 */
export const mapItemGroupDetailResponse = (response: unknown): ItemGroupCacheEntry => {
	const result = response as QuotationSetup2ResponseRaw;

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
		if (item.defaultRate != null) {
			itemRateById[item.value] = item.defaultRate;
		}
		if (item.taxPercentage != null) {
			itemTaxById[item.value] = item.taxPercentage;
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
 * Maps quotation details from API response to form values.
 */
export const mapQuotationDetailsToFormValues = (
	details: {
		branch?: unknown;
		quotationDate?: string;
		// Backend (get_quotation_by_id) sends `party` / `quotationExpiryDate`.
		party?: unknown;
		customer?: unknown;
		broker?: unknown;
		billingAddress?: unknown;
		shippingAddress?: unknown;
		brokeragePercentage?: number | null;
		paymentTerms?: string;
		deliveryTerms?: string;
		deliveryDays?: number | null;
		quotationExpiryDate?: string;
		expiryDate?: string;
		footerNotes?: string;
		internalNote?: string;
		termsCondition?: string;
	},
	defaultValues: Record<string, unknown>,
): Record<string, unknown> => {
	return {
		...defaultValues,
		branch: toStringValue(details.branch ?? defaultValues.branch),
		quotation_date: normalizeDate(details.quotationDate) || toStringValue(defaultValues.quotation_date),
		customer: toStringValue(details.party ?? details.customer ?? defaultValues.customer),
		broker: toStringValue(details.broker ?? defaultValues.broker),
		billing_address: toStringValue(details.billingAddress ?? defaultValues.billing_address),
		shipping_address: toStringValue(details.shippingAddress ?? defaultValues.shipping_address),
		brokerage_percentage:
			details.brokeragePercentage !== undefined && details.brokeragePercentage !== null
				? String(details.brokeragePercentage)
				: toStringValue(defaultValues.brokerage_percentage),
		payment_terms: toStringValue(details.paymentTerms ?? defaultValues.payment_terms),
		delivery_terms: toStringValue(details.deliveryTerms ?? defaultValues.delivery_terms),
		delivery_days:
			details.deliveryDays !== undefined && details.deliveryDays !== null
				? String(details.deliveryDays)
				: toStringValue(defaultValues.delivery_days),
		quotation_expiry_date: normalizeDate(details.quotationExpiryDate ?? details.expiryDate) || toStringValue(defaultValues.quotation_expiry_date),
		footer_notes: toStringValue(details.footerNotes ?? defaultValues.footer_notes),
		internal_note: toStringValue(details.internalNote ?? defaultValues.internal_note),
		terms_condition: toStringValue(details.termsCondition ?? defaultValues.terms_condition),
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
