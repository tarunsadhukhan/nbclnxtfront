# Procurement Pages — Part 2: Material Inspection, SR, Bill Pass, DR/CR Note, Reports

Last verified: 2026-06-12

> Scope: the post-receipt half of the chain. These features call `apiRoutesPortalMasters`
> constants directly from their pages (no dedicated service file except Bill Pass).
> BE file paths are relative to `../vowerp3be/`.

## Material Inspection

Quality gate on an Inward. Completing inspection sets `inspection_check = TRUE`, freezing the
Inward and deriving `approved_qty = inward_qty - rejected_qty` per line.

- List page: `materialInspection/page.tsx` — pending list via `INSPECTION_PENDING_LIST`.
- Inspect page: `materialInspection/inspect/page.tsx` — per-line rejected qty + reasons +
  accepted item make; preview `inspect/components/MaterialInspectionPreview.tsx`.
- Endpoints (BE `src/procurement/material_inspection.py`, prefix `/materialInspection`):

| api.ts const | URL | Purpose |
|---|---|---|
| `INSPECTION_PENDING_LIST` | `/get_pending_inspection_list` | Inwards awaiting inspection |
| `INSPECTION_GET_BY_INWARD_ID` | `/get_inspection_by_inward_id/{inward_id}` | Load inspection view |
| `INSPECTION_COMPLETE` | `/complete_inspection` | Finalize (`inspection_check = TRUE`) |

- Scope: co/branch from sidebar. Approval: no — but it is the gate for SR and DR/CR.

## Store Receipt (SR)

Values the accepted quantities (rates, additional charges) and carries its own simplified approval
flow on `proc_inward.sr_status` (see `approval-flows.md §SR`). Only inspected inwards appear.

- List page: `sr/page.tsx` — `SR_PENDING_LIST` (`/get_sr_pending_list`).
- Create/edit: `sr/createSR/page.tsx`.
- How it works: hooks/ `useSRFormState`, `useSRLineItems`, `useSRAdditionalCharges`,
  `useSRApproval`; components/ `SRHeaderForm`, `SRLineItemsTable`, `SRAdditionalCharges`,
  `SRTotalsDisplay`, `SRApprovalBar`, `SRPreview`.
- Endpoints (BE `src/procurement/sr.py`, prefix `/storesReceipt`):

| api.ts const | URL | Purpose |
|---|---|---|
| `SR_PENDING_LIST` | `/get_sr_pending_list` | Inspected inwards pending SR |
| `SR_GET_BY_INWARD_ID` | `/get_sr_by_inward_id/{inward_id}` | Load SR (keyed by inward) |
| `SR_SAVE` | `/save_sr` | Save draft (sr_status 21) |
| `SR_OPEN` / `SR_APPROVE` / `SR_REJECT` | `/open_sr`, `/approve_sr`, `/reject_sr` | Lifecycle (no send-for-approval step) |

- Approval: **yes (simplified)** — Draft 21 → Open 1 → Approved 3 / Rejected 4 on `sr_status`;
  bar `SRApprovalBar.tsx`.

## Bill Pass

Final payable computation: SR total minus DR/CR adjustments, plus supplier invoice capture.
Backend enforces `WHERE sr_status = 3` — only approved SRs can be bill-passed. **No approval
workflow** of its own (Save / Complete actions).

- List page: `billPass/page.tsx` — `BILL_PASS_LIST`, CSV via `BILL_PASS_DOWNLOAD`.
- Detail (read-only after completion): `billPass/[id]/page.tsx`.
- Edit: `billPass/edit/page.tsx` — invoice fields, Save vs Complete; preview
  `edit/components/BillPassPreview.tsx`.
- Service: `src/utils/billPassService.ts`.
- Endpoints (BE `src/procurement/billpass.py`, prefix `/billPass`):

| api.ts const | URL | Purpose |
|---|---|---|
| `BILL_PASS_LIST` | `/get_bill_pass_list` | List with SR/DRCR totals + net payable |
| `BILL_PASS_GET_BY_ID` | `/get_bill_pass_by_id/{inward_id}` | Header + SR lines + DRCR notes + invoice fields |
| `BILL_PASS_UPDATE` | `/update_bill_pass/{inward_id}` | Save or complete |
| `BILL_PASS_DOWNLOAD` | `/download_bill_pass_list` | CSV export |

## Debit/Credit Note (DR/CR)

Adjustment documents raised against an inward (e.g. for rejected quantities); they net off in Bill
Pass. Simplified approval flow (see `approval-flows.md §DR/CR`).

- List page: `drcrNote/page.tsx` — `DRCR_NOTE_LIST`; create dialog posts `/create_drcr_note`;
  open/approve/reject actions inline.
- View page: `drcrNote/view/page.tsx` — `DRCR_NOTE_GET_BY_ID`.
- Endpoints (BE `src/procurement/drcr_note.py`, prefix `/drcrNote`):

| api.ts const | URL | Purpose |
|---|---|---|
| `DRCR_NOTE_LIST` | `/get_drcr_note_list` | List |
| `DRCR_NOTE_GET_BY_ID` | `/get_drcr_note_by_id/{drcr_note_id}` | Load |
| (page builds URL) | `/get_inward_for_drcr_note/{inward_id}` | Source inward data (requires approved SR) |
| (page builds URL) | `/create_drcr_note` | Create draft (21) |
| `DRCR_NOTE_OPEN` / `DRCR_NOTE_APPROVE` / `DRCR_NOTE_REJECT` | `/open_drcr_note`, `/approve_drcr_note`, `/reject_drcr_note` | Lifecycle |

- Approval: **yes (simplified)** — Draft 21 → Open 1 → Approved 3 / Rejected 4.

## Reports

- Page: `reports/page.tsx` with `reports/_components/`: `ReportFilters`, `AllIndents`,
  `AllIndentItemwise`, `IndentsWaitingForPo`, `OutstandingIndentList`, `AllPurchaseOrders`,
  `OutstandingPoList`, `SrRegister`, `BillPassReport`, configured in `reportConfig.ts`.
- Endpoints (BE `src/procurement/reports.py`, prefix `/procurementReports`):

| api.ts const | URL | Purpose |
|---|---|---|
| `INDENT_ITEMWISE_REPORT` / `INDENT_ITEMWISE_DOWNLOAD` | `/indent-itemwise`(`/download`) | Indent item-wise report + CSV |
| `PO_ITEMWISE_REPORT` / `PO_ITEMWISE_DOWNLOAD` | `/po-itemwise`(`/download`) | PO item-wise report + CSV |
| `SR_ITEMWISE_REPORT` / `SR_ITEMWISE_DOWNLOAD` | `/sr-itemwise`(`/download`) | SR item-wise report + CSV |

- Module landing page: `procurement/page.tsx` (navigation tiles).
- Shared: `procurement/_shared/PrintHeader.tsx` — print header used by previews.
