import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/** Nested GST breakup as returned by get_quotation_by_id (camelCase). */
export type QuotationLineGst = {
  igstAmount?: number | null;
  igstPercent?: number | null;
  cgstAmount?: number | null;
  cgstPercent?: number | null;
  sgstAmount?: number | null;
  sgstPercent?: number | null;
  gstTotal?: number | null;
};

export type QuotationLine = {
  id: string;
  itemGroup?: string;
  item?: string;
  itemCode?: string;
  itemName?: string;
  itemMake?: string;
  hsnCode?: string;
  quantity?: number | string;
  rate?: number | string;
  uom?: string;
  uomName?: string;
  /** Backend key is `discountType`; older callers used `discountMode`. */
  discountType?: number;
  discountMode?: number;
  discountValue?: number | string;
  discountedRate?: number | null;
  discountAmount?: number;
  netAmount?: number;
  totalAmount?: number;
  remarks?: string;
  /** Backend returns the GST breakup nested under `gst`. */
  gst?: QuotationLineGst | null;
  // Legacy flat fields (never emitted by the current backend — kept for back-compat).
  taxPercentage?: number;
  igst?: number;
  sgst?: number;
  cgst?: number;
  /** Enquiry-flow cost basis (AMCL Phase 1) — present when the line came from an enquiry. */
  enquiryDtlId?: string | null;
  costSnapshotId?: string | null;
  baseCost?: number | null;
  overheadPct?: number | null;
  marginPct?: number | null;
};

export type ApprovalActionPermissions = {
  canApprove?: boolean;
  canReject?: boolean;
  canOpen?: boolean;
  canSendForApproval?: boolean;
  canCancelDraft?: boolean;
  canReopen?: boolean;
  canViewApprovalLog?: boolean;
  canClone?: boolean;
  canSave?: boolean;
};

export type QuotationDetails = {
  id: string;
  quotationNo: string;
  quotationDate: string;
  branch: string;
  /** Backend key is `party`; kept `customer` alias for older callers. */
  party?: string;
  customer: string;
  broker: string;
  billingAddress: string;
  shippingAddress: string;
  /** State name for the customer billing address (used for GST type determination). */
  billingAddressState?: string;
  /** State name for the customer shipping address. */
  shippingAddressState?: string;
  /** State name for the company's selected branch (shipping-from state). */
  branchStateName?: string;
  brokeragePercentage?: number | null;
  paymentTerms?: string;
  deliveryTerms?: string;
  deliveryDays?: number | null;
  /** Backend key is `quotationExpiryDate`; kept `expiryDate` alias for older callers. */
  quotationExpiryDate?: string;
  expiryDate?: string;
  footerNotes?: string;
  internalNote?: string;
  termsCondition?: string;
  grossAmount?: number;
  netAmount?: number;
  roundOffValue?: number;
  status?: string;
  statusId?: 1 | 3 | 4 | 5 | 6 | 20 | 21;
  approvalLevel?: number | null;
  maxApprovalLevel?: number | null;
  updatedBy?: string;
  updatedAt?: string;
  permissions?: ApprovalActionPermissions;
  /** Source enquiry (AMCL enquiry flow) — set when the quotation was made against an enquiry. */
  salesEnquiryId?: string | null;
  enquiryNo?: string | null;
  lines: QuotationLine[];
};

export type QuotationSetup1Response = {
  branches?: Array<Record<string, unknown>>;
  customers?: Array<Record<string, unknown>>;
  customer_branches?: Array<Record<string, unknown>>;
  brokers?: Array<Record<string, unknown>>;
  item_groups?: Array<Record<string, unknown>>;
  co_config?: Record<string, unknown>;
  branch_addresses?: Array<Record<string, unknown>>;
};

export type QuotationSetup2Response = {
  items?: Array<Record<string, unknown>>;
  makes?: Array<Record<string, unknown>>;
  uoms?: Array<Record<string, unknown>>;
};

export type CreateQuotationRequest = {
  branch_id: number | string;
  quotation_date: string;
  party_id?: number | string | null;
  sales_broker_id?: number | string | null;
  billing_address_id?: number | string | null;
  shipping_address_id?: number | string | null;
  brokerage_percentage?: number | null;
  payment_terms?: string;
  delivery_terms?: string;
  delivery_days?: number | null;
  quotation_expiry_date?: string | null;
  footer_notes?: string;
  internal_note?: string;
  terms_condition?: string;
  sales_enquiry_id?: number | string | null;
  items: Array<{
    item_id: number | string;
    item_make_id?: number | string | null;
    hsn_code?: string;
    quantity: number | string;
    uom_id: number | string;
    rate: number | string;
    discount_type?: number;
    discounted_rate?: number;
    discount_amount?: number;
    net_amount?: number;
    total_amount?: number;
    remarks?: string;
    enquiry_dtl_id?: number | string | null;
    cost_snapshot_id?: number | string | null;
    base_cost?: number | null;
    overhead_pct?: number | null;
    margin_pct?: number | null;
    gst?: {
      igst_amount?: number;
      igst_percent?: number;
      cgst_amount?: number;
      cgst_percent?: number;
      sgst_amount?: number;
      sgst_percent?: number;
      gst_total?: number;
    };
  }>;
};

