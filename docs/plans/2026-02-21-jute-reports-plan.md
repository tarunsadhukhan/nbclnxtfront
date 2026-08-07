# Jute Procurement Reports - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a tab-based reports page for Jute Procurement with two reports: Jute Stock Report and Batch Cost Report.

**Architecture:** Backend (FastAPI) provides 2 new GET endpoints under `/api/juteReports/`. Frontend (Next.js) renders a tab-based page with MUI Tabs, branch selector, date picker, and MUI DataGrid per report. Data flows: SQL query -> FastAPI endpoint -> fetchWithCookie -> React hook -> DataGrid.

**Tech Stack:** Python/FastAPI/SQLAlchemy (backend), Next.js 15/React 19/TypeScript/MUI DataGrid/Tailwind (frontend)

**Design Doc:** `docs/plans/2026-02-21-jute-reports-design.md`

---

## Agent Assignment

| Agent | Tasks | Repo |
|-------|-------|------|
| **Backend Agent 1** | Tasks 1-3 (Stock Report API) | `vowerp3be` |
| **Backend Agent 2** | Task 4 (Batch Cost Report API) | `vowerp3be` |
| **Frontend Agent** | Tasks 5-9 (UI) | `vowerp3ui` |

Backend Agent 1 runs first (creates files). Backend Agent 2 runs second (adds to files). Frontend Agent can run in parallel once Task 5 (types) is done.

---

## Task 1: Create Report Queries File - Stock Report Query

**Agent:** Backend Agent 1
**Files:**
- Create: `c:/code/vowerp3be/src/juteProcurement/reportQueries.py`

**Step 1: Create `reportQueries.py` with the stock report query**

This query calculates daily stock position grouped by item group and item. It uses the `_group_path_cte()` from `query.py` for hierarchical group names.

Key tables:
- `jute_mr` + `jute_mr_li` for receipts (use `out_date` as inward date, `actual_weight` for weight)
- `jute_issue` for issues (use `issue_date`, `weight` field)
- `item_mst` + `item_grp_mst` for item/group names
- Status filter: `status_id IN (1, 3, 13)` (Open, Approved, Finalised)

