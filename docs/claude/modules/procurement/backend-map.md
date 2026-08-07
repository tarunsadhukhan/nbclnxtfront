# Procurement Backend Map

Last verified: 2026-06-12

> Scope: every router in `../vowerp3be/src/procurement/` with its `main.py` prefix and endpoints.
> All routes are Portal persona — `Depends(get_tenant_db)` + `get_current_user_with_refresh`.
> Registered in `../vowerp3be/src/main.py:165-172`.

| Router file | Prefix | Endpoints |
|---|---|---|
| `indent.py` | `/api/procurementIndent` | GET `/validate_item_for_indent`, `/get_indent_setup_1`, `/get_indent_setup_2`, `/get_indent_lines_by_title`, `/get_indent_table`, `/get_all_approved_indents`, `/get_indent_by_id`, `/get_approval_flow`, `/download_indent_table`; POST `/create_indent`, `/approve_indent`, `/approve_indent_with_value`, `/open_indent`, `/cancel_draft_indent`, `/reopen_indent`, `/send_indent_for_approval`, `/reject_indent`; PUT `/update_indent` |
| `po.py` | `/api/procurementPO` | GET `/get_po_setup_1`, `/get_po_setup_2`, `/validate_item_for_po`, `/get_indent_line_items`, `/get_supplier_branches`, `/get_po_table`, `/get_po_by_id`, `/download_po_table`; POST `/create_po`, `/save_po`, `/approve_po`, `/open_po`, `/cancel_draft_po`, `/reopen_po`, `/send_po_for_approval`, `/reject_po`, `/clone_po`; PUT `/update_po` |
| `inward.py` | `/api/procurementInward` | GET `/get_inward_table`, `/get_inward_setup_1`, `/get_inward_setup_2`, `/get_approved_pos_by_supplier`, `/get_po_line_items`, `/get_inward_by_id`; POST `/create_inward`, `/cancel_inward`; PUT `/update_inward` |
| `material_inspection.py` | `/api/materialInspection` | GET `/get_pending_inspection_list`, `/get_inspection_by_inward_id/{inward_id}`; POST `/complete_inspection` |
| `sr.py` | `/api/storesReceipt` | GET `/get_sr_pending_list`, `/get_sr_by_inward_id/{inward_id}`; POST `/save_sr`, `/open_sr`, `/approve_sr`, `/reject_sr` |
| `drcr_note.py` | `/api/drcrNote` | GET `/get_drcr_note_list`, `/get_drcr_note_by_id/{drcr_note_id}`, `/get_inward_for_drcr_note/{inward_id}`; POST `/create_drcr_note`, `/open_drcr_note`, `/approve_drcr_note`, `/reject_drcr_note` |
| `billpass.py` | `/api/billPass` | GET `/get_bill_pass_list`, `/get_bill_pass_by_id/{inward_id}`, `/download_bill_pass_list`; PUT `/update_bill_pass/{inward_id}` |
| `reports.py` | `/api/procurementReports` | GET `/indent-itemwise`(`/download`), `/po-itemwise`(`/download`), `/sr-itemwise`(`/download`) |

Shared SQL lives in `query.py` (transactions) and `reportQueries.py` (reports). Key tables:
`proc_indent(_dtl)`, `proc_po(_dtl)`, `po_gst`, `proc_po_additional`, `proc_inward(_dtl)` — the
inward header also carries SR (`sr_status`, `sr_no`) and bill-pass fields; DR/CR notes in their own
tables keyed to `inward_id`.
