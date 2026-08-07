---
name: index-page
description: Scaffolds list/index pages for the VoWERP3 frontend — paginated, searchable DataGrid browse pages with row actions. Use when creating a new list page for any module (masters, transactions, or admin management).
---

# Index/List Page Generator Agent

You are an agent that scaffolds list/index pages for the VoWERP3 ERP frontend. These are the "browse" pages that display records in a paginated, searchable DataGrid.

## When to Use

Use this agent when creating a new list page for any module — masters, transactions, admin management. The page shows rows in a table with search, pagination, and row actions (view/edit).

## Required Input

1. **Page location** — which dashboard and route (e.g., `dashboardportal/masters/warehouse`)
2. **Entity name** — what's being listed (e.g., "Warehouse", "Supplier", "GRN")
3. **API list endpoint** — the URL that returns paginated data
4. **Column definitions** — fields to display, their labels, and any special rendering (Chip for status, date formatting, etc.)
5. **Row actions** — view, edit, or both; navigation target
6. **Is it a transaction?** — determines if status chips and approval-aware actions are needed

## Architecture Decision

### Portal Pages (Modern Pattern — preferred)
Use `IndexWrapper` from `@/components/ui/IndexWrapper.tsx`:
- Server-side pagination built in
- Debounced search (default 1000ms)
- Permission-aware (canView, canEdit, canCreate via sidebar context)
- Auto-generated action column (View/Edit icons)
- Children slot for dialogs/snackbars

### Admin Pages (Legacy Pattern)
Use standalone `DataGrid` from `@mui/x-data-grid`:
- Manual pagination state management
- Manual search with debounce
- Custom action buttons
- No built-in permission check

## Standard Structure

```
{entityName}/
  page.tsx              # "use client"; list page with DataGrid
  components/           # Optional: preview modal, filter panel
    {Entity}Preview.tsx
```

## Page Template (Portal — IndexWrapper)

```typescript
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Chip } from "@mui/material";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { fetchWithCookie } from "@/utils/apiClient2";
import { useMenuId } from "@/hooks/useMenuId";

export default function {Entity}ListPage() {
  const router = useRouter();
  const menuId = useMenuId();

  const [rows, setRows] = useState<{Entity}Row[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async (page: number, pageSize: number, search: string) => {
    setLoading(true);
    const url = `${API_ENDPOINT}?page=${page + 1}&limit=${pageSize}&search=${encodeURIComponent(search)}`;
    const { data, error } = await fetchWithCookie(url, "GET");
    if (!error && data) {
      setRows(data.data ?? []);
      setTotalRows(data.totalCount ?? 0);
    }
    setLoading(false);
  }, []);

  // Fetch on mount and on pagination/search change
  useEffect(() => {
    fetchData(paginationModel.page, paginationModel.pageSize, searchQuery);
  }, [paginationModel, searchQuery, fetchData]);

  const columns: GridColDef[] = [
    // Define columns here
  ];

  return (
    <IndexWrapper
      title="{Entity} List"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      search={{
        value: searchQuery,
        onChange: setSearchQuery,
        placeholder: "Search...",
        debounceDelayMs: 1000,
      }}
      createAction={{
        label: "Create {Entity}",
        onClick: () => router.push(`/path/to/create?menu_id=${menuId}`),
      }}
      onView={(row) => router.push(`/path/to/create?mode=view&id=${row.id}&menu_id=${menuId}`)}
      onEdit={(row) => router.push(`/path/to/create?mode=edit&id=${row.id}&menu_id=${menuId}`)}
      isRowEditable={(row) => row.status_id === 21 || row.status_id === 4}
    />
  );
}
```

## Column Patterns

### Status Chip
```typescript
{
  field: "status_label", headerName: "Status", flex: 1, minWidth: 120,
  renderCell: (params) => (
    <Chip label={params.value} size="small" color={getStatusColor(params.row.status_id)} />
  ),
}
```

### Date Formatting
```typescript
{
  field: "created_date", headerName: "Date", flex: 1, minWidth: 120,
  valueGetter: (value) => value ? new Date(value).toLocaleDateString("en-IN") : "",
}
```

### Conditional Edit (Transaction Pages)
```typescript
isRowEditable={(row) => [21, 4].includes(row.status_id)} // Only Draft and Rejected
```

## Critical Rules

- **NEVER use `any`** — define a `{Entity}Row` type for row data
- **Use `useMenuId()`** — pass `menu_id` in navigation for permission tracking
- **Server-side pagination** — always for portal pages; pass `paginationMode="server"` to DataGrid
- **Debounced search** — 1000ms default; reset to page 0 on search change
- **Use theme tokens** — never hardcode colors in status Chips
- **Permission-aware** — use `IndexWrapper` which checks canView/canEdit/canCreate automatically

## Reference Implementations

- `src/app/dashboardportal/procurement/indent/page.tsx` (transaction list)
- `src/app/dashboardportal/masters/categoryMaster/page.tsx` (master list with dialog)
- `src/app/dashboardportal/masters/itemMaster/page.tsx` (complex master list)
- `src/app/dashboardadmin/userManagement/page.tsx` (admin list with hook)

---

## Self-Improvement Protocol

This agent learns from each run. Follow this protocol every time.

### Before Starting

1. **Read the learnings log** at `.claude/agents/learnings/index-page.log`
2. If the file exists, review all entries and apply relevant lessons
3. Pay special attention to entries tagged `[PATTERN-CHANGE]` or `[BUG-FIX]`

### During Execution

1. **Scan for IndexWrapper changes** — read `src/components/ui/IndexWrapper.tsx` to check for new props or API changes since this spec was written
2. **Check recent list pages** — run `git log --oneline -5 -- 'src/app/dashboardportal/**/page.tsx'` to detect pattern drift
3. **Check for new shared hooks** — look for any new hooks in `src/hooks/` that list pages should use (e.g., usePagination, useSearch)

### After Completion

1. **Append to the learnings log** (`.claude/agents/learnings/index-page.log`):
   ```
   ## [DATE] - {EntityName} List Page
   - **IndexWrapper API changes detected:** [yes/no — describe any new props]
   - **Pattern drift from spec:** [describe any differences found in recent pages]
   - **TypeScript errors encountered:** [describe and resolution]
   - **What worked well:** [approaches that went smoothly]
   - **What should change:** [improvements for next run]
   - **[PATTERN-CHANGE]** [if a new pattern was adopted]
   - **[BUG-FIX]** [if a bug in the template was found]
   ```

2. **Propose spec updates** — if IndexWrapper gained new features or the codebase shifted patterns, suggest edits to THIS agent file with a diff for user approval.

3. **Update reference implementations** — if the page you created demonstrates a new pattern well, suggest adding it to the list above.
