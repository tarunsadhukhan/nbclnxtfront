import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SalesOrderLineGst = {
  igstAmount?: number | null;
  igstPercent?: number | null;
  cgstAmount?: number | null;
  cgstPercent?: number | null;
  sgstAmount?: number | null;
  sgstPercent?: number | null;
  gstTotal?: number | null;
};

export type SalesOrderLineHessian = {
  qtyBales?: number | null;
  ratePerBale?: number | null;
  billingRateMt?: number | null;
  billingRateBale?: number | null;
};

export type SalesOrderLineJuteDtl = {
  claimAmountDtl?: number | null;
  claimDesc?: string | null;
  claimRate?: number | null;
  unitConversion?: string | null;
  qtyUnitConversion?: number | null;
};

export type SalesOrderLineGovtSkgDtl = {
  packSheet?: number | null;
  netWeight?: number | null;
  totalWeight?: number | null;
};

export type SalesOrderLine = {
  id: string;
  quotationLineitemId?: number | null;
  hsnCode?: string;
  itemGroup?: string;
  item?: string;
  itemName?: string;
  itemMake?: string;
  quantity?: number | string;
  uom?: string;
  qtyUom?: string;
  uomName?: string;
  qtyUomName?: string;
  rate?: number | string;
  discountType?: number | null;
  discountedRate?: number | null;
  discountAmount?: number | null;
  netAmount?: number | null;
  totalAmount?: number | null;
  remarks?: string;
  gst?: SalesOrderLineGst | null;
  hessian?: SalesOrderLineHessian | null;
  juteDtl?: SalesOrderLineJuteDtl | null;
  govtskgDtl?: SalesOrderLineGovtSkgDtl | null;
  full_item_code?: string;
  fullItemCode?: string;
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

export type SalesOrderDetails = {
  id: string;
  salesNo: string;
  salesOrderDate: string;
  salesOrderExpiryDate?: string | null;
  invoiceType?: number | null;
  branch: string;
  quotation?: string | null;
  quotationNo?: string | null;
  party?: string | null;
  partyName?: string;
  partyBranch?: string | null;
  broker?: string | null;
  brokerName?: string | null;
  billingTo?: string | null;
  shippingTo?: string | null;
  transporter?: string | null;
  transporterName?: string | null;
  brokerCommissionPercent?: number | null;
  footerNote?: string | null;
  termsConditions?: string | null;
  internalNote?: string | null;
  deliveryTerms?: string | null;
  paymentTerms?: string | null;
  buyerOrderNo?: string | null;
  buyerOrderDate?: string | null;
  deliveryDays?: number | null;
  committedDeliveryDate?: string | null;
  advanceAmount?: number | null;
  advanceNote?: string | null;
  salesEnquiryId?: string | null;
  enquiryNo?: string | null;
  freightCharges?: number | null;
  grossAmount?: number | null;
  netAmount?: number | null;
  status?: string;
  statusId?: 1 | 3 | 4 | 5 | 6 | 20 | 21;
  approvalLevel?: number | null;
  maxApprovalLevel?: number | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
  permissions?: ApprovalActionPermissions;
  lines: SalesOrderLine[];
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
  } | null;
  juteyarn?: {
    pcso_no?: string | null;
    container_no?: string | null;
    customer_ref_no?: string | null;
  } | null;
};

export type SalesOrderSetup1Response = {
  branches?: Array<Record<string, unknown>>;
  customers?: Array<Record<string, unknown>>;
  brokers?: Array<Record<string, unknown>>;
  transporters?: Array<Record<string, unknown>>;
  co_config?: Record<string, unknown>;
  approved_quotations?: Array<Record<string, unknown>>;
  item_groups?: Array<Record<string, unknown>>;
};

export type SalesOrderSetup2Response = {
  items?: Array<Record<string, unknown>>;
  makes?: Array<Record<string, unknown>>;
  uoms?: Array<Record<string, unknown>>;
};

export type QuotationLinesResponse = {
  data: Array<Record<string, unknown>>;
};

