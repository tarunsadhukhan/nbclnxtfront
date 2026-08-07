# Sales Pages — Part 1: Quotation, Sales Order

Last verified: 2026-06-12

> Scope: the first two documents of the chain. All pages are Portal pages — list pages filter by
> `selectedBranches` from `useSidebarContext`; create pages resolve `co_id` via
> `useSelectedCompanyCoId` and read `mode`/`id`/`branch_id`/`menu_id` from search params.
> BE file paths are relative to `../vowerp3be/`.

## Quotation

The offer document: items + rates quoted to a customer, with per-line GST. Full approval
workflow (see `approval-flows.md §Quotation`). Doc prefix `SQ`.

- List page: `src/app/dashboardportal/sales/quotation/page.tsx` — DataGrid via `QUOTATION_TABLE`,
  status `Chip`s (Approved/Rejected color-coded), branch filter from sidebar; row actions
  `router.push` to `createQuotation?mode=view|edit&id=...&branch_id=...`.
- Create/edit/view: `quotation/createQuotation/page.tsx` (smart container; mode via `?mode=&id=`).
  Note: this folder uses `components/` (not `_components/`). Built on the shared transaction kit
  (`TransactionWrapper`, `useDeferredOptionCache`, `useTransactionSetup`, `useTransactionPreview`,
  `ItemSelectionDialog` from `src/components/ui/transaction`).
- How it works:
  - hooks/: `useQuotationFormState`, `useQuotationLineItems` (cascade resets, trailing blank row),
    `useQuotationSelectOptions`, `useQuotationFormSchemas` (header + footer MuiForm schemas),
    `useQuotationAddresses` (customer branch addresses), `useQuotationTaxCalculations` (GST),
    `useQuotationFormSubmission`, `useQuotationApproval` (status + action handlers; permissions
    come from the `permissions` block of `get_quotation_by_id` — see approval-flows.md)
  - types/: `quotationTypes.ts` (all types in one file)
  - utils/: `quotationConstants.ts` (`QUOTATION_STATUS_IDS`, frozen empties, `DISCOUNT_MODE`),
    `quotationFactories.ts`, `quotationMappers.ts`, `quotationCalculations.ts`
  - components/: `QuotationHeaderForm`, `QuotationLineItemsTable`, `QuotationFooterForm`,
    `QuotationTotalsDisplay`, `QuotationApprovalBar`, `QuotationPreview`
- Service: `src/utils/quotationService.ts`
- Endpoints (const → URL → BE file `src/sales/quotation.py`, prefix `/salesQuotation`):

| api.ts const | URL | Purpose |
|---|---|---|
| `QUOTATION_TABLE` | `/get_quotation_table` | Paginated list (used by list page directly) |
| `QUOTATION_SETUP_1` / `QUOTATION_SETUP_2` | `/get_quotation_setup_1`, `/get_quotation_setup_2` | Dropdown/setup data (customers, brokers, item groups / per-group items+UOM) |
| `QUOTATION_GET_BY_ID` | `/get_quotation_by_id` | Load for edit/view (+ `permissions` when `menu_id` passed) |
| `QUOTATION_CREATE` / `QUOTATION_UPDATE` | `/create_quotation`, `/update_quotation` | Save draft (21) |
| `QUOTATION_OPEN` `QUOTATION_CANCEL_DRAFT` `QUOTATION_SEND_FOR_APPROVAL` `QUOTATION_APPROVE` `QUOTATION_REJECT` `QUOTATION_REOPEN` | `/open_quotation` ... `/reopen_quotation` | Approval lifecycle (see approval-flows.md) |

- Scope: list filters by sidebar branches; create defaults company/branch from sidebar and locks
  `branch_id` from the URL in edit/view mode.
- Approval: **yes** — full lifecycle, value-based on `net_amount`; bar `QuotationApprovalBar.tsx`.

## Sales Order

