# Sales Module — Review Findings (2026-07)

A full review of the Sales module (Quotation → Sales Order → Delivery Order → Sales Invoice,
plus reports and jute tally) across `vowerp3ui` and `vowerp3be`. Each item was found by a
reviewer and confirmed by an independent adversarial verifier against the source.

Legend: **[FIXED]** = corrected in this change · **[OPEN]** = documented for a follow-up
(needs a coordinated change or a product decision). Paths are repo-relative.

---

## 0. Systemic security issue — cross-company access control (OPEN, highest priority)

Every sales transaction (quotation, sales order, delivery order, invoice) exposes its
by-id endpoints — `update`, `approve`, `reject`, `cancel`, `open`, `send-for-approval`,
`reopen`, and the `get_*_by_id` loaders — with a **primary-key-only `WHERE`** and **no
`co_id` (company) scoping**. Because a tenant DB holds every company's rows, a portal user
scoped to company A can pass company B's document id and read, overwrite, approve, reject,
or cancel B's document.

Confirmed endpoints (all `vowerp3be/src/sales/`):

| Transaction | Endpoints with PK-only scoping |
|-------------|--------------------------------|
| Quotation | `update_quotation` (quotation.py:675), `approve` (:979), `reject` (:1017), `open` (:831), `cancel_draft` (:895), `send_for_approval` (:936), `reopen` (:1049) |
| Sales Order | `update_sales_order` (salesOrder.py:1029), `approve` (:1508), `reject` (:1545), `open` (:1379), `cancel_draft` (:1439), `send` (:1473), `reopen` (:1576) |
| Delivery Order | `update_delivery_order` (deliveryOrder.py:701), `approve` (:1004), `reject` (:1041), `open` (:875), `cancel_draft` (:935), `send` (:969), `reopen` (:1072) |
| Sales Invoice | `update_sales_invoice` (salesInvoice.py:2488), `approve` (:3050), `reject` (:3088), `open` (:2897), `cancel_draft` (:2975), `send` (:3012), `reopen` (:3118) |

Additionally, the four `update_*` endpoints have **no status guard** — an already-Approved
(3), Pending-Approval (20), or Closed (5) document can be edited: its detail/GST rows are
delete-reinserted with new quantities, bypassing the approval workflow. For DOs this
silently corrupts the parent SO's outstanding balances (approved DO qty feeds
`vw_sales_order_outstanding.do_consumed_qty`).

**Recommended remediation (coordinated FE + BE):**
1. BE: thread `co_id` into every by-id query — join `branch_mst` and add `AND bm.co_id = :co_id`
   to the existence check and to `get_*_with_approval_info` / the `update_*_status` helpers;
   return 404 on mismatch. Make `co_id` a required payload/query field on these endpoints.
2. FE: send `co_id` on the workflow POST calls in the sales services (currently they send only
   the doc id / branch_id / menu_id).
3. Add an editable-status guard to `update_*` (allow only Draft 21 / Open 1).

This was left OPEN deliberately: it touches ~24 endpoints and the shared approval helpers
(`src/common/approval_utils.py`), and needs multi-company integration testing before shipping.

---

## 1. Approval-permission bypass on Reject (menu_id) — FIXED

`process_rejection` (`src/common/approval_utils.py`) only verifies the approver's permission
**when `menu_id` is provided**. The Delivery-Order and Sales-Invoice reject calls omitted it,
so any authenticated portal user could reject any pending DO/invoice.

- **[FIXED]** `deliveryOrderService.rejectDO` and `useDeliveryOrderApproval.handleReject` now send `menu_id`.
- **[FIXED]** `salesInvoiceService.rejectInvoice` and `useSalesInvoiceApproval.handleReject` now send `menu_id`.
- Quotation and Sales Order reject already sent `menu_id` (verified).

---

## 2. Cross-company data bleed in setup lists — FIXED

`get_govtskg_transport_charge_rates` (query.py) selected `co_id` but never filtered on it, so
Govt-Sacking transport rates from **every** company were returned to the SO and Invoice setup
screens, producing duplicate/wrong auto-charges.

- **[FIXED]** Query now scopes `AND (:co_id IS NULL OR co_id = :co_id OR co_id IS NULL)` and both
  `get_sales_order_setup_1` and `get_sales_invoice_setup_1` pass the request's `co_id`.

`get_invoice_list_report_query` (reportQueries.py) omitted the soft-delete filter, so cancelled/
deleted invoices appeared in the report and its Excel export.