```python
from sqlalchemy import text


def _group_path_cte():
    """
    Recursive CTE for hierarchical item group names.
    Copied from query.py to keep reportQueries self-contained.
    """
    return """
        WITH RECURSIVE group_path AS (
            SELECT
                igm.item_grp_id AS target_id,
                igm.item_grp_id,
                igm.item_grp_name,
                igm.parent_grp_id,
                CAST(igm.item_grp_name AS CHAR(500)) AS item_grp_name_path
            FROM item_grp_mst igm

            UNION ALL

            SELECT
                child.target_id,
                p.item_grp_id,
                p.item_grp_name,
                p.parent_grp_id,
                CAST(CONCAT(p.item_grp_name, ' > ', child.item_grp_name_path) AS CHAR(500))
            FROM item_grp_mst p
            JOIN group_path child ON child.parent_grp_id = p.item_grp_id
        ),
        full_group_paths AS (
            SELECT target_id AS item_grp_id, item_grp_name_path
            FROM group_path
            WHERE parent_grp_id IS NULL
        )
    """


def get_jute_stock_report_query():
    """
    Jute Stock Report: daily stock position by item group and item.

    For a given branch_id and report_date:
    - opening_weight = all MR receipts before date - all issues before date
    - receipt_weight = MR receipts ON the date
    - issue_weight = issues ON the date
    - closing_weight = opening + receipt - issue
    - mtd_receipt_weight = MR receipts from 1st of month to date
    - mtd_issue_weight = issues from 1st of month to date

    Status filter: IN (1, 3, 13) for both MR and issues.
    """
    sql = _group_path_cte() + """
        SELECT
            im.item_grp_id,
            COALESCE(fgp.item_grp_name_path, ig.item_grp_name) AS item_group_name,
            im.item_id,
            im.item_name,

            -- Opening: receipts before date minus issues before date
            ROUND(COALESCE(rcpt_before.total_weight, 0), 3) AS receipt_before_weight,
            ROUND(COALESCE(issue_before.total_weight, 0), 3) AS issue_before_weight,
            ROUND(
                COALESCE(rcpt_before.total_weight, 0) - COALESCE(issue_before.total_weight, 0),
                3
            ) AS opening_weight,

            -- Day's receipt and issue
            ROUND(COALESCE(rcpt_day.total_weight, 0), 3) AS receipt_weight,
            ROUND(COALESCE(issue_day.total_weight, 0), 3) AS issue_weight,

            -- Closing = opening + receipt - issue
            ROUND(
                (COALESCE(rcpt_before.total_weight, 0) - COALESCE(issue_before.total_weight, 0))
                + COALESCE(rcpt_day.total_weight, 0)
                - COALESCE(issue_day.total_weight, 0),
                3
            ) AS closing_weight,

            -- MTD receipt and issue
            ROUND(COALESCE(rcpt_mtd.total_weight, 0), 3) AS mtd_receipt_weight,
            ROUND(COALESCE(issue_mtd.total_weight, 0), 3) AS mtd_issue_weight

        FROM item_mst im
        INNER JOIN item_grp_mst ig ON ig.item_grp_id = im.item_grp_id
        LEFT JOIN full_group_paths fgp ON fgp.item_grp_id = im.item_grp_id

        -- Receipts BEFORE report date (for opening stock)
        LEFT JOIN (
            SELECT mrli.actual_item_id AS item_id,
                   SUM(mrli.actual_weight) AS total_weight
            FROM jute_mr_li mrli
            INNER JOIN jute_mr jm ON jm.jute_mr_id = mrli.jute_mr_id
            WHERE jm.branch_id = :branch_id
              AND jm.out_date < :report_date
              AND jm.status_id IN (1, 3, 13)
            GROUP BY mrli.actual_item_id
        ) rcpt_before ON rcpt_before.item_id = im.item_id

        -- Issues BEFORE report date (for opening stock)
        LEFT JOIN (
            SELECT COALESCE(ji.item_id, mrli.actual_item_id) AS item_id,
                   SUM(ji.weight) AS total_weight
            FROM jute_issue ji
            LEFT JOIN jute_mr_li mrli ON mrli.jute_mr_li_id = ji.jute_mr_li_id
            WHERE ji.branch_id = :branch_id
              AND ji.issue_date < :report_date
              AND ji.status_id IN (1, 3)
            GROUP BY COALESCE(ji.item_id, mrli.actual_item_id)
        ) issue_before ON issue_before.item_id = im.item_id

        -- Receipts ON report date
        LEFT JOIN (
            SELECT mrli.actual_item_id AS item_id,
                   SUM(mrli.actual_weight) AS total_weight
            FROM jute_mr_li mrli
            INNER JOIN jute_mr jm ON jm.jute_mr_id = mrli.jute_mr_id
            WHERE jm.branch_id = :branch_id
              AND jm.out_date = :report_date
              AND jm.status_id IN (1, 3, 13)
            GROUP BY mrli.actual_item_id
        ) rcpt_day ON rcpt_day.item_id = im.item_id

        -- Issues ON report date
        LEFT JOIN (
            SELECT COALESCE(ji.item_id, mrli.actual_item_id) AS item_id,
                   SUM(ji.weight) AS total_weight
            FROM jute_issue ji
            LEFT JOIN jute_mr_li mrli ON mrli.jute_mr_li_id = ji.jute_mr_li_id
            WHERE ji.branch_id = :branch_id
              AND ji.issue_date = :report_date
              AND ji.status_id IN (1, 3)
            GROUP BY COALESCE(ji.item_id, mrli.actual_item_id)
        ) issue_day ON issue_day.item_id = im.item_id

        -- MTD receipts (1st of month to report date)
        LEFT JOIN (
            SELECT mrli.actual_item_id AS item_id,
                   SUM(mrli.actual_weight) AS total_weight
            FROM jute_mr_li mrli
            INNER JOIN jute_mr jm ON jm.jute_mr_id = mrli.jute_mr_id
            WHERE jm.branch_id = :branch_id
              AND jm.out_date >= DATE_FORMAT(:report_date, '%%Y-%%m-01')
              AND jm.out_date <= :report_date
              AND jm.status_id IN (1, 3, 13)
            GROUP BY mrli.actual_item_id
        ) rcpt_mtd ON rcpt_mtd.item_id = im.item_id

        -- MTD issues (1st of month to report date)
        LEFT JOIN (
            SELECT COALESCE(ji.item_id, mrli.actual_item_id) AS item_id,
                   SUM(ji.weight) AS total_weight
            FROM jute_issue ji
            LEFT JOIN jute_mr_li mrli ON mrli.jute_mr_li_id = ji.jute_mr_li_id
            WHERE ji.branch_id = :branch_id
              AND ji.issue_date >= DATE_FORMAT(:report_date, '%%Y-%%m-01')
              AND ji.issue_date <= :report_date
              AND ji.status_id IN (1, 3)
            GROUP BY COALESCE(ji.item_id, mrli.actual_item_id)
        ) issue_mtd ON issue_mtd.item_id = im.item_id

        -- Only include items that have ANY stock activity
        WHERE (
            rcpt_before.total_weight IS NOT NULL
            OR issue_before.total_weight IS NOT NULL
            OR rcpt_day.total_weight IS NOT NULL
            OR issue_day.total_weight IS NOT NULL
            OR rcpt_mtd.total_weight IS NOT NULL
            OR issue_mtd.total_weight IS NOT NULL
        )

        ORDER BY ig.item_grp_name, im.item_name
    """
    return text(sql)
```

