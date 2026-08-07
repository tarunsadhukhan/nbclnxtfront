# Sales Pages — Part 2: Delivery Order, Sales Invoice, Jute Tally Download, Reports

Last verified: 2026-06-12

> Scope: the back half of the chain plus the two report pages. Same Portal conventions as Part 1:
> list pages filter by `selectedBranches`, report pages take `selectedCompany` (branch options
> derived from `selectedCompany.branches`) from `useSidebarContext`.
> BE file paths are relative to `../vowerp3be/`.

## Delivery Order

Dispatch document against an **approved Sales Order** — DO setup lists only SOs with
`status_id = 3`, and `get_sales_order_lines` pulls the chosen SO's lines. Full approval workflow
(see `approval-flows.md §Delivery Order`). Doc prefix `DO`. In-folder doc:
`createDeliveryOrder/invoiceTypeDoc.md`.

- List page: `deliveryOrder/page.tsx` — DataGrid via `DELIVERY_ORDER_TABLE`, status chips,
  navigation to `createDeliveryOrder?mode=...`.
- Create/edit/view: `deliveryOrder/createDeliveryOrder/page.tsx` (uses `components/`).
- How it works:
  - hooks/: `useDeliveryOrderFormState`, `useDeliveryOrderLineItems`,
    `useDeliveryOrderSelectOptions`, `useDeliveryOrderFormSchemas`,
    `useDeliveryOrderFormSubmission`, `useDeliveryOrderApproval`
  - types/: `deliveryOrderTypes.ts`
  - utils/: `deliveryOrderConstants.ts`, `deliveryOrderFactories.ts`, `deliveryOrderMappers.ts`,
    `deliveryOrderCalculations.ts`
  - components/: `DeliveryOrderHeaderForm`, `DeliveryOrderLineItemsTable`, `DeliveryOrderFooter`,
    `SalesOrderLinesDialog` (pick SO lines to deliver), `DOSalesOrderExtensionDisplay`
    (read-only render of the source SO's jute/govtskg/juteyarn extension data),
    `DeliveryOrderApprovalBar`, `DeliveryOrderPreview`
- Service: `src/utils/deliveryOrderService.ts` (`fetchDOSetup1/2`, `fetchSalesOrderLines`,
  `getDOById`, `createDO`, `updateDO`, `openDO` ... `reopenDO`)
- Endpoints (BE file `src/sales/deliveryOrder.py`, prefix `/salesDeliveryOrder`):

| api.ts const | URL | Purpose |
|---|---|---|
| `DELIVERY_ORDER_TABLE` | `/get_delivery_order_table` | Paginated list |
| `DELIVERY_ORDER_SETUP_1` / `DELIVERY_ORDER_SETUP_2` | `/get_delivery_order_setup_1`, `/get_delivery_order_setup_2` | Setup data incl. **approved SOs** (status 3) |
| `DELIVERY_ORDER_SALES_ORDER_LINES` | `/get_sales_order_lines` | Lines of the chosen approved SO |
| `DELIVERY_ORDER_GET_BY_ID` | `/get_delivery_order_by_id` | Load for edit/view (+ `permissions`) |
| `DELIVERY_ORDER_CREATE` / `DELIVERY_ORDER_UPDATE` | `/create_delivery_order`, `/update_delivery_order` | Save draft (21) |
| `DELIVERY_ORDER_OPEN` `DELIVERY_ORDER_CANCEL_DRAFT` `DELIVERY_ORDER_SEND_FOR_APPROVAL` `DELIVERY_ORDER_APPROVE` `DELIVERY_ORDER_REJECT` `DELIVERY_ORDER_REOPEN` | `/open_delivery_order` ... `/reopen_delivery_order` | Approval lifecycle |

- Approval: **yes** — bar `DeliveryOrderApprovalBar.tsx`.

## Sales Invoice

The billing document — the largest page of the module. Sources lines from an **approved DO** or
directly from an **approved SO** (setup_1 returns both `approved_delivery_orders` and
`approved_sales_orders`). Heavy invoice-type branching; the Govt Sacking **Freight** type (7)
builds an invoice off existing approved Govt Sacking (type 3) invoices via a dedicated source
picker. Full approval workflow (see `approval-flows.md §Sales Invoice`). Doc prefix `SI`.
In-folder doc: `createSalesInvoice/invoiceTypeDoc.md`.

- List page: `salesInvoice/page.tsx` — DataGrid via `SALES_INVOICE_TABLE`, same pattern.
- Create/edit/view: `salesInvoice/createSalesInvoice/page.tsx` (uses `components/`; has its own
  `__tests__/` — `govt-sacking-freight.test.tsx`, `transporter-fields.test.tsx`).
- How it works:
  - hooks/: `useSalesInvoiceFormState`, `useSalesInvoiceLineItems`,
    `useSalesInvoiceSelectOptions`, `useSalesInvoiceFormSchemas`,
    `useSalesInvoiceFormSubmission`, `useSalesInvoiceApproval`
  - types/: `salesInvoiceTypes.ts`
  - utils/: `salesInvoiceConstants.ts`, `salesInvoiceFactories.ts`, `salesInvoiceMappers.ts`,
    `salesInvoiceCalculations.ts`, `freightTax.ts`, `buildFreightPreviewProps.ts`,
    `buildFreightCreatePreviewProps.ts`, `invoicePrintFormatters.ts`,
    `salesInvoiceFields.test.ts`
  - components/: `SalesInvoiceHeaderForm`, `SalesInvoiceLineItemsTable`, `SalesInvoiceFooter`,
    `GovtSackingFreightForm`, `GovtSackingSourcePicker`, `GovtSackingSourcePreview`,
    `SalesInvoiceApprovalBar`, `SalesInvoicePreview`
  - Transporter fields resolve GST/address/state via `getTransporterBranches`; hessian math
    reuses `src/utils/hessianCalculations.ts` (no brokerage on the invoice side — applied
    upstream on the SO); govt-sacking transport charges from `sales/utils/govtskgTransportCharges.ts`.
- Service: `src/utils/salesInvoiceService.ts`
- Endpoints (BE file `src/sales/salesInvoice.py`, prefix `/salesInvoice`):

| api.ts const | URL | Purpose |
|---|---|---|
| `SALES_INVOICE_TABLE` | `/get_sales_invoice_table` | Paginated list |
| `SALES_INVOICE_SETUP_1` / `SALES_INVOICE_SETUP_2` | `/get_sales_invoice_setup_1`, `/get_sales_invoice_setup_2` | Setup data incl. approved DOs + approved SOs |
| `SALES_INVOICE_DELIVERY_ORDER_LINES` | `/get_delivery_order_lines` | Lines of a chosen approved DO |
| `SALES_INVOICE_SALES_ORDER_LINES` | `/get_sales_order_lines` | Lines of a chosen approved SO (direct invoicing) |
| `SALES_INVOICE_BY_ID` | `/get_sales_invoice_by_id` | Load for edit/view (+ `permissions`, + `e_invoice_submission_history`) |
| `SALES_INVOICE_CREATE` / `SALES_INVOICE_UPDATE` | `/create_sales_invoice`, `/update_sales_invoice` | Save draft (21) incl. GST, freight, type extensions |
| `SALES_INVOICE_TRANSPORTER_BRANCHES` | `/get_transporter_branches` | Transporter branch GST/address options |
| `SALES_INVOICE_GOVT_SACKING_SOURCE_LIST` | `/govt_sacking_source_list` | Paginated picker of finalized type-3 invoices (freight flow) |
| `SALES_INVOICE_GOVT_SACKING_SOURCE` | `/govt_sacking_source/{invoice_id}` | Pre-fill data for a type-7 freight invoice — **dynamic URL**: service appends `/${invoiceId}` |
| `SALES_INVOICE_OPEN` `SALES_INVOICE_CANCEL_DRAFT` `SALES_INVOICE_SEND_FOR_APPROVAL` `SALES_INVOICE_APPROVE` `SALES_INVOICE_REJECT` `SALES_INVOICE_REOPEN` | `/open_sales_invoice` ... `/reopen_sales_invoice` | Approval lifecycle |

- Approval: **yes** — value-based on `invoice_amount`; bar `SalesInvoiceApprovalBar.tsx`.
- E-invoice: `../vowerp3be/src/sales/e_invoice_handler.py` is a structure-only placeholder
  (raises `NotImplementedError`); `get_sales_invoice_by_id` already returns
  `e_invoice_submission_history` for the UI.

## Jute Tally Download

Standalone export page for **Raw Jute** (type 5) **Approved** invoices in a date range, in the
exact single-sheet `Sales` xlsx column order Tally expects.

- Page: `src/app/dashboardportal/sales/juteTallyDownload/page.tsx` — branch Autocomplete +
  date range (defaults to current month); on-screen DataGrid preview via
  `fetchSalesJuteMrSummary` (one row per invoice with linked MR number/vehicle/challan/amounts),
  then `fetchSalesJuteTallyDownload` → `file-saver` `saveAs` for the xlsx.
- Service: `src/utils/salesReportService.ts`. Note: the download function uses **axios with
  `responseType: "blob"`** directly instead of `fetchWithCookie` (binary response).
- Endpoints (BE file `src/sales/reports.py`, prefix `/salesReports`):

| api.ts const | URL | Purpose |
|---|---|---|
| `SALES_REPORT_JUTE_MR_SUMMARY` | `/jute-mr-summary` | JSON preview rows (same filter scope as the download) |
| `SALES_REPORT_JUTE_TALLY_DOWNLOAD` | `/jute-tally-download` | Streaming xlsx attachment (row cap enforced; 400 if exceeded) |

- Scope: `selectedCompany` from sidebar (`co_id` required; `branch_id` optional).
- Approval: no.

## Reports

Dropdown-driven report hub with two reports, each a presentational component fed by
`salesReportService.ts`.

- Page: `src/app/dashboardportal/sales/reports/page.tsx` — report `Select`
  ("List of Sales Orders" / "List of Invoices"); hydration-safe (`mounted` guard because
  `useSidebarContext` differs between SSR and client). Note: this folder uses `_components/`
  (unlike the transaction pages, which use `components/`).
- Components: `reports/_components/SalesOrderListReport.tsx`, `InvoiceListReport.tsx`;
  types in `reports/types/reportTypes.ts`.
- Endpoints (BE file `src/sales/reports.py`, prefix `/salesReports`):

| api.ts const | URL | Purpose |
|---|---|---|
| `SALES_REPORT_SALES_ORDER_LIST` | `/sales-order-list` | JSON list of SOs in a date range |
| `SALES_REPORT_SALES_ORDER_LIST_DOWNLOAD` | `/sales-order-list-download` | xlsx download of the same |
| `SALES_REPORT_INVOICE_LIST` | `/invoice-list` | JSON list of invoices in a date range |
| `SALES_REPORT_INVOICE_LIST_DOWNLOAD` | `/invoice-list-download` | xlsx download of the same |

- Scope: `selectedCompany` from sidebar; branch options from `selectedCompany.branches`.
- Approval: no.
