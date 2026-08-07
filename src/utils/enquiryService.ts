/**
 * Sales Enquiry service — AMCL enquiry flow Phase 1.
 *
 * Wraps the /api/salesEnquiry + /api/isoMenuMap endpoints. All calls go
 * through fetchWithCookie; components must never call the API directly.
 */
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// ---------------------------------------------------------------------------
// Types (single source for the enquiry module — design §7)
// ---------------------------------------------------------------------------

export type EnquiryStage = {
	stage_id: number;
	stage_code: string;
	stage_name: string;
	dept_hint?: string | null;
	sequence_no: number;
	is_terminal?: number;
};

export type EnquiryListRow = {
	sales_enquiry_id: number;
	enquiry_no: string | null;
	enquiry_date: string;
	party_id?: number | null;
	party_name?: string | null;
	branch_id?: number | null;
	branch_name?: string | null;
	received_via?: string | null;
	customer_ref_no?: string | null;
	expected_delivery_date?: string | null;
	current_stage_id?: number | null;
	stage_code?: string | null;
	stage_name?: string | null;
	dept_hint?: string | null;
	days_in_stage?: number | null;
	hold_flag?: number | null;
	status_id?: number | null;
	status?: string | null;
	close_reason?: string | null;
	project_id?: number | null;
};

export type EnquiryLine = {
	enquiry_dtl_id?: number;
	item_id?: number | null;
	item_code?: string | null;
	item_name?: string | null;
	item_desc_freetext?: string | null;
	is_new_item?: number;
	design_change?: number;
	qty?: number | null;
	uom_id?: number | null;
	uom_name?: string | null;
	target_price?: number | null;
	bom_hdr_id?: number | null;
	cost_snapshot_id?: number | null;
	confirmed_cost_per_unit?: number | null;
	overhead_pct?: number | null;
	margin_pct?: number | null;
	sell_price_per_unit?: number | null;
	costing_confirmed_by?: number | null;
	costing_confirmed_date?: string | null;
	remarks?: string | null;
};

export type EnquiryTimelineEntry = {
	stage_log_id: number;
	from_stage_id?: number | null;
	from_stage_name?: string | null;
	to_stage_id?: number | null;
	to_stage_name?: string | null;
	action: string;
	feedback?: string | null;
	linked_doc_type?: string | null;
	linked_doc_id?: number | null;
	action_by?: number | null;
	action_by_name?: string | null;
	action_date_time?: string | null;
};

export type EnquiryLinkedDoc = {
	doc_type: string;
	doc_id: number;
	doc_no?: string | number | null;
	doc_date?: string | null;
	status_id?: number | null;
	status_name?: string | null;
};

export type EnquiryPermissions = {
	canSave?: boolean;
	canOpen?: boolean;
	canCancelDraft?: boolean;
	canReopen?: boolean;
	canSendForApproval?: boolean;
	canApprove?: boolean;
	canReject?: boolean;
	canViewApprovalLog?: boolean;
};

export type EnquiryDetail = EnquiryListRow & {
	status_name?: string | null;
	contact_person?: string | null;
	contact_detail?: string | null;
	enquiry_desc?: string | null;
	internal_note?: string | null;
	lost_remarks?: string | null;
	approval_level?: number | null;
	lines: EnquiryLine[];
	timeline: EnquiryTimelineEntry[];
	linked_docs: EnquiryLinkedDoc[];
	permissions?: EnquiryPermissions;
};

export type EnquirySetup = {
	customers: Array<{ party_id: number; party_name: string }>;
	uoms: Array<{ uom_id: number; uom_name: string }>;
	items: Array<{ item_id: number; item_code?: string; item_name: string; item_grp_id?: number; item_grp_name?: string }>;
	stages: EnquiryStage[];
	received_via_options: string[];
	iso_doc_no?: string | null;
};

