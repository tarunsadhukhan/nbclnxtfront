import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type POLine = {
  id: string;
  indentNo?: string;
  indentDtlId?: string;
  department?: string;
  itemGroup?: string;
  item?: string;
  itemCode?: string;
  itemMake?: string;
  hsnCode?: string;
  quantity?: number | string;
  rate?: number | string;
  uom?: string;
  discountMode?: number;
  discountValue?: number | string;
  discountAmount?: number;
  amount?: number;
  remarks?: string;
  taxPercentage?: number;
  igst?: number;
  sgst?: number;
  cgst?: number;
  taxAmount?: number;
};

export type POAdditionalCharge = {
  id?: string;
  additionalChargesId?: string;
  additionalChargesName?: string;
  qty?: number;
  rate?: number;
  netAmount?: number;
  remarks?: string;
  igst?: number;
  sgst?: number;
  cgst?: number;
  tax_pct?: number;
  tax_amount?: number;
  apply_tax?: boolean;
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

export type PODetails = {
  id: string;
  poNo: string;
  poDate: string;
  branch: string;
  branchName?: string;
  supplier: string;
  supplierBranch: string;
  supplierState?: string;
  billingAddress: string;
  billingState?: string;
  shippingAddress: string;
  shippingState?: string;
  project?: string;
  expenseType?: string;
  poType?: string;
  creditTerm?: number;
  deliveryTimeline?: number;
  contactPerson?: string;
  contactNo?: string;
  footerNote?: string;
  internalNote?: string;
  termsConditions?: string;
  taxType?: string;
  netAmount?: number;
  totalAmount?: number;
  advancePercentage?: number;
  advanceAmount?: number;
  status?: string;
  statusId?: 1 | 3 | 4 | 5 | 6 | 20 | 21;
  approvalLevel?: number | null;
  maxApprovalLevel?: number | null;
  updatedBy?: string;
  updatedAt?: string;
  permissions?: ApprovalActionPermissions;
  lines: POLine[];
  additionalCharges: POAdditionalCharge[];
};

export type POSetup1Response = {
  branches?: Array<Record<string, unknown>>;
  suppliers?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  expense_types?: Array<Record<string, unknown>>;
  item_groups?: Array<Record<string, unknown>>;
  co_config?: Record<string, unknown>;
  branch_addresses?: Array<Record<string, unknown>>;
};

export type POSetup2Response = {
  items?: Array<Record<string, unknown>>;
  makes?: Array<Record<string, unknown>>;
  uoms?: Array<Record<string, unknown>>;
};

export type IndentLineItemsResponse = {
  indent_id: number;
  expenseType?: string;
  line_items: Array<Record<string, unknown>>;
};

export type SupplierBranchesResponse = {
  party_id: number;
  branches: Array<Record<string, unknown>>;
};

export type CreatePORequest = {
  branch: string;
  date: string;
  supplier: string;
  supplier_branch: string;
  billing_address: string;
  shipping_address: string;
  tax_payable: string;
  credit_term?: number;
  delivery_timeline: number;
  project: string;
  expense_type: string;
  /** Source price-enquiry id when the PO is created from an enquiry award. */
  price_enquiry_id?: string;
  po_type?: string;
  contact_person?: string;
  contact_no?: string;
  footer_note?: string;
  internal_note?: string;
  terms_conditions?: string;
  advance_percentage?: number;
  items: Array<{
    po_dtl_id?: string;
    indent_dtl_id?: string;
    item?: string;
    hsn_code?: string;
    quantity?: string;
    rate?: string;
    uom?: string;
    make?: string;
    discount_mode?: number;
    discount_value?: string;
    remarks?: string;
  }>;
  additional_charges?: Array<{
    additional_charges_id?: string;
    qty?: number;
    rate?: number;
    net_amount?: number;
    remarks?: string;
    tax_pct?: number;
    igst_amount?: number;
    cgst_amount?: number;
    sgst_amount?: number;
    tax_amount?: number;
  }>;
};

export type SavePORequest = CreatePORequest & { id?: string };

export type CreatePOResponse = {
  message?: string;
  po_id?: number | string;
  poId?: number | string;
};

export type StatusChangeResponse = {
  status: string;
  new_status_id: number;
  new_approval_level?: number;
  message: string;
  po_no?: number;
};

export async function fetchPOSetup1(params: { coId: string; branchId?: string }): Promise<POSetup1Response> {
  const query = new URLSearchParams({ co_id: params.coId });
  if (params.branchId) {
    query.set("branch_id", params.branchId);
  }

  const { data, error } = await fetchWithCookie<POSetup1Response>(
    `${apiRoutesPortalMasters.GET_PO_SETUP_1}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty PO setup response.");
  }

  return data;
}

export async function fetchPOSetup2(itemGroupId: string, coId?: string): Promise<POSetup2Response> {
  const params: Record<string, string> = { item_group: itemGroupId };
  if (coId) params.co_id = coId;
  const query = new URLSearchParams(params);
  const { data, error } = await fetchWithCookie<POSetup2Response>(
    `${apiRoutesPortalMasters.GET_PO_SETUP_2}?${query.toString()}`,
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

export type ApprovedIndent = {
  indent_id: number;
  indent_no: string;
  indent_date: string;
  branch_name: string;
  expense_type: string;
};

export type ApprovedIndentsResponse = {
  data: ApprovedIndent[];
};

export async function getAllApprovedIndents(branchId?: number | string, coId?: number): Promise<ApprovedIndentsResponse> {
  const query = new URLSearchParams();
  if (branchId) {
    query.append("branch_id", String(branchId));
  }
  if (coId) {
    query.append("co_id", String(coId));
  }
  const { data, error } = await fetchWithCookie<ApprovedIndentsResponse>(
    `${apiRoutesPortalMasters.GET_ALL_APPROVED_INDENTS}${query.toString() ? `?${query.toString()}` : ""}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("No data returned from get_all_approved_indents");
  }

  return data;
}

export async function getIndentLineItems(indentId: string): Promise<IndentLineItemsResponse> {
  const query = new URLSearchParams({ indent_id: indentId });
  const { data, error } = await fetchWithCookie<IndentLineItemsResponse>(
    `${apiRoutesPortalMasters.GET_INDENT_LINE_ITEMS}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty indent line items response.");
  }

  return data;
}

export async function getSupplierBranches(partyId: string): Promise<SupplierBranchesResponse> {
  const query = new URLSearchParams({ party_id: partyId });
  const { data, error } = await fetchWithCookie<SupplierBranchesResponse>(
    `${apiRoutesPortalMasters.GET_SUPPLIER_BRANCHES}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty supplier branches response.");
  }

  return data;
}

export async function createPO(payload: CreatePORequest): Promise<CreatePOResponse> {
  const { data, error } = await fetchWithCookie<CreatePOResponse>(
    apiRoutesPortalMasters.PO_CREATE,
    "POST",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  return data ?? { message: "PO created successfully." };
}

export async function savePO(payload: SavePORequest): Promise<CreatePOResponse> {
  const { data, error } = await fetchWithCookie<CreatePOResponse>(
    apiRoutesPortalMasters.PO_SAVE,
    "POST",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  return data ?? { message: "PO saved successfully." };
}

export async function getPOById(id: string, coId?: string, menuId?: string): Promise<PODetails> {
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
    throw new Error("Company ID (co_id) is required to fetch PO details");
  }

  const query = new URLSearchParams({
    po_id: id,
    co_id: companyId,
  });

  // Add menu_id if provided (needed for permission calculation)
  if (menuId) {
    query.set("menu_id", menuId);
  }

  const { data, error } = await fetchWithCookie<PODetails>(
    `${apiRoutesPortalMasters.GET_PO_BY_ID}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from PO API");
  }

  return data;
}

export async function updatePO(payload: Partial<PODetails>): Promise<{ message: string; po_id?: number }> {
  if (!payload.id) {
    throw new Error("PO ID is required for update");
  }

  // Map frontend payload to backend format
  const items = (payload.lines ?? []).map((line) => ({
    indent_dtl_id: line.indentDtlId,
    item: line.item ?? "",
    quantity: line.quantity ?? 0,
    rate: line.rate ?? 0,
    uom: line.uom ?? "",
    make: line.itemMake ?? undefined,
    discount_mode: line.discountMode,
    discount_value: line.discountValue ?? undefined,
    remarks: line.remarks ?? undefined,
  }));

  const additional_charges = (payload.additionalCharges ?? []).map((addl) => ({
    additional_charges_id: addl.additionalChargesId ?? "",
    qty: addl.qty ?? 0,
    rate: addl.rate ?? 0,
    remarks: addl.remarks ?? undefined,
  }));

  const updatePayload = {
    id: payload.id,
    branch: payload.branch ?? "",
    supplier: payload.supplier ?? "",
    supplier_branch: payload.supplierBranch ?? "",
    billing_address: payload.billingAddress ?? "",
    shipping_address: payload.shippingAddress ?? "",
    project: payload.project ?? "",
    date: payload.poDate ?? "",
    credit_term: payload.creditTerm ?? undefined,
    delivery_timeline: payload.deliveryTimeline ?? undefined,
    contact_person: payload.contactPerson ?? undefined,
    contact_no: payload.contactNo ?? undefined,
    footer_note: payload.footerNote ?? undefined,
    internal_note: payload.internalNote ?? undefined,
    terms_conditions: payload.termsConditions ?? undefined,
    advance_percentage: payload.advancePercentage ?? undefined,
    items: items,
    additional_charges: additional_charges,
  };

  const { data, error } = await fetchWithCookie<{ message: string; po_id?: number }>(
    apiRoutesPortalMasters.PO_UPDATE,
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

export async function approvePO(poId: string, branchId: string, menuId: string): Promise<StatusChangeResponse> {
  const payload = {
    po_id: poId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.PO_APPROVE,
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

export async function openPO(poId: string, branchId: string, menuId: string): Promise<StatusChangeResponse> {
  const payload = {
    po_id: poId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.PO_OPEN,
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

export async function cancelDraftPO(poId: string, branchId: string, menuId: string): Promise<StatusChangeResponse> {
  const payload = {
    po_id: poId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.PO_CANCEL_DRAFT,
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

export async function reopenPO(poId: string, branchId: string, menuId: string): Promise<StatusChangeResponse> {
  const payload = {
    po_id: poId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.PO_REOPEN,
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

export async function sendPOForApproval(poId: string, branchId: string, menuId: string): Promise<StatusChangeResponse> {
  const payload = {
    po_id: poId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.PO_SEND_FOR_APPROVAL,
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

export async function rejectPO(poId: string, branchId: string, menuId: string, reason: string): Promise<StatusChangeResponse> {
  const payload = {
    po_id: poId,
    branch_id: branchId,
    menu_id: menuId,
    reason: reason,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.PO_REJECT,
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

export type ClonePOResponse = {
  id: string;
  poNo?: string;
  message?: string;
};

export async function clonePO(poId: string, branchId: string, menuId: string): Promise<ClonePOResponse> {
  const payload = {
    po_id: poId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<ClonePOResponse>(
    apiRoutesPortalMasters.PO_CLONE,
    "POST",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from clone API");
  }

  return data;
}

// ---------------------------------------------------------------------------
// Item validation for direct PO (Logic 1 / 2 / 3)
// ---------------------------------------------------------------------------

export type POItemValidationResult = {
  validation_logic: 1 | 2 | 3;
  po_type: string;
  expense_type_name: string;
  errors: string[];
  warnings: string[];
  // Logic 1
  branch_stock: number | null;
  outstanding_indent_qty: number | null;
  outstanding_po_qty: number | null;
  minqty: number | null;
  maxqty: number | null;
  min_order_qty: number | null;
  has_open_indent: boolean;
  has_open_po: boolean;
  stock_exceeds_max: boolean;
  max_po_qty: number | null;
  min_po_qty: number | null;
  // Logic 2
  fy_po_exists: boolean;
  fy_po_no: string | null;
  fy_indent_exists: boolean;
  fy_indent_no: string | null;
  has_minmax: boolean;
  regular_bom_outstanding: number | null;
  forced_qty: number | null;
};

export type ValidateItemForPOParams = {
  coId: string;
  branchId: string;
  itemId: string;
  poType: string;
  expenseTypeId: string;
  poId?: string; // Optional — for edit-mode validation adjustment
};

export async function validateItemForPO(params: ValidateItemForPOParams): Promise<POItemValidationResult> {
  const query = new URLSearchParams({
    co_id: params.coId,
    branch_id: params.branchId,
    item_id: params.itemId,
    po_type: params.poType,
    expense_type_id: params.expenseTypeId,
  });
  if (params.poId) {
    query.set("po_id", params.poId);
  }

  const { data, error } = await fetchWithCookie<POItemValidationResult>(
    `${apiRoutesPortalMasters.PO_VALIDATE_ITEM}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from validate_item_for_po");
  }

  return data;
}

