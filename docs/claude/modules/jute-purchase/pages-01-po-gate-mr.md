# Jute Purchase Pages — Part 1: Jute PO, Gate Entry, MR

Last verified: 2026-06-12

> Scope: the first half of the chain — ordering and receiving. All pages are Portal pages.
> List pages read `co_id` from `localStorage["sidebar_selectedCompany"]` (the sidebar's persisted
> selection); create/edit pages use the `useSelectedCompanyCoId` hook. BE paths are relative to
> `../vowerp3be/`.

## Jute PO

Order to a jute supplier, organised by **mukam** (growing region) with vehicle type/quantity and
quality-wise line items. Full approval workflow with multi-level support (see
`approval-flows.md §Jute PO`). The `jute_po` table has **no `co_id` column** — the backend scopes
every query through a `branch_mst` join.

- List page: `src/app/dashboardportal/jutePurchase/po/page.tsx` — DataGrid via `JUTE_PO_TABLE`,
  xlsx export via `JUTE_PO_DOWNLOAD` (`useExcelDownload` + `fetchExcelBlob`), edit gated by
  `createStatusBasedEditCheck`.
- Create/edit/view: `po/createPO/page.tsx` (mode via `?mode=&id=`).
- How it works:
  - hooks/: `useJutePOFormState`, `useJutePOLineItems`, `useJutePOSelectOptions`,
    `useJutePOFormSchemas`, `useJutePOApproval` (calls the lifecycle endpoints directly)
  - components/: `JutePOHeaderForm`, `JutePOLineItemsTable`, `JutePOTotalsDisplay`,
    `JutePOApprovalBar`, `JutePOPreview` (+ `index.ts` barrel)
  - types/: `jutePOTypes.ts`; utils/: `jutePOCalculations.ts`, `jutePOConstants.ts`,
    `jutePOFactories.ts`, `jutePOMappers.ts`
- Service: none — page and hooks call `apiRoutesPortalMasters` constants directly.
- Endpoints (BE `src/juteProcurement/jutePO.py`, prefix `/jutePO`):

| api.ts const | URL | Purpose |
|---|---|---|
| `JUTE_PO_TABLE` / `JUTE_PO_DOWNLOAD` | `/get_jute_po_table`, `/download_po_table` | List + xlsx |
| `JUTE_PO_CREATE_SETUP` | `/jute_po_create_setup` | Dropdown/setup data |
| `JUTE_PO_BY_ID` | `/get_jute_po_by_id/{jute_po_id}` | Load for edit/view |
| `JUTE_PO_PARTIES_BY_SUPPLIER` | `/get_parties_by_supplier/{supplier_id}` | Supplier → party cascade |
| `JUTE_PO_QUALITIES_BY_ITEM` | `/get_qualities_by_item/{item_grp_id}` | Item group → quality cascade |
| `JUTE_PO_CREATE` / `JUTE_PO_UPDATE` | `/jute_po_create`, `/jute_po_update/{id}` | Save (21); update allowed in 21 or 1 |
| `JUTE_PO_OPEN` `JUTE_PO_APPROVE` `JUTE_PO_REJECT` `JUTE_PO_CANCEL_DRAFT` `JUTE_PO_REOPEN` | `/open_jute_po/{id}` ... `/reopen_jute_po/{id}` | Lifecycle (see approval-flows.md) |
| (unused) `JUTE_PO_SUPPLIERS_BY_MUKAM`, `JUTE_PO_LINE_ITEMS` | `/get_suppliers_by_mukam/{mukam_id}`, `/get_jute_po_line_items/{id}` | Endpoints exist; no FE caller today |

- Specifics: vehicle weight tolerance check on create (`VEHICLE_WEIGHT_TOLERANCE_PERCENT = 5` in
  `jutePO.py`); create validates branch/supplier/party belong to `co_id` ("defense in depth").
- Approval: **yes** — bar `JutePOApprovalBar.tsx`; **no send-for-approval endpoint** — the shared
  `process_approval` utility auto-transitions 1 → 20 on the first approve when `menu_id` is sent.

## Gate Entry

Vehicle IN/OUT at the factory gate. **Creates the `jute_mr` row** (merged table) with a gate-entry
number per branch + financial year and `status_id = 1` ("IN" — numerically the same as Open).
No status lifecycle of its own: completion is tracked by `out_time` presence, not `status_id`,
and **OUT is blocked until QC (`qc_check = 1`) is complete**.

- List page: `gateEntry/page.tsx` — `JUTE_GATE_ENTRY_TABLE`, xlsx via `JUTE_GATE_ENTRY_DOWNLOAD`;
  rows become view-only once OUT is completed (`createBooleanFieldEditCheck`).
- Create/edit/view: `gateEntry/createGateEntry/page.tsx` — a **single self-contained file**
  (no hooks/ or components/ folders, deviating from the standard transaction layout). Three
  actions: **IN** (create mode → POST `JUTE_GATE_ENTRY_CREATE`, then redirect to edit), **Save**
  (PUT `JUTE_GATE_ENTRY_UPDATE/{id}`), **OUT** (same PUT with `action: "OUT"` + `out_date`/
  `out_time`; client-side blocked if QC incomplete — backend keeps `status_id` unchanged).