export type EnquiryBoardStage = EnquiryStage & {
	enquiry_count?: number;
	enquiries: Array<EnquiryListRow & { quotation_count?: number; sales_order_count?: number; latest_feedback?: string | null; costed_line_count?: number; line_count?: number }>;
};

export type EnquiryLinePayload = {
	item_id?: number | null;
	item_desc_freetext?: string | null;
	is_new_item?: number;
	design_change?: number;
	qty?: number | null;
	uom_id?: number | null;
	target_price?: number | null;
	remarks?: string | null;
};

export type EnquiryHeaderPayload = {
	sales_enquiry_id?: number;
	enquiry_date: string;
	received_via?: string | null;
	branch_id: number;
	party_id?: number | null;
	contact_person?: string | null;
	contact_detail?: string | null;
	customer_ref_no?: string | null;
	expected_delivery_date?: string | null;
	enquiry_desc?: string | null;
	internal_note?: string | null;
	lines: EnquiryLinePayload[];
};

export type PriceCheckRow = {
	price_check_id: number;
	sales_enquiry_id: number;
	enquiry_no?: string | null;
	party_name?: string | null;
	request_note?: string | null;
	pc_status: string;
	requested_by?: number | null;
	requested_by_name?: string | null;
	requested_date_time?: string | null;
	response_note?: string | null;
};

export type PriceCheckDtl = {
	price_check_dtl_id: number;
	enquiry_dtl_id?: number | null;
	item_id: number;
	item_code?: string | null;
	item_name?: string | null;
	last_po_rate?: number | null;
	last_po_date?: string | null;
	last_supplier_id?: number | null;
	last_supplier_name?: string | null;
	confirmed_rate?: number | null;
	rate_source?: string | null;
	supplier_id?: number | null;
	remarks?: string | null;
};

type ApiResult<T> = { data: T | null; error: string | null };

const asError = (error: unknown, fallback: string): string =>
	error instanceof Error ? error.message : typeof error === "string" && error ? error : fallback;

async function getJson<T>(url: string, fallback: string): Promise<ApiResult<T>> {
	try {
		const { data, error } = await fetchWithCookie(url, "GET");
		if (error) return { data: null, error };
		return { data: data as T, error: null };
	} catch (err) {
		return { data: null, error: asError(err, fallback) };
	}
}

async function postJson<T>(url: string, method: "POST" | "PUT", body: unknown, fallback: string): Promise<ApiResult<T>> {
	try {
		const { data, error } = await fetchWithCookie(url, method, body as Record<string, unknown>);
		if (error) return { data: null, error };
		return { data: data as T, error: null };
	} catch (err) {
		return { data: null, error: asError(err, fallback) };
	}
}

// ---------------------------------------------------------------------------
// Enquiry
// ---------------------------------------------------------------------------

export async function fetchEnquiryTable(params: {
	co_id: string | number;
	branch_id?: string | number | null;
	page?: number;
	limit?: number;
	search?: string;
	stage_code?: string;
	status_id?: string | number;
}) {
	const query = new URLSearchParams({ co_id: String(params.co_id) });
	if (params.branch_id) query.set("branch_id", String(params.branch_id));
	if (params.page) query.set("page", String(params.page));
	if (params.limit) query.set("limit", String(params.limit));
	if (params.search) query.set("search", params.search);
	if (params.stage_code) query.set("stage_code", params.stage_code);
	if (params.status_id) query.set("status_id", String(params.status_id));
	return getJson<{ data: EnquiryListRow[]; total: number }>(
		`${apiRoutesPortalMasters.SALES_ENQUIRY_TABLE}?${query.toString()}`,
		"Failed to load enquiries"
	);
}

export async function fetchEnquiryBoard(co_id: string | number, branch_id?: string | number | null) {
	const query = new URLSearchParams({ co_id: String(co_id) });
	if (branch_id) query.set("branch_id", String(branch_id));
	return getJson<{ data: { stages: EnquiryBoardStage[] } }>(
		`${apiRoutesPortalMasters.SALES_ENQUIRY_BOARD}?${query.toString()}`,
		"Failed to load enquiry board"
	);
}

