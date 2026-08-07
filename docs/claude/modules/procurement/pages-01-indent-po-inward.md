# Procurement Pages — Part 1: Indent, Purchase Order, Inward

Last verified: 2026-06-12

> Scope: the first three documents of the chain. All pages are Portal pages — they take
> `co_id`/`branch_id` from the sidebar (`SidebarContext`) and pass them on every call.
> BE file paths are relative to `../vowerp3be/`.

## Indent

The request document: a department asks for items. Full approval workflow (see
`approval-flows.md §Indent`). Indent types: Regular / Open / BOM (`utils/indentConstants.ts`,
mirrored in BE `src/procurement/constants.py`).

- List page: `src/app/dashboardportal/procurement/indent/page.tsx` — DataGrid of indents with
  status chips, preview (`indent/components/IndentPreview.tsx`), CSV download.
- Create/edit/view: `indent/createIndent/page.tsx` (smart container; mode via `?mode=&id=`).
  Note: this folder uses `components/` (not `_components/`).
- How it works:
  - hooks/: `useIndentFormState` (values + formRef + formKey), `useIndentLineItems` (cascade
    resets, trailing blank row), `useIndentSelectOptions` (memoized options + label resolvers),
    `useIndentFormSchemas` (MuiForm schema), `useIndentApproval` (status + action handlers),
    `useIndentItemValidation` (+ unit test)
  - types/: `indentTypes.ts` (all types in one file)
  - utils/: `indentConstants.ts`, `indentFactories.ts`, `indentMappers.ts` (+ tests)
  - components/: `IndentHeaderForm`, `IndentLineItemsTable`, `IndentApprovalBar`
- Service: `src/utils/indentService.ts`
- Endpoints (const → URL → BE file `src/procurement/indent.py`):

| api.ts const | URL (`/procurementIndent` prefix) | Purpose |
|---|---|---|
| `INDENT_TABLE` | `/get_indent_table` | Paginated list (used by list page directly) |
| `INDENT_TABLE_DOWNLOAD` | `/download_indent_table` | CSV export |
| `GET_INDENT_SETUP_1` / `GET_INDENT_SETUP_2` | `/get_indent_setup_1`, `/get_indent_setup_2` | Dropdown/setup data |
| `GET_INDENT_BY_ID` | `/get_indent_by_id` | Load for edit/view |
| `GET_INDENT_LINES_BY_TITLE` | `/get_indent_lines_by_title` | BOM/open indent line lookup |
| `VALIDATE_ITEM_FOR_INDENT` | `/validate_item_for_indent` | Per-line duplicate/eligibility check |
| `INDENT_CREATE` / `INDENT_UPDATE` | `/create_indent`, `/update_indent` | Save draft (21) |
| `GET_APPROVAL_FLOW` | `/get_approval_flow` | Approval hierarchy levels for the doc |
| `INDENT_OPEN` `INDENT_CANCEL_DRAFT` `INDENT_SEND_FOR_APPROVAL` `INDENT_APPROVE` `INDENT_APPROVE_WITH_VALUE` `INDENT_REJECT` `INDENT_REOPEN` | `/open_indent` ... `/reopen_indent` | Approval lifecycle (see approval-flows.md) |

- Scope: header form defaults company/branch from sidebar; all queries filter by `co_id`/`branch_id`.
- Approval: **yes** — full lifecycle incl. approve-with-value; bar `IndentApprovalBar.tsx`.

## Purchase Order

Converts approved indent lines into a supplier order, with GST/tax calculations and additional
charges. Full approval workflow + clone (see `approval-flows.md §PO`).

- List page: `purchaseOrder/page.tsx` — list via `PO_TABLE`, download via `PO_TABLE_DOWNLOAD`;
  `purchaseOrder/components/IndentLineItemsDialog.tsx` lets the user pick approved indent lines.