export type UpdateQuotationRequest = CreateQuotationRequest & {
  sales_quotation_id: number | string;
};

export type StatusChangeResponse = {
  status: string;
  new_status_id: number;
  new_approval_level?: number;
  message: string;
  quotation_no?: string;
};

export async function fetchQuotationSetup1(params: {
  coId: string;
  branchId?: string;
}): Promise<QuotationSetup1Response> {
  const query = new URLSearchParams({ co_id: params.coId });
  if (params.branchId) {
    query.set("branch_id", params.branchId);
  }

  const { data, error } = await fetchWithCookie<QuotationSetup1Response>(
    `${apiRoutesPortalMasters.QUOTATION_SETUP_1}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty quotation setup response.");
  }

  return data;
}

export async function fetchQuotationSetup2(itemGroupId: string): Promise<QuotationSetup2Response> {
  const query = new URLSearchParams({ item_group: itemGroupId });
  const { data, error } = await fetchWithCookie<QuotationSetup2Response>(
    `${apiRoutesPortalMasters.QUOTATION_SETUP_2}?${query.toString()}`,
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

export async function createQuotation(
  payload: CreateQuotationRequest
): Promise<{ message: string; sales_quotation_id?: number | string }> {
  const { data, error } = await fetchWithCookie<{
    message: string;
    sales_quotation_id?: number | string;
  }>(apiRoutesPortalMasters.QUOTATION_CREATE, "POST", payload);

  if (error) {
    throw new Error(error);
  }

  return data ?? { message: "Quotation created successfully." };
}

export async function updateQuotation(
  payload: UpdateQuotationRequest
): Promise<{ message: string; sales_quotation_id?: number | string }> {
  if (!payload.sales_quotation_id) {
    throw new Error("Quotation ID is required for update");
  }

  const { data, error } = await fetchWithCookie<{
    message: string;
    sales_quotation_id?: number | string;
  }>(apiRoutesPortalMasters.QUOTATION_UPDATE, "PUT", payload);

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from update API");
  }

  return data;
}

export async function getQuotationById(
  id: string,
  coId?: string,
  menuId?: string
): Promise<QuotationDetails> {
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
    throw new Error("Company ID (co_id) is required to fetch quotation details");
  }

  const query = new URLSearchParams({
    sales_quotation_id: id,
    co_id: companyId,
  });

  // Add menu_id if provided (needed for permission calculation)
  if (menuId) {
    query.set("menu_id", menuId);
  }

  const { data, error } = await fetchWithCookie<QuotationDetails>(
    `${apiRoutesPortalMasters.QUOTATION_GET_BY_ID}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from quotation API");
  }

  return data;
}

export async function openQuotation(
  quotationId: string,
  branchId: string,
  menuId: string
): Promise<StatusChangeResponse> {
  const payload = {
    sales_quotation_id: quotationId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.QUOTATION_OPEN,
    "POST",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from open API");
  }

  return data;
}

export async function cancelDraftQuotation(
  quotationId: string,
  branchId: string,
  menuId: string
): Promise<StatusChangeResponse> {
  const payload = {
    sales_quotation_id: quotationId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.QUOTATION_CANCEL_DRAFT,
    "POST",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from cancel draft API");
  }

  return data;
}

export async function sendQuotationForApproval(
  quotationId: string,
  branchId: string,
  menuId: string
): Promise<StatusChangeResponse> {
  const payload = {
    sales_quotation_id: quotationId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.QUOTATION_SEND_FOR_APPROVAL,
    "POST",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from send for approval API");
  }

  return data;
}

export async function approveQuotation(
  quotationId: string,
  branchId: string,
  menuId: string
): Promise<StatusChangeResponse> {
  const payload = {
    sales_quotation_id: quotationId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.QUOTATION_APPROVE,
    "POST",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from approve API");
  }

  return data;
}

export async function rejectQuotation(
  quotationId: string,
  branchId: string,
  menuId: string,
  reason: string
): Promise<StatusChangeResponse> {
  const payload = {
    sales_quotation_id: quotationId,
    branch_id: branchId,
    menu_id: menuId,
    reason: reason,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.QUOTATION_REJECT,
    "POST",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from reject API");
  }

  return data;
}

export async function reopenQuotation(
  quotationId: string,
  branchId: string,
  menuId: string
): Promise<StatusChangeResponse> {
  const payload = {
    sales_quotation_id: quotationId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.QUOTATION_REOPEN,
    "POST",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from reopen API");
  }

  return data;
}
