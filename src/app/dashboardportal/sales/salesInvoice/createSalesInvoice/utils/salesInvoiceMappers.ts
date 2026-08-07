import type {
	CustomerRecord,
	CustomerRecordRaw,
	CustomerBranchRecord,
	CustomerBranchRecordRaw,
	TransporterRecord,
	TransporterRecordRaw,
	BrokerRecord,
	BrokerRecordRaw,
	ApprovedDeliveryOrderRecord,
	ApprovedDeliveryOrderRecordRaw,
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
	InvoiceSetup1ResponseRaw,
	InvoiceSetup2ResponseRaw,
	InvoiceSetupData,
	BankDetailRecord,
	BankDetailRecordRaw,
	MukamRecord,
	Option,
	UomConversionEntry,
} from "../types/salesInvoiceTypes";

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
			const addressParts = [address, addressAdditional, zipCode, stateName].filter(Boolean);
			const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : String(id);
			return {
				id: String(id),
				name: data?.party_branch_name ?? (address || String(id)),
				address: address || String(id),
				fullAddress,
				stateName: data?.state_name,
				stateId: data?.state_id,
				stateCode: data?.state_code,
				gstNo: data?.gst_no,
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

export const mapApprovedDeliveryOrders = (records: unknown[]): ApprovedDeliveryOrderRecord[] =>
	records
		.map((row) => {
			const data = row as ApprovedDeliveryOrderRecordRaw;
			const id = data?.sales_delivery_order_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				deliveryOrderNo: data?.delivery_order_no ?? data?.do_no ?? String(id),
				deliveryOrderDate: data?.delivery_order_date,
				partyId: data?.party_id,
				partyName: data?.party_name,
				netAmount: data?.net_amount,
				salesOrderId: data?.sales_order_id,
				salesOrderDate: data?.sales_order_date,
				salesOrderNo: data?.sales_order_no,
				invoiceType: data?.invoice_type,
				billingToId: data?.billing_to_id,
				shippingToId: data?.shipping_to_id,
				transporterId: data?.transporter_id,
			} satisfies ApprovedDeliveryOrderRecord;
		})
		.filter(Boolean) as ApprovedDeliveryOrderRecord[];

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

export const mapMukamRecords = (records: unknown[]): MukamRecord[] =>
	records
		.map((row) => {
			const data = row as { mukam_id?: number; mukam_name?: string };
			if (!data?.mukam_id) return null;
			return { mukam_id: Number(data.mukam_id), mukam_name: String(data.mukam_name ?? "") } satisfies MukamRecord;
		})
		.filter(Boolean) as MukamRecord[];

export const mapApprovedSalesOrders = (records: unknown[]): ApprovedSalesOrderRecord[] =>
	records
		.map((row) => {
			const data = row as ApprovedSalesOrderRecordRaw;
			const id = data?.sales_order_id ?? data?.id;
			if (!id) return null;
			return {
				id: String(id),
				salesOrderNo: data?.sales_order_no ?? String(id),
				salesOrderDate: data?.sales_order_date,
				partyId: data?.party_id,
				partyName: data?.party_name,
				paymentTerms: data?.payment_terms,
				invoiceType: data?.invoice_type,
				brokerId: data?.broker_id,
				billingToId: data?.billing_to_id,
				shippingToId: data?.shipping_to_id,
				transporterId: data?.transporter_id,
				buyerOrderNo: data?.buyer_order_no,
				buyerOrderDate: data?.buyer_order_date,
			} satisfies ApprovedSalesOrderRecord;
		})
		.filter(Boolean) as ApprovedSalesOrderRecord[];

export const buildMukamOptions = (mukams: MukamRecord[]): Option[] =>
	mukams.map((m) => ({ label: m.mukam_name, value: String(m.mukam_id) }));

export const mapBankDetailRecords = (records: unknown[]): BankDetailRecord[] =>
	records
		.map((row) => {
			const data = row as BankDetailRecordRaw;
			if (!data?.bank_detail_id) return null;
			return {
				id: String(data.bank_detail_id),
				bankName: data.bank_name ?? "",
				bankBranch: data.bank_branch,
				accNo: data.acc_no ?? "",
				ifscCode: data.ifsc_code ?? "",
			} satisfies BankDetailRecord;
		})
		.filter(Boolean) as BankDetailRecord[];

