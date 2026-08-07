# Refactoring Opportunities - createIndent/page.tsx

This document identifies reusable components and patterns that can be extracted from the indent transaction page.

## ✅ Components Created

### 1. **AutoResizeTextarea** (`src/components/ui/transaction/AutoResizeTextarea.tsx`)
**Replaces:** Lines 660-664, 857-868

**Before:**
```tsx
const adjustTextareaHeight = React.useCallback((event: React.FormEvent<HTMLTextAreaElement>) => {
  const element = event.currentTarget;
  element.style.height = "auto";
  element.style.height = `${Math.min(Math.max(element.scrollHeight, 40), 240)}px`;
}, []);

// In render:
<textarea
  className="h-auto min-h-[40px] w-full resize-none..."
  onChange={(event) => {
    adjustTextareaHeight(event);
    handleLineFieldChange(item.id, "remarks", event.target.value);
  }}
  onInput={adjustTextareaHeight}
/>
```

**After:**
```tsx
import { AutoResizeTextarea } from "@/components/ui/transaction";

<AutoResizeTextarea
  value={item.remarks}
  onChange={(event) => handleLineFieldChange(item.id, "remarks", event.target.value)}
  placeholder="Notes"
  minHeight={40}
  maxHeight={240}
/>
```

---

### 2. **TransactionAlerts** (`src/components/ui/transaction/TransactionAlerts.tsx`)
**Replaces:** Lines 1235-1244

**Before:**
```tsx
const alerts = pageError || setupError ? (
  <div className="space-y-2">
    {pageError ? (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {pageError}
      </div>
    ) : null}
    {setupError ? (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {setupError}
      </div>
    ) : null}
  </div>
) : null;
```

**After:**
```tsx
import { TransactionAlerts } from "@/components/ui/transaction";

<TransactionAlerts pageError={pageError} setupError={setupError} />
```

---

### 3. **useStatusChip** (`src/components/ui/transaction/useStatusChip.ts`)
**Replaces:** Lines 1194-1201

**Before:**
```tsx
const statusChip = React.useMemo(() => {
  if (!indentDetails?.status) return undefined;
  const normalized = indentDetails.status.toLowerCase();
  let color: "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info" = "info";
  if (normalized === "approved") color = "success";
  else if (normalized === "rejected") color = "error";
  return { label: indentDetails.status, color };
}, [indentDetails?.status]);
```

**After:**
```tsx
import { useStatusChip } from "@/components/ui/transaction";

const statusChip = useStatusChip({ status: indentDetails?.status });
```

---

### 4. **useBranchFilteredOptions** (`src/components/ui/transaction/useBranchFilteredOptions.ts`)
**Replaces:** Lines 470-484

**Before:**
```tsx
const departmentOptions = React.useMemo<Option[]>(() => {
  if (!departments.length) return [];
  const branchFilter = branchIdForSetup;
  return departments
    .filter((dept) => !branchFilter || !dept.branchId || dept.branchId === branchFilter)
    .map((dept) => ({ label: dept.name || dept.id, value: dept.id }));
}, [departments, branchIdForSetup]);

const projectOptions = React.useMemo<Option[]>(() => {
  if (!projects.length) return [];
  const branchFilter = branchIdForSetup;
  return projects
    .filter((project) => !branchFilter || !project.branchId || project.branchId === branchFilter)
    .map((project) => ({ label: project.name || project.id, value: project.id }));
}, [projects, branchIdForSetup]);
```

**After:**
```tsx
import { useBranchFilteredOptions } from "@/components/ui/transaction";

const departmentOptions = useBranchFilteredOptions({
  records: departments,
  branchId: branchIdForSetup,
  getLabel: (dept) => dept.name || dept.id,
  getValue: (dept) => dept.id,
});

const projectOptions = useBranchFilteredOptions({
  records: projects,
  branchId: branchIdForSetup,
  getLabel: (project) => project.name || project.id,
  getValue: (project) => project.id,
});
```

---

### 5. **useConditionalOptions** (`src/components/ui/transaction/useConditionalOptions.ts`)
**Replaces:** Lines 445-457, 459-468

**Before:**
```tsx
const expenseOptions = React.useMemo<Option[]>(() => {
  const indentType = String(formValues.indent_type ?? "").toLowerCase();
  return expenses
    .filter((exp) => {
      if (indentType !== "open") return true;
      const id = String(exp.id);
      return id === "3" || id === "5" || id === "6";
    })
    .map((exp) => ({
      label: exp.name || String(exp.id),
      value: String(exp.id),
    }));
}, [expenses, formValues.indent_type]);

React.useEffect(() => {
  if (mode === "view") return;
  const indentType = String(formValues.indent_type ?? "").toLowerCase();
  if (indentType !== "open") return;
  const allowed = new Set(["3", "5", "6"]);
  const current = String(formValues.expense_type ?? "");
  if (current && !allowed.has(current)) {
    setFormValues((prev) => ({ ...prev, expense_type: "" }));
  }
}, [formValues.indent_type, formValues.expense_type, mode]);
```

