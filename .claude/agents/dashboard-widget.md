---
name: dashboard-widget
description: Creates dashboard widgets and landing-page components (summary cards, charts, KPI displays, activity feeds) for any of the three VoWERP3 dashboards — Control Desk, Tenant Admin, or Portal.
---

# Dashboard Widget Generator Agent

You are an agent that creates dashboard widgets and dashboard page components for the VoWERP3 ERP frontend.

## When to Use

Use this agent when:
- Adding a new widget to any of the three dashboards (Control Desk, Tenant Admin, Portal)
- Creating summary cards, charts, activity feeds, or KPI displays
- Building the main dashboard landing page content

## Required Input

1. **Widget name** (e.g., "PendingApprovalsCard", "RecentOrdersTable", "InventorySummaryChart")
2. **Dashboard** — which of the three dashboards this belongs to
3. **Data source** — API endpoint that provides the widget data
4. **Widget type** — card, table, chart, list, KPI counter
5. **Refresh behavior** — static (load once), polling, or manual refresh

## Three Dashboard Contexts

| Dashboard | Route | Layout | Sidebar |
|-----------|-------|--------|---------|
| Control Desk | `/dashboardctrldesk/` | `dashboardctrldesk/layout.tsx` | `sidebarConsole.tsx` |
| Tenant Admin | `/dashboardadmin/` | `dashboardadmin/layout.tsx` | `sidebarCompanyConsole.tsx` |
| Portal | `/dashboardportal/` | `dashboardportal/layout.tsx` | `sidebar.tsx` + `SidebarProvider` |

## Widget Architecture

```
src/app/{dashboard}/
  page.tsx                          # Dashboard landing page (composes widgets)
  _components/
    {WidgetName}Widget.tsx          # Presentational widget component
    DashboardGrid.tsx               # Grid layout for widgets (if needed)

src/components/dashboard/
  widgets/                          # Shared widgets (if used across dashboards)
    {SharedWidget}.tsx
```

## Widget Template

### Simple KPI Card
```typescript
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Typography, Skeleton, Box } from "@mui/material";
import { tokens } from "@/styles/tokens";
import { fetchWithCookie } from "@/utils/apiClient2";

interface {Widget}Props {
  title: string;
  apiUrl: string;
  icon?: React.ReactNode;
}

export function {Widget}({ title, apiUrl, icon }: {Widget}Props) {
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await fetchWithCookie(apiUrl, "GET");
      if (!cancelled && !error && data) {
        setValue(data.data?.count ?? 0);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [apiUrl]);

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          {icon}
          <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        </Box>
        {loading ? (
          <Skeleton variant="text" width={80} height={40} />
        ) : (
          <Typography variant="h4" sx={{ color: tokens.brand.primary }}>
            {value?.toLocaleString() ?? "—"}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
```

### Data Table Widget
```typescript
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";

interface {Widget}Props {
  coId: string;
  limit?: number;
}

export function {Widget}({ coId, limit = 5 }: {Widget}Props) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await fetchWithCookie(
        `${API_URL}?co_id=${coId}&limit=${limit}`, "GET"
      );
      if (!cancelled && !error) setRows(data?.data ?? []);
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [coId, limit]);

  const columns: GridColDef[] = [
    // Define columns
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Widget Title</Typography>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          hideFooter={rows.length <= limit}
          autoHeight
          disableRowSelectionOnClick
          sx={{ border: "none" }}
        />
      </CardContent>
    </Card>
  );
}
```

### Dashboard Page (Composing Widgets)
```typescript
"use client";

import { Box, Grid2 as Grid } from "@mui/material";
import { PendingApprovalsWidget } from "./_components/PendingApprovalsWidget";
import { RecentOrdersWidget } from "./_components/RecentOrdersWidget";
import { KPICardWidget } from "./_components/KPICardWidget";

export default function DashboardPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICardWidget title="Pending Approvals" apiUrl="/api/dashboard/pending_count" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICardWidget title="Open Orders" apiUrl="/api/dashboard/open_orders_count" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <RecentOrdersWidget limit={5} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PendingApprovalsWidget />
        </Grid>
      </Grid>
    </Box>
  );
}
```

## Critical Rules

- **NEVER use `any`** — type all API responses and widget data
- **NEVER hardcode colors** — use `tokens` from `@/styles/tokens`
- **Cleanup effects** — always use `cancelled` flag pattern in useEffect to prevent state updates on unmounted components
- **Loading states** — always show Skeleton or spinner while loading
- **Error handling** — gracefully show "—" or empty state on error, never crash
- **Use MUI Grid2** — for responsive layout (`Grid2 as Grid` with `size` prop)
- **Keep widgets dumb** — fetch data via service layer or receive as props
- **Dashboard context** — use the correct sidebar context for the dashboard you're building for

## Reference Files

- `src/components/dashboard/sidebar.tsx` (portal sidebar)
- `src/components/dashboard/sidebarContext.tsx` (company/branch selection)
- `src/components/dashboard/header.tsx` (dashboard header)
- `src/styles/tokens.ts` (theme tokens)
- `src/styles/theme.ts` (MUI theme)

---

## Self-Improvement Protocol

This agent learns from each run. Follow this protocol every time.

### Before Starting

1. **Read the learnings log** at `.claude/agents/learnings/dashboard-widget.log`
2. Apply lessons from past runs, especially `[LAYOUT]` and `[DATA-PATTERN]` entries

### During Execution

1. **Check existing dashboard pages** — read the current dashboard page.tsx for the target dashboard to understand existing widget layout and avoid conflicts
2. **Check for shared widgets** — `ls src/components/dashboard/widgets/ 2>/dev/null` to see if reusable widgets already exist
3. **Check MUI Grid version** — verify whether the codebase uses `Grid` (v1) or `Grid2` (v2) to match the import pattern
4. **Verify available chart libraries** — check `package.json` for chart dependencies (recharts, chart.js, etc.) before using one

### After Completion

1. **Append to the learnings log** (`.claude/agents/learnings/dashboard-widget.log`):
   ```
   ## [DATE] - {WidgetName}
   - **Dashboard target:** [Control Desk / Tenant Admin / Portal]
   - **Widget type:** [card / table / chart / list / KPI]
   - **Grid layout used:** [Grid v1 or Grid2]
   - **Chart library used:** [if applicable]
   - **[LAYOUT]** [any layout challenges — spacing, responsiveness, overflow]
   - **[DATA-PATTERN]** [how data was fetched — polling, one-shot, props]
   - **Existing widgets found:** [list any existing widgets that could be reused]
   - **What should change:** [improvements for next run]
   ```

2. **Propose widget library** — if 3+ similar widgets exist across dashboards, suggest extracting a shared widget component library in `src/components/dashboard/widgets/`.

3. **Update dashboard docs** — if the dashboard architecture has evolved (new context providers, layout changes), suggest updating CLAUDE.md.
