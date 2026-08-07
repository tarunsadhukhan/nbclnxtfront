# Jute Procurement Reports Page - Design Document

**Date:** 2026-02-21
**Module:** `dashboardportal/jutePurchase/reports`
**Status:** Approved

---

## Overview

A tab-based reports page for the Jute Procurement module with two reports:
1. **Jute Stock Report** - Daily stock position grouped by item group and item
2. **Batch Cost Report** - Yarn quality-wise planned vs actual issue pivot

---

## Page Architecture

### Frontend Structure

```
src/app/dashboardportal/jutePurchase/reports/
├── page.tsx                          # Tab container + branch/date selectors
├── _components/
│   ├── JuteStockReport.tsx           # Tab 1: Stock report DataGrid
│   └── BatchCostReport.tsx           # Tab 2: Batch cost pivot DataGrid
├── hooks/
│   ├── useJuteStockReport.ts         # Fetch + transform stock data
│   └── useBatchCostReport.ts         # Fetch + transform batch cost data
└── types/
    └── reportTypes.ts                # All report types
```

### Backend Structure

```
src/juteProcurement/
├── reportQueries.py                  # SQL queries for both reports
└── reports.py                        # FastAPI router with 2 endpoints
```

Router registered in `main.py` as `/api/juteReports/`.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Jute Stock Report]  [Batch Cost Report]               │
├─────────────────────────────────────────────────────────┤
│  Branch: [Select Branch ▼]    Date: [2026-02-20]        │
├─────────────────────────────────────────────────────────┤
│  ┌─ DataGrid ─────────────────────────────────────────┐ │
│  │  (report-specific content per active tab)          │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

- Branch selector is **required** before data loads
- Date defaults to **yesterday**
- Tab switching preserves branch/date selection

---

## Report 1: Jute Stock Report

### API

`GET /api/juteReports/stock?branch_id=X&date=YYYY-MM-DD`

### Query Logic

- **Opening Stock (Wt)** = SUM(MR receipt weight before date) - SUM(Issue weight before date)
- **Receipt (Wt)** = SUM(MR receipt weight ON date)
- **Issue (Wt)** = SUM(Jute issue weight ON date)
- **Closing Stock (Wt)** = Opening + Receipt - Issue
- **MTD Receipt (Wt)** = SUM(MR receipt weight from 1st of month to date)
- **MTD Issue (Wt)** = SUM(Jute issue weight from 1st of month to date)

### Status Filter

Include transactions with status: **Open (1), Approved (3), Finalised (13)**. Exclude Draft (21), Rejected (4), Cancelled (6).

### Grouping

Grouped by `item_grp_id` (jute group name) then `item_id` (item name).

### DataGrid Columns

| Column | Field | Type |
|--------|-------|------|
| Item Group | `item_group_name` | string (group header) |
| Item Name | `item_name` | string |
| Opening Wt (kg) | `opening_weight` | number |
| Receipt Wt (kg) | `receipt_weight` | number |
| Issue Wt (kg) | `issue_weight` | number |
| Closing Wt (kg) | `closing_weight` | number (calculated: opening + receipt - issue) |
| MTD Receipt Wt (kg) | `mtd_receipt_weight` | number |
| MTD Issue Wt (kg) | `mtd_issue_weight` | number |

### Response Shape

```typescript
interface JuteStockReportRow {
  item_grp_id: number;
  item_group_name: string;
  item_id: number;
  item_name: string;
  opening_weight: number;
  receipt_weight: number;
  issue_weight: number;
  closing_weight: number;       // calculated server-side
  mtd_receipt_weight: number;
  mtd_issue_weight: number;
}
```

---

## Report 2: Batch Cost Report

### API

`GET /api/juteReports/batch-cost?branch_id=X&date=YYYY-MM-DD`

### Query Logic

1. Get batch daily assignments for date + branch (status Open/Approved)
2. Join `batch_plan -> batch_plan_li` to get quality percentages per yarn type
3. Get total actual issue weight per yarn type for the date
4. **Planned weight** = (quality_percentage / 100) * total_actual_issue_weight_for_yarn_type
5. Get actual issue breakdown by `yarn_type_id` + `item_id` (jute quality)
6. Join MR line items to get `actual_rate`
7. **Issue value** = (actual_weight / 100) * actual_rate

### Status Filter

Same as stock report: Open (1), Approved (3), Finalised (13).

### DataGrid Columns (nested: Yarn Type -> Jute Quality)

| Column | Field | Type |
|--------|-------|------|
| Yarn Type | `yarn_type_name` | string (group header) |
| Jute Quality | `item_name` | string |
| Planned Wt (kg) | `planned_weight` | number |
| Actual Wt (kg) | `actual_weight` | number |
| Rate (per qtl) | `actual_rate` | number |
| Value | `issue_value` | number |
| Variance (kg) | `variance` | number (actual - planned) |

### Response Shape

```typescript
interface BatchCostReportRow {
  yarn_type_id: number;
  yarn_type_name: string;
  item_id: number;
  item_name: string;
  planned_weight: number;
  actual_weight: number;
  actual_rate: number;
  issue_value: number;
  variance: number;             // actual_weight - planned_weight
}
```

---

## 3-Agent Implementation Team

| Agent | Scope | Deliverables |
|-------|-------|-------------|
| **Backend Agent 1: Stock Report** | DB query + endpoint for jute stock | `reportQueries.py` (stock query), `reports.py` (router + stock endpoint), register in `main.py` |
| **Backend Agent 2: Batch Cost Report** | DB query + endpoint for batch cost | Add batch cost query to `reportQueries.py`, add batch cost endpoint to `reports.py` |
| **Frontend Agent: UI** | Reports page with tabs + both components | `page.tsx`, `_components/`, `hooks/`, `types/`, API routes in `api.ts`, service functions |

**Execution order:** Backend Agent 1 first (creates files), Backend Agent 2 second (adds to files). Frontend Agent can start in parallel once types are defined.

---

## Key Data Sources

### Stock Report Tables
- `jute_mr` + `jute_mr_li` - Material receipts (receipt data)
- `jute_issue` - Issue transactions (issue data)
- `item_mst` - Item names
- `item_grp_mst` - Item group names

### Batch Cost Report Tables
- `jute_batch_daily_assign` - Daily assignments (date + branch + yarn)
- `jute_batch_plan` + `jute_batch_plan_li` - Plan with quality percentages
- `jute_issue` - Actual issues (by yarn_type + item)
- `jute_mr_li` - Rates from material receipt
- `jute_yarn_mst` - Yarn type names
- `item_mst` - Quality/item names

---

## UI Patterns

- **Tabs:** MUI `Tabs` + `Tab` (first usage in this project)
- **Date Picker:** Native `TextField type="date"` with `toDateInput()` (existing pattern)
- **Branch Selector:** MUI `Autocomplete` with branch options from sidebar context
- **DataGrid:** `MuiDataGrid` wrapper component (existing)
- **Styling:** Tailwind for layout, MUI for components, theme tokens for colors
