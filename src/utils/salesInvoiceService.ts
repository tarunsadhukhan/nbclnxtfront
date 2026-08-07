import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type { ApprovalActionPermissions } from "@/utils/poService";

export type InvoiceLine = {
  id: string;
  deliveryOrderDtlId?: number;
  salesOrderDtlId?: number;
  hsnCode?: string;
  itemGroup?: string;
  item?: string;
  itemName?: string;
  itemCode?: string;
  fullItemCode?: string;
  itemMake?: string;
  quantity?: number | string;
  rate?: number | string;
  uom?: string;
  uomName?: string;
  discountType?: number;
  discountedRate?: number;
  discountAmount?: number;
  netAmount?: number;
  totalAmount?: number;
  remarks?: string;
  taxPercentage?: number;
  gst?: {
    igstAmount?: number;
    igstPercent?: number;
    cgstAmount?: number;
    cgstPercent?: number;
    sgstAmount?: number;
    sgstPercent?: number;
    gstTotal?: number;
    taxPercentage?: number;
    taxAmount?: number;
  };
  juteDtl?: {
    claimAmountDtl?: number;
    claimDesc?: string;
    claimRate?: number;
    unitConversion?: string;
    qtyUnitConversion?: number;
  } | null;
  hessianDtl?: {
    qtyBales?: number;
    ratePerBale?: number;
    billingRateMt?: number;
    billingRateBale?: number;
  } | null;
  govtskgDtl?: {
    packSheet?: number;
    netWeight?: number;
    totalWeight?: number;
  } | null;
};

export type InvoiceDetails = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  challanNo?: string;
  challanDate?: string;
  branchId: string;
  salesDeliveryOrderId?: number | string;
  deliveryOrderNo?: string;
  saleNo?: string;
  party: string;
  partyName?: string;
  partyBranch?: string;
  billingTo?: string;
  billingAddress?: string;
  billingGstNo?: string;
  billingStateId?: number;
  billingStateName?: string;
  billingContactPerson?: string;
  billingContactNo?: string;
  shippingTo?: string;
  shippingAddress?: string;
  shippingGstNo?: string;
  shippingStateId?: number;
  shippingStateName?: string;
  shippingContactPerson?: string;
  shippingContactNo?: string;
  transporter?: string;
  transporterName?: string;
  vehicleNo?: string;
  ewayBillNo?: string;
  ewayBillDate?: string;
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
  shippingStateCode?: string;
  intraInterState?: number;
  paymentTerms?: number;
  salesOrderId?: number;
  salesOrderDate?: string;
  salesOrderNo?: string;
  billingStateCode?: number;
  bankDetailId?: number;
  bankName?: string;
  bankAccNo?: string;
  bankIfscCode?: string;
  bankBranchName?: string;
  companyName?: string;
  companyAddress1?: string;
  companyAddress2?: string;
  companyZipcode?: number;
  companyCinNo?: string;
  companyPanNo?: string;
  companyStateName?: string;
  companyStateCode?: string;
  branchAddress1?: string;
  branchAddress2?: string;
  branchZipcode?: number;
  branchGstNo?: string;
  branchStateName?: string;
  branchStateCode?: string;
  status?: string;
  statusId?: 1 | 3 | 4 | 5 | 6 | 20 | 21;
  approvalLevel?: number | null;
  maxApprovalLevel?: number | null;
  updatedBy?: string;
  updatedAt?: string;
  permissions?: import("@/utils/poService").ApprovalActionPermissions;
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
  freight?: {
    salesInvoiceFreightId?: number;
    sourceInvoiceId: number;
    iwBillNo?: string | null;
    iwBillDate?: string | null;
    source?: {
      invoice_id: number;
      invoice_no: number | string | null;
      invoice_no_formatted?: string | null;
      invoice_date: string | null;
      pcso_no: string | null;
      delivery_order_no?: number | string | null;
      delivery_order_no_formatted?: string | null;
      delivery_order_date?: string | null;
    };
    sources?: Array<{
      invoice_id: number;
      invoice_no: number | string | null;
      invoice_no_formatted?: string | null;
      invoice_date: string | null;
      party_name?: string | null;
      pcso_no?: string | null;
      pcso_date?: string | null;
      delivery_order_no?: number | string | null;
      delivery_order_no_formatted?: string | null;
      delivery_order_date?: string | null;
      bales_qty?: number | null;
    }>;
  } | null;
  transporterBranchId?: number;
  transporterGstNo?: string;
  transporterDocNo?: string;
  transporterDocDate?: string;
  buyerOrderNo?: string;
  buyerOrderDate?: string;
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  qrCode?: string;
  eInvoiceSubmissionHistory?: unknown[];
  lines: InvoiceLine[];
};

