# Sales Backend Map

Last verified: 2026-06-12

> Scope: every router in `../vowerp3be/src/sales/` with its `main.py` prefix and endpoints.
> All routes are Portal persona — `Depends(get_tenant_db)` + `get_current_user_with_refresh`.
> Imported in `../vowerp3be/src/main.py:77-81`, registered in `src/main.py:204-208`.

| Router file | Prefix | Endpoints |
|---|---|---|
| `quotation.py` | `/api/salesQuotation` | GET `/get_quotation_setup_1`, `/get_quotation_setup_2`, `/get_quotation_table`, `/get_quotation_by_id`; POST `/create_quotation`, `/open_quotation`, `/cancel_draft_quotation`, `/send_quotation_for_approval`, `/approve_quotation`, `/reject_quotation`, `/reopen_quotation`; PUT `/update_quotation` |
| `salesOrder.py` | `/api/salesOrder` | GET `/get_sales_order_setup_1`, `/get_sales_order_setup_2`, `/get_quotation_lines`, `/get_sales_order_table`, `/get_sales_order_by_id`; POST `/create_sales_order`, `/open_sales_order`, `/cancel_draft_sales_order`, `/send_sales_order_for_approval`, `/approve_sales_order`, `/reject_sales_order`, `/reopen_sales_order`; PUT `/update_sales_order` |
| `deliveryOrder.py` | `/api/salesDeliveryOrder` | GET `/get_delivery_order_setup_1`, `/get_delivery_order_setup_2`, `/get_sales_order_lines`, `/get_delivery_order_table`, `/get_delivery_order_by_id`; POST `/create_delivery_order`, `/open_delivery_order`, `/cancel_draft_delivery_order`, `/send_delivery_order_for_approval`, `/approve_delivery_order`, `/reject_delivery_order`, `/reopen_delivery_order`; PUT `/update_delivery_order` |
| `salesInvoice.py` | `/api/salesInvoice` | GET `/get_sales_invoice_setup_1`, `/get_sales_invoice_setup_2`, `/get_delivery_order_lines`, `/get_sales_order_lines`, `/get_sales_invoice_table`, `/govt_sacking_source_list`, `/govt_sacking_source/{invoice_id}`, `/get_transporter_branches`, `/get_sales_invoice_by_id`; POST `/create_sales_invoice`, `/open_sales_invoice`, `/cancel_draft_sales_invoice`, `/send_sales_invoice_for_approval`, `/approve_sales_invoice`, `/reject_sales_invoice`, `/reopen_sales_invoice`; PUT `/update_sales_invoice` |
| `reports.py` | `/api/salesReports` | GET `/jute-tally-download`, `/jute-mr-summary`, `/sales-order-list`, `/sales-order-list-download`, `/invoice-list`, `/invoice-list-download` |

61 endpoints total (12 + 13 + 13 + 17 + 6); every one has a matching `apiRoutesPortalMasters`
constant in `src/utils/api.ts` (1:1, no dead constants, no orphans). The only dynamic URL is
`/govt_sacking_source/{invoice_id}` — `salesInvoiceService.fetchGovtSackingSource` appends the
path segment to `SALES_INVOICE_GOVT_SACKING_SOURCE`.

## Supporting modules (not routers)

| File | Role |
|---|---|
| `query.py` | All transaction SQL: per-document insert/update/delete/status/table/by-id query fns plus the cross-document feeders (`get_approved_quotations_query`, `get_quotation_lines_for_order`, `get_approved_sales_orders_query`, `get_sales_order_lines_for_delivery`, `get_approved_delivery_orders_query`, `get_delivery_order_lines_for_invoice`, `get_sales_order_lines_for_invoice`, `get_approved_sales_orders_for_invoice`) — all feeders filter `status_id = 3` |
| `reportQueries.py` | SQL for the `/salesReports` endpoints |
| `constants.py` | `SALES_STATUS_IDS` (incl. CLOSED 5 — defined but unused by routers), `SALES_STATUS_LABELS`, `SALES_DOC_TYPES` (SQ/SO/DO/SI), `INVOICE_TYPE_IDS` (1 Regular, 2 Hessian, 3 Govt Sacking, 4 Jute Yarn, 5 Raw Jute, 7 Govt Sacking Freight), `resolve_invoice_type_code()`, `is_govt_skg_invoice()` — never hard-code these IDs |
| `hessian_calculations.py` | Hessian bale/MT math (`compute_hessian_fields`) — mirror contract with FE `src/utils/hessianCalculations.ts`; change both or neither |
| `e_invoice_handler.py` | GST e-invoice portal integration **placeholder** — `submit_invoice_to_portal` raises `NotImplementedError`; audit-history query already wired into `get_sales_invoice_by_id` |

## Conventions shared by all four transaction routers

- Approval transitions delegate to `../vowerp3be/src/common/approval_utils.py`:
  `process_approval` (auto 1→20, level checks, value-based limits via the document amount,
  final → 3) and `process_rejection` (→ 4, stores reason). `get_*_by_id` embeds a `permissions`
  block from `calculate_approval_permissions` when `menu_id` is passed — there is **no separate
  `get_approval_flow` endpoint** in sales (unlike procurement).
- `/open_*` generates the document number: max + 1 per `branch_id` + financial year; numbers are
  formatted with the procurement `format_indent_no` helper using `SALES_DOC_TYPES` prefixes.
- Header/detail/GST rows are rewritten on update (`delete_*_dtl` + reinsert); GST breakup lives
  in `*_dtl_gst` parallel tables.
- Watch the singular-`sale` typo tables `sale_invoice_jute` and `sale_invoice_govtskg_dtl`
  (production names — do not rename).