Confirms the sale, optionally pre-filled from approved quotation lines (`get_quotation_lines`).
The most invoice-type-sensitive document: per-type header extension blocks, hessian bale/MT
conversion, additional charges. Full approval workflow (see `approval-flows.md §Sales Order`).
Doc prefix `SO`. In-folder doc: `createSalesOrder/invoiceTypeDoc.md` (per-type behavior).

- List page: `salesOrder/page.tsx` — DataGrid via `SALES_ORDER_TABLE`, same chip/navigation
  pattern as Quotation.
- Create/edit/view: `salesOrder/createSalesOrder/page.tsx` (also uses `components/`).
- How it works:
  - hooks/: `useSalesOrderFormState`, `useSalesOrderLineItems` (+ unit test),
    `useSalesOrderSelectOptions`, `useSalesOrderFormSchemas`, `useSalesOrderFormSubmission`,
    `useSalesOrderApproval`, `useSalesOrderTaxCalculations` (GST), plus **invoice-type extension
    schemas**: `useSalesOrderJuteSchema` (Raw Jute, mukam dropdown), `useSalesOrderJuteYarnSchema`,
    `useSalesOrderGovtskgSchema`
  - types/: `salesOrderTypes.ts`
  - utils/: `salesOrderConstants.ts`, `salesOrderFactories.ts`, `salesOrderMappers.ts`,
    `salesOrderTotals.ts` (+ test), `hessianCalculations.ts` (+ test) — thin re-export of the
    shared `src/utils/hessianCalculations.ts` (mirror of BE `src/sales/hessian_calculations.py`)
  - components/: `SalesOrderHeaderForm`, `SalesOrderLineItemsTable`, `SalesOrderTotalsDisplay`,
    `AdditionalChargesSection` (also imported by Sales Invoice), `SalesOrderApprovalBar`,
    `SalesOrderPreview`
  - Govt Sacking transport charges (CONCOR/RAIL/ROAD → printing/handling rates per 100 pcs) come
    from the module-shared `sales/utils/govtskgTransportCharges.ts`.
- Service: `src/utils/salesOrderService.ts`
- Endpoints (BE file `src/sales/salesOrder.py`, prefix `/salesOrder`):

| api.ts const | URL | Purpose |
|---|---|---|
| `SALES_ORDER_TABLE` | `/get_sales_order_table` | Paginated list |
| `SALES_ORDER_SETUP_1` / `SALES_ORDER_SETUP_2` | `/get_sales_order_setup_1`, `/get_sales_order_setup_2` | Setup data incl. company-mapped invoice types + **approved quotations** (status 3) |
| `SALES_ORDER_QUOTATION_LINES` | `/get_quotation_lines` | Lines of a chosen approved quotation to pre-fill |
| `SALES_ORDER_BY_ID` | `/get_sales_order_by_id` | Load for edit/view (+ extension blocks + `permissions`) |
| `SALES_ORDER_CREATE` / `SALES_ORDER_UPDATE` | `/create_sales_order`, `/update_sales_order` | Save draft (21) incl. GST, hessian, additional charges, type extensions |
| `SALES_ORDER_OPEN` `SALES_ORDER_CANCEL_DRAFT` `SALES_ORDER_SEND_FOR_APPROVAL` `SALES_ORDER_APPROVE` `SALES_ORDER_REJECT` `SALES_ORDER_REOPEN` | `/open_sales_order` ... `/reopen_sales_order` | Approval lifecycle |

- Scope: list + create both read `selectedBranches` from `useSidebarContext`; every call carries
  `co_id`/`branch_id`.
- Approval: **yes** — full lifecycle, value-based on net amount; bar `SalesOrderApprovalBar.tsx`.
- Extension tables written on save: `sales_order_jute(_dtl)`, `sales_order_juteyarn`,
  `sales_order_govtskg(_dtl)`, `sales_order_dtl_hessian`, `sales_order_additional(_gst)`.