export type CreateSalesOrderRequest = {
  branch: string;
  date: string;
  party?: string | null;
  party_branch?: string;
  quotation?: string | null;
  invoice_type?: number | null;
  broker?: string | null;
  broker_commission_percent?: number | null;
  billing_to?: string | null;
  shipping_to?: string | null;
  transporter?: string | null;
  expiry_date?: string | null;
  delivery_terms?: string | null;
  payment_terms?: string | null;
  buyer_order_no?: string | null;
  buyer_order_date?: string | null;
  delivery_days?: number | null;
  committed_delivery_date?: string | null;
  advance_amount?: number | null;
  advance_note?: string | null;
  sales_enquiry_id?: number | string | null;
  freight_charges?: number | null;
  footer_note?: string | null;
  internal_note?: string | null;
  terms_conditions?: string | null;
  gross_amount?: number | null;
  net_amount?: number | null;
  items: Array<{
    item?: string;
    item_make?: string | null;
    quotation_lineitem_id?: number | null;
    hsn_code?: string | null;
    quantity?: string | number;
    qty_uom?: string;
    rate?: string | number;
    discount_type?: number | null;
    discounted_rate?: number | null;
    discount_amount?: number | null;
    net_amount?: number | null;
    total_amount?: number | null;
    remarks?: string | null;
    gst?: {
      igst_amount?: number | null;
      igst_percent?: number | null;
      cgst_amount?: number | null;
      cgst_percent?: number | null;
      sgst_amount?: number | null;
      sgst_percent?: number | null;
      gst_total?: number | null;
    };
    hessian?: {
      qty_bales?: number | null;
      rate_per_bale?: number | null;
      billing_rate_mt?: number | null;
      billing_rate_bale?: number | null;
    } | null;
    jute_dtl?: {
      claim_amount_dtl?: number | null;
      claim_desc?: string | null;
      claim_rate?: number | null;
      unit_conversion?: string | null;
      qty_untit_conversion?: number | null;
    } | null;
    govtskg_dtl?: {
      pack_sheet?: number | null;
      net_weight?: number | null;
      total_weight?: number | null;
    } | null;
  }>;
  jute?: {
    mr_no?: string;
    mukam_id?: string;
    claim_amount?: number;
    claim_description?: string;
  };
  govtskg?: {
    pcso_no?: string;
    pcso_date?: string;
    administrative_office_address?: string;
    destination_rail_head?: string;
    loading_point?: string;
  };
  juteyarn?: {
    pcso_no?: string;
    container_no?: string;
    customer_ref_no?: string;
  };
  additional_charges?: Array<{
    additional_charges_id: string;
    charge_name?: string;
    qty: number;
    rate: number;
    net_amount: number;
    remarks?: string;
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

export type CreateSalesOrderResponse = {
  message?: string;
  sales_order_id?: number | string;
};

export type StatusChangeResponse = {
  status: string;
  new_status_id: number;
  new_approval_level?: number;
  message: string;
  sales_no?: string;
};

// ---------------------------------------------------------------------------
// Setup APIs
// ---------------------------------------------------------------------------

export async function fetchSalesOrderSetup1(params: {
  coId: string;
  branchId?: string;
}): Promise<SalesOrderSetup1Response> {
  const query = new URLSearchParams({ co_id: params.coId });
  if (params.branchId) {
    query.set("branch_id", params.branchId);
  }

  const { data, error } = await fetchWithCookie<SalesOrderSetup1Response>(
    `${apiRoutesPortalMasters.SALES_ORDER_SETUP_1}?${query.toString()}`,
    "GET"
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty sales order setup response.");
  return data;
}

export async function fetchSalesOrderSetup2(
  itemGroupId: string
): Promise<SalesOrderSetup2Response> {
  const query = new URLSearchParams({ item_group: itemGroupId });
  const { data, error } = await fetchWithCookie<SalesOrderSetup2Response>(
    `${apiRoutesPortalMasters.SALES_ORDER_SETUP_2}?${query.toString()}`,
    "GET"
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty item group setup response.");
  return data;
}

export async function getQuotationLines(
  quotationId: string
): Promise<QuotationLinesResponse> {
  const query = new URLSearchParams({ sales_quotation_id: quotationId });
  const { data, error } = await fetchWithCookie<QuotationLinesResponse>(
    `${apiRoutesPortalMasters.SALES_ORDER_QUOTATION_LINES}?${query.toString()}`,
    "GET"
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty quotation lines response.");
  return data;
}

// ---------------------------------------------------------------------------
// CRUD APIs
// ---------------------------------------------------------------------------

export async function getSalesOrderById(
  id: string,
  coId?: string,
  menuId?: string
): Promise<SalesOrderDetails> {
  let companyId = coId;
  if (!companyId && typeof window !== "undefined") {
    try {
      const storedCompany = localStorage.getItem("sidebar_selectedCompany");
      if (storedCompany) {
        const parsed = JSON.parse(storedCompany) as {
          co_id?: string | number;
        } | null;
        if (parsed?.co_id) {
          companyId =
            typeof parsed.co_id === "string"
              ? parsed.co_id
              : String(parsed.co_id);
        }
      }
    } catch {
      // Ignore
    }
  }

  if (!companyId) {
    throw new Error("Company ID (co_id) is required to fetch sales order details");
  }

  const query = new URLSearchParams({
    sales_order_id: id,
    co_id: companyId,
  });

  if (menuId) {
    query.set("menu_id", menuId);
  }

  const { data, error } = await fetchWithCookie<SalesOrderDetails>(
    `${apiRoutesPortalMasters.SALES_ORDER_BY_ID}?${query.toString()}`,
    "GET"
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from sales order API");
  return data;
}

export async function createSalesOrder(
  payload: CreateSalesOrderRequest
): Promise<CreateSalesOrderResponse> {
  const { data, error } = await fetchWithCookie<CreateSalesOrderResponse>(
    apiRoutesPortalMasters.SALES_ORDER_CREATE,
    "POST",
    payload
  );

  if (error) throw new Error(error);
  return data ?? { message: "Sales order created successfully." };
}

export async function updateSalesOrder(
  payload: Partial<SalesOrderDetails> & {
    id: string;
    items?: CreateSalesOrderRequest["items"];
    jute?: CreateSalesOrderRequest["jute"];
    govtskg?: CreateSalesOrderRequest["govtskg"];
    juteyarn?: CreateSalesOrderRequest["juteyarn"];
    additional_charges?: CreateSalesOrderRequest["additional_charges"];
  }
): Promise<{ message: string; sales_order_id?: number }> {
  if (!payload.id) {
    throw new Error("Sales order ID is required for update");
  }

  const updatePayload = {
    id: payload.id,
    branch: payload.branch ?? "",
    party: payload.party ?? undefined,
    party_branch: payload.partyBranch ?? undefined,
    date: payload.salesOrderDate ?? "",
    quotation: payload.quotation ?? undefined,
    invoice_type: payload.invoiceType ?? undefined,
    broker: payload.broker ?? undefined,
    broker_commission_percent: payload.brokerCommissionPercent ?? undefined,
    billing_to: payload.billingTo ?? undefined,
    shipping_to: payload.shippingTo ?? undefined,
    transporter: payload.transporter ?? undefined,
    expiry_date: payload.salesOrderExpiryDate ?? undefined,
    delivery_terms: payload.deliveryTerms ?? undefined,
    payment_terms: payload.paymentTerms ?? undefined,
    buyer_order_no: payload.buyerOrderNo ?? undefined,
    buyer_order_date: payload.buyerOrderDate ?? undefined,
    delivery_days: payload.deliveryDays ?? undefined,
    committed_delivery_date: payload.committedDeliveryDate ?? undefined,
    advance_amount: payload.advanceAmount ?? undefined,
    advance_note: payload.advanceNote ?? undefined,
    sales_enquiry_id: payload.salesEnquiryId ?? undefined,
    freight_charges: payload.freightCharges ?? undefined,
    footer_note: payload.footerNote ?? undefined,
    internal_note: payload.internalNote ?? undefined,
    terms_conditions: payload.termsConditions ?? undefined,
    gross_amount: payload.grossAmount ?? undefined,
    net_amount: payload.netAmount ?? undefined,
    items: payload.items ?? [],
    // Type-specific header extensions — must be forwarded so the backend
    // can persist them. Without these, invoice_type=GovtSacking/Jute/JuteYarn
    // updates silently drop their extension data.
    jute: payload.jute,
    govtskg: payload.govtskg,
    juteyarn: payload.juteyarn,
    additional_charges: payload.additional_charges,
  };

  const { data, error } = await fetchWithCookie<{
    message: string;
    sales_order_id?: number;
  }>(apiRoutesPortalMasters.SALES_ORDER_UPDATE, "PUT", updatePayload);

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from update API");
  return data;
}

// ---------------------------------------------------------------------------
// Workflow APIs
// ---------------------------------------------------------------------------

export async function openSalesOrder(
  salesOrderId: string,
  branchId: string,
  menuId: string
): Promise<StatusChangeResponse> {
  const payload = { sales_order_id: salesOrderId, branch_id: branchId, menu_id: menuId };
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_ORDER_OPEN,
    "POST",
    payload
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from open API");
  return data;
}

export async function cancelDraftSalesOrder(
  salesOrderId: string,
  branchId: string,
  menuId: string
): Promise<StatusChangeResponse> {
  const payload = { sales_order_id: salesOrderId, branch_id: branchId, menu_id: menuId };
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_ORDER_CANCEL_DRAFT,
    "POST",
    payload
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from cancel draft API");
  return data;
}

export async function sendSalesOrderForApproval(
  salesOrderId: string,
  branchId: string,
  menuId: string
): Promise<StatusChangeResponse> {
  const payload = { sales_order_id: salesOrderId, branch_id: branchId, menu_id: menuId };
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_ORDER_SEND_FOR_APPROVAL,
    "POST",
    payload
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from send for approval API");
  return data;
}

export async function approveSalesOrder(
  salesOrderId: string,
  branchId: string,
  menuId: string
): Promise<StatusChangeResponse> {
  const payload = { sales_order_id: salesOrderId, branch_id: branchId, menu_id: menuId };
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_ORDER_APPROVE,
    "POST",
    payload
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from approve API");
  return data;
}

export async function rejectSalesOrder(
  salesOrderId: string,
  branchId: string,
  menuId: string,
  reason: string
): Promise<StatusChangeResponse> {
  const payload = {
    sales_order_id: salesOrderId,
    branch_id: branchId,
    menu_id: menuId,
    reason,
  };
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_ORDER_REJECT,
    "POST",
    payload
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from reject API");
  return data;
}

export async function reopenSalesOrder(
  salesOrderId: string,
  branchId: string,
  menuId: string
): Promise<StatusChangeResponse> {
  const payload = { sales_order_id: salesOrderId, branch_id: branchId, menu_id: menuId };
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_ORDER_REOPEN,
    "POST",
    payload
  );

  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from reopen API");
  return data;
}
