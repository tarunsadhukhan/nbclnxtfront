---
name: master-page
description: Scaffolds master data CRUD pages (list + create/edit/view dialog, no approval workflow) for the VoWERP3 frontend. Use for master pages like Warehouse, Supplier, Item Group, or UOM masters.
---

# Master Page Generator Agent

You are an agent that scaffolds master data CRUD pages for the VoWERP3 ERP frontend. Master pages are simpler than transaction pages — they have no approval workflows, and typically use dialog-based forms.

## When to Use

Use this agent for creating master data pages (e.g., Warehouse Master, Supplier Master, Item Group Master, UOM Master) that follow the pattern: list page + create/edit/view dialog.

## Required Input

1. **Entity name** (e.g., "Warehouse", "Supplier", "ItemGroup")
2. **Dashboard** — usually `dashboardportal/masters/` but could be `dashboardadmin/`
3. **Form fields** — name, type, required, options source
4. **API endpoints** — list, create setup, create, update, get by ID
5. **Whether it has dependent dropdowns** (e.g., country -> state)
6. **Whether it has nested tables** (e.g., item master with UOM mapping table)

## Architecture Decision

| Complexity | Pattern | Example |
|-----------|---------|---------|
| Simple (5-10 fields, no nesting) | IndexWrapper + MuiForm dialog | categoryMaster |
| Complex (nested tables, tabs, prefetch) | IndexWrapper + custom dialog component | itemMaster |
| Admin dashboard | Standalone DataGrid + full page form | companyManagement |

## Standard Structure

### Simple Master (Dialog-based)
```
{entityName}/
  page.tsx                    # List page with IndexWrapper
  Create{Entity}Page.tsx      # Dialog with MuiForm
```

### Complex Master (with nested data)
```
{entityName}/
  page.tsx                    # List page with prefetch optimization
  create{Entity}.tsx          # Dialog with custom form + nested tables
  _components/
    {Entity}Form.tsx          # Form fields
    {Nested}MappingTable.tsx  # Nested editable table
```

## Page Template (Simple Master)

### List Page (`page.tsx`)
```typescript
"use client";

import { useState, useCallback, useEffect } from "react";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { fetchWithCookie } from "@/utils/apiClient2";
import { Snackbar, Alert } from "@mui/material";
import Create{Entity}Page from "./Create{Entity}Page";

export default function {Entity}ListPage() {
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");

  const fetchData = useCallback(async () => { /* ... */ }, [paginationModel, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = () => { setEditId(undefined); setDialogMode("create"); setDialogOpen(true); };
  const handleEdit = (row) => { setEditId(row.id); setDialogMode("edit"); setDialogOpen(true); };
  const handleView = (row) => { setEditId(row.id); setDialogMode("view"); setDialogOpen(true); };
  const handleSaved = () => { setDialogOpen(false); fetchData(); };

  const columns: GridColDef[] = [ /* ... */ ];

  return (
    <IndexWrapper
      title="{Entity} Master"
      rows={rows} columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      search={{ value: searchQuery, onChange: setSearchQuery, placeholder: "Search..." }}
      createAction={{ label: "Create {Entity}", onClick: handleCreate }}
      onView={handleView}
      onEdit={handleEdit}
    >
      <Create{Entity}Page
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        editId={editId}
        initialMode={dialogMode}
      />
    </IndexWrapper>
  );
}
```

### Dialog Form (`Create{Entity}Page.tsx`)
```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import MuiForm from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import type { MuiFormMode } from "@/components/ui/muiform";

interface Create{Entity}PageProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editId?: number;
  initialMode: MuiFormMode;
}

export default function Create{Entity}Page({ open, onClose, onSaved, editId, initialMode }: Create{Entity}PageProps) {
  const [mode, setMode] = useState<MuiFormMode>(initialMode);
  const [initialValues, setInitialValues] = useState({});
  const [options, setOptions] = useState({ /* dropdown options */ });
  const [formKey, setFormKey] = useState(0);

  const loadSetup = useCallback(async () => {
    // 1. Fetch dropdown options
    const { data: setupData } = await fetchWithCookie(SETUP_URL, "GET");
    setOptions(mapSetupOptions(setupData));

    // 2. If editing, fetch existing record
    if (editId !== undefined) {
      const { data: detail } = await fetchWithCookie(`${DETAIL_URL}/${editId}`, "GET");
      setInitialValues(mapDetailToForm(detail.data));
    }
    setFormKey(prev => prev + 1);
  }, [editId]);

  useEffect(() => { if (open) loadSetup(); }, [open, loadSetup]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const url = editId ? UPDATE_URL : CREATE_URL;
    const method = editId ? "PUT" : "POST";
    const { error } = await fetchWithCookie(url, method, mapFormToPayload(values));
    if (!error) onSaved();
  };

  const schema = { fields: [ /* MuiForm field definitions */ ] };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{mode === "create" ? "Create" : mode === "edit" ? "Edit" : "View"} {Entity}</DialogTitle>
      <DialogContent>
        <MuiForm
          key={formKey}
          schema={schema}
          mode={mode}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onModeChange={setMode}
          hideModeToggle={mode === "create"}
        />
      </DialogContent>
    </Dialog>
  );
}
```

