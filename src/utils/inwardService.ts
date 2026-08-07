import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type InwardLine = {
	id: string;
	poDtlId?: string;
	poNo?: string;
	itemGroup?: string;
	item?: string;
	itemCode?: string;
	itemMake?: string;
	orderedQty?: number;
	receivedQty?: number;
	quantity?: number | string;
	uom?: string;
	remarks?: string;
	taxPercentage?: number;
	hsnCode?: string;
};

export type InwardDetails = {
	id: string;
	inwardNo?: string;
	inwardDate: string;
	branch: string;
	branchId?: string;
	supplier: string;
	supplierId?: string;
	challanNo?: string;
	challanDate?: string;
	invoiceNo?: string;
	invoiceDate?: string;
	invoiceRecvdDate?: string;
	vehicleNo?: string;
	driverName?: string;
	driverContactNo?: string;
	transporterName?: string;
	consignmentNo?: string;
	consignmentDate?: string;
	ewaybillno?: string;
	ewaybillDate?: string;
	despatchRemarks?: string;
	receiptsRemarks?: string;
	remarks?: string;
	updatedBy?: string;
	updatedAt?: string;
	inspection_check?: boolean | number | null;
	active?: boolean | number | null;
	statusId?: number | string | null;
	status?: string | null;
	lines: InwardLine[];
};

export type InwardSetup1Response = {
	branches?: Array<Record<string, unknown>>;
	suppliers?: Array<Record<string, unknown>>;
	item_groups?: Array<Record<string, unknown>>;
	co_config?: Record<string, unknown>;
};

export type InwardSetup2Response = {
	items?: Array<Record<string, unknown>>;
	makes?: Array<Record<string, unknown>>;
	uoms?: Array<Record<string, unknown>>;
};

export type ApprovedPO = {
	po_id: number;
	po_no: string;
	po_date: string;
	branch_id: number;
	branch_name: string;
	supplier_id: number;
	supplier_name: string;
};

export type ApprovedPOsResponse = {
	data: ApprovedPO[];
	total: number;
};

export type POLineItemsResponse = {
	po_id: number;
	line_items: Array<Record<string, unknown>>;
};

export type CreateInwardRequest = {
	branch: string;
	supplier: string;
	inward_date: string;
	challan_no?: string;
	challan_date?: string;
	invoice_no?: string;
	invoice_date?: string;
	vehicle_no?: string;
	transporter_name?: string;
	remarks?: string;
	items: Array<{
		po_dtl_id?: string;
		item?: string;
		quantity?: string | number;
		uom?: string;
		remarks?: string;
		hsn_code?: string;
	}>;
};

export type CreateInwardResponse = {
	message?: string;
	inward_id?: number | string;
	inwardId?: number | string;
	inward_no?: string;
};

export async function fetchInwardSetup1(params: { coId: string; branchId?: string }): Promise<InwardSetup1Response> {
	const query = new URLSearchParams({ co_id: params.coId });
	if (params.branchId) {
		query.set("branch_id", params.branchId);
	}

	const { data, error } = await fetchWithCookie<InwardSetup1Response>(
		`${apiRoutesPortalMasters.GET_INWARD_SETUP_1}?${query.toString()}`,
		"GET"
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty inward setup response.");
	}

	return data;
}

export async function fetchInwardSetup2(itemGroupId: string): Promise<InwardSetup2Response> {
	const query = new URLSearchParams({ item_group: itemGroupId });
	const { data, error } = await fetchWithCookie<InwardSetup2Response>(
		`${apiRoutesPortalMasters.GET_INWARD_SETUP_2}?${query.toString()}`,
		"GET"
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty item group setup response.");
	}

	return data;
}

export async function getApprovedPOsBySupplier(
	supplierId: string | number,
	branchId?: string | number
): Promise<ApprovedPOsResponse> {
	const query = new URLSearchParams({ supplier_id: String(supplierId) });
	if (branchId) {
		query.append("branch_id", String(branchId));
	}

	const { data, error } = await fetchWithCookie<ApprovedPOsResponse>(
		`${apiRoutesPortalMasters.GET_APPROVED_POS_BY_SUPPLIER}?${query.toString()}`,
		"GET"
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("No data returned from get_approved_pos_by_supplier");
	}

	return data;
}

