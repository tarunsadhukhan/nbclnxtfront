# Batch Plan Daily Assignment — Design Document

**Date:** 2026-02-20
**Module:** Jute Purchase → Batch Plan (`/dashboardportal/jutePurchase/batchPlan/`)
**Pattern:** Mirrors Jute Issue (day+branch grouping with approval workflow)

---

## Purpose

Map yarn types to batch plans for each day and branch, so production knows which batch plan (jute quality mix) to use for each yarn type on a given day. Follows branch-wise logic.

## Core Concept

- **Batch Plan Master** defines named plans with jute quality percentages (e.g., "Plan A = 40% Tossa, 30% Mesta, 30% White")
- **Batch Plan Daily Assignment** maps: `Date + Branch + Yarn Type → Batch Plan`
- Each day+branch can have multiple yarn types, each assigned exactly one batch plan
- Unique constraint: one batch plan per yarn type per day+branch

---

## Data Model

### New Table: `jute_batch_daily_assign`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `batch_daily_assign_id` | BigInteger | PK, auto-increment | Primary key |
| `branch_id` | Integer | NOT NULL, indexed | Branch reference |
| `assign_date` | Date | NOT NULL, indexed | Assignment date |
| `yarn_type_id` | Integer | NOT NULL, indexed | FK to `jute_yarn_type_mst` |
| `batch_plan_id` | BigInteger | NOT NULL, indexed | FK to `jute_batch_plan` |
| `status_id` | Integer | NOT NULL, default 21 | 21=Draft, 1=Open, 3=Approved, 4=Rejected |
| `updated_by` | BigInteger | nullable | Audit: user ID |
| `updated_date_time` | DateTime | server default NOW | Audit: timestamp |

**Unique constraint:** `(branch_id, assign_date, yarn_type_id)`

---

## Backend API (Router: `batchDailyAssign`)

### Endpoints

| Endpoint | Method | Params | Purpose |
|----------|--------|--------|---------|
| `/get_assign_table` | GET | `branch_id`, `page`, `limit`, `search` | List: aggregated by day+branch |
| `/get_assigns_by_date` | GET | `co_id`, `branch_id`, `assign_date` | Detail: all assignments for date+branch |
| `/get_assign_create_setup` | GET | `co_id`, `branch_id` | Setup: yarn types + batch plans for branch |
| `/get_max_assign_date` | GET | `co_id`, `branch_id` | Latest date for auto-increment |
| `/create_assign` | POST | `co_id` | Create single assignment row |
| `/delete_assign/{id}` | DELETE | `co_id` | Delete draft assignment |
| `/open_assigns` | POST | `co_id` | Bulk Draft → Open |
| `/approve_assigns` | POST | `co_id` | Bulk Open → Approved |
| `/reject_assigns` | POST | `co_id` | Bulk Open → Rejected |

### Request/Response Shapes

**Create payload:**
```json
{
  "branch_id": 1,
  "assign_date": "2026-02-20",
  "yarn_type_id": 5,
  "batch_plan_id": 12
}
```

**List response (aggregated):**
```json
{
  "data": [
    {
      "assign_date": "2026-02-20",
      "branch_id": 1,
      "branch_name": "Mill Branch",
      "total_assignments": 3,
      "status": "Draft"
    }
  ],
  "total": 25
}
```

**Detail response:**
```json
{
  "data": [
    {
      "batch_daily_assign_id": 1,
      "branch_id": 1,
      "assign_date": "2026-02-20",
      "yarn_type_id": 5,
      "yarn_type_name": "Hessian",
      "batch_plan_id": 12,
      "plan_name": "Plan A",
      "status_id": 21,
      "updated_by": 10,
      "updated_date_time": "2026-02-20T10:00:00"
    }
  ],
  "summary": {
    "total_assignments": 3,
    "status": "Draft",
    "status_id": 21
  }
}
```

