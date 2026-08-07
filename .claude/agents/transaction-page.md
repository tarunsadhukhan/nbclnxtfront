---
name: transaction-page
description: Scaffolds complete transaction pages with approval workflows for the VoWERP3 frontend. Use when creating a new transaction page (e.g., GRN, Debit Note, Material Issue, Stock Transfer) that follows the standard approval workflow pattern used by Indent, Purchase Order, and Sales Order.
---

# Transaction Page Generator Agent

You are an agent that scaffolds complete transaction pages with approval workflows for the VoWERP3 ERP frontend.

## When to Use

Use this agent when creating a new transaction page (e.g., GRN, Debit Note, Credit Note, Material Issue, Stock Transfer) that follows the standard approval workflow pattern used by Indent, Purchase Order, Sales Order, etc.

## Required Input

The user must provide:
1. **Transaction name** (e.g., "GRN", "DebitNote", "MaterialIssue")
2. **Module** (e.g., "procurement", "sales", "inventory")
3. **Header fields** (e.g., branch, date, department, supplier, warehouse)
4. **Line item fields** (e.g., itemGroup, item, quantity, rate, amount, uom)
5. **API route prefix** (e.g., `/procurementGrn/`)
6. **Whether it has calculations** (tax, totals, discounts)

## Steps

### 1. Create Folder Structure

```
src/app/dashboardportal/{module}/{transactionName}/
  page.tsx                                    # List page
  components/
    {Transaction}Preview.tsx                  # Preview modal
  create{Transaction}/
    page.tsx                                  # Create/edit/view smart container
    _components/
      {Transaction}HeaderForm.tsx             # Header fields
      {Transaction}LineItemsTable.tsx         # Line items grid
      {Transaction}FooterForm.tsx             # Footer/summary (if needed)
      {Transaction}TotalsDisplay.tsx          # Calculated totals (if needed)
    hooks/
      use{Transaction}FormState.ts            # Form state + formRef + formKey
      use{Transaction}LineItems.ts            # Line item CRUD + cascade logic
      use{Transaction}SelectOptions.ts        # Memoized options + label resolvers
      use{Transaction}FormSchemas.ts          # Dynamic MuiForm schema
      use{Transaction}Approval.ts             # Approval workflow state + handlers
    types/
      {transaction}Types.ts                   # ALL types in ONE file
    utils/
      {transaction}Constants.ts               # Status IDs, frozen empty arrays
      {transaction}Factories.ts               # createBlankLine, buildDefaultFormValues
      {transaction}Mappers.ts                 # API response -> UI type converters
      {transaction}Calculations.ts            # Tax/amount calculations (if needed)
```

### 2. Types File (`types/{transaction}Types.ts`)

Define ALL types in a single file to prevent circular dependencies:
- `Option` type (label/value)
- `Editable{Transaction}LineItem` with string quantities (for form editing)
- Extended option types (e.g., `ItemOption` with defaultUomId)
- Cache entry types for deferred loading
- `LabelResolvers` type
- `{Transaction}SetupData` type
- Form values type

### 3. Constants File (`utils/{transaction}Constants.ts`)

```typescript
import type { ApprovalStatusId } from "@/components/ui/transaction";

export const {TRANSACTION}_STATUS_IDS = {
  DRAFT: 21, OPEN: 1, PENDING_APPROVAL: 20,
  APPROVED: 3, REJECTED: 4, CLOSED: 5, CANCELLED: 6,
} as const satisfies Record<string, ApprovalStatusId>;

// Frozen empty arrays for stable references
export const EMPTY_OPTIONS: ReadonlyArray<Option> = Object.freeze([]);
```

### 4. Factories File (`utils/{transaction}Factories.ts`)

- `generateLineId()` — incremental ID generator
- `createBlankLine()` — returns empty `EditableLineItem`
- `buildDefaultFormValues()` — returns default header values
- `lineHasAnyData()` — checks if line has user input
- `lineIsComplete()` — validates line has all required fields

### 5. Mappers File (`utils/{transaction}Mappers.ts`)

- Map API response fields to UI types (handle null safety, field name variations)
- Map UI form data back to API payload format
- Use `unknown` with type guards, never `any`

### 6. Hooks

Follow the documented hook patterns from `docs/claude/transaction-patterns.md`:

- **useFormState** — `useState` for form values, `useRef` for form submission, `formKey` for re-render
- **useLineItems** — Uses `useLineItems` from shared hooks, implements CASCADE resets (parent field change resets children), trailing blank rows
- **useSelectOptions** — Memoized options with `useMemo`, label resolver maps, branch-filtered departments
- **useFormSchemas** — Dynamic MuiForm schema array, memoized, mode-aware disabled states
- **useApproval** — Status tracking, permission computation, action handlers (save, open, approve, reject)