- Endpoints (BE `src/juteProcurement/juteGateEntry.py`, prefix `/juteGateEntry`; the id path
  param is `jute_mr_id`):

| api.ts const | URL | Purpose |
|---|---|---|
| `JUTE_GATE_ENTRY_TABLE` / `JUTE_GATE_ENTRY_DOWNLOAD` | `/get_jute_gate_entry_table`, `/download_gate_entry_table` | List + xlsx |
| `JUTE_GATE_ENTRY_CREATE_SETUP` | `/jute_gate_entry_create_setup` | Setup data |
| `JUTE_GATE_ENTRY_BY_ID` | `/get_jute_gate_entry_by_id/{jute_mr_id}` | Load for edit/view |
| `JUTE_GATE_ENTRY_CREATE` | `/jute_gate_entry_create` | IN — inserts `jute_mr` + `jute_mr_li` |
| `JUTE_GATE_ENTRY_UPDATE` | `/jute_gate_entry_update/{jute_mr_id}` | Save / OUT (`action: "OUT"`) |
| `JUTE_GATE_ENTRY_PARTIES_BY_SUPPLIER` / `JUTE_GATE_ENTRY_QUALITIES_BY_ITEM` / `JUTE_GATE_ENTRY_PO_DETAILS` | `/get_parties_by_supplier/{id}`, `/get_qualities_by_item/{id}`, `/get_po_details/{po_id}` | Cascades + PO auto-fill — **called by the Material Inspection create page**, not by this page |

- Approval: **no** — see `approval-flows.md §No lifecycle`.

## Material Receipt (MR)

Finalisation of a received lot. MRs are **created by Gate Entry** (there is no MR create endpoint);
they arrive on this screen already at status 1 Open. Approval (final level) is the big event:
MR date becomes mandatory, `branch_mr_no` **and** `bill_pass_no` are generated per branch + FY, and
totals / claim / roundoff / net / **194Q TDS** are computed (0.1% above ₹50,00,000 cumulative party
value in the FY — `TDS_CAP_INR` in `constants.py`). See `approval-flows.md §MR`.

- List page: `mr/page.tsx` — `JUTE_MR_TABLE`; xlsx via `mrService.fetchJuteMRDownload`
  (`JUTE_MR_DOWNLOAD`).
- Edit: `mr/edit/page.tsx` — note the **module-level layout**: `components/`, `hooks/`, `types/`,
  `utils/` sit at `mr/` (shared by list + edit), not inside `edit/`.
- How it works:
  - components/: `MRHeaderForm`, `MRApprovalBar`, `MRApprovalDialog` (collects MR date / party
    branch for final approval), `MRPreview` (+ `MRPreview.test.tsx`)
  - hooks/: `useMRLineItems`, `useMRApproval` (derives permissions, wraps `mrService` actions)
  - types/: `mrTypes.ts`; utils/: `mrConstants.ts` (`MR_STATUS_IDS` incl. 13), `mrService.ts`
  - `edit/weightDistribution.test.ts` — unit test for the weight-distribution logic
  - Edit page computes `shortage_kgs = actual_weight × (moisture excess % + claim_dust %)` and
    `accepted_weight = actual_weight − shortage_kgs` (whole kg) per line
- Service: `mr/utils/mrService.ts` — **local to the page tree** (not `src/utils/`): `openMR`,
  `pendingMR`, `approveMR`, `rejectMR`, `cancelMR`, `fetchJuteMRDownload`.
- Endpoints (BE `src/juteProcurement/mr.py`, prefix `/juteMR`):

| api.ts const | URL | Purpose |
|---|---|---|
| `JUTE_MR_TABLE` / `JUTE_MR_DOWNLOAD` | `/get_mr_table`, `/download_mr_table` | List + xlsx |
| `JUTE_MR_BY_ID` | `/get_mr_by_id?id=` | Load header + lines |
| `JUTE_MR_WAREHOUSE_OPTIONS` / `JUTE_MR_PARTY_BRANCHES` | `/get_warehouse_options`, `/get_party_branches` | Dropdowns |
| `JUTE_MR_UPDATE` | `/update_mr/{mr_id}` | Save header + lines; recalculates accepted weights and `mr_weight` |
| `JUTE_MR_OPEN` `JUTE_MR_PENDING` `JUTE_MR_APPROVE` `JUTE_MR_REJECT` `JUTE_MR_CANCEL` | `/open_mr`, `/pending_mr`, `/approve_mr`, `/reject_mr`, `/cancel_mr` | Lifecycle (see approval-flows.md) |
| (unused) `JUTE_MR_AGENT_OPTIONS` | `/get_agent_options` | Endpoint exists; no FE caller today |

- Backend also exposes `PUT /change_status/{mr_id}` (generic status set with party validation when
  leaving Draft) — not wired to any FE constant.
- Approval: **yes** — multi-level when `menu_id` is sent (shared `process_approval`); bar
  `MRApprovalBar.tsx` + `MRApprovalDialog.tsx`. The `jute_mr` table carries production typos
  `frieght_paid` and `brokrage_rate` — quote them as-is, never "fix" the spelling.