**Step 2: Verify file created**

Run: `ls c:/code/vowerp3be/src/juteProcurement/reportQueries.py`

---

## Task 2: Create Report Router - Stock Report Endpoint

**Agent:** Backend Agent 1
**Files:**
- Create: `c:/code/vowerp3be/src/juteProcurement/reports.py`

**Step 1: Create `reports.py` with the stock report endpoint**

Follow the pattern from `issue.py:275` (get_stock_outstanding endpoint).

```python
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from src.config.db import get_tenant_db
from src.authorization.utils import get_current_user_with_refresh
from src.juteProcurement.reportQueries import (
    get_jute_stock_report_query,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/stock")
async def get_jute_stock_report(
    request: Request,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    """
    Jute Stock Report: daily stock position by item group and item.
    Required params: branch_id, date (YYYY-MM-DD)
    """
    try:
        q_branch_id = request.query_params.get("branch_id")
        q_date = request.query_params.get("date")

        if not q_branch_id:
            raise HTTPException(status_code=400, detail="branch_id is required")
        if not q_date:
            raise HTTPException(status_code=400, detail="date is required")

        branch_id = int(q_branch_id)

        query = get_jute_stock_report_query()
        rows = db.execute(query, {
            "branch_id": branch_id,
            "report_date": q_date,
        }).fetchall()

        data = [dict(r._mapping) for r in rows]
        return {"data": data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching jute stock report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching stock report: {str(e)}")
```

**Step 2: Verify file created**

Run: `ls c:/code/vowerp3be/src/juteProcurement/reports.py`

---

## Task 3: Register Report Router in main.py

**Agent:** Backend Agent 1
**Files:**
- Modify: `c:/code/vowerp3be/src/main.py:52` (add import) and `:134` (add router)

**Step 1: Add import at line 52 (after batch_daily_assign import)**

```python
from src.juteProcurement.reports import router as jute_reports_router
```

**Step 2: Add router registration at line 134 (after batch_daily_assign router)**

```python
app.include_router(jute_reports_router, prefix="/api/juteReports", tags=["jute-procurement-reports"])
```

**Step 3: Verify backend starts**

Run: `cd c:/code/vowerp3be && python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload`
Expected: Server starts without import errors.

**Step 4: Test stock endpoint**

Run: `curl "http://localhost:8000/api/juteReports/stock?branch_id=1&date=2026-02-20" -H "Cookie: access_token=<token>"`
Expected: `{"data": [...]}` with stock rows or empty array.

**Step 5: Commit**

```bash
cd c:/code/vowerp3be
git add src/juteProcurement/reportQueries.py src/juteProcurement/reports.py src/main.py
git commit -m "feat: add jute stock report API endpoint"
```

---

## Task 4: Add Batch Cost Report Query and Endpoint

**Agent:** Backend Agent 2
**Files:**
- Modify: `c:/code/vowerp3be/src/juteProcurement/reportQueries.py` (add query)
- Modify: `c:/code/vowerp3be/src/juteProcurement/reports.py` (add endpoint)

**Step 1: Add batch cost report query to `reportQueries.py`**

This query joins batch_daily_assign -> batch_plan -> batch_plan_li to get planned percentages per quality, then compares with actual jute_issue data.

Key logic:
- `batch_plan_li.percentage` defines planned mix per quality
- `planned_weight = (percentage / 100) * total_actual_issue_weight_for_yarn_type`
- Actual data from `jute_issue` grouped by `yarn_type_id` + `item_id`
- Rate from `jute_mr_li.actual_rate`
- `issue_value = (weight / 100) * actual_rate`

