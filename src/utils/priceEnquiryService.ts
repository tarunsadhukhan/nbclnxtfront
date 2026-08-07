import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
	EnquirySetupData,
	EnquiryDetails,
	ComparisonResponseDetail,
	POPrefillData,
	IndentLineItemForEnquiry,
} from "@/app/dashboardportal/procurement/priceEnquiry/createEnquiry/types/enquiryTypes";
import {
	parseEnvelope,
	enquirySetupSchema,
	comparisonResponseDetailSchema,
	responseDetailSchema,
	poPrefillSchema,
	type ResponseDetail,
} from "@/app/dashboardportal/procurement/priceEnquiry/createEnquiry/utils/enquirySchemas";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export type EnquiryTableResponse = {
	data: Array<Record<string, unknown>>;
	totalCount?: number;
};

export type EnquiryCreateResponse = {
	message?: string;
	enquiry_id?: number | string;
};

export type EnquiryStatusChangeResponse = {
	status: string;
	new_status_id: number;
	new_approval_level?: number;
	message: string;
	enquiry_no?: number;
};

export type ApprovedIndentItemsResponse = {
	data: IndentLineItemForEnquiry[];
};

export type ComparisonResponse = {
	data: ComparisonResponseDetail[];
};

export type ResponseCreateResponse = {
	message?: string;
	response_id?: number | string;
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * Fetch setup data (branches, suppliers, expense types, projects) for
 * creating a new price enquiry.
 */
export async function fetchEnquirySetup(
	coId: string | number,
	branchId?: string | number,
): Promise<EnquirySetupData> {
	const query = new URLSearchParams({ co_id: String(coId) });
	if (branchId) {
		query.set("branch_id", String(branchId));
	}

	const { data, error } = await fetchWithCookie<EnquirySetupData>(
		`${apiRoutesPortalMasters.GET_ENQUIRY_SETUP}?${query.toString()}`,
		"GET",
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty enquiry setup response.");
	}

	return parseEnvelope(enquirySetupSchema, data, "enquiry setup") as EnquirySetupData;
}

// ---------------------------------------------------------------------------
// Table / List
// ---------------------------------------------------------------------------

/**
 * Fetch paginated list of price enquiries for the table view.
 * The backend scopes the list by `branch_ids` (comma-separated).
 */
export async function fetchEnquiryTable(params: {
	branch_ids: Array<string | number>;
	page?: number;
	page_size?: number;
	search?: string;
	status?: string;
}): Promise<EnquiryTableResponse> {
	const query = new URLSearchParams({ branch_ids: params.branch_ids.join(",") });
	if (params.page != null) query.set("page", String(params.page));
	if (params.page_size != null) query.set("page_size", String(params.page_size));
	if (params.search) query.set("search", params.search);
	if (params.status) query.set("status", params.status);

	const { data, error } = await fetchWithCookie<EnquiryTableResponse>(
		`${apiRoutesPortalMasters.ENQUIRY_TABLE}?${query.toString()}`,
		"GET",
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty enquiry table response.");
	}

	return data;
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

/**
 * Fetch a single enquiry by ID, including items, suppliers, and responses.
 *
 * Pass `menuId` whenever approval actions matter: the backend only computes
 * `approval_permissions` (canApprove / canReject / ...) when it receives a
 * menu_id, so omitting it hides the Approve/Reject buttons.
 */
export async function getEnquiryById(
	enquiryId: string | number,
	coId?: string | number | null,
	menuId?: string | number | null,
): Promise<EnquiryDetails> {
	const query = new URLSearchParams({ enquiry_id: String(enquiryId) });
	if (coId != null && String(coId).length > 0) {
		query.set("co_id", String(coId));
	}
	if (menuId != null && String(menuId).length > 0) {
		query.set("menu_id", String(menuId));
	}

	const { data, error } = await fetchWithCookie<EnquiryDetails>(
		`${apiRoutesPortalMasters.GET_ENQUIRY_BY_ID}?${query.toString()}`,
		"GET",
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty enquiry detail response.");
	}

	// The backend wraps the detail in a `{ data: {...} }` envelope while
	// `fetchWithCookie` returns the raw body, so unwrap it here. Callers read
	// fields (status_id, items, suppliers, ...) directly off the result.
	const inner =
		typeof data === "object" && data !== null && "data" in (data as Record<string, unknown>)
			? (data as Record<string, unknown>).data
			: data;

	return inner as EnquiryDetails;
}

// ---------------------------------------------------------------------------
// Approved Indent Items
// ---------------------------------------------------------------------------

/**
 * Fetch approved indent line items available for selection in an enquiry.
 */
export async function fetchApprovedIndentItems(
	branchId: string | number,
): Promise<ApprovedIndentItemsResponse> {
	const query = new URLSearchParams({ branch_id: String(branchId) });

	const { data, error } = await fetchWithCookie<ApprovedIndentItemsResponse>(
		`${apiRoutesPortalMasters.GET_APPROVED_INDENT_ITEMS_FOR_ENQUIRY}?${query.toString()}`,
		"GET",
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty approved indent items response.");
	}

	return data;
}

// ---------------------------------------------------------------------------
// Create / Update Enquiry
// ---------------------------------------------------------------------------

/**
 * Create a new price enquiry.
 */
export async function createEnquiry(payload: unknown): Promise<EnquiryCreateResponse> {
	const { data, error } = await fetchWithCookie<EnquiryCreateResponse>(
		apiRoutesPortalMasters.ENQUIRY_CREATE,
		"POST",
		payload,
	);

	if (error) {
		throw new Error(error);
	}

	return data ?? { message: "Enquiry created successfully." };
}

/**
 * Update an existing price enquiry.
 */
export async function updateEnquiry(payload: unknown): Promise<EnquiryCreateResponse> {
	const { data, error } = await fetchWithCookie<EnquiryCreateResponse>(
		apiRoutesPortalMasters.ENQUIRY_UPDATE,
		"PUT",
		payload,
	);

	if (error) {
		throw new Error(error);
	}

	return data ?? { message: "Enquiry updated successfully." };
}

// ---------------------------------------------------------------------------
// Supplier Response CRUD
// ---------------------------------------------------------------------------

/**
 * Add a new supplier response to an enquiry.
 */
export async function addEnquiryResponse(payload: unknown): Promise<ResponseCreateResponse> {
	const { data, error } = await fetchWithCookie<ResponseCreateResponse>(
		apiRoutesPortalMasters.ENQUIRY_ADD_RESPONSE,
		"POST",
		payload,
	);

	if (error) {
		throw new Error(error);
	}

	return data ?? { message: "Response added successfully." };
}

/**
 * Update an existing supplier response.
 */
export async function updateEnquiryResponse(payload: unknown): Promise<ResponseCreateResponse> {
	const { data, error } = await fetchWithCookie<ResponseCreateResponse>(
		apiRoutesPortalMasters.ENQUIRY_UPDATE_RESPONSE,
		"PUT",
		payload,
	);

	if (error) {
		throw new Error(error);
	}

	return data ?? { message: "Response updated successfully." };
}

/**
 * Fetch a single supplier response (header + lines) for the view/edit page.
 */
export async function getResponseById(
	responseId: string | number,
): Promise<ResponseDetail> {
	const query = new URLSearchParams({ response_id: String(responseId) });

	const { data, error } = await fetchWithCookie<unknown>(
		`${apiRoutesPortalMasters.ENQUIRY_GET_RESPONSE_BY_ID}?${query.toString()}`,
		"GET",
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response detail.");
	}

	return parseEnvelope(responseDetailSchema, data, "response detail");
}

// ---------------------------------------------------------------------------
// Response Comparison & Selection
// ---------------------------------------------------------------------------

/**
 * Fetch all supplier responses for a given enquiry, suitable for
 * side-by-side comparison.
 */
export async function getResponsesForComparison(
	enquiryId: string | number,
): Promise<ComparisonResponse> {
	const query = new URLSearchParams({ enquiry_id: String(enquiryId) });

	const { data, error } = await fetchWithCookie<ComparisonResponse>(
		`${apiRoutesPortalMasters.ENQUIRY_GET_COMPARISON}?${query.toString()}`,
		"GET",
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty comparison response.");
	}

	const responses = parseEnvelope(
		z.array(comparisonResponseDetailSchema),
		data,
		"comparison",
	) as ComparisonResponseDetail[];
	return { data: responses };
}

/**
 * Mark a specific supplier response as selected for PO creation.
 */
export async function selectEnquiryResponse(
	responseId: string | number,
	enquiryId: string | number,
): Promise<EnquiryStatusChangeResponse> {
	const payload = {
		response_id: String(responseId),
		enquiry_id: String(enquiryId),
	};

	const { data, error } = await fetchWithCookie<EnquiryStatusChangeResponse>(
		apiRoutesPortalMasters.ENQUIRY_SELECT_RESPONSE,
		"POST",
		payload,
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from select response API.");
	}

	return data;
}

// ---------------------------------------------------------------------------
// PO Prefill from Selected Response
// ---------------------------------------------------------------------------

/**
 * Get prefilled PO data from a selected enquiry response.
 */
export async function getPOPrefillData(
	responseId: string | number,
): Promise<POPrefillData> {
	const query = new URLSearchParams({ response_id: String(responseId) });

	const { data, error } = await fetchWithCookie<POPrefillData>(
		`${apiRoutesPortalMasters.ENQUIRY_GET_PO_PREFILL}?${query.toString()}`,
		"GET",
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty PO prefill response.");
	}

	return parseEnvelope(poPrefillSchema, data, "PO prefill") as POPrefillData;
}

// ---------------------------------------------------------------------------
// Approval Workflow
// ---------------------------------------------------------------------------

/**
 * Workflow endpoints wrap their result in the standard `{ data: {...} }`
 * envelope; unwrap it so callers read status fields directly.
 */
function unwrapStatusChange(body: unknown): EnquiryStatusChangeResponse {
	const inner =
		body && typeof body === "object" && "data" in (body as Record<string, unknown>)
			? (body as Record<string, unknown>).data
			: body;
	return inner as EnquiryStatusChangeResponse;
}

/**
 * Send an enquiry for approval.
 */
export async function sendEnquiryForApproval(
	enquiryId: string | number,
	menuId: string | number,
): Promise<EnquiryStatusChangeResponse> {
	const payload = {
		enquiry_id: String(enquiryId),
		menu_id: String(menuId),
	};

	const { data, error } = await fetchWithCookie<EnquiryStatusChangeResponse>(
		apiRoutesPortalMasters.ENQUIRY_SEND_FOR_APPROVAL,
		"POST",
		payload,
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from send for approval API.");
	}

	return unwrapStatusChange(data);
}

/**
 * Approve an enquiry at the current approval level.
 */
export async function approveEnquiry(
	enquiryId: string | number,
	menuId: string | number,
): Promise<EnquiryStatusChangeResponse> {
	const payload = {
		enquiry_id: String(enquiryId),
		menu_id: String(menuId),
	};

	const { data, error } = await fetchWithCookie<EnquiryStatusChangeResponse>(
		apiRoutesPortalMasters.ENQUIRY_APPROVE,
		"POST",
		payload,
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from approve enquiry API.");
	}

	return unwrapStatusChange(data);
}

/**
 * Reject an enquiry with an optional reason.
 */
export async function rejectEnquiry(
	enquiryId: string | number,
	menuId: string | number,
	reason?: string,
): Promise<EnquiryStatusChangeResponse> {
	const payload: Record<string, string> = {
		enquiry_id: String(enquiryId),
		menu_id: String(menuId),
	};
	if (reason) {
		payload.reason = reason;
	}

	const { data, error } = await fetchWithCookie<EnquiryStatusChangeResponse>(
		apiRoutesPortalMasters.ENQUIRY_REJECT,
		"POST",
		payload,
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from reject enquiry API.");
	}

	return unwrapStatusChange(data);
}

/**
 * Cancel a Draft or Open enquiry (-> Cancelled).
 */
export async function cancelEnquiry(
	enquiryId: string | number,
): Promise<EnquiryStatusChangeResponse> {
	const { data, error } = await fetchWithCookie<EnquiryStatusChangeResponse>(
		apiRoutesPortalMasters.ENQUIRY_CANCEL,
		"POST",
		{ enquiry_id: String(enquiryId) },
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from cancel enquiry API.");
	}

	return unwrapStatusChange(data);
}

/**
 * Record that the RFQ document was issued to suppliers (all invited
 * suppliers, or the subset in `supplierIds`).
 */
export async function markRfqSent(
	enquiryId: string | number,
	supplierIds?: Array<string | number>,
): Promise<void> {
	const payload: Record<string, unknown> = { enquiry_id: String(enquiryId) };
	if (supplierIds && supplierIds.length > 0) {
		payload.supplier_ids = supplierIds.map(String);
	}

	const { error } = await fetchWithCookie(
		apiRoutesPortalMasters.ENQUIRY_MARK_RFQ_SENT,
		"POST",
		payload,
	);

	if (error) {
		throw new Error(error);
	}
}

/**
 * Reopen a Cancelled or Rejected enquiry back to Draft.
 */
export async function reopenEnquiry(
	enquiryId: string | number,
): Promise<EnquiryStatusChangeResponse> {
	const { data, error } = await fetchWithCookie<EnquiryStatusChangeResponse>(
		apiRoutesPortalMasters.ENQUIRY_REOPEN,
		"POST",
		{ enquiry_id: String(enquiryId) },
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from reopen enquiry API.");
	}

	return unwrapStatusChange(data);
}