- Create/edit/view: `purchaseOrder/createPO/page.tsx`.
- How it works:
  - hooks/: `usePOPageController` (orchestrates), `usePOFormState` (+ test), `usePOLineItems`,
    `usePOSelectOptions`, `usePOFormSchemas`, `usePOApproval`, `usePOTaxCalculations` (GST),
    `usePOAdditionalCharges`, `usePOAddresses` (supplier branch addresses), `usePOFormSubmission`
  - components/: `POHeaderForm`, `POLineItemsTable`, `POFooterForm`, `POTotalsDisplay`,
    `POAdditionalCharges`, `POApprovalBar`, `POPreview`
- Service: `src/utils/poService.ts`
- Endpoints (BE file `src/procurement/po.py`, prefix `/procurementPO`):

| api.ts const | URL | Purpose |
|---|---|---|
| `PO_TABLE` / `PO_TABLE_DOWNLOAD` | `/get_po_table`, `/download_po_table` | List + CSV |
| `GET_PO_SETUP_1` / `GET_PO_SETUP_2` | `/get_po_setup_1`, `/get_po_setup_2` | Setup data |
| `GET_ALL_APPROVED_INDENTS` | `/get_all_approved_indents` | Pick source indents |
| `GET_INDENT_LINE_ITEMS` | `/get_indent_line_items` | Lines of a chosen indent |
| `GET_SUPPLIER_BRANCHES` | `/get_supplier_branches` | Supplier branch/address options |
| `PO_VALIDATE_ITEM` | `/validate_item_for_po` | Per-line validation |
| `PO_CREATE` / `PO_UPDATE` / `PO_SAVE` | `/create_po`, `/update_po`, `/save_po` | Save draft |
| `GET_PO_BY_ID` | `/get_po_by_id` | Load for edit/view |
| `PO_OPEN` `PO_CANCEL_DRAFT` `PO_SEND_FOR_APPROVAL` `PO_APPROVE` `PO_REJECT` `PO_REOPEN` | `/open_po` ... `/reopen_po` | Approval lifecycle |
| `PO_CLONE` | `/clone_po` | Duplicate an existing PO as a new draft |

- Scope: company/branch from sidebar; GST breakup stored in `po_gst` parallel table.
- Approval: **yes** — bar `POApprovalBar.tsx`.

## Inward (GRN)

Goods receipt against an approved PO. **No approval workflow** — instead it gates on Material
Inspection: editing/cancelling is blocked once `inspection_check = TRUE`.

- List page: `inward/page.tsx` — `INWARD_TABLE` (`/get_inward_table`); shows `inspection_check` flag.
- Create/edit/view: `inward/createInward/page.tsx` — validates challan OR invoice required;
  cancel button only in edit mode while not inspected.
- How it works:
  - hooks/: `useInwardFormState`, `useInwardLineItems`, `useInwardSelectOptions`, `useInwardFormSchemas`
  - components/: `InwardHeaderForm`, `InwardLineItemsTable`, `InwardPreview`,
    `POLineItemsDialog` (pick approved-PO lines to receive)
  - types/ + utils/ follow the standard transaction layout
- Service: `src/utils/inwardService.ts`
- Endpoints (BE file `src/procurement/inward.py`, prefix `/procurementInward`):

| api.ts const | URL | Purpose |
|---|---|---|
| `INWARD_TABLE` | `/get_inward_table` | Paginated list (cancelled rows filtered) |
| `GET_INWARD_SETUP_1` / `GET_INWARD_SETUP_2` | `/get_inward_setup_1`, `/get_inward_setup_2` | Setup data |
| `GET_APPROVED_POS_BY_SUPPLIER` | `/get_approved_pos_by_supplier` | POs available to receive |
| `GET_PO_LINE_ITEMS_FOR_INWARD` | `/get_po_line_items` | Lines of the chosen PO |
| `GET_INWARD_BY_ID` | `/get_inward_by_id` | Load for edit/view |
| `INWARD_CREATE` / `INWARD_UPDATE` | `/create_inward`, `/update_inward` | Create (status 21) / update (blocked after inspection) |
| `INWARD_CANCEL` | `/cancel_inward` | Sets detail `status_id = 6`; 403 after inspection |

- Scope: company/branch from sidebar; doc number via `format_inward_no()` (`inward.py:34`).
- Approval: **no** — gated by inspection instead (see Part 2).