export const mapInvoiceSetupResponse = (response: unknown): InvoiceSetupData => {
	try {
		const result = response as InvoiceSetup1ResponseRaw;
		const additionalChargesRaw = (result as Record<string, unknown>)?.additional_charges_master;
		const additionalChargesMaster = Array.isArray(additionalChargesRaw)
			? additionalChargesRaw.map((c: Record<string, unknown>) => ({
				additional_charges_id: Number(c.additional_charges_id ?? 0),
				additional_charges_name: String(c.additional_charges_name ?? ""),
				default_value: c.default_value != null ? Number(c.default_value) : null,
			}))
			: [];
		const transportChargeRatesRaw = (result as Record<string, unknown>)?.transport_charge_rates;
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
			transporters: mapTransporterRecords(result?.transporters ?? []),
			brokers: mapBrokerRecords(result?.brokers ?? []),
			approvedDeliveryOrders: mapApprovedDeliveryOrders(result?.approved_delivery_orders ?? []),
			approvedSalesOrders: mapApprovedSalesOrders(result?.approved_sales_orders ?? []),
			itemGroups: mapItemGroupRecords(result?.item_groups ?? []),
			invoiceTypes: mapInvoiceTypeRecords(result?.invoice_types ?? []),
			mukamList: mapMukamRecords((result?.mukam_list as unknown[]) ?? []),
			branches: (result?.branches as InvoiceSetupData["branches"]) ?? [],
			bankDetails: mapBankDetailRecords((result?.bank_details as unknown[]) ?? []),
			company: result?.company ?? undefined,
			additionalChargesMaster,
			transportChargeRates,
		} satisfies InvoiceSetupData;
	} catch (error) {
		console.error("Failed to map invoice setup response", error);
		throw error;
	}
};