export async function fetchEnquirySetup(co_id: string | number, menu_id?: string | number | null) {
	const query = new URLSearchParams({ co_id: String(co_id) });
	if (menu_id) query.set("menu_id", String(menu_id));
	return getJson<{ data: EnquirySetup }>(
		`${apiRoutesPortalMasters.SALES_ENQUIRY_SETUP}?${query.toString()}`,
		"Failed to load enquiry setup"
	);
}

export async function fetchEnquiryById(sales_enquiry_id: string | number, co_id: string | number, menu_id?: string | number | null) {
	const query = new URLSearchParams({ sales_enquiry_id: String(sales_enquiry_id), co_id: String(co_id) });
	if (menu_id) query.set("menu_id", String(menu_id));
	return getJson<{ data: EnquiryDetail }>(
		`${apiRoutesPortalMasters.SALES_ENQUIRY_BY_ID}?${query.toString()}`,
		"Failed to load enquiry"
	);
}

export async function createEnquiry(payload: EnquiryHeaderPayload) {
	return postJson<{ message: string; data: { sales_enquiry_id: number } }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_CREATE, "POST", payload, "Failed to create enquiry"
	);
}

export async function updateEnquiry(payload: EnquiryHeaderPayload) {
	return postJson<{ message: string; data: { sales_enquiry_id: number } }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_UPDATE, "PUT", payload, "Failed to update enquiry"
	);
}

export async function openEnquiry(sales_enquiry_id: number, branch_id: number) {
	return postJson<{ status: string; message?: string }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_OPEN, "POST", { sales_enquiry_id, branch_id }, "Failed to open enquiry"
	);
}

export async function cancelDraftEnquiry(sales_enquiry_id: number) {
	return postJson<{ status: string; message?: string }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_CANCEL_DRAFT, "POST", { sales_enquiry_id }, "Failed to cancel enquiry"
	);
}

export async function sendEnquiryForApproval(sales_enquiry_id: number, menu_id: string | number) {
	return postJson<{ status: string; message?: string }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_SEND_FOR_APPROVAL, "POST", { sales_enquiry_id, menu_id }, "Failed to send for approval"
	);
}

export async function approveEnquiry(sales_enquiry_id: number, menu_id: string | number) {
	return postJson<{ status: string; message?: string; new_status_id?: number }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_APPROVE, "POST", { sales_enquiry_id, menu_id }, "Failed to approve enquiry"
	);
}

export async function rejectEnquiry(sales_enquiry_id: number, menu_id: string | number, reason: string) {
	return postJson<{ status: string; message?: string }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_REJECT, "POST", { sales_enquiry_id, menu_id, reason }, "Failed to reject enquiry"
	);
}

export async function reopenEnquiry(sales_enquiry_id: number) {
	return postJson<{ status: string; message?: string }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_REOPEN, "POST", { sales_enquiry_id }, "Failed to reopen enquiry"
	);
}

export type MoveStageAction = "FORWARD" | "SEND_BACK" | "HOLD" | "RESUME" | "MARK_LOST";

export async function moveEnquiryStage(payload: {
	sales_enquiry_id: number;
	action: MoveStageAction;
	to_stage_code?: string | null;
	feedback?: string | null;
	lost_remarks?: string | null;
}) {
	return postJson<{ status: string; message?: string }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_MOVE_STAGE, "POST", payload, "Failed to move stage"
	);
}

export async function closeEnquiry(sales_enquiry_id: number, close_reason: "won" | "lost" | "cancelled", remarks?: string) {
	return postJson<{ status: string; message?: string }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_CLOSE, "POST", { sales_enquiry_id, close_reason, remarks }, "Failed to close enquiry"
	);
}