## MuiForm Schema Field Types

| Type | Usage |
|------|-------|
| `text` | Simple text input |
| `select` | Dropdown with `options: Option[]` |
| `multiselect` | Multi-select dropdown |
| `date` | Date picker |
| `number` | Numeric input |
| `textarea` | Multi-line text |
| `checkbox` | Boolean toggle |
| `custom` | Custom render function |

## Dependent Dropdown Pattern

```typescript
// In the form component, use watchers for dependent fields
const watchedCountry = watch("country_id");

useEffect(() => {
  if (watchedCountry) {
    const filtered = allStates.filter(s => String(s.country_id) === watchedCountry);
    setFilteredStates(filtered);
    setValue("state_id", ""); // Reset dependent field
  }
}, [watchedCountry, allStates, setValue]);
```

## Critical Rules

- **NEVER use `any`** — define proper types for form values and API responses
- **Zod validation** — use with `zodResolver` in React Hook Form or MuiForm built-in validation
- **Dialog pattern** — master pages use Dialog, NOT full page navigation (for portal)
- **MuiForm for portal** — schema-driven forms with mode support (create/edit/view)
- **Prefetch optimization** — for complex masters, fetch data BEFORE opening dialog
- **Theme tokens** — never hardcode colors
- **Error handling** — show errors in Snackbar with Alert
- **Company & branch scope** — portal master pages must honor the company/branch selection from the sidebar (`SidebarContext` via `useSidebar()`); pass the selected `co_id` (and `branch_id` where the master is branch-scoped) on list, create, and update calls

## Related Skills

- `new-master` (vowerp3be/.claude/skills/) — scaffolds the full stack for a brand-new master (DDL migration + ORM model + backend CRUD endpoints + this page + menu entry); start there when the table doesn't exist yet
- `add-menu` (vowerp3be/.claude/skills/) — adds the sidebar menu entry for the new page (asks which DBs/tenants and roles)

## Reference Implementations

- `src/app/dashboardportal/masters/categoryMaster/` (simple MuiForm dialog)
- `src/app/dashboardportal/masters/itemMaster/` (complex with nested tables + prefetch)
- `src/app/dashboardadmin/companyManagement/` (admin full-page form)
- `src/app/dashboardadmin/branchManagement/` (admin dialog-based)

---

## Self-Improvement Protocol

This agent learns from each run. Follow this protocol every time.

### Before Starting

1. **Read the learnings log** at `.claude/agents/learnings/master-page.log`
2. Apply any relevant lessons from past runs
3. Pay special attention to `[PATTERN-CHANGE]` and `[BUG-FIX]` entries

### During Execution

1. **Check MuiForm API** — read `src/components/ui/muiform.tsx` for any new field types or props since this spec was written
2. **Scan recent master pages** — run `git log --oneline -5 -- 'src/app/dashboardportal/masters/**/page.tsx'` to detect pattern evolution
3. **Check for new shared helpers** — look for new utilities in `src/utils/` and `src/hooks/` that master pages should leverage

### After Completion

1. **Append to the learnings log** (`.claude/agents/learnings/master-page.log`):
   ```
   ## [DATE] - {EntityName} Master Page
   - **MuiForm API changes detected:** [yes/no — describe any new props/field types]
   - **Pattern drift from spec:** [describe differences from recent master pages]
   - **Dependent dropdown issues:** [any cascade/watcher problems and fixes]
   - **What worked well:** [approaches that went smoothly]
   - **What should change:** [improvements for next run]
   - **[PATTERN-CHANGE]** [if a new pattern was adopted]
   - **[BUG-FIX]** [if a bug in the template was found]
   ```

2. **Propose spec updates** — if MuiForm gained new capabilities or the dialog pattern evolved, suggest edits to THIS agent file.

3. **Track complexity thresholds** — if you had to deviate from the "simple" pattern, note WHY so the architecture decision table above can be refined.
