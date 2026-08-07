# Sales Approval Flows

Last verified: 2026-06-12

> Scope: status lifecycles for all four sales documents. Status IDs are global: 21 Draft · 1 Open ·
> 20 Pending Approval · 3 Approved · 4 Rejected · 5 Closed · 6 Cancelled. All four share the **same
> full multi-level lifecycle** driven by `../vowerp3be/src/common/approval_utils.py`
> (`process_approval` / `process_rejection`, value-based on the document amount). Status 5 (Closed)
> is defined in `SALES_STATUS_IDS` but no sales router ever sets it today.

## Shared shape (all four documents)

- Save (`create_*` / `update_*`) keeps the document at **Draft 21**.
- `/open_*` (21 → 1) requires `branch_id` and generates the document number (max + 1 per
  branch + financial year, prefixes SQ/SO/DO/SI).
- `/cancel_draft_*` (21 → 6) — draft only.
- `/send_*_for_approval` (1 → 20, `approval_level = 1`).
- `/approve_*` (requires `menu_id`) → `process_approval`: stays at 20 with incremented level
  until the final level, then 3. Value-based limits use `net_amount` (quotation/SO/DO) or
  `invoice_amount` (invoice).
- `/reject_*` (accepts `reason`) → `process_rejection` (20 → 4).
- `/reopen_*`: 6 → 21, 4 → 1; any other status is a 400.
- Action permissions come from the `permissions` block of `get_*_by_id` (when `menu_id` is
  passed), computed by `calculate_approval_permissions` — there is **no** sales
  `get_approval_flow` endpoint. FE fallback logic per status lives in each `use*Approval` hook.

## Quotation

Endpoints on `/api/salesQuotation` (BE `src/sales/quotation.py`); FE `useQuotationApproval.ts` +
`QuotationApprovalBar.tsx` via `quotationService.ts`.

```mermaid
stateDiagram-v2
    [*] --> Draft21: create_quotation / update_quotation
    Draft21 --> Open1: open_quotation (doc no. generated)
    Draft21 --> Cancelled6: cancel_draft_quotation
    Open1 --> Pending20: send_quotation_for_approval (level=1)
    Pending20 --> Pending20: approve_quotation (next level)
    Pending20 --> Approved3: approve_quotation (final level)
    Pending20 --> Rejected4: reject_quotation (reason)
    Rejected4 --> Open1: reopen_quotation
    Cancelled6 --> Draft21: reopen_quotation
```

## Sales Order

Endpoints on `/api/salesOrder` (BE `src/sales/salesOrder.py`); FE `useSalesOrderApproval.ts` +
`SalesOrderApprovalBar.tsx` via `salesOrderService.ts`. Approved (3) is the gate for downstream
documents: only approved SOs appear in the DO and direct-invoice pickers.

```mermaid
stateDiagram-v2
    [*] --> Draft21: create_sales_order / update_sales_order
    Draft21 --> Open1: open_sales_order
    Draft21 --> Cancelled6: cancel_draft_sales_order
    Open1 --> Pending20: send_sales_order_for_approval
    Pending20 --> Pending20: approve_sales_order (next level)
    Pending20 --> Approved3: approve_sales_order (final level)
    Pending20 --> Rejected4: reject_sales_order (reason)
    Rejected4 --> Open1: reopen_sales_order
    Cancelled6 --> Draft21: reopen_sales_order
```

## Delivery Order

Endpoints on `/api/salesDeliveryOrder` (BE `src/sales/deliveryOrder.py`); FE
`useDeliveryOrderApproval.ts` + `DeliveryOrderApprovalBar.tsx` via `deliveryOrderService.ts`.
Approved DOs feed the invoice picker.

```mermaid
stateDiagram-v2
    [*] --> Draft21: create_delivery_order / update_delivery_order
    Draft21 --> Open1: open_delivery_order
    Draft21 --> Cancelled6: cancel_draft_delivery_order
    Open1 --> Pending20: send_delivery_order_for_approval
    Pending20 --> Pending20: approve_delivery_order (next level)
    Pending20 --> Approved3: approve_delivery_order (final level)
    Pending20 --> Rejected4: reject_delivery_order (reason)
    Rejected4 --> Open1: reopen_delivery_order
    Cancelled6 --> Draft21: reopen_delivery_order
```

## Sales Invoice

Endpoints on `/api/salesInvoice` (BE `src/sales/salesInvoice.py`); FE `useSalesInvoiceApproval.ts`
+ `SalesInvoiceApprovalBar.tsx` via `salesInvoiceService.ts`. Value-based approval uses
`invoice_amount`. Finalized **Govt Sacking (type 3)** invoices become eligible sources for a
Govt Sacking Freight (type 7) invoice via `/govt_sacking_source_list`.

```mermaid
stateDiagram-v2
    [*] --> Draft21: create_sales_invoice / update_sales_invoice
    Draft21 --> Open1: open_sales_invoice
    Draft21 --> Cancelled6: cancel_draft_sales_invoice
    Open1 --> Pending20: send_sales_invoice_for_approval
    Pending20 --> Pending20: approve_sales_invoice (next level)
    Pending20 --> Approved3: approve_sales_invoice (final level)
    Pending20 --> Rejected4: reject_sales_invoice (reason)
    Rejected4 --> Open1: reopen_sales_invoice
    Cancelled6 --> Draft21: reopen_sales_invoice
```

## No approval workflow

- **Jute Tally Download** and **Reports** — read-only; they consume only Approved (3) documents
  (the Tally export additionally filters `invoice_type = RAW_JUTE`).