export async function getPOLineItemsForInward(poId: string | number): Promise<POLineItemsResponse> {
	const query = new URLSearchParams({ po_id: String(poId) });
	const { data, error } = await fetchWithCookie<POLineItemsResponse>(
		`${apiRoutesPortalMasters.GET_PO_LINE_ITEMS_FOR_INWARD}?${query.toString()}`,
		"GET"
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty PO line items response.");
	}

	return data;
}

export async function createInward(payload: CreateInwardRequest): Promise<CreateInwardResponse> {
	const { data, error } = await fetchWithCookie<CreateInwardResponse>(
		apiRoutesPortalMasters.INWARD_CREATE,
		"POST",
		payload
	);

	if (error) {
		throw new Error(error);
	}

	return data ?? { message: "Inward created successfully." };
}

export async function cancelInward(inwardId: number | string): Promise<{ message?: string }> {
	const { data, error } = await fetchWithCookie<{ message?: string }>(
		apiRoutesPortalMasters.INWARD_CANCEL,
		"POST",
		{ inward_id: typeof inwardId === "string" ? Number(inwardId) : inwardId }
	);

	if (error) {
		throw new Error(error);
	}

	return data ?? { message: "Inward cancelled successfully." };
}

export async function getInwardById(id: string, coId?: string, menuId?: string): Promise<InwardDetails> {
	// Get co_id from localStorage if not provided
	let companyId = coId;
	if (!companyId && typeof window !== "undefined") {
		try {
			const storedCompany = localStorage.getItem("sidebar_selectedCompany");
			if (storedCompany) {
				const parsed = JSON.parse(storedCompany) as { co_id?: string | number } | null;
				if (parsed?.co_id) {
					companyId = typeof parsed.co_id === "string" ? parsed.co_id : String(parsed.co_id);
				}
			}
		} catch {
			// Ignore errors
		}
	}

	if (!companyId) {
		throw new Error("Company ID (co_id) is required to fetch inward details");
	}

	const query = new URLSearchParams({
		inward_id: id,
		co_id: companyId,
	});

	// Add menu_id if provided (needed for permission calculation)
	if (menuId) {
		query.set("menu_id", menuId);
	}

	const { data, error } = await fetchWithCookie<InwardDetails>(
		`${apiRoutesPortalMasters.GET_INWARD_BY_ID}?${query.toString()}`,
		"GET"
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from inward API");
	}

	return data;
}

export async function updateInward(payload: Partial<InwardDetails>): Promise<{ message: string; inward_id?: number }> {
	if (!payload.id) {
		throw new Error("Inward ID is required for update");
	}

	// Map frontend payload to backend format. line.id is the inward_dtl_id for
	// lines loaded from the DB (numeric); dialog-added lines have generated
	// non-numeric ids and are matched by po_dtl_id instead.
	const items = (payload.lines ?? []).map((line) => ({
		inward_dtl_id: line.id && /^\d+$/.test(line.id) ? line.id : undefined,
		po_dtl_id: line.poDtlId,
		item: line.item ?? "",
		quantity: line.quantity ?? 0,
		uom: line.uom ?? "",
		remarks: line.remarks ?? undefined,
		hsn_code: line.hsnCode || undefined,
	}));

	const updatePayload = {
		id: payload.id,
		branch: payload.branchId ?? payload.branch ?? "",
		supplier: payload.supplierId ?? payload.supplier ?? "",
		inward_date: payload.inwardDate ?? "",
		challan_no: payload.challanNo ?? undefined,
		challan_date: payload.challanDate ?? undefined,
		invoice_no: payload.invoiceNo ?? undefined,
		invoice_date: payload.invoiceDate ?? undefined,
		invoice_recvd_date: payload.invoiceRecvdDate ?? undefined,
		vehicle_no: payload.vehicleNo ?? undefined,
		driver_name: payload.driverName ?? undefined,
		driver_contact_no: payload.driverContactNo ?? undefined,
		consignment_no: payload.consignmentNo ?? undefined,
		consignment_date: payload.consignmentDate ?? undefined,
		ewaybillno: payload.ewaybillno ?? undefined,
		ewaybill_date: payload.ewaybillDate ?? undefined,
		despatch_remarks: payload.despatchRemarks ?? undefined,
		receipts_remarks: payload.receiptsRemarks ?? undefined,
		items: items,
	};

	const { data, error } = await fetchWithCookie<{ message: string; inward_id?: number }>(
		apiRoutesPortalMasters.INWARD_UPDATE,
		"PUT",
		updatePayload
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from update API");
	}

	return data;
}