export type InvoiceSetup1Response = {
  branches?: Array<Record<string, unknown>>;
  customers?: Array<Record<string, unknown>>;
  transporters?: Array<Record<string, unknown>>;
  approved_delivery_orders?: Array<Record<string, unknown>>;
  item_groups?: Array<Record<string, unknown>>;
};

export type InvoiceSetup2Response = {
  items?: Array<Record<string, unknown>>;
  makes?: Array<Record<string, unknown>>;
  uoms?: Array<Record<string, unknown>>;
};

export type DeliveryOrderLineForInvoice = {
  delivery_order_dtl_id: number;
  item_id: number;
  item_code?: string;
  item_name?: string;
  full_item_code?: string;
  item_grp_id: number;
  item_grp_code?: string;
  item_grp_name?: string;
  item_make_id?: number;
  item_make_name?: string;
  hsn_code?: string;
  quantity: number;
  uom_id: number;
  uom_name?: string;
  rate?: number;
  discount_type?: number;
  discounted_rate?: number;
  discount_amount?: number;
  net_amount?: number;
  total_amount?: number;
  remarks?: string;
  tax_percentage?: number;
  govtskg_pack_sheet?: string | null;
  govtskg_net_weight?: number | null;
  govtskg_total_weight?: number | null;
};

/** SO extension data returned inline by both DO-lines and SO-lines endpoints. */
export type SoExtensionData = {
  invoice_type?: number | null;
  so_govtskg?: {
    pcso_no?: string | null;
    pcso_date?: string | null;
    mode_of_transport?: string | null;
    administrative_office_address?: string | null;
    destination_rail_head?: string | null;
    loading_point?: string | null;
  };
  so_additional_charges?: Array<{
    sales_order_additional_id: number;
    additional_charges_id: number;
    additional_charges_name?: string;
    qty?: number;
    rate?: number;
    net_amount?: number;
    remarks?: string;
    igst_amount?: number;
    igst_percent?: number;
    cgst_amount?: number;
    cgst_percent?: number;
    sgst_amount?: number;
    sgst_percent?: number;
    gst_total?: number;
  }>;
};

export type SalesOrderLineForInvoice = {
  sales_order_dtl_id: number;
  item_id: number;
  item_code?: string;
  item_name?: string;
  full_item_code?: string;
  item_grp_id: number;
  item_grp_code?: string;
  item_grp_name?: string;
  item_make_id?: number;
  item_make_name?: string;
  hsn_code?: string;
  quantity: number;
  uom_id: number;
  uom_name?: string;
  rate?: number;
  discount_type?: number;
  discounted_rate?: number;
  discount_amount?: number;
  net_amount?: number;
  total_amount?: number;
  remarks?: string;
  tax_percentage?: number;
};