```python
def get_batch_cost_report_query():
    """
    Batch Cost Report: yarn quality-wise planned vs actual issue.

    For a given branch_id and report_date:
    - Gets batch daily assignments for the date (status IN 1, 3)
    - Joins to batch_plan_li for quality percentages
    - Calculates planned_weight = (percentage/100) * total_actual_weight_for_yarn
    - Gets actual issue data per yarn_type + item
    - Calculates variance = actual_weight - planned_weight

    Returns rows nested by yarn_type -> jute quality.
    """
    sql = _group_path_cte() + """,
        -- Total actual issue weight per yarn type on this date
        yarn_totals AS (
            SELECT
                ji.yarn_type_id,
                SUM(ji.weight) AS total_actual_weight
            FROM jute_issue ji
            WHERE ji.branch_id = :branch_id
              AND ji.issue_date = :report_date
              AND ji.status_id IN (1, 3)
            GROUP BY ji.yarn_type_id
        ),
        -- Planned percentages from batch assignments for this date
        planned AS (
            SELECT
                bda.jute_yarn_id AS yarn_type_id,
                bpl.jute_quality_id AS item_id,
                bpl.percentage,
                yt.total_actual_weight,
                ROUND((bpl.percentage / 100.0) * COALESCE(yt.total_actual_weight, 0), 3) AS planned_weight
            FROM jute_batch_daily_assign bda
            INNER JOIN jute_batch_plan_li bpl ON bpl.batch_plan_id = bda.batch_plan_id
            LEFT JOIN yarn_totals yt ON yt.yarn_type_id = bda.jute_yarn_id
            WHERE bda.branch_id = :branch_id
              AND bda.assign_date = :report_date
              AND bda.status_id IN (1, 3)
        ),
        -- Actual issue breakdown per yarn_type + item
        actual AS (
            SELECT
                ji.yarn_type_id,
                COALESCE(ji.item_id, mrli.actual_item_id) AS item_id,
                SUM(ji.weight) AS actual_weight,
                ROUND(AVG(mrli.actual_rate), 2) AS avg_rate,
                SUM(ji.issue_value) AS issue_value
            FROM jute_issue ji
            LEFT JOIN jute_mr_li mrli ON mrli.jute_mr_li_id = ji.jute_mr_li_id
            WHERE ji.branch_id = :branch_id
              AND ji.issue_date = :report_date
              AND ji.status_id IN (1, 3)
            GROUP BY ji.yarn_type_id, COALESCE(ji.item_id, mrli.actual_item_id)
        )

        SELECT
            COALESCE(p.yarn_type_id, a.yarn_type_id) AS yarn_type_id,
            COALESCE(yim.item_name, jym.jute_yarn_name) AS yarn_type_name,
            COALESCE(p.item_id, a.item_id) AS item_id,
            im.item_name,
            im.item_grp_id,
            COALESCE(fgp.item_grp_name_path, ig.item_grp_name) AS item_group_name,
            ROUND(COALESCE(p.planned_weight, 0), 3) AS planned_weight,
            ROUND(COALESCE(a.actual_weight, 0), 3) AS actual_weight,
            COALESCE(a.avg_rate, 0) AS actual_rate,
            ROUND(COALESCE(a.issue_value, 0), 2) AS issue_value,
            ROUND(COALESCE(a.actual_weight, 0) - COALESCE(p.planned_weight, 0), 3) AS variance

        FROM planned p
        -- FULL OUTER JOIN emulated with LEFT + RIGHT UNION
        LEFT JOIN actual a ON a.yarn_type_id = p.yarn_type_id AND a.item_id = p.item_id

        LEFT JOIN jute_yarn_mst jym ON jym.jute_yarn_id = COALESCE(p.yarn_type_id, a.yarn_type_id)
        LEFT JOIN item_mst yim ON yim.item_id = jym.item_id
        LEFT JOIN item_mst im ON im.item_id = COALESCE(p.item_id, a.item_id)
        LEFT JOIN item_grp_mst ig ON ig.item_grp_id = im.item_grp_id
        LEFT JOIN full_group_paths fgp ON fgp.item_grp_id = im.item_grp_id

        UNION

        SELECT
            a.yarn_type_id,
            COALESCE(yim.item_name, jym.jute_yarn_name) AS yarn_type_name,
            a.item_id,
            im.item_name,
            im.item_grp_id,
            COALESCE(fgp.item_grp_name_path, ig.item_grp_name) AS item_group_name,
            0 AS planned_weight,
            ROUND(a.actual_weight, 3) AS actual_weight,
            a.avg_rate AS actual_rate,
            ROUND(a.issue_value, 2) AS issue_value,
            ROUND(a.actual_weight, 3) AS variance

        FROM actual a
        LEFT JOIN planned p ON p.yarn_type_id = a.yarn_type_id AND p.item_id = a.item_id

        LEFT JOIN jute_yarn_mst jym ON jym.jute_yarn_id = a.yarn_type_id
        LEFT JOIN item_mst yim ON yim.item_id = jym.item_id
        LEFT JOIN item_mst im ON im.item_id = a.item_id
        LEFT JOIN item_grp_mst ig ON ig.item_grp_id = im.item_grp_id
        LEFT JOIN full_group_paths fgp ON fgp.item_grp_id = im.item_grp_id

        WHERE p.yarn_type_id IS NULL

        ORDER BY yarn_type_name, item_name
    """
    return text(sql)
```