- **[FIXED]** Added `AND (si.active = 1 OR si.active IS NULL)` (the SO report already filtered `active`).

---

## 3. Edit-mode round-trip data loss (Quotation) — FIXED

`get_quotation_by_id` returns header key `party` / `quotationExpiryDate` and per-line
`discountType` + a nested `gst { igstAmount, cgstAmount, sgstAmount, igstPercent, … }`. The
frontend mappers read the wrong keys, so opening a saved quotation to view/edit **lost** the
customer, expiry date, discount type, tax % and the whole GST split — and an edit-save then
persisted the zeroed values.

- **[FIXED]** `quotationMappers.mapQuotationDetailsToFormValues` reads `party` / `quotationExpiryDate`.
- **[FIXED]** `useQuotationLineItems.mapLineToEditable` reads the nested `gst` object and `discountType`.
- **[FIXED]** `quotationService.QuotationLine` / `QuotationDetails` types updated to the real backend shape.

## 3b. e-Invoice submission history never rendered — FIXED

`get_sales_invoice_by_id` attaches history under `e_invoice_submission_history` (snake_case)
while the invoice mapper read `eInvoiceSubmissionHistory`, so the header's submission-history
panel was always empty.

- **[FIXED]** `salesInvoiceMappers` reads the snake_case key (with camelCase fallback).

## 3c. Delivery-Order SO extension block never rendered — FIXED

`DOSalesOrderExtensionDisplay` paired each invoice-type id with the **wrong** extension key
(id 4→`jute`, 5→`govtskg`, 3→`juteyarn`) while the backend keys them 3→`govtskg`, 4→`juteyarn`,
5→`jute`. Every branch missed, so the SO extension block never showed.

- **[FIXED]** Conditions corrected to the canonical id→key mapping.

---

## 4. Invoice GST not recalculated when state resolves — FIXED

`useSalesInvoiceLineItems.recalcLine` only ran on manual per-line edits. When the company /
shipping state ids resolved **after** lines were imported from a DO/SO (or loaded from a saved
invoice), the lines kept the zero/wrong-split GST computed at import time and that got persisted.

- **[FIXED]** Added a guarded effect that recomputes each line's GST split when
  `companyBranchStateId` / `shippingBranchStateId` resolve or change (only touches lines whose
  value actually differs, so no render loop).

## 4b. Freight CGST/SGST rounding imbalance — FIXED

`computeFreightTax` rounded both halves independently, so for odd-paise totals `cgst + sgst`
could differ from the total by ₹0.01 (the backend balances the halves).

- **[FIXED]** `sgst = total − cgst`, matching the backend.

---

## 5. UX-flow improvements — DONE

- **[FIXED]** **Sales landing page** (`sales/page.tsx`) was a bare `<div>Sales Module</div>` stub.
  It is now a module hub: a document-flow strip (Quotation → SO → DO → Invoice) and
  permission-aware cards for every section with inline "New …" actions (gated by `create`
  permission), plus Reports and Jute Tally.
- **[FIXED]** **Status filter + richer status chips** on all four list pages. Previously the
  chips only distinguished Approved/Rejected (everything else rendered identical grey) and there
  was no way to filter by status. A new shared `SalesStatusChip` colours all seven lifecycle
  states, and a `SalesStatusFilter` dropdown drives a new `status_id` query param supported by
  all four backend list endpoints.
