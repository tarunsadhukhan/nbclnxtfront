# Vowerp3 Frontend Agents Guide

## 1. Project Overview

**Vowerp3ui** is the frontend for the Vowerp ERP system. It is built with a modern stack designed for performance, scalability, and developer experience.

### Core Stack
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [MUI (Material UI)](https://mui.com/)
- **State Management**: React Hooks + Context + URL Search Params
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Package Manager**: `pnpm`

---

## 2. Directory Structure

Understanding the codebase layout is crucial.

```
src/
├── app/                 # Next.js App Router pages and layouts
│   ├── layout.tsx       # Root layout (Providers, Global Styles)
│   ├── page.tsx         # Home page
│   └── [feature]/       # Feature-based routes (e.g., dashboardportal, auth)
├── components/          # Shared React Components
│   ├── ui/              # Generic, reusable UI primitives (Buttons, Inputs, Cards)
│   ├── clientside/      # Client-side only wrappers/guards
│   └── dashboard/       # Dashboard-specific layout components
├── hooks/               # Shared Custom React Hooks
├── lib/                 # Utility libraries and configurations
├── styles/              # Global styles and theme definitions
├── types/               # Shared TypeScript type definitions
└── utils/               # Shared Helper functions
```

---

## 3. Componentization Guidelines & Organization

**Goal**: Maximize reusability, maintainability, and discoverability.

### 3.1. Where to Place Components

We follow a strict rule based on **scope of use**:

1.  **Generic / Shared Components**:
    *   **Location**: `src/components/ui/` (for primitives) or `src/components/[feature]/` (for domain-shared).
    *   **Criteria**: Used in *multiple* pages or features.
    *   **Example**: `ConfirmationDialog`, `DataTable`, `EmployeeCard`.

2.  **Page-Specific Components**:
    *   **Location**: Inside the page folder, ideally in a `_components` or `components` subfolder.
    *   **Criteria**: Used *only* by that specific page or its immediate children.
    *   **Benefit**: Keeps the global `components` folder clean and makes it obvious which components belong to a specific workflow.
    *   **Example**:
        ```
        src/app/dashboardportal/procurement/indent/createIndent/
        ├── page.tsx
        ├── _components/           <-- Page-specific components here
        │   ├── IndentHeaderForm.tsx
        │   └── IndentLineItems.tsx
        └── utils/                 <-- Page-specific utils here
        ```

### 3.2. The "Smart" vs. "Dumb" Pattern

1.  **Smart Components (Containers/Pages)**:
    *   **Role**: Data fetching, state management, business logic orchestrators.
    *   **Location**: `page.tsx` or top-level containers.
    *   **Responsibilities**:
        *   Fetching data (Server or Client side).
        *   Defining form schemas and handlers.
        *   Passing data and callbacks to children.

2.  **Dumb Components (Presentational)**:
    *   **Role**: Rendering UI based purely on `props`.
    *   **Location**: `src/components/...` or `_components/...`.
    *   **Responsibilities**:
        *   Displaying data.
        *   Emitting events (e.g., `onClick`, `onChange`) to parents.
        *   **Must be pure**: Same props = same output.

---

## 4. Documentation & Comments Standards

Clear documentation is mandatory for maintainability.

### 4.1. Component Documentation
Every component (especially reusable ones) must have a top-level comment block:

```typescript
/**
 * @component ApprovalActionsBar
 * @description Renders the action buttons for transaction approval workflows (Approve, Reject, etc.).
 * Handles visibility based on current status and user permissions.
 *
 * @example
 * <ApprovalActionsBar
 *   statusId={1}
 *   permissions={{ canApprove: true }}
 *   onApprove={handleApprove}
 * />
 */
export const ApprovalActionsBar = ({ ... }) => { ... }
```

### 4.2. Complex Logic
Add comments for any non-trivial logic:
```typescript
// We map status ID to a color token to ensure consistent theming across the app
// 21 = Draft (Grey), 1 = Open (Blue), 3 = Approved (Green)
const statusColor = getStatusColor(statusId);
```

---

## 5. Design Patterns & Best Practices

### 5.1. Validation (Zod)
*   **Rule**: ALL forms and API inputs must be validated using **Zod**.
*   **Why**: Ensures type safety and runtime validation match.
*   **Pattern**:
    ```typescript
    import { z } from "zod";

    // Define schema
    const createIndentSchema = z.object({
      date: z.date(),
      department_id: z.number().min(1, "Department is required"),
      remarks: z.string().optional(),
    });

    // Infer type
    type CreateIndentForm = z.infer<typeof createIndentSchema>;

    // Use in Form
    const { control, handleSubmit } = useForm<CreateIndentForm>({
      resolver: zodResolver(createIndentSchema)
    });
    ```

### 5.2. Custom Hooks for Logic Extraction
*   **Rule**: If a `useEffect` or state logic exceeds 10-15 lines or is reusable, extract it into a custom hook.
*   **Pattern**: Move data fetching, subscription, or complex state logic to `src/hooks/` or a local `use[Feature].ts`.

### 5.3. Styling Standards
*   **Tailwind First**: Use Tailwind utility classes for layout (flex, grid, padding, margin).
*   **MUI Components**: Use MUI for complex interactive elements (DataGrid, Dialog, Autocomplete).
*   **Theme**: Always use the `theme` object or Tailwind config colors. Never hardcode hex values like `#123456`.

---

## 6. Standardization Checklist

Before submitting code or marking a task as complete, verify:

- [ ] **Structure**: Generic components in `@components`, specific ones in page folders.
- [ ] **Validation**: Zod schemas are defined and used.
- [ ] **Typing**: strict TypeScript types (no `any`). Interfaces defined for all Props.
- [ ] **Comments**: Top-level component comments added.
- [ ] **Cleanup**: `console.log` removed (use proper logging if needed).
- [ ] **Naming**:
    -   Components: `PascalCase.tsx`
    -   Hooks: `camelCase.ts` (prefix `use`)
    -   Utils/Constants: `camelCase.ts`

---

## 7. Page Archetypes

### 7.1. Master / Index Pages (`IndexWrapper`)
Used for listing records.
*   **Component**: `src/components/ui/IndexWrapper.tsx`
*   **Key Props**: `rows`, `columns`, `paginationModel`, `search`.

### 7.2. Transaction Pages (`TransactionWrapper`)
Used for creating/editing documents (Indents, POs).
*   **Component**: `src/components/ui/TransactionWrapper.tsx`
*   **Key Props**: `statusChip`, `primaryActions`, `lineItems`.

### 7.3. Form Fields (`FormFieldWrapper`)
Standardized wrapper for consistent labels and error handling.
*   **Usage**:
    ```tsx
    <FormFieldWrapper
      control={control}
      name="supplier_id"
      label="Supplier"
      component={SearchableSelect} // or Input, DatePicker
      // ... props
    />
    ```

---

## 8. Transaction Page Architecture (Detailed)

When building new transaction pages (e.g., GRN, Invoice, Stock Transfer), follow the proven modular structure from `procurement/indent/createIndent/` and `procurement/purchaseOrder/createPO/`.

### 8.1. Folder Structure

```
src/app/dashboardportal/{module}/{transactionName}/
  page.tsx                    # Main page (Index/listing)
  components/
    {Transaction}Preview.tsx  # Printable preview component
  create{Transaction}/
    page.tsx                  # Transaction create/edit/view page
    components/
      {Transaction}HeaderForm.tsx
      {Transaction}LineItemsTable.tsx  # Column definitions hook + rendering
      {Transaction}ApprovalBar.tsx
      {Transaction}FooterForm.tsx      # Optional: for PO-style footer fields
      {Transaction}Preview.tsx         # Optional: if different from listing preview
      {Transaction}TotalsDisplay.tsx   # Optional: for calculated totals
    hooks/
      use{Transaction}FormState.ts     # Form state management
      use{Transaction}LineItems.ts     # Line item CRUD logic
      use{Transaction}Approval.ts      # Approval workflow handlers
      use{Transaction}FormSchemas.ts   # MuiForm schema generation
      use{Transaction}SelectOptions.ts # Memoised options and label resolvers
      use{Transaction}PageController.ts  # Optional: orchestration hook
      use{Transaction}TaxCalculations.ts # Optional: for tax logic
    types/
      {transaction}Types.ts            # All TypeScript types for the module
    utils/
      {transaction}Constants.ts        # Status IDs, empty arrays, config flags
      {transaction}Factories.ts        # `createBlankLine`, `buildDefaultFormValues`, etc.
      {transaction}Mappers.ts          # API response → UI type converters
      {transaction}Calculations.ts     # Optional: amount/tax/totals calculations
```

### 8.2. Type Definitions (`types/{transaction}Types.ts`)

Define all module-specific types in a single file to prevent circular dependencies:

```typescript
// Basic option type
export type Option = { label: string; value: string };

// Line item type (with all possible fields)
export type EditableLineItem = {
  id: string;
  itemGroup: string;
  item: string;
  itemMake: string;
  quantity: string;
  uom: string;
  remarks: string;
  // Add rate, amount, tax fields for PO-style transactions
};

// Record types for master data
export type DepartmentRecord = { id: string; name: string; branchId?: string };
export type ProjectRecord = { id: string; name: string; branchId?: string };
export type ExpenseRecord = { id: string; name: string };
export type ItemGroupRecord = { id: string; label: string };

// Extended item option with defaults
export type ItemOption = Option & {
  defaultUomId?: string;
  defaultUomLabel?: string;
  defaultRate?: number;
  taxPercentage?: number;
};

// Cache entry for deferred loading
export type ItemGroupCacheEntry = {
  items: ItemOption[];
  makes: Option[];
  uomsByItemId: Record<string, Option[]>;
  itemLabelById: Record<string, string>;
  makeLabelById: Record<string, string>;
  uomLabelByItemId: Record<string, Record<string, string>>;
};

// Setup data from API
export type {Transaction}SetupData = {
  departments: DepartmentRecord[];
  projects: ProjectRecord[];
  expenses: ExpenseRecord[];
  itemGroups: ItemGroupRecord[];
};

// Label resolvers for preview/tooltips
export type {Transaction}LabelResolvers = {
  department: (id: string) => string;
  itemGroup: (id: string) => string;
  item: (groupId: string, itemId: string) => string;
  itemMake: (groupId: string, makeId: string) => string;
  uom: (groupId: string, itemId: string, uomId: string) => string;
};
```

### 8.3. Constants (`utils/{transaction}Constants.ts`)

```typescript
import type { ApprovalStatusId } from "@/components/ui/transaction";

// Status IDs matching backend workflow
export const {TRANSACTION}_STATUS_IDS = {
  DRAFT: 21,
  OPEN: 1,
  PENDING_APPROVAL: 20,
  APPROVED: 3,
  REJECTED: 4,
  CLOSED: 5,
  CANCELLED: 6,
} as const satisfies Record<string, ApprovalStatusId>;

// Status labels for UI display
export const {TRANSACTION}_STATUS_LABELS: Record<ApprovalStatusId, string> = {
  [{TRANSACTION}_STATUS_IDS.DRAFT]: "Draft",
  [{TRANSACTION}_STATUS_IDS.OPEN]: "Open",
  // ... etc
};

// Immutable empty arrays to avoid re-renders
export const EMPTY_DEPARTMENTS: ReadonlyArray<DepartmentRecord> = Object.freeze([]);
export const EMPTY_PROJECTS: ReadonlyArray<ProjectRecord> = Object.freeze([]);
export const EMPTY_EXPENSES: ReadonlyArray<ExpenseRecord> = Object.freeze([]);
export const EMPTY_ITEM_GROUPS: ReadonlyArray<ItemGroupRecord> = Object.freeze([]);
export const EMPTY_OPTIONS: ReadonlyArray<Option> = Object.freeze([]);

// Default empty params for hooks
export const EMPTY_SETUP_PARAMS: Readonly<{ branchId?: string }> = Object.freeze({});
```

### 8.4. Factories (`utils/{transaction}Factories.ts`)

```typescript
let lineIdSeed = 0;

export const generateLineId = (): string => {
  lineIdSeed += 1;
  return `line-${lineIdSeed}`;
};

export const createBlankLine = (): EditableLineItem => ({
  id: generateLineId(),
  itemGroup: "",
  item: "",
  itemMake: "",
  quantity: "",
  uom: "",
  remarks: "",
});

export const buildDefaultFormValues = (): Record<string, unknown> => ({
  branch: "",
  date: new Date().toISOString().slice(0, 10),
  // ... transaction-specific defaults
});

export const lineHasAnyData = (line: EditableLineItem): boolean =>
  Boolean(line.itemGroup || line.item || line.quantity || line.remarks);

export const lineIsComplete = (line: EditableLineItem): boolean => {
  const qty = Number(line.quantity);
  return Boolean(line.itemGroup && line.item && line.uom && Number.isFinite(qty) && qty > 0);
};
```

### 8.5. Mappers (`utils/{transaction}Mappers.ts`)

Map raw API responses to UI types with null-safety:

```typescript
export const mapDepartmentRecords = (records: unknown[]): DepartmentRecord[] =>
  records
    .map((row) => {
      const data = row as Record<string, unknown>;
      const id = data?.dept_id ?? data?.department_id ?? data?.id;
      if (!id) return null;
      return {
        id: String(id),
        name: String(data?.dept_desc ?? data?.dept_name ?? data?.name ?? id),
        branchId: data?.branch_id != null ? String(data.branch_id) : undefined,
      } satisfies DepartmentRecord;
    })
    .filter(Boolean) as DepartmentRecord[];

export const map{Transaction}SetupResponse = (response: unknown): {Transaction}SetupData => {
  const result = response as Record<string, unknown>;
  return {
    departments: mapDepartmentRecords((result?.departments as unknown[]) ?? []),
    projects: mapProjectRecords((result?.projects as unknown[]) ?? []),
    expenses: mapExpenseRecords((result?.expense_types as unknown[]) ?? []),
    itemGroups: mapItemGroupRecords((result?.item_groups as unknown[]) ?? []),
  };
};
```

### 8.6. Form State Hook (`hooks/use{Transaction}FormState.ts`)

```typescript
export function use{Transaction}FormState({ mode }: { mode: MuiFormMode }) {
  const [initialValues, setInitialValues] = React.useState(buildDefaultFormValues);
  const [formValues, setFormValues] = React.useState(buildDefaultFormValues);
  const [formKey, setFormKey] = React.useState(0);
  const formRef = React.useRef<{ submit: () => Promise<void>; isDirty: () => boolean } | null>(null);
  const createDefaultsSeededRef = React.useRef(false);

  const bumpFormKey = React.useCallback(() => setFormKey((prev) => prev + 1), []);

  // Seed defaults in create mode
  React.useEffect(() => {
    if (mode !== "create") {
      createDefaultsSeededRef.current = false;
      return;
    }
    if (!createDefaultsSeededRef.current) {
      const base = buildDefaultFormValues();
      setInitialValues(base);
      setFormValues(base);
      setFormKey((prev) => prev + 1);
      createDefaultsSeededRef.current = true;
    }
  }, [mode]);

  return { initialValues, setInitialValues, formValues, setFormValues, formKey, bumpFormKey, formRef };
}
```

### 8.7. Line Items Hook (`hooks/use{Transaction}LineItems.ts`)

Wrap `useLineItems` from transaction primitives:

```typescript
export const use{Transaction}LineItems = ({
  mode,
  itemGroupCache,
  itemGroupLoading,
  ensureItemGroupData,
}: Use{Transaction}LineItemsParams) => {
  const { items: lineItems, setItems: setLineItems, replaceItems, removeItems } =
    useLineItems<EditableLineItem>({
      createBlankItem: createBlankLine,
      hasData: lineHasAnyData,
      getItemId: (item) => item.id,
      maintainTrailingBlank: mode !== "view",
    });

  const handleLineFieldChange = React.useCallback(
    (id: string, field: keyof EditableLineItem, rawValue: string) => {
      if (mode === "view") return;

      // Cascade logic: itemGroup change → reset item, uom, etc.
      if (field === "itemGroup") {
        setLineItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, itemGroup: rawValue, item: "", itemMake: "", uom: "" } : item
          )
        );
        if (rawValue && !itemGroupCache[rawValue] && !itemGroupLoading[rawValue]) {
          void ensureItemGroupData(rawValue);
        }
        return;
      }

      // item change → auto-select default UOM
      if (field === "item") {
        setLineItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            const cache = itemGroupCache[item.itemGroup ?? ""];
            const defaultUom = cache?.items.find((opt) => opt.value === rawValue)?.defaultUomId ?? "";
            return { ...item, item: rawValue, uom: defaultUom };
          })
        );
        return;
      }

      // Generic field update
      setLineItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: rawValue } : item))
      );
    },
    [mode, setLineItems, itemGroupCache, itemGroupLoading, ensureItemGroupData]
  );

  return { lineItems, setLineItems, replaceItems, removeLineItems, handleLineFieldChange };
};
```

### 8.8. Select Options Hook (`hooks/use{Transaction}SelectOptions.ts`)

Memoize all dropdown options and label resolvers:

```typescript
export const use{Transaction}SelectOptions = ({
  departments, projects, expenses, itemGroups, branchIdForSetup, itemGroupCache,
}: Use{Transaction}SelectOptionsParams) => {
  // Filter options by branch
  const departmentOptions = React.useMemo<Option[]>(() =>
    departments
      .filter((dept) => !branchIdForSetup || !dept.branchId || dept.branchId === branchIdForSetup)
      .map((dept) => ({ label: dept.name, value: dept.id })),
    [departments, branchIdForSetup]
  );

  // Build label maps
  const departmentLabelMap = React.useMemo(() =>
    buildLabelMap([...departments], (d) => d.id, (d) => d.name),
    [departments]
  );

  // Create label resolvers
  const getDepartmentLabel = React.useMemo(() => createLabelResolver(departmentLabelMap), [departmentLabelMap]);

  // Item/make/uom getters from cache
  const getItemOptions = React.useCallback(
    (groupId: string) => itemGroupCache[groupId]?.items ?? [],
    [itemGroupCache]
  );

  return {
    departmentOptions, projectOptions, expenseOptions, itemGroupOptions,
    getDepartmentLabel, getItemGroupLabel, getItemLabel, getMakeLabel, getUomLabel,
    getItemOptions, getMakeOptions, getUomOptions,
    labelResolvers: { department: getDepartmentLabel, itemGroup: getItemGroupLabel, ... },
  };
};
```

### 8.9. Approval Hook (`hooks/use{Transaction}Approval.ts`)

Handle all approval workflow actions:

```typescript
export const use{Transaction}Approval = ({
  mode, requestedId, formValues, details, coId, getMenuId, setDetails,
}: Use{Transaction}ApprovalParams) => {
  const router = useRouter();
  const [approvalLoading, setApprovalLoading] = React.useState(false);

  // Map string status to ApprovalStatusId
  const mapStatusToId = React.useCallback((status?: string): ApprovalStatusId | null => {
    if (!status) return null;
    const normalized = status.toLowerCase();
    if (normalized.includes("draft")) return STATUS_IDS.DRAFT;
    // ... etc
  }, []);

  // Derive current status
  const statusId = React.useMemo<ApprovalStatusId>(() =>
    details?.statusId ?? mapStatusToId(details?.status) ?? STATUS_IDS.DRAFT,
    [details, mapStatusToId]
  );

  // Determine permissions based on status and mode
  const getApprovalPermissions = React.useCallback(
    (status: ApprovalStatusId, currentMode: MuiFormMode, apiPermissions?: ApprovalActionPermissions) => {
      if (apiPermissions) return apiPermissions;
      if (currentMode === "view") return { canViewApprovalLog: true, canClone: true };
      if (status === STATUS_IDS.DRAFT) return { canSave: true, canOpen: true, canCancelDraft: true };
      // ... etc
    }, []
  );

  // Action handlers
  const handleOpen = React.useCallback(async () => { /* ... */ }, []);
  const handleApprove = React.useCallback(async () => { /* ... */ }, []);
  const handleReject = React.useCallback(async () => { /* ... */ }, []);

  return { statusId, approvalInfo, approvalPermissions, approvalLoading, handleOpen, handleApprove, ... };
};
```

### 8.10. Form Schema Hook (`hooks/use{Transaction}FormSchemas.ts`)

Generate MuiForm schema with dependencies:

```typescript
export const use{Transaction}FormSchema = ({
  mode, branchOptions, expenseOptions, projectOptions,
}: Use{Transaction}FormSchemaParams): Schema => {
  return React.useMemo(() => ({
    fields: [
      {
        name: "branch",
        label: "Branch",
        type: "select",
        required: true,
        options: branchOptions,
        disabled: mode !== "create",
        grid: { xs: 12, md: 4 },
      },
      {
        name: "date",
        label: "Date",
        type: "date",
        required: true,
        grid: { xs: 12, md: 4 },
      },
      // ... more fields
    ],
  }), [mode, branchOptions, expenseOptions, projectOptions]);
};
```

### 8.11. Line Items Columns (`components/{Transaction}LineItemsTable.tsx`)

Return column definitions as a hook:

```typescript
export const use{Transaction}LineItemColumns = ({
  canEdit, departmentOptions, itemGroupOptions, itemGroupLoading, labelResolvers,
  getItemOptions, getMakeOptions, getUomOptions, handleLineFieldChange,
}: Use{Transaction}LineItemColumnsParams): TransactionLineColumn<EditableLineItem>[] => {
  return React.useMemo(() => [
    {
      id: "itemGroup",
      header: "Item Group",
      width: "1.6fr",
      renderCell: ({ item }) => {
        if (!canEdit) {
          return <span className="text-xs">{labelResolvers.itemGroup(item.itemGroup)}</span>;
        }
        const value = itemGroupOptions.find((opt) => opt.value === item.itemGroup) ?? null;
        return (
          <SearchableSelect
            options={itemGroupOptions}
            value={value}
            onChange={(next) => handleLineFieldChange(item.id, "itemGroup", next?.value ?? "")}
            getOptionLabel={(opt) => opt.label}
            isOptionEqualToValue={(a, b) => a.value === b.value}
            placeholder="Search item group"
          />
        );
      },
      getTooltip: ({ item }) => labelResolvers.itemGroup(item.itemGroup) || undefined,
    },
    // ... more columns
  ], [canEdit, itemGroupOptions, labelResolvers, handleLineFieldChange, ...]);
};
```

### 8.12. Main Page Orchestration (`create{Transaction}/page.tsx`)

Compose everything together:

```typescript
export default function {Transaction}TransactionPage() {
  const searchParams = useSearchParams();
  const mode: MuiFormMode = /* derive from searchParams */;
  const { coId } = useSelectedCompanyCoId();
  const branchOptions = useBranchOptions();

  // Form state
  const { formValues, setFormValues, formKey, bumpFormKey, formRef, ... } = use{Transaction}FormState({ mode });

  // Item group cache (deferred loading)
  const { cache: itemGroupCache, loading: itemGroupLoading, ensure: ensureItemGroupData } =
    useDeferredOptionCache<string, ItemGroupCacheEntry>({
      fetcher: async (groupId) => {
        const response = await fetch{Transaction}Setup2(groupId);
        return mapItemGroupDetailResponse(response);
      },
    });

  // Line items
  const { lineItems, setLineItems, handleLineFieldChange, ... } = use{Transaction}LineItems({
    mode, itemGroupCache, itemGroupLoading, ensureItemGroupData,
  });

  // Setup data loading
  const { data: setupData, loading: setupLoading } = useTransactionSetup({ ... });

  // Select options and label resolvers
  const { departmentOptions, itemGroupOptions, labelResolvers, ... } = use{Transaction}SelectOptions({
    departments: setupData?.departments ?? EMPTY_DEPARTMENTS,
    itemGroups: setupData?.itemGroups ?? EMPTY_ITEM_GROUPS,
    branchIdForSetup: formValues.branch as string,
    itemGroupCache,
  });

  // Form schema
  const formSchema = use{Transaction}FormSchema({ mode, branchOptions, ... });

  // Approval workflow
  const { approvalInfo, approvalPermissions, handleOpen, handleApprove, ... } = use{Transaction}Approval({
    mode, requestedId, formValues, details, coId, setDetails,
  });

  // Column definitions
  const columns = use{Transaction}LineItemColumns({
    canEdit: mode !== "view",
    itemGroupOptions, itemGroupLoading, labelResolvers, handleLineFieldChange, ...
  });

  return (
    <TransactionWrapper
      title="{Transaction}"
      loading={loading}
      saving={saving}
      error={pageError}
      preview={<{Transaction}Preview ... />}
      approvalBar={<{Transaction}ApprovalBar approvalInfo={approvalInfo} permissions={approvalPermissions} ... />}
      actions={actions}
      lineItems={{ items: lineItems, columns, onRemove: removeLineItems, ... }}
    >
      <{Transaction}HeaderForm
        schema={formSchema}
        formKey={formKey}
        initialValues={initialValues}
        mode={mode}
        formRef={formRef}
        onSubmit={handleSubmit}
        onValuesChange={setFormValues}
      />
    </TransactionWrapper>
  );
}
```

### 8.13. Key Patterns Summary

| Pattern | Description |
|---------|-------------|
| **Separation of concerns** | Types, constants, factories, mappers, hooks, and components each have dedicated files |
| **Memoization** | All options, label maps, and computed values use `React.useMemo` and `React.useCallback` |
| **Deferred loading** | Use `useDeferredOptionCache` for dependent data (item group → items/UOMs) |
| **Cascade resets** | When parent field changes, reset all dependent child fields |
| **Immutable defaults** | Use `Object.freeze()` on empty arrays to prevent re-renders |
| **Label resolvers** | Build label maps for tooltips and preview rendering |
| **Approval workflow** | Centralize status mapping and permission logic in a dedicated hook |
| **Mode-aware rendering** | Check `mode !== "view"` before allowing edits; disable fields appropriately |

---

**Remember**: The goal is to write code that your future self (and other agents) can understand immediately.
