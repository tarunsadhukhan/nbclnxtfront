---
name: module-sales
description: Cross-repo guide for the Sales module (quotation, sales order, delivery order, sales invoice, jute tally download, reports). Use when asked which sales page does what, which backend endpoints a page uses, or how sales approval workflows behave. Covers vowerp3ui pages and vowerp3be routers.
tools: Read, Grep, Glob
---

# Module Guide: Sales

Last verified: 2026-06-12

## 1. Module overview

The sales chain: a **Quotation** offers items/rates to a customer, an approved quotation becomes
a **Sales Order**, dispatch happens via a **Delivery Order**, and billing via a **Sales Invoice**
(which can also source directly from an approved SO). Persona: **Portal** — tenant DB, tables
prefixed `sales_`, everything scoped by `co_id`/`branch_id` from the sidebar (`SidebarContext`).
Each downstream picker shows only **Approved (3)** upstream documents.

Behavior branches per **invoice type** (`invoice_type_mst`, company-mapped via
`invoice_type_co_map`): 1 Regular, 2 Hessian, 3 Govt Sacking, 4 Jute Yarn, 5 Raw Jute,
7 Govt Sacking Freight (built off approved type-3 invoices). The SO/DO/SI create folders each
carry an in-folder `invoiceTypeDoc.md` describing per-type form behavior. All four transactions
have the full approval workflow (21→1→20→3/4/6, multi-level, value-based).

## 2. Knowledge docs (read for detail)

- `docs/claude/modules/sales/_index.md` — chain diagram + file registry
- `docs/claude/modules/sales/pages-01-quotation-salesorder.md`
- `docs/claude/modules/sales/pages-02-delivery-invoice-reports.md`
- `docs/claude/modules/sales/backend-map.md`
- `docs/claude/modules/sales/approval-flows.md`

(From vowerp3be, prepend `../vowerp3ui/`.)

## 3. Page quick-map

| FE page (src/app/dashboardportal/sales/...) | Purpose | BE prefix | Detailed in |
|---|---|---|---|
| `page.tsx` | Module landing (stub) | — | — |
| `quotation/page.tsx` + `quotation/createQuotation/` | Quotation list / create-edit-view (GST, customer addresses) | `/salesQuotation` | pages-01 |
| `salesOrder/page.tsx` + `salesOrder/createSalesOrder/` | SO list / create-edit-view (invoice-type extensions, hessian, additional charges) | `/salesOrder` | pages-01 |
| `deliveryOrder/page.tsx` + `deliveryOrder/createDeliveryOrder/` | DO list / create-edit-view (from approved SO) | `/salesDeliveryOrder` | pages-02 |
| `salesInvoice/page.tsx` + `salesInvoice/createSalesInvoice/` | Invoice list / create-edit-view (from approved DO or SO; govt-sacking freight flow; transporter) | `/salesInvoice` | pages-02 |
| `juteTallyDownload/page.tsx` | Raw Jute approved-invoice Tally xlsx export + MR preview | `/salesReports` | pages-02 |
| `reports/page.tsx` | SO list + invoice list reports (xlsx downloads) | `/salesReports` | pages-02 |

Services: `src/utils/quotationService.ts`, `salesOrderService.ts`, `deliveryOrderService.ts`,
`salesInvoiceService.ts`, `salesReportService.ts`. Module-shared utils:
`sales/utils/govtskgTransportCharges.ts`, `src/utils/hessianCalculations.ts` (mirror of BE
`hessian_calculations.py`).

## 4. Backend quick-map

| Router (../vowerp3be/src/sales/) | main.py prefix | Highlights |
|---|---|---|
| `quotation.py` | `/api/salesQuotation` | Full approval set; `permissions` embedded in get_by_id |
| `salesOrder.py` | `/api/salesOrder` | Full approval set + `get_quotation_lines`; type extension tables |
| `deliveryOrder.py` | `/api/salesDeliveryOrder` | Full approval set + `get_sales_order_lines` (approved SOs only) |
| `salesInvoice.py` | `/api/salesInvoice` | Full approval set + DO/SO line feeds, `govt_sacking_source*`, transporter branches, e-invoice history |
| `reports.py` | `/api/salesReports` | jute-tally-download (xlsx for Tally), jute-mr-summary, SO/invoice lists + downloads |

61 endpoints, 1:1 with `apiRoutesPortalMasters` constants (`src/utils/api.ts`).
Registered in `../vowerp3be/src/main.py:204-208`. Constants/status/invoice-type IDs:
`../vowerp3be/src/sales/constants.py`.

## 5. Approval workflow summary

Statuses: 21 Draft → 1 Open → 20 Pending → 3 Approved / 4 Rejected / 6 Cancelled (reopen 6→21,
4→1). **All four transactions** carry the full multi-level, value-based workflow via
`../vowerp3be/src/common/approval_utils.py` — bars `QuotationApprovalBar`, `SalesOrderApprovalBar`,
`DeliveryOrderApprovalBar`, `SalesInvoiceApprovalBar`. No sales `get_approval_flow` endpoint:
permissions ride on `get_*_by_id` (`calculate_approval_permissions`). Status 5 Closed is defined
but unused. State diagrams + endpoint tables: `docs/claude/modules/sales/approval-flows.md`.

## 6. Related docs & skills

- In-folder type docs: `salesOrder/createSalesOrder/invoiceTypeDoc.md`,
  `deliveryOrder/createDeliveryOrder/invoiceTypeDoc.md`,
  `salesInvoice/createSalesInvoice/invoiceTypeDoc.md`
- Hessian mirror contract: `../vowerp3be/src/sales/hessian_calculations.py` ↔
  `src/utils/hessianCalculations.ts`
- Skills: `wire-api` (new endpoints), `add-approval-workflow` (lifecycle endpoints),
  `add-menu` (sidebar entries) — canonical in `../vowerp3be/.claude/skills/`

## 7. Maintenance

Last verified date is at the top of this file and each knowledge doc.

Drift signals — while answering, watch for: a referenced path that no longer exists; a page folder
under `sales/` not in the quick-map; an endpoint listed here that is absent from the router
(or vice versa); approval behavior in code contradicting the state diagrams.

When drift is detected: **flag the staleness in your answer and ask the user whether to update this
agent / the knowledge docs. Never silently self-edit.** On approval: update the affected part file
and quick-map row, then bump the Last verified stamps.