- **[FIXED]** **Company-switch reactivity.** The four lists read `co_id` from raw `localStorage`
  inside the fetch callback, so switching company in the sidebar never refetched, and a failed
  read silently dropped `co_id` (returning *all* companies' rows). They now derive `co_id` from
  `SidebarContext.selectedCompany`, which is a hook dependency, so the list refetches on company
  change and never silently unscopes.
- **[FIXED]** **Shared list utilities** (`sales/utils/salesListShared.tsx`) de-duplicate the
  date/currency formatters, response parsing and query building that were copied across the four
  pages, removing the `any` casts and `Math.random()` row-id fallbacks. Invoice list now shows a
  real **DO No.** column (backend join added) and SO list keeps its Quotation link.
- **[FIXED]** Removed committed `console.log`s that dumped the full quotation payload; replaced a
  hardcoded header colour in the reports page with a theme token.

---

## 6. Confirmed but OPEN (need a decision or a larger change)

Correctness / workflow (frontend):
- **Quotation header totals not sent** (`useQuotationFormSubmission.ts:76`) — `net_amount` /
  `gross_amount` / `round_off_value` are never in the payload, so value-based approval evaluates
  the quotation as amount 0 and the list shows no amount. Needs the header total fields added to
  the request type + backend column mapping.
- **Quotation customer-change remount wipes fields** (`quotation/createQuotation/page.tsx:208`) —
  bumping `formKey` without syncing `initialValues` reverts every header/footer field the user
  entered.
- **Quotation item-change leaves stale amounts** (`useQuotationLineItems.ts:127`) — net/discount/
  tax not recomputed on item switch.
- **SO Phase-B populate effect reverts edits** (`salesOrder/createSalesOrder/page.tsx:630`) — the
  one-shot guard is reset by the effect's cleanup, so cache/brokerage dep changes re-run it and
  overwrite user edits in edit mode.
- **SO discount round-trip corruption** (`useSalesOrderFormSubmission.ts:56`) — payload sends the
  total discount amount as `discounted_rate` (a per-unit field), so reloading corrupts discount math.
- **SO quotation-line import** — maps post-tax `total_amount` into the pre-tax `amount`
  (`useSalesOrderLineItems.ts:719`) and reads `sales_quotation_dtl_id` where the API returns
  `quotation_lineitem_id` (`:708`), so quotation→SO line traceability is always NULL.
- **SO govtskg transport auto-populate runs in view mode** (`page.tsx:471`) — a shadowed `mode`
  variable hides the missing guard, clobbering persisted additional charges.
- **DO GST from a non-existent `party_branch`** (`deliveryOrder/createDeliveryOrder/page.tsx:215`,
  `:484`) — GST is 0 for manually-created DOs and lost on edited lines; also computed with a stale
  closure on SO import. Decision: derive `partyState` from `billing_to` (which round-trips) or add
  `party_branch` to the schema + backend.
- **DO over-delivery** (`useDeliveryOrderLineItems.ts:369`, BE `deliveryOrder.py:563`) — imported
  SO lines use full ordered qty instead of `bal_do_qty`, and nothing validates DO qty ≤ remaining.
- **DO line subset delete not wired** (`page.tsx:863`); **switching SO keeps prior SO's lines**
  (`page.tsx:459`); **E-Way Bill / Broker fields dropped** on submit (`useDeliveryOrderFormSubmission.ts:82`, BE `deliveryOrder.py:508`).
- **SO/DO/Invoice fallback approval permissions omit `canSendForApproval`** so the 1→20 step can
  dead-end when backend permissions are unavailable; the shared `ApprovalActionsBar` renders
  Approve on Open, making Send-for-Approval effectively unreachable (`ApprovalActionsBar.tsx:135`).

Correctness (backend):
- **Invoice create never persists `hessian_dtl` / `govtskg_dtl`** (`salesInvoice.py:2048`) — per-line
  detail lost.
- **Invoice: no qty validation vs the linked DO/SO** (`salesInvoice.py:1725`); **jute `invoice_amount`
  not reduced by `claim_amount`** (`:1925`, `effective_amount` computed then discarded).
- **Type-7 freight update re-fetches sources with `co_id=None`** (`salesInvoice.py:2267`), bypassing
  the tenancy check enforced on create.
- **Document/invoice-number generation is race-prone** (MAX+1 without lock) across all four, and the
  sequence is computed from the **client-supplied** `branch_id` rather than the document's stored branch.
- **Jute tally MR number uses the invoice's branch prefix** instead of the MR's own branch
  (`reportQueries.py:218`).

Quality / dead code / minor:
- Print/preview windows interpolate unescaped user + DB strings into `document.write` HTML
  (`SalesInvoicePreview.tsx:157`, `DeliveryOrderPreview.tsx:112`) — same-origin stored-HTML injection.
- Dead code: `SalesOrderApprovalBar.tsx`, `SalesOrderLinesDialog.tsx` / `DeliveryOrderApprovalBar.tsx`,
  `salesInvoiceMappers.mapFormValuesToApiPayload` (used only by tests).
- Hardcoded colours in `QuotationPreview.tsx:138`, `DeliveryOrderPreview.tsx:269`,
  `DOSalesOrderExtensionDisplay.tsx`; default `quotation_date` uses UTC (`quotationFactories.ts:35`,
  wrong calendar day for IST before 05:30); several `any` casts remained in preview code.

---

## Verification

- `vowerp3ui`: `npx tsc --noEmit` clean for all sales files; `pnpm test` sales suite 95/95 pass
  (two stale tests updated to the real camelCase API contract).
- `vowerp3be`: all edited modules parse; the 14 pre-existing sales test failures (stale mocks /
  DB-dependent) are unchanged by this work.