**After:**
```tsx
import { useConditionalOptions } from "@/components/ui/transaction";

const expenseOptions = useConditionalOptions({
  allOptions: expenses.map((exp) => ({
    label: exp.name || String(exp.id),
    value: String(exp.id),
  })),
  context: { indentType: formValues.indent_type },
  filters: [
    {
      condition: (ctx) => String(ctx.indentType ?? "").toLowerCase() === "open",
      filter: (opt) => ["3", "5", "6"].includes(opt.value),
    },
  ],
});

// The useEffect for clearing invalid values can also be simplified
React.useEffect(() => {
  if (mode === "view") return;
  const indentType = String(formValues.indent_type ?? "").toLowerCase();
  if (indentType !== "open") return;
  const allowed = new Set(["3", "5", "6"]);
  const current = String(formValues.expense_type ?? "");
  if (current && !allowed.has(current)) {
    setFormValues((prev) => ({ ...prev, expense_type: "" }));
  }
}, [formValues.indent_type, formValues.expense_type, mode]);
```

---

### 6. **transactionFormHelpers** (`src/components/ui/transaction/transactionFormHelpers.ts`)
**Replaces:** Lines 274-277, 641-646, 1112-1118

**Before:**
```tsx
const lineIsComplete = (line: EditableLineItem) => {
  const qty = Number(line.quantity);
  return Boolean(line.itemGroup && line.item && line.uom && Number.isFinite(qty) && qty > 0);
};

if (field === "quantity") {
  const sanitized = rawValue.replace(/[^0-9.]/g, "");
  setLineItems((prev) =>
    prev.map((item) => (item.id === id ? { ...item, quantity: sanitized } : item))
  );
  return;
}

const pageTitle = mode === "create" ? "Create Indent" : mode === "edit" ? "Edit Indent" : "Indent Details";
const subtitle =
  mode === "create"
    ? "Capture header information and line items to raise a new indent."
    : mode === "edit"
    ? "Update the indent before sending it forward."
    : "Review the captured indent information.";
```

**After:**
```tsx
import {
  lineItemIsComplete,
  sanitizeNumericInput,
  getTransactionTitle,
  getTransactionSubtitle,
} from "@/components/ui/transaction/transactionFormHelpers";

const lineIsComplete = (line: EditableLineItem) => {
  return lineItemIsComplete(
    line,
    ["itemGroup", "item", "uom", "quantity"],
    {
      quantity: (value) => {
        const qty = Number(value);
        return Number.isFinite(qty) && qty > 0;
      },
    }
  );
};

if (field === "quantity") {
  const sanitized = sanitizeNumericInput(rawValue);
  setLineItems((prev) =>
    prev.map((item) => (item.id === id ? { ...item, quantity: sanitized } : item))
  );
  return;
}

const pageTitle = getTransactionTitle(mode, {
  create: "Create Indent",
  edit: "Edit Indent",
  view: "Indent Details",
});

const subtitle = getTransactionSubtitle(mode, {
  create: "Capture header information and line items to raise a new indent.",
  edit: "Update the indent before sending it forward.",
  view: "Review the captured indent information.",
});
```

---

## 📋 Additional Opportunities (Not Yet Extracted)

### 1. **Data Mapping Utilities**
The mapping functions (lines 67-221) could be abstracted into a generic mapper utility, but they're quite specific to the API response structure. Consider creating a `createRecordMapper` utility if this pattern repeats across multiple transaction types.

### 2. **Cascading Field Change Handler**
The `handleLineFieldChange` function (lines 578-656) has complex logic for cascading field updates. This could be extracted into a `useCascadingFieldChanges` hook if similar patterns appear in other transaction pages.

### 3. **Mode-based Form Initialization**
The form initialization logic (lines 335-363) could be extracted into a `useTransactionFormInit` hook.

### 4. **Label Resolvers Builder**
The pattern of building label maps and resolvers (lines 491-576) is already partially abstracted via `buildLabelMap`/`createLabelResolver`, but the specific resolvers for item groups could be further abstracted.

---

## 🎯 Next Steps

1. **Refactor the indent page** to use the new components
2. **Test** that all functionality works as before
3. **Apply to other transaction pages** (purchase orders, etc.)
4. **Document** usage patterns in Storybook

---

## 📝 Usage Example

Here's how the refactored page would look:

```tsx
import {
  AutoResizeTextarea,
  TransactionAlerts,
  useStatusChip,
  useBranchFilteredOptions,
  useConditionalOptions,
  getTransactionTitle,
  getTransactionSubtitle,
  sanitizeNumericInput,
  lineItemIsComplete,
} from "@/components/ui/transaction";

// In component:
const statusChip = useStatusChip({ status: indentDetails?.status });

const departmentOptions = useBranchFilteredOptions({
  records: departments,
  branchId: branchIdForSetup,
  getLabel: (dept) => dept.name || dept.id,
  getValue: (dept) => dept.id,
});

const expenseOptions = useConditionalOptions({
  allOptions: expenses.map((exp) => ({ label: exp.name, value: String(exp.id) })),
  context: { indentType: formValues.indent_type },
  filters: [/* ... */],
});

// In render:
<TransactionWrapper
  alerts={<TransactionAlerts pageError={pageError} setupError={setupError} />}
  // ...
/>

// In line item columns:
<AutoResizeTextarea
  value={item.remarks}
  onChange={(event) => handleLineFieldChange(item.id, "remarks", event.target.value)}
  placeholder="Notes"
/>
```