**Step 2: Add batch cost endpoint to `reports.py`**

Add import for the new query at the top of `reports.py`:
```python
from src.juteProcurement.reportQueries import (
    get_jute_stock_report_query,
    get_batch_cost_report_query,
)
```

Add the endpoint:
```python
@router.get("/batch-cost")
async def get_batch_cost_report(
    request: Request,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    """
    Batch Cost Report: yarn quality-wise planned vs actual issue.
    Required params: branch_id, date (YYYY-MM-DD)
    """
    try:
        q_branch_id = request.query_params.get("branch_id")
        q_date = request.query_params.get("date")

        if not q_branch_id:
            raise HTTPException(status_code=400, detail="branch_id is required")
        if not q_date:
            raise HTTPException(status_code=400, detail="date is required")

        branch_id = int(q_branch_id)

        query = get_batch_cost_report_query()
        rows = db.execute(query, {
            "branch_id": branch_id,
            "report_date": q_date,
        }).fetchall()

        data = [dict(r._mapping) for r in rows]
        return {"data": data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching batch cost report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching batch cost report: {str(e)}")
```

**Step 3: Test batch cost endpoint**

Run: `curl "http://localhost:8000/api/juteReports/batch-cost?branch_id=1&date=2026-02-20" -H "Cookie: access_token=<token>"`
Expected: `{"data": [...]}` with batch cost rows or empty array.

**Step 4: Commit**

```bash
cd c:/code/vowerp3be
git add src/juteProcurement/reportQueries.py src/juteProcurement/reports.py
git commit -m "feat: add batch cost report API endpoint"
```

---

## Task 5: Create Frontend Types

**Agent:** Frontend Agent
**Files:**
- Create: `c:/code/vowerp3ui/src/app/dashboardportal/jutePurchase/reports/types/reportTypes.ts`

**Step 1: Create the types file**

```typescript
/** Row from GET /api/juteReports/stock */
export interface JuteStockReportRow {
  item_grp_id: number;
  item_group_name: string;
  item_id: number;
  item_name: string;
  opening_weight: number;
  receipt_weight: number;
  issue_weight: number;
  closing_weight: number;
  mtd_receipt_weight: number;
  mtd_issue_weight: number;
}

/** Row from GET /api/juteReports/batch-cost */
export interface BatchCostReportRow {
  yarn_type_id: number;
  yarn_type_name: string;
  item_id: number;
  item_name: string;
  item_grp_id: number;
  item_group_name: string;
  planned_weight: number;
  actual_weight: number;
  actual_rate: number;
  issue_value: number;
  variance: number;
}

/** API response wrapper */
export interface ReportApiResponse<T> {
  data: T[];
}

/** Branch option for the selector */
export interface BranchOption {
  branch_id: number;
  branch_name: string;
}
```

---

## Task 6: Add API Routes and Service Functions

**Agent:** Frontend Agent
**Files:**
- Modify: `c:/code/vowerp3ui/src/utils/api.ts:322` (add routes after BATCH_DAILY_ASSIGN_REJECT)
- Create: `c:/code/vowerp3ui/src/utils/juteReportService.ts`

**Step 1: Add API route constants to `api.ts`**

After line 322 (BATCH_DAILY_ASSIGN_REJECT), add:

```typescript
    // Jute Reports
    JUTE_REPORT_STOCK: `${API_URL}/juteReports/stock`,
    JUTE_REPORT_BATCH_COST: `${API_URL}/juteReports/batch-cost`,
```

**Step 2: Create service file**

