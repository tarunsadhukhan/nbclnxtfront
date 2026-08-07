/**
 * Centralized URL builders for Price Enquiry navigation.
 *
 * The enquiry detail page (createEnquiry in view mode) is the "hub" — all
 * leaf pages (response, compare) link back to it. Keeping URL construction in
 * one place ensures `menu_id` is consistently forwarded and query params stay
 * aligned across pages.
 */

const BASE = "/dashboardportal/procurement/priceEnquiry";
const PO_BASE = "/dashboardportal/procurement/purchaseOrder";

const appendMenu = (params: URLSearchParams, menuId?: string | number | null) => {
	if (menuId != null && String(menuId).length > 0) {
		params.set("menu_id", String(menuId));
	}
};

const build = (path: string, params: URLSearchParams) => {
	const qs = params.toString();
	return qs ? `${path}?${qs}` : path;
};

/** Price enquiry list / index page. */
export const indexUrl = (menuId?: string | number | null) => {
	const params = new URLSearchParams();
	appendMenu(params, menuId);
	return build(BASE, params);
};

/** Fresh create form. */
export const createUrl = (menuId?: string | number | null) => {
	const params = new URLSearchParams();
	appendMenu(params, menuId);
	return build(`${BASE}/createEnquiry`, params);
};

/** Edit an existing draft enquiry. */
export const editUrl = (enquiryId: string | number, menuId?: string | number | null) => {
	const params = new URLSearchParams({ mode: "edit", id: String(enquiryId) });
	appendMenu(params, menuId);
	return build(`${BASE}/createEnquiry`, params);
};

/**
 * Hub URL: view mode of an enquiry. All leaf pages (response, compare) should
 * return here on back/save when possible.
 */
export const hubUrl = (enquiryId: string | number, menuId?: string | number | null) => {
	const params = new URLSearchParams({ mode: "view", id: String(enquiryId) });
	appendMenu(params, menuId);
	return build(`${BASE}/createEnquiry`, params);
};

/** Record a new response for a supplier against an enquiry. */
export const createResponseUrl = (
	enquiryId: string | number,
	supplierId?: string | number | null,
	menuId?: string | number | null,
) => {
	const params = new URLSearchParams({
		enquiry_id: String(enquiryId),
		mode: "create",
	});
	if (supplierId != null && String(supplierId).length > 0) {
		params.set("supplier_id", String(supplierId));
	}
	appendMenu(params, menuId);
	return build(`${BASE}/response`, params);
};

/** Edit an existing response. */
export const editResponseUrl = (
	enquiryId: string | number,
	responseId: string | number,
	menuId?: string | number | null,
) => {
	const params = new URLSearchParams({
		enquiry_id: String(enquiryId),
		response_id: String(responseId),
		mode: "edit",
	});
	appendMenu(params, menuId);
	return build(`${BASE}/response`, params);
};

/** View an existing response (read-only). */
export const viewResponseUrl = (
	enquiryId: string | number,
	responseId: string | number,
	menuId?: string | number | null,
) => {
	const params = new URLSearchParams({
		enquiry_id: String(enquiryId),
		response_id: String(responseId),
		mode: "view",
	});
	appendMenu(params, menuId);
	return build(`${BASE}/response`, params);
};

/** Compare responses for an enquiry. */
export const compareUrl = (
	enquiryId: string | number,
	menuId?: string | number | null,
) => {
	const params = new URLSearchParams({ enquiry_id: String(enquiryId) });
	appendMenu(params, menuId);
	return build(`${BASE}/compare`, params);
};

/** Create PO prefilled from a selected response. */
export const createPoFromResponseUrl = (
	enquiryId: string | number,
	responseId: string | number,
	menuId?: string | number | null,
) => {
	const params = new URLSearchParams({
		mode: "create",
		from_enquiry: "1",
		enquiry_id: String(enquiryId),
		response_id: String(responseId),
	});
	appendMenu(params, menuId);
	return build(`${PO_BASE}/createPO`, params);
};
