# Transaction Page Architecture

Referenced from `CLAUDE.md`. For documents with approval workflows (Indent, PO, GRN, Invoice).

---

## Folder Structure (Standard)

```
{transactionName}/
  page.tsx                              # List/index page
  components/
    {Transaction}Preview.tsx            # Preview modal/component
  create{Transaction}/
    page.tsx                            # Create/edit/view page (Smart container)
    _components/                        # Page-specific presentational components
      {Transaction}HeaderForm.tsx       # Header fields
      {Transaction}LineItemsTable.tsx   # Line items grid (with column hook)
      {Transaction}FooterForm.tsx       # Footer/summary (optional)
      {Transaction}TotalsDisplay.tsx    # Calculated totals (optional)
    hooks/                              # CRITICAL: Custom hooks for page logic
      use{Transaction}FormState.ts      # Form state + formRef + formKey
      use{Transaction}LineItems.ts      # Line item CRUD + cascade logic
      use{Transaction}SelectOptions.ts  # Memoized options + label resolvers
      use{Transaction}FormSchemas.ts    # Dynamic MuiForm schema
      use{Transaction}Approval.ts       # Approval workflow state + handlers
      use{Transaction}PageController.ts # Optional: top-level orchestration
    types/
      {transaction}Types.ts             # ALL types in ONE file (prevent circular deps)
    utils/
      {transaction}Constants.ts         # Status IDs, frozen empty arrays
      {transaction}Factories.ts         # createBlankLine, buildDefaultFormValues
      {transaction}Mappers.ts           # API response -> UI type converters
      {transaction}Calculations.ts      # Tax/amount calculations (optional)
```

---

## Type Definitions Pattern

**CRITICAL: All types for a module go in ONE file to prevent circular dependency hell.**

```typescript
// types/indentTypes.ts

export type Option = { label: string; value: string };
export type DepartmentRecord = { id: string; name: string; branchId?: string };

// Line items keep quantity as STRING during editing (user input)
export type EditableLineItem = {
  id: string;
  itemGroup: string;
  item: string;
  itemMake: string;
  quantity: string;        // STRING during editing, convert on submit
  uom: string;
  remarks: string;
};

// Extended item option with defaults (for auto-populating UOM)
export type ItemOption = Option & {
  defaultUomId?: string;
  defaultUomLabel?: string;
};

// Cache entry for deferred loading pattern
export type ItemGroupCacheEntry = {
  items: ItemOption[];
  makes: Option[];
  uomsByItemId: Record<string, Option[]>;
  itemLabelById: Record<string, string>;
};

// Label resolvers for preview/tooltips
export type LabelResolvers = {
  department: (id: string) => string;
  itemGroup: (id: string) => string;
  item: (groupId: string, itemId: string) => string;
  uom: (groupId: string, itemId: string, uomId: string) => string;
};

// Setup data from API
export type IndentSetupData = {
  departments: DepartmentRecord[];
  projects: ProjectRecord[];
  itemGroups: ItemGroupRecord[];
};
```

---

## Constants Pattern

```typescript
// utils/indentConstants.ts

import type { ApprovalStatusId } from "@/components/ui/transaction";

export const INDENT_STATUS_IDS = {
  DRAFT: 21, OPEN: 1, PENDING_APPROVAL: 20,
  APPROVED: 3, REJECTED: 4, CLOSED: 5, CANCELLED: 6,
} as const satisfies Record<string, ApprovalStatusId>;

export const INDENT_STATUS_LABELS: Record<ApprovalStatusId, string> = {
  [INDENT_STATUS_IDS.DRAFT]: "Draft",
  [INDENT_STATUS_IDS.OPEN]: "Open",
  // ... etc
};

// IMMUTABLE empty arrays (prevent re-renders from new [] allocations)
export const EMPTY_DEPARTMENTS: ReadonlyArray<DepartmentRecord> = Object.freeze([]);
export const EMPTY_OPTIONS: ReadonlyArray<Option> = Object.freeze([]);
```

---

## Factories Pattern

```typescript
// utils/indentFactories.ts

let lineIdSeed = 0;
export const generateLineId = (): string => `line-${++lineIdSeed}`;

export const createBlankLine = (): EditableLineItem => ({
  id: generateLineId(),
  itemGroup: "", item: "", itemMake: "",
  quantity: "",  // String!
  uom: "", remarks: "",
});

export const buildDefaultFormValues = () => ({
  branch: "", date: new Date().toISOString().slice(0, 10),
  department: "", project: "", remarks: "",
});

// Helpers for validation
export const lineHasAnyData = (line: EditableLineItem): boolean =>
  Boolean(line.itemGroup || line.item || line.quantity || line.remarks);

export const lineIsComplete = (line: EditableLineItem): boolean => {
  const qty = Number(line.quantity);
  return Boolean(line.itemGroup && line.item && line.uom && Number.isFinite(qty) && qty > 0);
};
```

---

## Mappers Pattern (API -> UI)