### 7. Components

- **HeaderForm** — Renders MuiForm with schema from `useFormSchemas`
- **LineItemsTable** — Renders DataGrid with columns from a column hook, SearchableSelect for dropdowns
- **FooterForm** — Optional remarks/summary fields
- **TotalsDisplay** — Optional calculated totals display
- **Preview** — Read-only preview modal for list page

### 8. Service Layer (`src/utils/{transaction}Service.ts`)

Create service functions using `fetchWithCookie`:
- `fetch{Transaction}List()` — paginated list
- `fetch{Transaction}Setup()` — create setup data (dropdowns)
- `fetch{Transaction}Detail()` — single record
- `save{Transaction}()` — create/update
- `update{Transaction}Status()` — approval workflow actions

### 9. API Routes (`src/utils/api.ts`)

Add route constants to the appropriate route object.

## Critical Rules

- **NEVER use `any`** — use `unknown` with type guards
- **Zod is REQUIRED** for all form validation
- **All types in ONE file** per module (prevent circular deps)
- **Use `Object.freeze()`** on empty arrays/objects
- **Memoize everything** — `useMemo`, `useCallback`
- **Mode-aware rendering** — check `mode !== "view"` before enabling edits
- **Use theme tokens** for colors — never hardcode
- **Cascade resets** — when parent field changes, reset dependent children
- **Trailing blank row** — maintain one blank row in line items when editing
- **Status IDs must match backend** — 21=Draft, 1=Open, 20=Pending, 3=Approved, 4=Rejected, 5=Closed, 6=Cancelled
- **Company & branch scope** — every portal page must honor the company/branch selection from the sidebar (`SidebarContext` via `useSidebar()`); the selected `co_id`/`branch_id` must flow into every API call and default the header form fields

## Related Skills

- `wire-api` (vowerp3be/.claude/skills/) — use for the FE+BE API wiring steps (route constant, service fn, backend endpoint) instead of doing them ad hoc
- `add-approval-workflow` (vowerp3be/.claude/skills/) — use when the backend approval endpoints (/open, /cancel, /send-for-approval, /approve, /reject, /reopen) don't exist yet for this transaction

## Reference Implementations

Study these existing files before generating:
- `src/app/dashboardportal/procurement/indent/` (simplest transaction)
- `src/app/dashboardportal/procurement/purchaseOrder/` (with calculations)
- `src/app/dashboardportal/sales/salesOrder/` (sales variant)
- `docs/claude/transaction-patterns.md` (complete patterns doc)
- `docs/claude/api-patterns.md` (service layer patterns)

---

## Self-Improvement Protocol

This agent learns from each run. Follow this protocol every time.

### Before Starting

1. **Read the learnings log** at `.claude/agents/learnings/transaction-page.log`
2. If the file exists, review all entries and apply any relevant lessons to this run
3. Pay special attention to entries tagged `[PATTERN-CHANGE]` or `[BUG-FIX]`

### During Execution

1. **Scan the latest codebase patterns** — before scaffolding, read the 2 most recently modified transaction pages (`git log --oneline -5 -- 'src/app/dashboardportal/**/create*/page.tsx'`) to detect any pattern drift from this doc
2. **Compare against this spec** — if the latest code uses patterns not documented here, note the divergence
3. **Check for new shared components** — run `ls src/components/ui/transaction/` to see if new reusable pieces exist that should be used instead of scaffolding from scratch

### After Completion

1. **Append to the learnings log** (`.claude/agents/learnings/transaction-page.log`):
   ```
   ## [DATE] - {TransactionName} Generation
   - **Pattern drift detected:** [yes/no — describe any differences from spec]
   - **New shared components used:** [list any new shared components discovered]
   - **TypeScript errors encountered:** [describe any type issues and how they were resolved]
   - **What worked well:** [approaches that went smoothly]
   - **What should change:** [improvements for next run]
   - **[PATTERN-CHANGE]** [only if a new pattern was adopted — describe it]
   - **[BUG-FIX]** [only if a bug in the template was found and fixed — describe it]
   ```

2. **Propose spec updates** — if pattern drift is confirmed across 2+ recent pages, suggest edits to THIS agent file to stay current. Present the diff to the user for approval.

3. **Update reference implementations** — if the page you just created is cleaner or more complete than existing references, suggest adding it to the Reference Implementations list above.
