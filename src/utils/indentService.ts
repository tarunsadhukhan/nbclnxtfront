import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type IndentLine = {
  id: string;
  department?: string;
  itemGroup?: string;
  item?: string;
  itemMake?: string;
  quantity?: number;
  uom?: string;
  remarks?: string;
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

export type IndentDetails = {
  id: string;
  indentNo: string;
  indentDate: string;
  branch: string;
  indentType: string;
  expenseType: string;
  project?: string;
  requester?: string;
  status?: string;
  statusId?: 1 | 3 | 4 | 5 | 6 | 20 | 21;
  approvalLevel?: number | null;
  maxApprovalLevel?: number | null;
  updatedBy?: string;
  updatedAt?: string;
  remarks?: string;
  permissions?: ApprovalActionPermissions;
  lines: IndentLine[];
};

export type IndentSetup1Response = {
  branches?: Array<Record<string, unknown>>;
  departments?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  expense_types?: Array<Record<string, unknown>>;
  item_groups?: Array<Record<string, unknown>>;
};

export type IndentSetup2Response = {
  items?: Array<Record<string, unknown>>;
  makes?: Array<Record<string, unknown>>;
  uoms?: Array<Record<string, unknown>>;
};

export type CreateIndentRequest = {
  branch: string;
  indent_type: string;
  expense_type: string;
  date: string;
  indent_no?: string;
  project?: string;
  requester?: string;
  remarks?: string;
  items: Array<{
    item_group?: string;
    item?: string;
    quantity?: string;
    uom?: string;
    item_make?: string;
    remarks?: string;
    department?: string;
  }>;
};

export type CreateIndentResponse = {
  message?: string;
  indent_id?: number | string;
  indentId?: number | string;
  indent_no?: number | string;
};

export type ItemValidationResponse = {
  validation_logic: 1 | 2 | 3;
  item_id: number;
  branch_id: number;
  indent_type: string;
  expense_type_name: string | null;
  errors: string[];
  branch_stock: number;
  minqty: number | null;
  maxqty: number | null;
  min_order_qty: number | null;
  lead_time: number | null;
  outstanding_indent_qty: number;
  has_open_indent: boolean;
  stock_exceeds_max: boolean;
  max_indent_qty: number | null;
  min_indent_qty: number | null;
  has_minmax: boolean;
  fy_indent_exists: boolean;
  fy_indent_no: string | null;
  fy_duplicate_indent_no: number | null;
  regular_bom_outstanding: number;
  forced_qty: number | null;
  warnings: string[];
};

const mockIndent: IndentDetails = {
  id: "123",
  indentNo: "IND-2025-00123",
  indentDate: new Date().toISOString().slice(0, 10),
  branch: "Main Plant",
  indentType: "regular",
  expenseType: "1",
  project: "Expansion Project",
  requester: "John Doe",
  status: "Draft",
  updatedBy: "John Doe",
  updatedAt: new Date().toISOString(),
  remarks: "Please expedite delivery.",
  lines: [
    {
      id: "l1",
      department: "Production",
      itemGroup: "100-RAW",
      item: "Raw Steel Sheet",
      itemMake: "Make A",
      quantity: 25,
      uom: "PCS",
      remarks: "Gauge 18, priority order",
    },
    {
      id: "l2",
      department: "Maintenance",
      itemGroup: "200-SPARES",
      item: "Bearing Assembly",
      itemMake: "SKF",
      quantity: 4,
      uom: "SET",
      remarks: "For line 3 overhaul",
    },
  ],
};

function delay<T>(result: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(result), ms));
}

export async function fetchIndentSetup1(params: { coId: string; branchId?: string }): Promise<IndentSetup1Response> {
  const query = new URLSearchParams({ co_id: params.coId });
  if (params.branchId) {
    query.set("branch_id", params.branchId);
  }

  const { data, error } = await fetchWithCookie<IndentSetup1Response>(
    `${apiRoutesPortalMasters.GET_INDENT_SETUP_1}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty indent setup response.");
  }

  return data;
}

export async function fetchIndentSetup2(itemGroupId: string): Promise<IndentSetup2Response> {
  const query = new URLSearchParams({ item_group: itemGroupId });
  const { data, error } = await fetchWithCookie<IndentSetup2Response>(
    `${apiRoutesPortalMasters.GET_INDENT_SETUP_2}?${query.toString()}`,
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

export async function createIndent(payload: CreateIndentRequest): Promise<CreateIndentResponse> {
  const { data, error } = await fetchWithCookie<CreateIndentResponse>(
    apiRoutesPortalMasters.INDENT_CREATE,
    "POST",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  return data ?? { message: "Indent created successfully." };
}

export async function getIndentById(id: string, coId?: string, menuId?: string): Promise<IndentDetails> {
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
    throw new Error("Company ID (co_id) is required to fetch indent details");
  }

  const query = new URLSearchParams({
    indent_id: id,
    co_id: companyId,
  });
  
  // Add menu_id if provided (needed for permission calculation)
  if (menuId) {
    query.set("menu_id", menuId);
  }

  const { data, error } = await fetchWithCookie<IndentDetails>(
    `${apiRoutesPortalMasters.GET_INDENT_BY_ID}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from indent API");
  }

  return data;
}