**Setup response:**
```json
{
  "yarn_types": [
    { "jute_yarn_type_id": 5, "jute_yarn_type_name": "Hessian" }
  ],
  "batch_plans": [
    { "batch_plan_id": 12, "plan_name": "Plan A" }
  ]
}
```

**Bulk status transition payload:**
```json
{
  "ids": [1, 2, 3]
}
```

### Backend Files

| File | Purpose |
|------|---------|
| `src/models/jute.py` | Add `JuteBatchDailyAssign` ORM model |
| `src/juteProcurement/batchDailyAssign.py` | New router with all endpoints |
| `src/main.py` | Register router |

### Reference Files for Queries

- `src/models/jute.py` — existing jute models
- `src/juteProcurement/` — existing jute procurement routers (pattern reference)

---

## Frontend Structure

```
batchPlan/
├── page.tsx                          # List page (day+branch grouping)
└── edit/
    ├── page.tsx                      # Detail page (create/edit/view)
    ├── hooks/
    │   └── useBatchAssignSetup.ts    # Fetch yarn types + batch plans
    ├── types/
    │   └── batchAssignTypes.ts       # All TypeScript types
    └── utils/
        ├── batchAssignConstants.ts   # Status IDs and labels
        ├── batchAssignFactories.ts   # Blank line, validation helpers
        └── batchAssignMappers.ts     # API ↔ UI mapping
```

### List Page (`page.tsx`)

- Uses `IndexWrapper` with MUI DataGrid
- One row per date+branch (backend-aggregated)
- Columns: Date | Branch | Assignment Count | Status
- Actions: View / Edit / New Assignment
- Branch-scoped from sidebar context
- Paginated with debounced search
- Navigation: `/edit?mode={mode}&date={date}&branch_id={id}`

### Detail Page (`edit/page.tsx`)

**Three modes:**
- **Create**: Select branch (if multiple), auto-set date (max+1), add rows
- **Edit**: Load existing, add/delete drafts, submit for approval
- **View**: Read-only

**Each row:**
- Yarn Type (Autocomplete dropdown)
- Batch Plan (Autocomplete dropdown)
- Status chip (color-coded)
- Delete button (draft only)

**Validation:**
- Yarn type dropdown excludes already-assigned types for that day
- Both yarn type and batch plan required before save
- Batch plans filtered to the selected branch

**Approval workflow:**
- Checkboxes for selecting lines
- Approval bar with Open All / Approve All / Reject All actions
- Line-level status transitions (same as jute issue)

### Frontend Files

| File | Purpose |
|------|---------|
| `src/utils/api.ts` | Add `BATCH_DAILY_ASSIGN_*` routes |
| `batchPlan/page.tsx` | Replace placeholder with list page |
| `batchPlan/edit/page.tsx` | New detail page |
| `batchPlan/edit/types/batchAssignTypes.ts` | All types |
| `batchPlan/edit/hooks/useBatchAssignSetup.ts` | Setup data hook |
| `batchPlan/edit/utils/batchAssignConstants.ts` | Status constants |
| `batchPlan/edit/utils/batchAssignFactories.ts` | Factories |
| `batchPlan/edit/utils/batchAssignMappers.ts` | Mappers |

---

## Agent Split

### Backend Agent (vowerp3be)
1. Add `JuteBatchDailyAssign` model to `src/models/jute.py`
2. Create `src/juteProcurement/batchDailyAssign.py` with all 9 endpoints
3. Register router in `src/main.py`
4. Reference: `src/models/jute.py` and `src/juteProcurement/` for patterns

### Frontend Agent (vowerp3ui)
1. Add API routes to `src/utils/api.ts`
2. Build types, constants, factories, mappers in `edit/` subfolders
3. Build `useBatchAssignSetup` hook
4. Build list page (`page.tsx`) using `IndexWrapper`
5. Build detail page (`edit/page.tsx`) with three-mode rendering + approval

---

## Status Workflow

```
Draft (21) → Open (1) → Approved (3)
                      → Rejected (4)
```

Same status IDs as all other jute transactions.