```typescript
import { fetchWithCookie } from "./apiClient2";
import { API_ROUTES } from "./api";
import type {
  JuteStockReportRow,
  BatchCostReportRow,
  ReportApiResponse,
} from "@/app/dashboardportal/jutePurchase/reports/types/reportTypes";

export async function fetchJuteStockReport(
  branchId: number,
  date: string,
): Promise<JuteStockReportRow[]> {
  const url = `${API_ROUTES.JUTE_REPORT_STOCK}?branch_id=${branchId}&date=${date}`;
  const result = await fetchWithCookie<ReportApiResponse<JuteStockReportRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch jute stock report");
  }
  return result.data.data;
}

export async function fetchBatchCostReport(
  branchId: number,
  date: string,
): Promise<BatchCostReportRow[]> {
  const url = `${API_ROUTES.JUTE_REPORT_BATCH_COST}?branch_id=${branchId}&date=${date}`;
  const result = await fetchWithCookie<ReportApiResponse<BatchCostReportRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch batch cost report");
  }
  return result.data.data;
}
```

**Step 3: Commit**

```bash
cd c:/code/vowerp3ui
git add src/utils/api.ts src/utils/juteReportService.ts src/app/dashboardportal/jutePurchase/reports/types/reportTypes.ts
git commit -m "feat: add jute report types, API routes, and service functions"
```

---

## Task 7: Create Report Hooks

**Agent:** Frontend Agent
**Files:**
- Create: `c:/code/vowerp3ui/src/app/dashboardportal/jutePurchase/reports/hooks/useJuteStockReport.ts`
- Create: `c:/code/vowerp3ui/src/app/dashboardportal/jutePurchase/reports/hooks/useBatchCostReport.ts`

**Step 1: Create `useJuteStockReport.ts`**

```typescript
"use client";

import { useState, useCallback } from "react";
import { fetchJuteStockReport } from "@/utils/juteReportService";
import type { JuteStockReportRow } from "../types/reportTypes";

export function useJuteStockReport() {
  const [rows, setRows] = useState<JuteStockReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (branchId: number, date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJuteStockReport(branchId, date);
      setRows(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { rows, loading, error, loadReport };
}
```

**Step 2: Create `useBatchCostReport.ts`**

```typescript
"use client";

import { useState, useCallback } from "react";
import { fetchBatchCostReport } from "@/utils/juteReportService";
import type { BatchCostReportRow } from "../types/reportTypes";

export function useBatchCostReport() {
  const [rows, setRows] = useState<BatchCostReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (branchId: number, date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBatchCostReport(branchId, date);
      setRows(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { rows, loading, error, loadReport };
}
```

**Step 3: Commit**

```bash
cd c:/code/vowerp3ui
git add src/app/dashboardportal/jutePurchase/reports/hooks/
git commit -m "feat: add hooks for jute stock and batch cost reports"
```

---

## Task 8: Create Report Components

**Agent:** Frontend Agent
**Files:**
- Create: `c:/code/vowerp3ui/src/app/dashboardportal/jutePurchase/reports/_components/JuteStockReport.tsx`
- Create: `c:/code/vowerp3ui/src/app/dashboardportal/jutePurchase/reports/_components/BatchCostReport.tsx`

**Step 1: Create `JuteStockReport.tsx`**

Uses MUI DataGrid with client-side pagination (all rows returned by API). Grouped visually by item_group_name using the `rowGrouping` pattern or a simple approach with bold group headers via `renderCell`.

```tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useJuteStockReport } from "../hooks/useJuteStockReport";

interface JuteStockReportProps {
  branchId: number | null;
  date: string;
}

const WEIGHT_COL_WIDTH = 120;

const JuteStockReport: React.FC<JuteStockReportProps> = ({ branchId, date }) => {
  const { rows, loading, error, loadReport } = useJuteStockReport();

  useEffect(() => {
    if (branchId && date) {
      loadReport(branchId, date);
    }
  }, [branchId, date, loadReport]);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "item_group_name",
        headerName: "Item Group",
        width: 180,
        flex: 1,
      },
      {
        field: "item_name",
        headerName: "Item",
        width: 160,
        flex: 1,
      },
      {
        field: "opening_weight",
        headerName: "Opening (kg)",
        width: WEIGHT_COL_WIDTH,
        type: "number",
        valueFormatter: (value: number) => value?.toFixed(2) ?? "0.00",
      },
      {
        field: "receipt_weight",
        headerName: "Receipt (kg)",
        width: WEIGHT_COL_WIDTH,
        type: "number",
        valueFormatter: (value: number) => value?.toFixed(2) ?? "0.00",
      },
      {
        field: "issue_weight",
        headerName: "Issue (kg)",
        width: WEIGHT_COL_WIDTH,
        type: "number",
        valueFormatter: (value: number) => value?.toFixed(2) ?? "0.00",
      },
      {
        field: "closing_weight",
        headerName: "Closing (kg)",
        width: WEIGHT_COL_WIDTH,
        type: "number",
        valueFormatter: (value: number) => value?.toFixed(2) ?? "0.00",
      },
      {
        field: "mtd_receipt_weight",
        headerName: "MTD Receipt (kg)",
        width: 140,
        type: "number",
        valueFormatter: (value: number) => value?.toFixed(2) ?? "0.00",
      },
      {
        field: "mtd_issue_weight",
        headerName: "MTD Issue (kg)",
        width: 140,
        type: "number",
        valueFormatter: (value: number) => value?.toFixed(2) ?? "0.00",
      },
    ],
    [],
  );

  const rowsWithId = useMemo(
    () => rows.map((r) => ({ ...r, id: `${r.item_grp_id}-${r.item_id}` })),
    [rows],
  );

  if (!branchId) {
    return (
      <Box className="flex items-center justify-center py-12">
        <Typography color="text.secondary">Select a branch to view the report</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ height: 600, width: "100%", position: "relative" }}>
      {loading && (
        <Box className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
          <CircularProgress />
        </Box>
      )}
      <DataGrid
        rows={rowsWithId}
        columns={columns}
        pageSizeOptions={[25, 50, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 50 } },
          sorting: { sortModel: [{ field: "item_group_name", sort: "asc" }] },
        }}
        disableRowSelectionOnClick
        sx={{
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: "#3ea6da",
            color: "white",
            fontWeight: "bold",
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: "bold",
          },
        }}
      />
    </Box>
  );
};

export default JuteStockReport;
```

**Step 2: Create `BatchCostReport.tsx`**

Nested display: yarn type as group header, jute quality as detail rows. Uses DataGrid row grouping or visual nesting.

```tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useBatchCostReport } from "../hooks/useBatchCostReport";

interface BatchCostReportProps {
  branchId: number | null;
  date: string;
}

const BatchCostReport: React.FC<BatchCostReportProps> = ({ branchId, date }) => {
  const { rows, loading, error, loadReport } = useBatchCostReport();

  useEffect(() => {
    if (branchId && date) {
      loadReport(branchId, date);
    }
  }, [branchId, date, loadReport]);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "yarn_type_name",
        headerName: "Yarn Type",
        width: 180,
        flex: 1,
      },
      {
        field: "item_name",
        headerName: "Jute Quality",
        width: 160,
        flex: 1,
      },
      {
        field: "planned_weight",
        headerName: "Planned Wt (kg)",
        width: 130,
        type: "number",
        valueFormatter: (value: number) => value?.toFixed(2) ?? "0.00",
      },
      {
        field: "actual_weight",
        headerName: "Actual Wt (kg)",
        width: 130,
        type: "number",
        valueFormatter: (value: number) => value?.toFixed(2) ?? "0.00",
      },
      {
        field: "actual_rate",
        headerName: "Rate (per qtl)",
        width: 120,
        type: "number",
        valueFormatter: (value: number) => value?.toFixed(2) ?? "0.00",
      },
      {
        field: "issue_value",
        headerName: "Value",
        width: 120,
        type: "number",
        valueFormatter: (value: number) =>
          value != null
            ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)
            : "0.00",
      },
      {
        field: "variance",
        headerName: "Variance (kg)",
        width: 130,
        type: "number",
        renderCell: (params) => {
          const val = params.value as number;
          if (val == null) return "0.00";
          const color = val > 0 ? "green" : val < 0 ? "red" : "inherit";
          const prefix = val > 0 ? "+" : "";
          return (
            <span style={{ color, fontWeight: val !== 0 ? 600 : 400 }}>
              {prefix}{val.toFixed(2)}
            </span>
          );
        },
      },
    ],
    [],
  );

  const rowsWithId = useMemo(
    () => rows.map((r) => ({ ...r, id: `${r.yarn_type_id}-${r.item_id}` })),
    [rows],
  );

  if (!branchId) {
    return (
      <Box className="flex items-center justify-center py-12">
        <Typography color="text.secondary">Select a branch to view the report</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ height: 600, width: "100%", position: "relative" }}>
      {loading && (
        <Box className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
          <CircularProgress />
        </Box>
      )}
      <DataGrid
        rows={rowsWithId}
        columns={columns}
        pageSizeOptions={[25, 50, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 50 } },
          sorting: {
            sortModel: [{ field: "yarn_type_name", sort: "asc" }],
          },
        }}
        disableRowSelectionOnClick
        sx={{
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: "#3ea6da",
            color: "white",
            fontWeight: "bold",
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: "bold",
          },
        }}
      />
    </Box>
  );
};

export default BatchCostReport;
```