export const mapItemGroupDetailResponse = (response: unknown): ItemGroupCacheEntry => {
	const result = response as InvoiceSetup2ResponseRaw;

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

export const mapInvoiceDetailsToFormValues = (
	details: {
		branchId?: unknown;
		invoiceDate?: string;
		party?: unknown;
		partyBranch?: unknown;
		salesDeliveryOrderId?: unknown;
		billingTo?: unknown;
		shippingTo?: unknown;
		transporter?: unknown;
		vehicleNo?: string;
		ewayBillNo?: string;
		ewayBillDate?: string;
		challanNo?: string;
		challanDate?: string;
		invoiceType?: string;
		footerNote?: string;
		internalNote?: string;
		termsConditions?: string;
		grossAmount?: number;
		netAmount?: number;
		freightCharges?: number;
		roundOff?: number;
		dueDate?: string;
		typeOfSale?: string;
		taxId?: string;
		transporterAddress?: string;
		transporterStateCode?: string;
		transporterStateName?: string;
		containerNo?: string;
		contractNo?: string;
		contractDate?: string;
		consignmentNo?: string;
		consignmentDate?: string;
		paymentTerms?: number;
		salesOrderId?: number;
		salesOrderDate?: string;
		billingStateCode?: number;
		bankDetailId?: number;
		shippingStateCode?: string | number;
		intraInterState?: string | number;
		jute?: {
			mrNo?: string;
			mrId?: number;
			claimAmount?: number;
			otherReference?: string;
			unitConversion?: string;
			claimDescription?: string;
			mukamId?: number;
			mukamName?: string;
		} | null;
		govtskg?: {
			pcsoNo?: string;
			pcsoDate?: string;
			administrativeOfficeAddress?: string;
			destinationRailHead?: string;
			loadingPoint?: string;
			modeOfTransport?: string;
			packSheet?: number;
			netWeight?: number;
			totalWeight?: number;
		} | null;
		// New transporter fields (camelCase from API response)
		transporterBranchId?: number;
		transporterGstNo?: string;
		transporterDocNo?: string;
		transporterDocDate?: string;
		// New buyer order fields
		buyerOrderNo?: string;
		buyerOrderDate?: string;
		// New e-invoice fields
		irn?: string;
		ackNo?: string;
		ackDate?: string;
		qrCode?: string;
		// Submission history (read-only from response; API sends snake_case)
		e_invoice_submission_history?: unknown[];
		eInvoiceSubmissionHistory?: unknown[];
	},
	defaultValues: Record<string, unknown>,
): Record<string, unknown> => ({
	...defaultValues,
	branch: toStringValue(details.branchId ?? defaultValues.branch),
	date: normalizeDate(details.invoiceDate) || toStringValue(defaultValues.date),
	party: toStringValue(details.party ?? defaultValues.party),
	party_branch: toStringValue(details.partyBranch ?? defaultValues.party_branch),
	delivery_order: toStringValue(details.salesDeliveryOrderId ?? defaultValues.delivery_order),
	billing_to: toStringValue(details.billingTo ?? defaultValues.billing_to),
	shipping_to: toStringValue(details.shippingTo ?? defaultValues.shipping_to),
	transporter: toStringValue(details.transporter ?? defaultValues.transporter),
	vehicle_no: toStringValue(details.vehicleNo ?? defaultValues.vehicle_no),
	eway_bill_no: toStringValue(details.ewayBillNo ?? defaultValues.eway_bill_no),
	eway_bill_date: normalizeDate(details.ewayBillDate) || toStringValue(defaultValues.eway_bill_date),
	challan_no: toStringValue(details.challanNo ?? defaultValues.challan_no),
	challan_date: normalizeDate(details.challanDate) || toStringValue(defaultValues.challan_date),
	invoice_type: toStringValue(details.invoiceType ?? defaultValues.invoice_type),
	footer_note: toStringValue(details.footerNote ?? defaultValues.footer_note),
	internal_note: toStringValue(details.internalNote ?? defaultValues.internal_note),
	terms_conditions: toStringValue(details.termsConditions ?? defaultValues.terms_conditions),
	freight_charges: details.freightCharges != null ? String(details.freightCharges) : toStringValue(defaultValues.freight_charges),
	round_off: details.roundOff != null ? String(details.roundOff) : toStringValue(defaultValues.round_off),
	due_date: normalizeDate(details.dueDate) || toStringValue(defaultValues.due_date),
	type_of_sale: toStringValue(details.typeOfSale ?? defaultValues.type_of_sale),
	tax_id: toStringValue(details.taxId ?? defaultValues.tax_id),
	transporter_address: toStringValue(details.transporterAddress ?? defaultValues.transporter_address),
	transporter_state_code: toStringValue(details.transporterStateCode ?? defaultValues.transporter_state_code),
	transporter_state_name: toStringValue(details.transporterStateName ?? defaultValues.transporter_state_name),
	container_no: toStringValue(details.containerNo ?? defaultValues.container_no),
	contract_no: toStringValue(details.contractNo ?? defaultValues.contract_no),
	contract_date: normalizeDate(details.contractDate) || toStringValue(defaultValues.contract_date),
	consignment_no: toStringValue(details.consignmentNo ?? defaultValues.consignment_no),
	consignment_date: normalizeDate(details.consignmentDate) || toStringValue(defaultValues.consignment_date),
	payment_terms: details.paymentTerms != null ? String(details.paymentTerms) : toStringValue(defaultValues.payment_terms),
	sales_order_id: details.salesOrderId != null ? String(details.salesOrderId) : toStringValue(defaultValues.sales_order_id),
	sales_order_date: normalizeDate(details.salesOrderDate) || toStringValue(defaultValues.sales_order_date),
	billing_state_code: details.billingStateCode != null ? String(details.billingStateCode) : toStringValue(defaultValues.billing_state_code),
	bank_detail_id: details.bankDetailId != null ? String(details.bankDetailId) : toStringValue(defaultValues.bank_detail_id),
	shipping_state_code: details.shippingStateCode != null ? String(details.shippingStateCode) : toStringValue(defaultValues.shipping_state_code),
	intra_inter_state: details.intraInterState != null ? String(details.intraInterState) : toStringValue(defaultValues.intra_inter_state),
	jute_mr_no: toStringValue(details.jute?.mrNo ?? defaultValues.jute_mr_no),
	jute_claim_amount: details.jute?.claimAmount != null ? String(details.jute.claimAmount) : toStringValue(defaultValues.jute_claim_amount),
	jute_claim_description: toStringValue(details.jute?.claimDescription ?? defaultValues.jute_claim_description),
	jute_mukam_id: details.jute?.mukamId != null ? String(details.jute.mukamId) : toStringValue(defaultValues.jute_mukam_id),
	govtskg_pcso_no: toStringValue(details.govtskg?.pcsoNo ?? defaultValues.govtskg_pcso_no),
	govtskg_pcso_date: normalizeDate(details.govtskg?.pcsoDate) || toStringValue(defaultValues.govtskg_pcso_date),
	govtskg_admin_office_address: toStringValue(details.govtskg?.administrativeOfficeAddress ?? defaultValues.govtskg_admin_office_address),
	govtskg_destination_rail_head: toStringValue(details.govtskg?.destinationRailHead ?? defaultValues.govtskg_destination_rail_head),
	govtskg_loading_point: toStringValue(details.govtskg?.loadingPoint ?? defaultValues.govtskg_loading_point),
	govtskg_mode_of_transport: toStringValue(details.govtskg?.modeOfTransport ?? defaultValues.govtskg_mode_of_transport),
	govtskg_pack_sheet: details.govtskg?.packSheet != null ? String(details.govtskg.packSheet) : toStringValue(defaultValues.govtskg_pack_sheet),
	govtskg_net_weight: details.govtskg?.netWeight != null ? String(details.govtskg.netWeight) : toStringValue(defaultValues.govtskg_net_weight),
	govtskg_total_weight: details.govtskg?.totalWeight != null ? String(details.govtskg.totalWeight) : toStringValue(defaultValues.govtskg_total_weight),
	// New transporter fields — API sends camelCase
	transporter_branch_id: details.transporterBranchId ?? defaultValues.transporter_branch_id,
	transporter_gst_no: toStringValue(details.transporterGstNo ?? defaultValues.transporter_gst_no),
	transporter_doc_no: toStringValue(details.transporterDocNo ?? defaultValues.transporter_doc_no),
	transporter_doc_date: normalizeDate(details.transporterDocDate) || toStringValue(defaultValues.transporter_doc_date),
	// New buyer order fields
	buyer_order_no: toStringValue(details.buyerOrderNo ?? defaultValues.buyer_order_no),
	buyer_order_date: normalizeDate(details.buyerOrderDate) || toStringValue(defaultValues.buyer_order_date),
	// New e-invoice fields
	irn: toStringValue(details.irn ?? defaultValues.irn),
	ack_no: toStringValue(details.ackNo ?? defaultValues.ack_no),
	ack_date: normalizeDate(details.ackDate) || toStringValue(defaultValues.ack_date),
	qr_code: toStringValue(details.qrCode ?? defaultValues.qr_code),
	// Submission history (read-only from response; API sends snake_case)
	e_invoice_submission_history:
		details.e_invoice_submission_history ?? details.eInvoiceSubmissionHistory ?? defaultValues.e_invoice_submission_history,
});

export const mapFormValuesToApiPayload = (
	formValues: Record<string, unknown>,
	lineItems?: unknown[],
): any => {
	const payload: any = {
		// Basic fields
		branch: formValues.branch || null,
		invoice_date: formValues.date || null,
		party: formValues.party || null,
		party_branch: formValues.party_branch || null,
		delivery_order: formValues.delivery_order || null,
		billing_to: formValues.billing_to || null,
		shipping_to: formValues.shipping_to || null,
		transporter: formValues.transporter || null,
		vehicle_no: formValues.vehicle_no || null,
		eway_bill_no: formValues.eway_bill_no || null,
		eway_bill_date: formValues.eway_bill_date || null,
		challan_no: formValues.challan_no || null,
		challan_date: formValues.challan_date || null,
		invoice_type: formValues.invoice_type || null,
		footer_note: formValues.footer_note || null,
		internal_note: formValues.internal_note || null,
		terms_conditions: formValues.terms_conditions || null,
		freight_charges: formValues.freight_charges || null,
		round_off: formValues.round_off || null,
		due_date: formValues.due_date || null,
		type_of_sale: formValues.type_of_sale || null,
		tax_id: formValues.tax_id || null,
		transporter_address: formValues.transporter_address || null,
		transporter_state_code: formValues.transporter_state_code || null,
		transporter_state_name: formValues.transporter_state_name || null,
		container_no: formValues.container_no || null,
		contract_no: formValues.contract_no || null,
		contract_date: formValues.contract_date || null,
		consignment_no: formValues.consignment_no || null,
		consignment_date: formValues.consignment_date || null,
		payment_terms: formValues.payment_terms || null,
		sales_order_id: formValues.sales_order_id || null,
		sales_order_date: formValues.sales_order_date || null,
		billing_state_code: formValues.billing_state_code || null,
		bank_detail_id: formValues.bank_detail_id || null,
		shipping_state_code: formValues.shipping_state_code || null,
		intra_inter_state: formValues.intra_inter_state || null,
		// Jute fields
		jute_mr_no: formValues.jute_mr_no || null,
		jute_claim_amount: formValues.jute_claim_amount || null,
		jute_claim_description: formValues.jute_claim_description || null,
		jute_mukam_id: formValues.jute_mukam_id || null,
		// Govt Sacking fields
		govtskg_pcso_no: formValues.govtskg_pcso_no || null,
		govtskg_pcso_date: formValues.govtskg_pcso_date || null,
		govtskg_admin_office_address: formValues.govtskg_admin_office_address || null,
		govtskg_destination_rail_head: formValues.govtskg_destination_rail_head || null,
		govtskg_loading_point: formValues.govtskg_loading_point || null,
		govtskg_pack_sheet: formValues.govtskg_pack_sheet || null,
		govtskg_net_weight: formValues.govtskg_net_weight || null,
		govtskg_total_weight: formValues.govtskg_total_weight || null,
		// New transporter fields
		transporter_branch_id: formValues.transporter_branch_id || null,
		transporter_doc_no: formValues.transporter_doc_no || null,
		transporter_doc_date: formValues.transporter_doc_date || null,
		// New buyer order fields
		buyer_order_no: formValues.buyer_order_no || null,
		buyer_order_date: formValues.buyer_order_date || null,
		// New e-invoice fields
		irn: formValues.irn || null,
		ack_no: formValues.ack_no || null,
		ack_date: formValues.ack_date || null,
		qr_code: formValues.qr_code || null,
	};

	if (lineItems) {
		payload.line_items = lineItems;
	}

	return payload;
};
