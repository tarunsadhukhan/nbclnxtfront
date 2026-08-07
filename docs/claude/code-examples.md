# Code Examples & Common Pitfalls

Referenced from `CLAUDE.md`. Contains code examples for TypeScript, Zod, component patterns, and common mistakes.

---

## TypeScript Standards Examples

### Type Guards (instead of `any`)

```typescript
// WRONG
function processData(data: any) {
  return data.value;
}

// CORRECT
interface DataItem {
  value: string;
  id: number;
}

function processData(data: DataItem | unknown) {
  if (isDataItem(data)) {
    return data.value;
  }
  throw new Error("Invalid data");
}

function isDataItem(obj: unknown): obj is DataItem {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "value" in obj &&
    "id" in obj
  );
}
```

---

## Zod + React Hook Form Example

```typescript
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// 1. Define schema
const createIndentSchema = z.object({
  date: z.date(),
  department_id: z.number().min(1, "Department is required"),
  branch_id: z.number().min(1, "Branch is required"),
  remarks: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
});

// 2. Infer TypeScript type from schema
type CreateIndentForm = z.infer<typeof createIndentSchema>;

// 3. Use with React Hook Form
const { control, handleSubmit, formState: { errors } } = useForm<CreateIndentForm>({
  resolver: zodResolver(createIndentSchema),
  defaultValues: {
    date: new Date(),
    remarks: "",
    priority: "medium",
  },
});

// 4. Submit handler with type safety
const onSubmit = (data: CreateIndentForm) => {
  // data is fully typed and validated
};
```

---

## Component Organization Examples

### Shared Component (with JSDoc)

```typescript
/**
 * @component FormFieldWrapper
 * @description Wraps form fields with label, validation, and error display
 * @example
 * <FormFieldWrapper label="Name" error={errors.name}>
 *   <input {...register("name")} />
 * </FormFieldWrapper>
 */
interface FormFieldWrapperProps {
  label: string;
  error?: FieldError;
  required?: boolean;
  children: React.ReactNode;
}

export function FormFieldWrapper({ label, error, required, children }: FormFieldWrapperProps) {
  // Implementation
}
```

### Page-Specific Component Structure

```
src/app/dashboardportal/procurement/indent/createIndent/
  page.tsx                             # Main page (container)
  _components/
    IndentHeaderForm.tsx               # Page-specific header form
    IndentLineItemsTable.tsx           # Page-specific table
    IndentApprovalBar.tsx              # Page-specific approval
    IndentFooterForm.tsx               # Page-specific footer
```

### Smart vs. Dumb Pattern

```typescript
// page.tsx - Smart component (handles state, data, logic)
"use client";
export default function CreateIndentPage() {
  const [setupData, setSetupData] = useState(null);
  useEffect(() => { fetchIndentSetup().then(setSetupData); }, []);
  const handleSave = async (formData) => { await saveIndent(formData); };
  return <IndentForm data={setupData} onSave={handleSave} />;
}

// _components/IndentForm.tsx - Dumb component (pure rendering from props)
interface IndentFormProps {
  data: SetupData | null;
  onSave: (formData: IndentFormData) => void;
}
export function IndentForm({ data, onSave }: IndentFormProps) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
      {/* Render UI */}
    </form>
  );
}
```

---

## Styling Examples

```typescript
// Tailwind for layout
<div className="flex flex-col gap-4 p-6">
  <div className="grid grid-cols-2 gap-4">{/* ... */}</div>
</div>

// MUI for complex interactions
import { DataGrid, Autocomplete, Dialog } from "@mui/material";

// Theme tokens for colors (NEVER hardcode)
import { tokens } from "@/styles/tokens";
<button style={{ backgroundColor: tokens.brand.primary }}>Click</button>
// OR Tailwind with CSS variables
<button className="bg-primary hover:bg-primary-hover">Click</button>
```

---

## Common Pitfalls

### 1. Using `any` Type

```typescript
// WRONG
function handleData(data: any) { return data.value; }

// CORRECT
interface DataItem { value: string; }
function handleData(data: DataItem) { return data.value; }
```

### 2. Hardcoding Colors

```typescript
// WRONG
<button style={{ backgroundColor: "#1976d2" }}>Click</button>

// CORRECT
import { tokens } from "@/styles/tokens";
<button style={{ backgroundColor: tokens.brand.primary }}>Click</button>
```

### 3. Not Validating Forms

```typescript
// WRONG
const onSubmit = (data) => { saveData(data); };

// CORRECT
const schema = z.object({ name: z.string().min(1, "Name required") });
const { handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

### 4. Mutating Frozen Objects

```typescript
// WRONG
const EMPTY_ARRAY = Object.freeze([]);
EMPTY_ARRAY.push(item); // Error!

// CORRECT
const EMPTY_ARRAY = Object.freeze([]);
const newArray = [...EMPTY_ARRAY, item];
```

### 5. Circular Dependencies

```typescript
// WRONG - two files importing each other
// typeA.ts: import { TypeB } from "./typeB";
// typeB.ts: import { TypeA } from "./typeA";

// CORRECT - single file
// types.ts
export type TypeA = { b: TypeB };
export type TypeB = { a: TypeA };
```

### 6. React Hook Declaration Order (useMemo/useCallback)

Block-scoped `const` declared with `useMemo`/`useCallback` are NOT hoisted. Always declare hooks in dependency order.

```typescript
// WRONG - getAdjustedBalQty used before declaration
const calculatedWeight = React.useMemo(() => {
  const adj = getAdjustedBalQty(stock); // TS error!
  return adj * rate;
}, [getAdjustedBalQty, stock, rate]);

const getAdjustedBalQty = React.useCallback(
  (stock) => stock.balqty - draftQty, [draftQty]
);

// CORRECT - dependencies declared FIRST
const getAdjustedBalQty = React.useCallback(
  (stock) => stock.balqty - draftQty, [draftQty]
);

const calculatedWeight = React.useMemo(() => {
  const adj = getAdjustedBalQty(stock);
  return adj * rate;
}, [getAdjustedBalQty, stock, rate]);
```