export async function confirmLineCosting(
	enquiry_dtl_id: number,
	bom_hdr_id: number,
	overhead_pct?: number | null,
	margin_pct?: number | null,
) {
	return postJson<{ status: string; message?: string; data?: Record<string, unknown> }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_CONFIRM_LINE_COSTING,
		"POST",
		{ enquiry_dtl_id, bom_hdr_id, overhead_pct: overhead_pct ?? null, margin_pct: margin_pct ?? null },
		"Failed to confirm costing"
	);
}

// ---------------------------------------------------------------------------
// Price check
// ---------------------------------------------------------------------------

export async function createPriceCheck(payload: {
	sales_enquiry_id: number;
	request_note?: string | null;
	items?: Array<{ enquiry_dtl_id?: number | null; item_id?: number | null; remarks?: string | null }>;
}) {
	return postJson<{ status: string; message?: string; price_check_id?: number }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_PRICE_CHECK_CREATE, "POST", payload, "Failed to raise price check"
	);
}

export async function fetchPriceCheckPending(co_id: string | number, branch_id?: string | number | null) {
	const query = new URLSearchParams({ co_id: String(co_id) });
	if (branch_id) query.set("branch_id", String(branch_id));
	return getJson<{ data: PriceCheckRow[] }>(
		`${apiRoutesPortalMasters.SALES_ENQUIRY_PRICE_CHECK_PENDING}?${query.toString()}`,
		"Failed to load price checks"
	);
}

export async function fetchPriceCheckById(price_check_id: string | number) {
	const query = new URLSearchParams({ price_check_id: String(price_check_id) });
	return getJson<{ data: PriceCheckRow & { lines: PriceCheckDtl[] } }>(
		`${apiRoutesPortalMasters.SALES_ENQUIRY_PRICE_CHECK_BY_ID}?${query.toString()}`,
		"Failed to load price check"
	);
}

export async function respondPriceCheck(payload: {
	price_check_id: number;
	response_note?: string | null;
	items: Array<{
		price_check_dtl_id: number;
		confirmed_rate?: number | null;
		rate_source?: string | null;
		supplier_id?: number | null;
		remarks?: string | null;
	}>;
}) {
	return postJson<{ status: string; message?: string }>(
		apiRoutesPortalMasters.SALES_ENQUIRY_PRICE_CHECK_RESPOND, "POST", payload, "Failed to respond to price check"
	);
}

// ---------------------------------------------------------------------------
// Enquiry lines for quotation / direct sales order prefill
// ---------------------------------------------------------------------------

export type EnquirySourceLine = {
	enquiry_dtl_id: number;
	sales_enquiry_id: number;
	item_id?: number | null;
	item_code?: string | null;
	item_name?: string | null;
	item_grp_id?: number | null;
	hsn_code?: string | null;
	item_desc_freetext?: string | null;
	is_new_item?: number;
	qty?: number | null;
	uom_id?: number | null;
	uom_name?: string | null;
	target_price?: number | null;
	cost_snapshot_id?: number | null;
	confirmed_cost_per_unit?: number | null;
	overhead_pct?: number | null;
	margin_pct?: number | null;
	remarks?: string | null;
};

export async function fetchEnquiryLinesForQuotation(sales_enquiry_id: string | number) {
	const query = new URLSearchParams({ sales_enquiry_id: String(sales_enquiry_id) });
	return getJson<{ data: EnquirySourceLine[]; master?: { enquiry?: Record<string, unknown> } }>(
		`${apiRoutesPortalMasters.QUOTATION_ENQUIRY_LINES}?${query.toString()}`,
		"Failed to load enquiry lines"
	);
}

export async function fetchEnquiryLinesForSalesOrder(sales_enquiry_id: string | number) {
	const query = new URLSearchParams({ sales_enquiry_id: String(sales_enquiry_id) });
	return getJson<{ data: EnquirySourceLine[]; master?: { enquiry?: Record<string, unknown> } }>(
		`${apiRoutesPortalMasters.SALES_ORDER_ENQUIRY_LINES}?${query.toString()}`,
		"Failed to load enquiry lines"
	);
}