```typescript
// utils/indentMappers.ts -- Handle null-safety and field name variations from backend

export const mapDepartmentRecords = (records: unknown[]): DepartmentRecord[] =>
  records.map((row) => {
    const data = row as Record<string, unknown>;
    const id = data?.dept_id ?? data?.department_id ?? data?.id;
    if (!id) return null;
    return {
      id: String(id),
      name: String(data?.dept_desc ?? data?.dept_name ?? data?.name ?? id),
      branchId: data?.branch_id != null ? String(data.branch_id) : undefined,
    };
  }).filter(Boolean) as DepartmentRecord[];
```

---

## Hooks Patterns

**Rule:** If a `useEffect` or state logic exceeds 10-15 lines or is reusable, extract into a custom hook.

### Form State Hook

```typescript
export function useIndentFormState({ mode }: { mode: MuiFormMode }) {
  const [initialValues, setInitialValues] = useState(buildDefaultFormValues);
  const [formValues, setFormValues] = useState(buildDefaultFormValues);
  const [formKey, setFormKey] = useState(0);       // Bump to force re-render
  const formRef = useRef<{ submit: () => Promise<void> } | null>(null);
  const bumpFormKey = useCallback(() => setFormKey(prev => prev + 1), []);
  return { initialValues, setInitialValues, formValues, setFormValues, formKey, bumpFormKey, formRef };
}
```

### Line Items Hook (with CASCADE logic -- CRITICAL)

```typescript
export const useIndentLineItems = ({ mode, itemGroupCache, ensureItemGroupData }) => {
  const { items: lineItems, setItems: setLineItems } = useLineItems<EditableLineItem>({
    createBlankItem: createBlankLine,
    hasData: lineHasAnyData,
    maintainTrailingBlank: mode !== "view",  // Keep blank row when editing
  });

  const handleLineFieldChange = useCallback(
    (id: string, field: keyof EditableLineItem, rawValue: string) => {
      if (mode === "view") return;

      // CASCADE 1: itemGroup change -> reset item, itemMake, uom
      if (field === "itemGroup") {
        setLineItems(prev => prev.map(item =>
          item.id === id ? { ...item, itemGroup: rawValue, item: "", itemMake: "", uom: "" } : item
        ));
        if (rawValue && !itemGroupCache[rawValue]) ensureItemGroupData(rawValue);
        return;
      }

      // CASCADE 2: item change -> auto-select default UOM from cache
      if (field === "item") {
        setLineItems(prev => prev.map(item => {
          if (item.id !== id) return item;
          const defaultUom = itemGroupCache[item.itemGroup]?.items
            .find(opt => opt.value === rawValue)?.defaultUomId ?? "";
          return { ...item, item: rawValue, uom: defaultUom };
        }));
        return;
      }

      // Generic field update
      setLineItems(prev => prev.map(item =>
        item.id === id ? { ...item, [field]: rawValue } : item
      ));
    },
    [mode, setLineItems, itemGroupCache, ensureItemGroupData]
  );

  return { lineItems, setLineItems, handleLineFieldChange };
};
```

### Select Options Hook (Memoized + Label Resolvers)

```typescript
export const useIndentSelectOptions = ({ departments, itemGroups, branchId, itemGroupCache }) => {
  const departmentOptions = useMemo(() =>
    departments
      .filter(d => !branchId || !d.branchId || d.branchId === branchId)
      .map(d => ({ label: d.name, value: d.id })),
    [departments, branchId]
  );

  const departmentLabelMap = useMemo(() =>
    Object.fromEntries(departmentOptions.map(o => [o.value, o.label])),
    [departmentOptions]
  );

  const getItemOptions = useCallback(
    (groupId: string) => itemGroupCache[groupId]?.items ?? [],
    [itemGroupCache]
  );

  return { departmentOptions, departmentLabelMap, getItemOptions };
};
```

### Line Item Columns as Hook (for DataGrid)

```typescript
export const useIndentLineItemColumns = ({ canEdit, itemGroupOptions, labelResolvers, handleLineFieldChange }) => {
  return useMemo(() => [
    {
      id: "itemGroup", header: "Item Group", width: "1.6fr",
      renderCell: ({ item }) => canEdit
        ? <SearchableSelect options={itemGroupOptions} value={...} onChange={...} />
        : <span>{labelResolvers.itemGroup(item.itemGroup)}</span>,
      getTooltip: ({ item }) => labelResolvers.itemGroup(item.itemGroup),
    },
    // ... more columns
  ], [canEdit, itemGroupOptions, labelResolvers, handleLineFieldChange]);
};
```

---

## Deferred Loading Pattern (CRITICAL for dependent dropdowns)

```typescript
// Use useDeferredOptionCache for itemGroup -> items/UOMs lazy loading
const { cache, loading, ensure } = useDeferredOptionCache<string, ItemGroupCacheEntry>({
  fetcher: async (groupId) => {
    const response = await fetchSetup2(groupId);
    return mapItemGroupDetailResponse(response);
  },
});
// Call ensure(groupId) when user selects an item group
```

