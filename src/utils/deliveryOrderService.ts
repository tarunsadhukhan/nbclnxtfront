import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type { ApprovalActionPermissions } from "@/utils/poService";

export type DOLine = {
  id: string;
  salesOrderDtlId?: number;
  hsnCode?: string;
  itemGroup?: string;
  item?: string;
  itemName?: string;
  itemCode?: string;
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
  };
};

export type DODetails = {
  id: string;
  deliveryOrderNo: string;
  deliveryOrderDate: string;
  expectedDeliveryDate?: string;
  branch: string;
  salesOrder?: string;
  salesNo?: string;
  party: string;
  partyName?: string;
  partyBranch?: string;
  billingTo?: string;
  shippingTo?: string;
  transporter?: string;
  transporterName?: string;
  vehicleNo?: string;
  driverName?: string;
  driverContact?: string;
  ewayBillNo?: string;
  ewayBillDate?: string;
  footerNote?: string;
  internalNote?: string;
  grossAmount?: number;
  netAmount?: number;
  freightCharges?: number;
  roundOffValue?: number;
  status?: string;
  statusId?: 1 | 3 | 4 | 5 | 6 | 20 | 21;
  approvalLevel?: number | null;
  maxApprovalLevel?: number | null;
  updatedBy?: string;
  updatedAt?: string;
  invoiceType?: string;
  soExtensionData?: {
    jute?: Record<string, unknown>;
    govtskg?: Record<string, unknown>;
    juteyarn?: Record<string, unknown>;
  } | null;
  permissions?: import("@/utils/poService").ApprovalActionPermissions;
  lines: DOLine[];
};

export type DOSetup1Response = {
  branches?: Array<Record<string, unknown>>;
  customers?: Array<Record<string, unknown>>;
  transporters?: Array<Record<string, unknown>>;
  approved_sales_orders?: Array<Record<string, unknown>>;
  item_groups?: Array<Record<string, unknown>>;
};

export type DOSetup2Response = {
  items?: Array<Record<string, unknown>>;
  makes?: Array<Record<string, unknown>>;
  uoms?: Array<Record<string, unknown>>;
};

export type SalesOrderLine = {
  sales_order_dtl_id: number;
  item_id: number;
  item_code?: string;
  full_item_code?: string;
  item_name?: string;
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
  qty_bales?: number;
  rate_per_bale?: number;
};

export type CreateDORequest = {
  branch: string;
  date: string;
  party: string;
  party_branch?: string;
  sales_order?: string;
  invoice_type?: string;
  billing_to?: string;
  shipping_to?: string;
  transporter?: string;
  vehicle_no?: string;
  driver_name?: string;
  driver_contact?: string;
  eway_bill_no?: string;
  eway_bill_date?: string;
  expected_delivery_date?: string;
  footer_note?: string;
  internal_note?: string;
  gross_amount?: number;
  net_amount?: number;
  freight_charges?: number;
  round_off_value?: number;
  items: Array<{
    item: string;
    item_make?: string;
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
    };
  }>;
};

export type SaveDORequest = CreateDORequest & { id?: string };

export type CreateDOResponse = {
  message?: string;
  sales_delivery_order_id?: number | string;
};

export type StatusChangeResponse = {
  status: string;
  new_status_id: number;
  new_approval_level?: number;
  message: string;
  delivery_order_no?: string;
};

export async function fetchDOSetup1(params: { coId: string; branchId?: string }): Promise<DOSetup1Response> {
  const query = new URLSearchParams({ co_id: params.coId });
  if (params.branchId) query.set("branch_id", params.branchId);
  const { data, error } = await fetchWithCookie<DOSetup1Response>(
    `${apiRoutesPortalMasters.DELIVERY_ORDER_SETUP_1}?${query.toString()}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty DO setup response.");
  return data;
}

export async function fetchDOSetup2(itemGroupId: string): Promise<DOSetup2Response> {
  const query = new URLSearchParams({ item_group: itemGroupId });
  const { data, error } = await fetchWithCookie<DOSetup2Response>(
    `${apiRoutesPortalMasters.DELIVERY_ORDER_SETUP_2}?${query.toString()}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty item group setup response.");
  return data;
}

export async function fetchSalesOrderLines(salesOrderId: string): Promise<{ data: SalesOrderLine[] }> {
  const query = new URLSearchParams({ sales_order_id: salesOrderId });
  const { data, error } = await fetchWithCookie<{ data: SalesOrderLine[] }>(
    `${apiRoutesPortalMasters.DELIVERY_ORDER_SALES_ORDER_LINES}?${query.toString()}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty sales order lines response.");
  return data;
}

export async function getDOById(id: string, coId?: string, menuId?: string): Promise<DODetails> {
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
  if (!companyId) throw new Error("Company ID (co_id) is required to fetch DO details");

  const query = new URLSearchParams({ sales_delivery_order_id: id, co_id: companyId });
  if (menuId) query.set("menu_id", menuId);

  const { data, error } = await fetchWithCookie<DODetails>(
    `${apiRoutesPortalMasters.DELIVERY_ORDER_GET_BY_ID}?${query.toString()}`,
    "GET"
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from DO API");
  return data;
}

export async function createDO(payload: CreateDORequest): Promise<CreateDOResponse> {
  const { data, error } = await fetchWithCookie<CreateDOResponse>(
    apiRoutesPortalMasters.DELIVERY_ORDER_CREATE, "POST", payload
  );
  if (error) throw new Error(error);
  return data ?? { message: "Delivery order created successfully." };
}

export async function updateDO(payload: SaveDORequest): Promise<CreateDOResponse> {
  const { data, error } = await fetchWithCookie<CreateDOResponse>(
    apiRoutesPortalMasters.DELIVERY_ORDER_UPDATE, "PUT", payload
  );
  if (error) throw new Error(error);
  return data ?? { message: "Delivery order updated successfully." };
}

export async function openDO(doId: string, branchId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.DELIVERY_ORDER_OPEN, "POST", { sales_delivery_order_id: doId, branch_id: branchId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from open API");
  return data;
}

export async function cancelDraftDO(doId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.DELIVERY_ORDER_CANCEL_DRAFT, "POST", { sales_delivery_order_id: doId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from cancel draft API");
  return data;
}

export async function sendDOForApproval(doId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.DELIVERY_ORDER_SEND_FOR_APPROVAL, "POST", { sales_delivery_order_id: doId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from send for approval API");
  return data;
}

export async function approveDO(doId: string, menuId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.DELIVERY_ORDER_APPROVE, "POST", { sales_delivery_order_id: doId, menu_id: menuId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from approve API");
  return data;
}

export async function rejectDO(doId: string, reason: string, menuId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.DELIVERY_ORDER_REJECT, "POST", { sales_delivery_order_id: doId, reason, menu_id: menuId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from reject API");
  return data;
}

export async function reopenDO(doId: string): Promise<StatusChangeResponse> {
  const { data, error } = await fetchWithCookie<StatusChangeResponse>(
    apiRoutesPortalMasters.DELIVERY_ORDER_REOPEN, "POST", { sales_delivery_order_id: doId }
  );
  if (error) throw new Error(error);
  if (!data) throw new Error("Empty response from reopen API");
  return data;
}