export type CreateInvoiceRequest = {
  branch: string;
  date: string;
  party: string;
  party_branch?: string;
  sales_delivery_order_id?: number;
  billing_to?: string;
  shipping_to?: string;
  transporter?: string;
  vehicle_no?: string;
  eway_bill_no?: string;
  eway_bill_date?: string;
  challan_no?: string;
  challan_date?: string;
  invoice_type?: string;
  footer_note?: string;
  internal_note?: string;
  terms_conditions?: string;
  gross_amount?: number;
  net_amount?: number;
  freight_charges?: number;
  round_off?: number;
  due_date?: string;
  type_of_sale?: string;
  tax_id?: string;
  transporter_address?: string;
  transporter_state_code?: string;
  transporter_state_name?: string;
  container_no?: string;
  contract_no?: string;
  contract_date?: string;
  consignment_no?: string;
  consignment_date?: string;
  shipping_state_code?: string;
  intra_inter_state?: string;
  payment_terms?: number;
  sales_order_id?: number;
  billing_state_code?: number;
  bank_detail_id?: number;
  transporter_branch_id?: number;
  transporter_doc_no?: string;
  transporter_doc_date?: string;
  buyer_order_no?: string;
  buyer_order_date?: string;
  irn?: string;
  ack_no?: string;
  ack_date?: string;
  qr_code?: string;
  jute?: {
    mr_no?: string;
    mr_id?: number;
    claim_amount?: number;
    other_reference?: string;
    unit_conversion?: string;
    claim_description?: string;
    mukam_id?: number;
  };
  govtskg?: {
    pcso_no?: string;
    pcso_date?: string;
    administrative_office_address?: string;
    destination_rail_head?: string;
    loading_point?: string;
    mode_of_transport?: string;
    pack_sheet?: number;
    net_weight?: number;
    total_weight?: number;
  };
  freight?: {
    // Legacy single-source key. Kept for back-compat with pre-multi-source
    // clients; the array below is preferred when both are present.
    source_invoice_id?: number;
    source_invoice_ids?: number[];
    iw_bill_no: string;
    iw_bill_date: string;
    // Optional — Govt Sacking Freight invoices may be dispatched by truck
    // without a container. Backend stores `null` when absent.
    container_no?: string | null;
    vehicle_no: string;
    freight_amount: number;
    bales_qty: number;
  };
  co_id?: number;
  additional_charges?: Array<{
    additional_charges_id: string;
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
  items: Array<{
    item: string;
    item_make?: string;
    delivery_order_dtl_id?: number;
    sales_order_dtl_id?: number;
    hsn_code?: string;
    quantity: string;
    uom: string;
    rate?: string;
    discount_type?: number;
    discounted_rate?: number;
    discount_amount?: number;
    net_amount?: number;
    total_amount?: number;
    remarks?: string;
    gst?: {
      igst_amount?: number;
      igst_percent?: number;
      cgst_amount?: number;
      cgst_percent?: number;
      sgst_amount?: number;
      sgst_percent?: number;
      gst_total?: number;
      tax_percentage?: number;
      tax_amount?: number;
    };
    jute_dtl?: {
      claim_amount_dtl?: number;
      claim_desc?: string;
      claim_rate?: number;
      unit_conversion?: string;
      qty_untit_conversion?: number;
    };
    hessian_dtl?: {
      qty_bales?: number;
      rate_per_bale?: number;
      billing_rate_mt?: number;
      billing_rate_bale?: number;
    };
    govtskg_dtl?: {
      pack_sheet?: number;
      net_weight?: number;
      total_weight?: number;
    };
  }>;
};

export type SaveInvoiceRequest = CreateInvoiceRequest & { id?: string };

export type CreateInvoiceResponse = {
  message?: string;
  invoice_id?: number | string;
};

export type StatusChangeResponse = {
  status: string;
  new_status_id: number;
  new_approval_level?: number;
  message: string;
  invoice_no?: string;
};

export async function fetchInvoiceSetup1(params: { coId: string; branchId?: string }): Promise<InvoiceSetup1Response> {
  const query = new URLSearchParams({ co_id: params.coId });
  if (params.branchId) query.set("branch_id", params.branchId);
  const { data, error } = await fetchWithCookie<InvoiceSetup1Response>(
    `${apiRoutesPortalMasters.SALES_INVOICE_SETUP_1}?${query.toString()}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty invoice setup response.");
  return data;
}

export async function fetchInvoiceSetup2(itemGroupId: string): Promise<InvoiceSetup2Response> {
  const query = new URLSearchParams({ item_group: itemGroupId });
  const { data, error } = await fetchWithCookie<InvoiceSetup2Response>(
    `${apiRoutesPortalMasters.SALES_INVOICE_SETUP_2}?${query.toString()}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty item group setup response.");
  return data;
}

type DOLinesResponse = { data: DeliveryOrderLineForInvoice[] } & SoExtensionData;
type SOLinesResponse = { data: SalesOrderLineForInvoice[] } & SoExtensionData;

export async function fetchDeliveryOrderLines(deliveryOrderId: string): Promise<DOLinesResponse> {
  const query = new URLSearchParams({ sales_delivery_order_id: deliveryOrderId });
  const { data, error } = await fetchWithCookie<DOLinesResponse>(
    `${apiRoutesPortalMasters.SALES_INVOICE_DELIVERY_ORDER_LINES}?${query.toString()}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty delivery order lines response.");
  return data;
}

export async function fetchSalesOrderLinesForInvoice(salesOrderId: string): Promise<SOLinesResponse> {
  const query = new URLSearchParams({ sales_order_id: salesOrderId });
  const { data, error } = await fetchWithCookie<SOLinesResponse>(
    `${apiRoutesPortalMasters.SALES_INVOICE_SALES_ORDER_LINES}?${query.toString()}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty sales order lines response.");
  return data;
}

export async function getInvoiceById(id: string, coId?: string, menuId?: string): Promise<InvoiceDetails> {
  let companyId = coId;
  if (!companyId && typeof window !== "undefined") {
    try {
      const storedCompany = localStorage.getItem("sidebar_selectedCompany");
      if (storedCompany) {
        const parsed = JSON.parse(storedCompany) as { co_id?: string | number } | null;
        if (parsed?.co_id) companyId = String(parsed.co_id);
      }
    } catch { /* ignore */ }
  }
  if (!companyId) throw new Error("Company ID (co_id) is required to fetch invoice details");

  const query = new URLSearchParams({ invoice_id: id, co_id: companyId });
  if (menuId) query.set("menu_id", menuId);

  const { data, error } = await fetchWithCookie<InvoiceDetails>(
    `${apiRoutesPortalMasters.SALES_INVOICE_BY_ID}?${query.toString()}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from invoice API");
  return data;
}

export async function createInvoice(payload: CreateInvoiceRequest): Promise<CreateInvoiceResponse> {
  const { data, error } = await fetchWithCookie<CreateInvoiceResponse>(
    apiRoutesPortalMasters.SALES_INVOICE_CREATE, "POST", payload
  );
  if (error) throw new Error(error);
  return data ?? { message: "Sales invoice created successfully." };
}

export async function updateInvoice(payload: SaveInvoiceRequest): Promise<CreateInvoiceResponse> {
  const { data, error } = await fetchWithCookie<CreateInvoiceResponse>(
    apiRoutesPortalMasters.SALES_INVOICE_UPDATE, "PUT", payload
  );
  if (error) throw new Error(error);
  return data ?? { message: "Sales invoice updated successfully." };
}

export async function openInvoice(invoiceId: string, branchId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_INVOICE_OPEN, "POST", { invoice_id: invoiceId, branch_id: branchId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from open API");
  return data;
}

export async function cancelDraftInvoice(invoiceId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_INVOICE_CANCEL_DRAFT, "POST", { invoice_id: invoiceId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from cancel draft API");
  return data;
}

export async function sendInvoiceForApproval(invoiceId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_INVOICE_SEND_FOR_APPROVAL, "POST", { invoice_id: invoiceId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from send for approval API");
  return data;
}

export async function approveInvoice(invoiceId: string, menuId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_INVOICE_APPROVE, "POST", { invoice_id: invoiceId, menu_id: menuId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from approve API");
  return data;
}

export async function rejectInvoice(invoiceId: string, reason: string, menuId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_INVOICE_REJECT, "POST", { invoice_id: invoiceId, reason, menu_id: menuId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from reject API");
  return data;
}

export async function reopenInvoice(invoiceId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.SALES_INVOICE_REOPEN, "POST", { invoice_id: invoiceId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from reopen API");
  return data;
}

export async function getTransporterBranches(transporterId: number, coId: number): Promise<{ data: Array<{ id: number; gst_no: string; address: string; state_id: number }> }> {
  const { data, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.SALES_INVOICE_TRANSPORTER_BRANCHES}?transporter_id=${transporterId}&co_id=${coId}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from transporter branches API");
  return data;
}

export type GovtSackingSourceListResponse = {
  data: import("@/app/dashboardportal/sales/salesInvoice/createSalesInvoice/types/salesInvoiceTypes").GovtSackingSourceRow[];
  total: number;
};

export type GovtSackingSourceDetailResponse = {
  data: import("@/app/dashboardportal/sales/salesInvoice/createSalesInvoice/types/salesInvoiceTypes").GovtSackingSourceDetail;
};

export async function fetchGovtSackingSourceList(params: {
  coId: string;
  branchId: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<GovtSackingSourceListResponse> {
  const query = new URLSearchParams({
    co_id: params.coId,
    branch_id: params.branchId,
  });
  if (params.search) query.set("search", params.search);
  if (params.page != null) query.set("page", String(params.page));
  if (params.limit != null) query.set("limit", String(params.limit));
  const { data, error } = await fetchWithCookie<GovtSackingSourceListResponse>(
    `${apiRoutesPortalMasters.SALES_INVOICE_GOVT_SACKING_SOURCE_LIST}?${query.toString()}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty Govt Sacking source list response.");
  return data;
}

export async function fetchGovtSackingSource(
  invoiceId: string | number,
  coId: string | number,
): Promise<GovtSackingSourceDetailResponse> {
  const query = new URLSearchParams({ co_id: String(coId) });
  const { data, error } = await fetchWithCookie<GovtSackingSourceDetailResponse>(
    `${apiRoutesPortalMasters.SALES_INVOICE_GOVT_SACKING_SOURCE}/${invoiceId}?${query.toString()}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty Govt Sacking source detail response.");
  return data;
}