---

## Key Pattern Summary

| Pattern | Rule |
|---------|------|
| **Separation of concerns** | Types, constants, factories, mappers, hooks, components in dedicated files |
| **Memoization** | ALL options, label maps, computed values use `useMemo` and `useCallback` |
| **Deferred loading** | Use `useDeferredOptionCache` for dependent data (itemGroup -> items/UOMs) |
| **Cascade resets** | When parent field changes (itemGroup), reset all dependent child fields |
| **Immutable defaults** | Use `Object.freeze()` on empty arrays to prevent re-renders |
| **Label resolvers** | Build label maps for tooltips and preview rendering |
| **Mode-aware** | Check `mode !== "view"` before allowing edits; disable fields appropriately |
| **Trailing blank row** | Maintain one blank row at end of line items when editing |

---

## Approval Workflow (ApprovalActionsBar)

**Location:** `src/components/ui/transaction/ApprovalActionsBar.tsx`

### Status Contract (Fixed -- MUST match backend)

| Status ID | Label | Meaning | Badge Color |
|-----------|-------|---------|-------------|
| 21 | Drafted | Initial state, editable | `default` (gray) |
| 1 | Open | Doc number generated, ready for approval | `primary` (blue) |
| 20 | Pending Approval | In workflow (has `approval_level`) | `warning` (amber) |
| 3 | Approved | Fully approved | `success` (green) |
| 4 | Rejected | Rejected during approval | `error` (red) |
| 5 | Closed | External close | `default` (gray) |
| 6 | Cancelled | Draft cancelled | `default` (gray) |

### Behavior Rules

- Document number is generated **only** when moving to Open (1)
- **Pending (20)** contains `approval_level`; on approve: increment level (stay 20) or finalize (-> 3)
- **Rejected (4)** can be reopened back to 1 or 21

### Type Definitions

```typescript
type ApprovalInfo = {
  statusId: ApprovalStatusId;
  statusLabel: string;
  approvalLevel?: number | null;
  maxApprovalLevel?: number | null;
  isFinalLevel?: boolean;
};

type ApprovalActionPermissions = {
  canSave?: boolean;
  canOpen?: boolean;
  canCancelDraft?: boolean;
  canReopen?: boolean;
  canSendForApproval?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  canViewApprovalLog?: boolean;
  canClone?: boolean;
};
```

### Button Visibility Rules

| Status | Visible Buttons |
|--------|----------------|
| Draft (21) | Save, Open, Cancel Draft |
| Open (1) | Save, Send for Approval |
| Pending (20) | Approve, Reject, View Approval Log |
| Approved (3) | View Approval Log, Clone |
| Rejected (4) | Re-Open, Clone, View Approval Log |
| Cancelled (6) | Re-Open, Save |
| Closed (5) | View Approval Log |

### Usage

```typescript
<ApprovalActionsBar
  approvalInfo={{ statusId: 21, statusLabel: "Draft", approvalLevel: 0, totalLevels: 3 }}
  permissions={{ canSave: true, canOpen: true, canApprove: false, canReject: false }}
  onSave={handleSave} onOpen={handleOpen} onApprove={handleApprove}
  onReject={handleReject} onViewLog={handleViewLog} loading={isLoading}
/>
```

---

## MuiForm Schema Pattern

The `MuiForm` component renders forms dynamically from a schema:

```typescript
type Schema = {
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "date" | "select" | "textarea" | "number" | "checkbox";
    required?: boolean;
    options?: Option[];
    disabled?: boolean;
    grid?: { xs: number; md: number };
    placeholder?: string;
    validate?: (value: unknown) => string | undefined;
  }>;
};

// Build schema in a hook, memoize with useMemo:
export const useIndentFormSchema = ({ mode, branchOptions, departmentOptions }) => {
  return useMemo(() => ({
    fields: [
      { name: "branch", label: "Branch", type: "select", required: true,
        options: branchOptions, disabled: mode !== "create", grid: { xs: 12, md: 4 } },
      { name: "date", label: "Date", type: "date", required: true, grid: { xs: 12, md: 4 } },
      { name: "department", label: "Department", type: "select", required: true,
        options: departmentOptions, grid: { xs: 12, md: 4 } },
    ],
  }), [mode, branchOptions, departmentOptions]);
};
```

---

## Quick Reference: Creating a New Transaction Page

Transaction pages with approval workflows live under `dashboardportal/`.

### Steps

1. **Create folder structure** (see Folder Structure above)
2. **Define types** in `types/transactionTypes.ts` (single file)
3. **Create constants** in `utils/transactionConstants.ts` (status IDs, frozen arrays)
4. **Create factories** in `utils/transactionFactories.ts` (createBlankLine, defaults)
5. **Create hooks** for form state, line items, select options, schemas, approval
6. **Create components** in `_components/` (header form, line items table, footer)
7. **Create page** (smart container wiring hooks + components)
8. **Write tests** for complex logic