**Step 3: Commit**

```bash
cd c:/code/vowerp3ui
git add src/app/dashboardportal/jutePurchase/reports/_components/
git commit -m "feat: add JuteStockReport and BatchCostReport components"
```

---

## Task 9: Build the Reports Page with Tabs

**Agent:** Frontend Agent
**Files:**
- Modify: `c:/code/vowerp3ui/src/app/dashboardportal/jutePurchase/reports/page.tsx`

**Step 1: Write the tab-based reports page**

This is the main page that combines tabs, branch selector, date picker, and renders the appropriate report component. Uses MUI Tabs (first usage in the codebase), Autocomplete for branch, and native date input.

```tsx
"use client";

import React, { useState, useMemo, useCallback, SyntheticEvent } from "react";
import {
  Box,
  Tabs,
  Tab,
  TextField,
  Autocomplete,
  Paper,
  Typography,
} from "@mui/material";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import JuteStockReport from "./_components/JuteStockReport";
import BatchCostReport from "./_components/BatchCostReport";
import type { BranchOption } from "./types/reportTypes";

/** Return YYYY-MM-DD for yesterday */
function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export default function JuteReportsPage() {
  const { selectedCompany } = useSidebarContext();

  const [activeTab, setActiveTab] = useState(0);
  const [selectedBranch, setSelectedBranch] = useState<BranchOption | null>(null);
  const [reportDate, setReportDate] = useState<string>(getYesterdayDate());

  const branchOptions: BranchOption[] = useMemo(
    () =>
      (selectedCompany?.branches ?? []).map((b) => ({
        branch_id: b.branch_id,
        branch_name: b.branch_name,
      })),
    [selectedCompany?.branches],
  );

  const handleTabChange = useCallback((_: SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setReportDate(e.target.value);
    },
    [],
  );

  return (
    <Box className="flex flex-col gap-4 p-4">
      {/* Page title */}
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold" }}
      >
        Jute Procurement Reports
      </Typography>

      {/* Tabs */}
      <Paper elevation={1}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
            "& .Mui-selected": { color: "#0C3C60" },
            "& .MuiTabs-indicator": { backgroundColor: "#0C3C60" },
          }}
        >
          <Tab label="Jute Stock Report" />
          <Tab label="Batch Cost Report" />
        </Tabs>
      </Paper>

      {/* Filters toolbar */}
      <Paper elevation={1} className="flex flex-wrap items-center gap-4 p-4">
        <Autocomplete
          options={branchOptions}
          getOptionLabel={(o) => o.branch_name}
          isOptionEqualToValue={(opt, val) => opt.branch_id === val.branch_id}
          value={selectedBranch}
          onChange={(_, val) => setSelectedBranch(val)}
          renderInput={(params) => (
            <TextField {...params} label="Branch" size="small" />
          )}
          sx={{ minWidth: 240 }}
        />
        <TextField
          type="date"
          label="Report Date"
          size="small"
          value={reportDate}
          onChange={handleDateChange}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 180 }}
        />
      </Paper>

      {/* Report content */}
      <Paper elevation={1} className="p-2">
        {activeTab === 0 && (
          <JuteStockReport
            branchId={selectedBranch?.branch_id ?? null}
            date={reportDate}
          />
        )}
        {activeTab === 1 && (
          <BatchCostReport
            branchId={selectedBranch?.branch_id ?? null}
            date={reportDate}
          />
        )}
      </Paper>
    </Box>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd c:/code/vowerp3ui && npx tsc --noEmit`
Expected: No errors related to the reports page.

**Step 3: Verify dev server renders the page**

Run: `pnpm dev`
Navigate to: `http://localhost:3000/dashboardportal/jutePurchase/reports`
Expected: Page with tabs, branch selector, date picker, and report DataGrid.

**Step 4: Commit**

```bash
cd c:/code/vowerp3ui
git add src/app/dashboardportal/jutePurchase/reports/page.tsx
git commit -m "feat: add jute procurement reports page with tabs"
```

---

## Execution Dependencies

```
Task 1 ──→ Task 2 ──→ Task 3 (Backend Agent 1: sequential)
                         ↓
                       Task 4 (Backend Agent 2: after Task 3)

Task 5 ──→ Task 6 ──→ Task 7 ──→ Task 8 ──→ Task 9 (Frontend Agent: sequential)

Task 5 can start immediately (types are standalone).
Tasks 6-9 depend on Task 5.
Full integration testing requires Tasks 3 + 9 both complete.
```