export async function updateIndent(payload: Partial<IndentDetails>): Promise<{ message: string; indent_id?: number }> {
  if (!payload.id) {
    throw new Error("Indent ID is required for update");
  }

  // Map frontend payload to backend format
  const items = (payload.lines ?? []).map((line) => ({
    indent_dtl_id: line.id || undefined,
    item: line.item ?? "",
    quantity: line.quantity ?? 0,
    uom: line.uom ?? "",
    item_make: line.itemMake ?? undefined,
    department: line.department ?? undefined,
    remarks: line.remarks ?? undefined,
  }));

  const updatePayload = {
    id: payload.id,
    branch: payload.branch ?? "",
    indent_type: payload.indentType ?? "",
    expense_type: payload.expenseType ?? "",
    date: payload.indentDate ?? "",
    project: payload.project ?? undefined,
    name: payload.requester ?? undefined,
    remarks: payload.remarks ?? undefined,
    items: items,
  };

  const { data, error } = await fetchWithCookie<{ message: string; indent_id?: number }>(
    apiRoutesPortalMasters.INDENT_UPDATE,
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

export async function getIndentPrintable(id: string): Promise<IndentDetails> {
  return getIndentById(id);
}

export type ApprovalFlowResponse = {
  menu_id: number;
  branch_id: number;
  approval_flow: Array<{
    approval_mst_id: number;
    menu_id: number;
    user_id: number;
    branch_id: number;
    approval_level: number;
    max_amount_single?: number | null;
    day_max_amount?: number | null;
    month_max_amount?: number | null;
    user_name?: string;
    menu_name?: string;
  }>;
};

export type ApproveIndentResponse = {
  status: string;
  new_status_id: number;
  new_approval_level: number;
  message: string;
};

export async function getApprovalFlow(menuId: string, branchId: string): Promise<ApprovalFlowResponse> {
  const query = new URLSearchParams({
    menu_id: menuId,
    branch_id: branchId,
  });

  const { data, error } = await fetchWithCookie<ApprovalFlowResponse>(
    `${apiRoutesPortalMasters.GET_APPROVAL_FLOW}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty approval flow response");
  }

  return data;
}

export async function approveIndent(
  indentId: string,
  branchId: string,
  menuId: string,
  approvalLevel?: number | null
): Promise<ApproveIndentResponse> {
  const payload = {
    indent_id: indentId,
    branch_id: branchId,
    menu_id: menuId,
    ...(approvalLevel != null && { approval_level: approvalLevel }),
  };

  const { data, error } = await fetchWithCookie<ApproveIndentResponse>(
    apiRoutesPortalMasters.INDENT_APPROVE,
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

export async function approveIndentWithValue(
  indentId: string,
  branchId: string,
  menuId: string,
  amount: number
): Promise<ApproveIndentResponse> {
  const payload = {
    indent_id: indentId,
    branch_id: branchId,
    menu_id: menuId,
    amount: amount,
  };

  const { data, error } = await fetchWithCookie<ApproveIndentResponse>(
    apiRoutesPortalMasters.INDENT_APPROVE_WITH_VALUE,
    "POST",
    payload
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty response from approve with value API");
  }

  return data;
}

export type StatusChangeResponse = {
  status: string;
  new_status_id: number;
  new_approval_level?: number;
  message: string;
};

export async function openIndent(indentId: string, branchId: string, menuId: string): Promise<StatusChangeResponse> {
  const payload = {
    indent_id: indentId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.INDENT_OPEN,
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

export async function cancelDraftIndent(indentId: string, branchId: string, menuId: string): Promise<StatusChangeResponse> {
  const payload = {
    indent_id: indentId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.INDENT_CANCEL_DRAFT,
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

export async function reopenIndent(indentId: string, branchId: string, menuId: string): Promise<StatusChangeResponse> {
  const payload = {
    indent_id: indentId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.INDENT_REOPEN,
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

export async function sendIndentForApproval(indentId: string, branchId: string, menuId: string): Promise<StatusChangeResponse> {
  const payload = {
    indent_id: indentId,
    branch_id: branchId,
    menu_id: menuId,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.INDENT_SEND_FOR_APPROVAL,
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

export async function rejectIndent(indentId: string, branchId: string, menuId: string, reason: string): Promise<StatusChangeResponse> {
  const payload = {
    indent_id: indentId,
    branch_id: branchId,
    menu_id: menuId,
    reason: reason,
  };

  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.INDENT_REJECT,
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

export async function validateItemForIndent(params: {
  branchId: string;
  itemId: string;
  indentType: string;
  expenseTypeId: string;
  indentId?: string;
}): Promise<ItemValidationResponse> {
  const query = new URLSearchParams({
    branch_id: params.branchId,
    item_id: params.itemId,
    indent_type: params.indentType,
    expense_type_id: params.expenseTypeId,
  });
  if (params.indentId) {
    query.set("indent_id", params.indentId);
  }

  const { data, error } = await fetchWithCookie<ItemValidationResponse>(
    `${apiRoutesPortalMasters.VALIDATE_ITEM_FOR_INDENT}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Empty validation response.");
  }

  return data;
}

// ─── Indent Template (reuse by name) ──────────────────────────────────────

export type IndentLinesByTitleResponse = {
  lines: IndentLine[];
};

/**
 * Fetch line items from the most recent indent matching the given title,
 * scoped by co_id and branch_id.  Used for template pre-fill.
 */
export async function fetchIndentLinesByTitle(
  coId: string,
  branchId: string,
  indentTitle: string
): Promise<IndentLinesByTitleResponse> {
  const query = new URLSearchParams({
    co_id: coId,
    branch_id: branchId,
    indent_title: indentTitle,
  });

  const { data, error } = await fetchWithCookie<{ data: IndentLinesByTitleResponse }>(
    `${apiRoutesPortalMasters.GET_INDENT_LINES_BY_TITLE}?${query.toString()}`,
    "GET"
  );

  if (error) {
    throw new Error(error);
  }

  // The backend wraps the payload in { data: { lines: [...] } }
  const payload = (data as unknown as { data?: IndentLinesByTitleResponse })?.data ?? (data as unknown as IndentLinesByTitleResponse);
  return { lines: payload?.lines ?? [] };
}
