# Batch Plan Daily Assignment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a daily batch plan assignment page that maps yarn types to batch plans per day+branch, with full approval workflow.

**Architecture:** Mirrors the Jute Issue pattern — list page grouped by day+branch using IndexWrapper, detail page with create/edit/view modes. Backend uses new `jute_batch_daily_assign` table with CRUD + approval endpoints. Frontend follows the standard transaction page structure with hooks/types/utils.

**Tech Stack:** Backend: FastAPI, SQLAlchemy 2.0, Pydantic, MySQL | Frontend: Next.js 15, React 19, TypeScript, MUI DataGrid, Tailwind CSS

---

## Agent Split

This plan is designed for **two parallel agents**:
- **Backend Agent** — Tasks B1-B5, works in `c:/code/vowerp3be/`
- **Frontend Agent** — Tasks F1-F7, works in `c:/code/vowerp3ui/`

Frontend Tasks F4+ depend on Backend Tasks B1-B3 being complete (API must exist).
Tasks within each agent are sequential.

---

## Backend Agent Tasks (vowerp3be)

### Task B1: Add ORM Model to jute.py

**Files:**
- Modify: `c:/code/vowerp3be/src/models/jute.py` (after line 799, after `VwJuteStockOutstanding`)

**Step 1: Add the `JuteBatchDailyAssign` model**

Append after the last class in `src/models/jute.py`:

```python
# =============================================================================
# JUTE BATCH DAILY ASSIGNMENT
# =============================================================================

class JuteBatchDailyAssign(Base):
    """Daily assignment of batch plans to yarn types per branch.

    Maps: Date + Branch + Yarn Type → Batch Plan.
    Each day+branch can have multiple yarn types, each assigned exactly one batch plan.
    Unique constraint: (branch_id, assign_date, yarn_type_id).

    Status workflow: Draft (21) → Open (1) → Approved (3) / Rejected (4).

    Based on design doc 2026-02-20.
    """
    __tablename__ = "jute_batch_daily_assign"
    __table_args__ = (
        UniqueConstraint("branch_id", "assign_date", "yarn_type_id", name="uq_branch_date_yarn"),
        {"extend_existing": True},
    )

    batch_daily_assign_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    assign_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    yarn_type_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    batch_plan_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    status_id: Mapped[int] = mapped_column(Integer, nullable=False, default=21)
    updated_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    updated_date_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, server_default=func.current_timestamp()
    )
```

**Step 2: Verify the import of `UniqueConstraint`**

Check top of `src/models/jute.py` for existing imports. If `UniqueConstraint` is not imported, add it:

```python
from sqlalchemy import UniqueConstraint
```

Also ensure `Date` is imported (it should be — `JuteIssue` uses it). If not:

```python
from sqlalchemy import Date
```

**Step 3: Commit**

```bash
git add src/models/jute.py
git commit -m "feat: add JuteBatchDailyAssign ORM model"
```

---

### Task B2: Add SQL Queries to query.py

**Files:**
- Modify: `c:/code/vowerp3be/src/juteProcurement/query.py` (append at end of file)

**Step 1: Add the aggregated list query**

Append to end of `query.py`:

```python
# =============================================================================
# BATCH DAILY ASSIGN QUERIES
# =============================================================================

def get_batch_daily_assign_table_query(search: str = None):
    """
    Query to get batch daily assignments aggregated by date and branch.
    Groups by assign_date and branch_id, counts assignments, determines status.
    """
    search_clause = ""
    if search:
        search_clause = """
            AND (
                CAST(bda.assign_date AS CHAR) LIKE :search
                OR bm.branch_name LIKE :search
            )
        """

    sql = f"""
        SELECT
            bda.assign_date,
            bda.branch_id,
            bm.branch_name,
            COUNT(*) AS total_assignments,
            SUM(CASE WHEN bda.status_id = 3 THEN 1 ELSE 0 END) AS approved_count,
            CASE
                WHEN COUNT(*) = SUM(CASE WHEN bda.status_id = 3 THEN 1 ELSE 0 END) AND COUNT(*) > 0 THEN 'Approved'
                WHEN SUM(CASE WHEN bda.status_id = 3 THEN 1 ELSE 0 END) > 0 THEN 'Partial Approved'
                ELSE 'Draft'
            END AS status
        FROM jute_batch_daily_assign bda
        INNER JOIN branch_mst bm ON bm.branch_id = bda.branch_id
        WHERE bm.branch_id = :branch_id
        {search_clause}
        GROUP BY bda.assign_date, bda.branch_id, bm.branch_name
        ORDER BY bda.assign_date DESC, bm.branch_name
        LIMIT :limit OFFSET :offset
    """
    return text(sql)


def get_batch_daily_assign_table_count_query(search: str = None):
    """
    Count of unique assign_date+branch combinations for pagination.
    """
    search_clause = ""
    if search:
        search_clause = """
            AND (
                CAST(bda.assign_date AS CHAR) LIKE :search
                OR bm.branch_name LIKE :search
            )
        """

    sql = f"""
        SELECT COUNT(*) AS total FROM (
            SELECT bda.assign_date, bda.branch_id
            FROM jute_batch_daily_assign bda
            INNER JOIN branch_mst bm ON bm.branch_id = bda.branch_id
            WHERE bm.branch_id = :branch_id
            {search_clause}
            GROUP BY bda.assign_date, bda.branch_id
        ) sub
    """
    return text(sql)


def get_batch_daily_assigns_by_date_query():
    """
    All assignments for a specific date+branch, with yarn type and batch plan names.
    """
    sql = """
        SELECT
            bda.batch_daily_assign_id,
            bda.branch_id,
            bda.assign_date,
            bda.yarn_type_id,
            ytm.jute_yarn_type_name AS yarn_type_name,
            bda.batch_plan_id,
            bp.plan_name,
            bda.status_id,
            bda.updated_by,
            bda.updated_date_time
        FROM jute_batch_daily_assign bda
        LEFT JOIN jute_yarn_type_mst ytm ON ytm.jute_yarn_type_id = bda.yarn_type_id
        LEFT JOIN jute_batch_plan bp ON bp.batch_plan_id = bda.batch_plan_id
        WHERE bda.branch_id = :branch_id
          AND bda.assign_date = :assign_date
        ORDER BY ytm.jute_yarn_type_name
    """
    return text(sql)


def get_batch_daily_assign_create_setup_query():
    """
    Setup data for creating assignments: yarn types for the company.
    """
    sql = """
        SELECT jute_yarn_type_id, jute_yarn_type_name
        FROM jute_yarn_type_mst
        WHERE co_id = :co_id
        ORDER BY jute_yarn_type_name
    """
    return text(sql)


def get_batch_plans_for_branch_query():
    """
    Get batch plans available for a specific branch.
    """
    sql = """
        SELECT bp.batch_plan_id, bp.plan_name
        FROM jute_batch_plan bp
        WHERE bp.branch_id = :branch_id
        ORDER BY bp.plan_name
    """
    return text(sql)


def get_batch_daily_assign_max_date_query():
    """
    Get latest assignment date for a branch to auto-increment.
    """
    sql = """
        SELECT MAX(assign_date) AS max_date
        FROM jute_batch_daily_assign
        WHERE branch_id = :branch_id
    """
    return text(sql)
```

**Step 2: Commit**

```bash
git add src/juteProcurement/query.py
git commit -m "feat: add batch daily assign SQL queries"
```

---

### Task B3: Create Router with All Endpoints

**Files:**
- Create: `c:/code/vowerp3be/src/juteProcurement/batchDailyAssign.py`

**Step 1: Create the router file**

Create `src/juteProcurement/batchDailyAssign.py` with the following content.

Reference `src/juteProcurement/issue.py` for the exact patterns (imports, error handling, auth dependency).

```python
"""
Batch Daily Assignment API endpoints.
Maps yarn types to batch plans for each day and branch.
Status workflow: Draft (21) → Open (1) → Approved (3) / Rejected (4).
"""

from fastapi import Depends, Request, HTTPException, APIRouter
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from src.config.db import get_tenant_db
from src.authorization.utils import get_current_user_with_refresh
from src.juteProcurement.query import (
    get_batch_daily_assign_table_query,
    get_batch_daily_assign_table_count_query,
    get_batch_daily_assigns_by_date_query,
    get_batch_daily_assign_create_setup_query,
    get_batch_plans_for_branch_query,
    get_batch_daily_assign_max_date_query,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class BatchDailyAssignCreate(BaseModel):
    """Payload for creating a single daily batch assignment."""
    branch_id: int
    assign_date: date
    yarn_type_id: int
    batch_plan_id: int


class BatchDailyAssignStatusUpdate(BaseModel):
    """Payload for bulk status transitions."""
    ids: List[int]


# ---------------------------------------------------------------------------
# READ endpoints
# ---------------------------------------------------------------------------

@router.get("/get_assign_table")
async def get_assign_table(
    request: Request,
    branch_id: int,
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user_with_refresh),
):
    """List page: aggregated by day+branch."""
    db: Session = get_tenant_db(request)
    try:
        offset = (page - 1) * limit
        search_param = f"%{search}%" if search else None

        # Get data
        query = get_batch_daily_assign_table_query(search=search)
        params = {"branch_id": branch_id, "limit": limit, "offset": offset}
        if search_param:
            params["search"] = search_param
        rows = db.execute(query, params).mappings().all()

        # Get count
        count_query = get_batch_daily_assign_table_count_query(search=search)
        count_params = {"branch_id": branch_id}
        if search_param:
            count_params["search"] = search_param
        total = db.execute(count_query, count_params).scalar() or 0

        return {
            "data": [dict(row) for row in rows],
            "total": total,
        }
    except Exception as e:
        logger.error(f"Error fetching batch daily assign table: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get_assigns_by_date")
async def get_assigns_by_date(
    request: Request,
    co_id: int,
    branch_id: int,
    assign_date: str,
    current_user: dict = Depends(get_current_user_with_refresh),
):
    """Detail page: all assignments for a specific date+branch."""
    db: Session = get_tenant_db(request)
    try:
        query = get_batch_daily_assigns_by_date_query()
        rows = db.execute(query, {"branch_id": branch_id, "assign_date": assign_date}).mappings().all()
        data = [dict(row) for row in rows]

        # Build summary
        total = len(data)
        approved_count = sum(1 for r in data if r.get("status_id") == 3)
        if total == 0:
            status = "No Assignments"
            status_id = 0
        elif approved_count == total:
            status = "Approved"
            status_id = 3
        elif approved_count > 0:
            status = "Partial Approved"
            status_id = 20
        else:
            # Check if all draft
            draft_count = sum(1 for r in data if r.get("status_id") == 21)
            if draft_count == total:
                status = "Draft"
                status_id = 21
            else:
                status = "Open"
                status_id = 1

        return {
            "data": data,
            "summary": {
                "total_assignments": total,
                "status": status,
                "status_id": status_id,
            },
        }
    except Exception as e:
        logger.error(f"Error fetching assigns by date: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get_assign_create_setup")
async def get_assign_create_setup(
    request: Request,
    co_id: int,
    branch_id: int,
    current_user: dict = Depends(get_current_user_with_refresh),
):
    """Setup data: yarn types + batch plans for the branch."""
    db: Session = get_tenant_db(request)
    try:
        # Yarn types
        yt_query = get_batch_daily_assign_create_setup_query()
        yarn_types = db.execute(yt_query, {"co_id": co_id}).mappings().all()

        # Batch plans for this branch
        bp_query = get_batch_plans_for_branch_query()
        batch_plans = db.execute(bp_query, {"branch_id": branch_id}).mappings().all()

        return {
            "yarn_types": [dict(r) for r in yarn_types],
            "batch_plans": [dict(r) for r in batch_plans],
        }
    except Exception as e:
        logger.error(f"Error fetching assign create setup: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get_max_assign_date")
async def get_max_assign_date(
    request: Request,
    co_id: int,
    branch_id: int,
    current_user: dict = Depends(get_current_user_with_refresh),
):
    """Get latest assignment date for auto-increment."""
    db: Session = get_tenant_db(request)
    try:
        query = get_batch_daily_assign_max_date_query()
        result = db.execute(query, {"branch_id": branch_id}).scalar()
        return {"max_date": str(result) if result else None}
    except Exception as e:
        logger.error(f"Error fetching max assign date: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# WRITE endpoints
# ---------------------------------------------------------------------------

@router.post("/create_assign")
async def create_assign(
    request: Request,
    co_id: int,
    payload: BatchDailyAssignCreate,
    current_user: dict = Depends(get_current_user_with_refresh),
):
    """Create a single daily assignment. Status defaults to Draft (21)."""
    db: Session = get_tenant_db(request)
    try:
        user_id = current_user.get("user_id")

        # Check for duplicate
        dup_check = text("""
            SELECT batch_daily_assign_id FROM jute_batch_daily_assign
            WHERE branch_id = :branch_id AND assign_date = :assign_date AND yarn_type_id = :yarn_type_id
        """)
        existing = db.execute(dup_check, {
            "branch_id": payload.branch_id,
            "assign_date": payload.assign_date,
            "yarn_type_id": payload.yarn_type_id,
        }).scalar()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Yarn type already assigned for this date and branch.",
            )

        insert = text("""
            INSERT INTO jute_batch_daily_assign
                (branch_id, assign_date, yarn_type_id, batch_plan_id, status_id, updated_by, updated_date_time)
            VALUES
                (:branch_id, :assign_date, :yarn_type_id, :batch_plan_id, 21, :updated_by, NOW())
        """)
        db.execute(insert, {
            "branch_id": payload.branch_id,
            "assign_date": payload.assign_date,
            "yarn_type_id": payload.yarn_type_id,
            "batch_plan_id": payload.batch_plan_id,
            "updated_by": user_id,
        })
        db.commit()

        return {"message": "Assignment created successfully."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating assign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete_assign/{batch_daily_assign_id}")
async def delete_assign(
    request: Request,
    batch_daily_assign_id: int,
    co_id: int,
    current_user: dict = Depends(get_current_user_with_refresh),
):
    """Delete a draft assignment."""
    db: Session = get_tenant_db(request)
    try:
        # Only allow deleting drafts
        check = text("""
            SELECT status_id FROM jute_batch_daily_assign
            WHERE batch_daily_assign_id = :id
        """)
        status = db.execute(check, {"id": batch_daily_assign_id}).scalar()
        if status is None:
            raise HTTPException(status_code=404, detail="Assignment not found.")
        if status != 21:
            raise HTTPException(status_code=400, detail="Only draft assignments can be deleted.")

        delete_sql = text("""
            DELETE FROM jute_batch_daily_assign WHERE batch_daily_assign_id = :id
        """)
        db.execute(delete_sql, {"id": batch_daily_assign_id})
        db.commit()

        return {"message": "Assignment deleted."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting assign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Status transition endpoints
# ---------------------------------------------------------------------------

def _bulk_status_change(db: Session, ids: List[int], from_status: int, to_status: int, user_id: int):
    """Helper: bulk status transition with validation."""
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided.")

    placeholders = ", ".join([f":id_{i}" for i in range(len(ids))])
    params = {f"id_{i}": id_val for i, id_val in enumerate(ids)}

    # Validate all are in expected status
    check_sql = text(f"""
        SELECT batch_daily_assign_id, status_id FROM jute_batch_daily_assign
        WHERE batch_daily_assign_id IN ({placeholders})
    """)
    rows = db.execute(check_sql, params).mappings().all()

    if len(rows) != len(ids):
        raise HTTPException(status_code=404, detail="Some assignments not found.")

    invalid = [r["batch_daily_assign_id"] for r in rows if r["status_id"] != from_status]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Assignments {invalid} are not in the expected status.",
        )

    update_sql = text(f"""
        UPDATE jute_batch_daily_assign
        SET status_id = :to_status, updated_by = :user_id, updated_date_time = NOW()
        WHERE batch_daily_assign_id IN ({placeholders})
    """)
    params["to_status"] = to_status
    params["user_id"] = user_id
    db.execute(update_sql, params)
    db.commit()


@router.post("/open_assigns")
async def open_assigns(
    request: Request,
    co_id: int,
    payload: BatchDailyAssignStatusUpdate,
    current_user: dict = Depends(get_current_user_with_refresh),
):
    """Bulk Draft (21) → Open (1)."""
    db: Session = get_tenant_db(request)
    try:
        user_id = current_user.get("user_id")
        _bulk_status_change(db, payload.ids, from_status=21, to_status=1, user_id=user_id)
        return {"message": f"{len(payload.ids)} assignment(s) opened."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error opening assigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve_assigns")
async def approve_assigns(
    request: Request,
    co_id: int,
    payload: BatchDailyAssignStatusUpdate,
    current_user: dict = Depends(get_current_user_with_refresh),
):
    """Bulk Open (1) → Approved (3)."""
    db: Session = get_tenant_db(request)
    try:
        user_id = current_user.get("user_id")
        _bulk_status_change(db, payload.ids, from_status=1, to_status=3, user_id=user_id)
        return {"message": f"{len(payload.ids)} assignment(s) approved."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving assigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reject_assigns")
async def reject_assigns(
    request: Request,
    co_id: int,
    payload: BatchDailyAssignStatusUpdate,
    current_user: dict = Depends(get_current_user_with_refresh),
):
    """Bulk Open (1) → Rejected (4)."""
    db: Session = get_tenant_db(request)
    try:
        user_id = current_user.get("user_id")
        _bulk_status_change(db, payload.ids, from_status=1, to_status=4, user_id=user_id)
        return {"message": f"{len(payload.ids)} assignment(s) rejected."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error rejecting assigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

**Step 2: Commit**

```bash
git add src/juteProcurement/batchDailyAssign.py
git commit -m "feat: add batch daily assign router with all endpoints"
```

---

### Task B4: Register Router in main.py

**Files:**
- Modify: `c:/code/vowerp3be/src/main.py`

**Step 1: Add import (after line 51)**

After the existing jute procurement imports (line 51: `from src.juteProcurement.issue import router as jute_issue_router`), add:

```python
from src.juteProcurement.batchDailyAssign import router as batch_daily_assign_router
```

**Step 2: Register the router (after line 132)**

After the existing jute procurement router registrations (line 132: `app.include_router(jute_issue_router, ...)`), add:

```python
app.include_router(batch_daily_assign_router, prefix="/api/batchDailyAssign", tags=["jute-procurement-batch-daily-assign"])
```

**Step 3: Commit**

```bash
git add src/main.py
git commit -m "feat: register batch daily assign router"
```

---

### Task B5: Create the Database Table

**Step 1: Create the table via SQL migration or direct DDL**

Run this SQL on the tenant database (e.g., dev3):

```sql
CREATE TABLE IF NOT EXISTS jute_batch_daily_assign (
    batch_daily_assign_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    assign_date DATE NOT NULL,
    yarn_type_id INT NOT NULL,
    batch_plan_id BIGINT NOT NULL,
    status_id INT NOT NULL DEFAULT 21,
    updated_by BIGINT NULL,
    updated_date_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_branch_id (branch_id),
    INDEX idx_assign_date (assign_date),
    INDEX idx_yarn_type_id (yarn_type_id),
    INDEX idx_batch_plan_id (batch_plan_id),
    UNIQUE KEY uq_branch_date_yarn (branch_id, assign_date, yarn_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Step 2: Verify the table was created**

```sql
DESCRIBE jute_batch_daily_assign;
```

Expected: 8 columns matching the design.

---

## Frontend Agent Tasks (vowerp3ui)

### Task F1: Add API Routes

**Files:**
- Modify: `c:/code/vowerp3ui/src/utils/api.ts` (after line 311, after the JUTE_ISSUE routes)

**Step 1: Add the batch daily assign routes**

After the `JUTE_ISSUE_REJECT` line in the `apiRoutesPortalMasters` object, add:

```typescript
// Batch Daily Assign
BATCH_DAILY_ASSIGN_TABLE: `${API_URL}/batchDailyAssign/get_assign_table`,
BATCH_DAILY_ASSIGN_BY_DATE: `${API_URL}/batchDailyAssign/get_assigns_by_date`,
BATCH_DAILY_ASSIGN_CREATE_SETUP: `${API_URL}/batchDailyAssign/get_assign_create_setup`,
BATCH_DAILY_ASSIGN_MAX_DATE: `${API_URL}/batchDailyAssign/get_max_assign_date`,
BATCH_DAILY_ASSIGN_CREATE: `${API_URL}/batchDailyAssign/create_assign`,
BATCH_DAILY_ASSIGN_DELETE: `${API_URL}/batchDailyAssign/delete_assign`,
BATCH_DAILY_ASSIGN_OPEN: `${API_URL}/batchDailyAssign/open_assigns`,
BATCH_DAILY_ASSIGN_APPROVE: `${API_URL}/batchDailyAssign/approve_assigns`,
BATCH_DAILY_ASSIGN_REJECT: `${API_URL}/batchDailyAssign/reject_assigns`,
```

**Step 2: Commit**

```bash
git add src/utils/api.ts
git commit -m "feat: add batch daily assign API routes"
```

---

### Task F2: Create Types, Constants, Factories, Mappers

**Files:**
- Create: `src/app/dashboardportal/jutePurchase/batchPlan/edit/types/batchAssignTypes.ts`
- Create: `src/app/dashboardportal/jutePurchase/batchPlan/edit/utils/batchAssignConstants.ts`
- Create: `src/app/dashboardportal/jutePurchase/batchPlan/edit/utils/batchAssignFactories.ts`
- Create: `src/app/dashboardportal/jutePurchase/batchPlan/edit/utils/batchAssignMappers.ts`

**Step 1: Create types file**

```typescript
// batchAssignTypes.ts

/** Modes for the batch assign detail page. */
export type BatchAssignMode = "create" | "edit" | "view";

/** Option type for Autocomplete dropdowns. */
export type Option = {
  label: string;
  value: string;
};

/** Yarn type record from API. */
export type YarnTypeRecord = {
  jute_yarn_type_id: number;
  jute_yarn_type_name: string;
};

/** Batch plan record from API. */
export type BatchPlanRecord = {
  batch_plan_id: number;
  plan_name: string;
};

/** Assignment row from detail API response. */
export type BatchDailyAssignRow = {
  batch_daily_assign_id: number;
  branch_id: number;
  assign_date: string;
  yarn_type_id: number;
  yarn_type_name: string;
  batch_plan_id: number;
  plan_name: string;
  status_id: number;
  updated_by: number | null;
  updated_date_time: string | null;
};

/** Editable line item in the form (client-side state). */
export type EditableAssignLine = {
  id: string; // Client-side tracking ID
  batch_daily_assign_id?: number; // null for new/unsaved lines
  yarn_type_id: string;
  batch_plan_id: string;
  status_id?: number;
  // Display-only (cached)
  yarn_type_name?: string;
  plan_name?: string;
};

/** Summary for a date+branch group. */
export type BatchAssignSummary = {
  total_assignments: number;
  status: string;
  status_id: number;
};

/** Summary row for the list page. */
export type BatchAssignSummaryRow = {
  id: string;
  assign_date: string;
  assign_date_raw: string;
  branch_id: number;
  branch_name: string;
  total_assignments: number;
  status: string;
};

/** Setup data from create_setup endpoint. */
export type BatchAssignSetupData = {
  yarn_types: YarnTypeRecord[];
  batch_plans: BatchPlanRecord[];
};
```

**Step 2: Create constants file**

```typescript
// batchAssignConstants.ts

export const BATCH_ASSIGN_STATUS_IDS = {
  DRAFT: 21,
  OPEN: 1,
  APPROVED: 3,
  REJECTED: 4,
} as const;

export const BATCH_ASSIGN_STATUS_LABELS: Record<number, string> = {
  21: "Draft",
  1: "Open",
  3: "Approved",
  4: "Rejected",
};
```

**Step 3: Create factories file**

```typescript
// batchAssignFactories.ts

import type { EditableAssignLine } from "../types/batchAssignTypes";

let lineCounter = 0;

/** Generate a unique client-side ID for a line. */
export const generateLineId = (): string => `assign-line-${Date.now()}-${++lineCounter}`;

/** Create a blank line for the form. */
export const createBlankAssignLine = (): EditableAssignLine => ({
  id: generateLineId(),
  batch_daily_assign_id: undefined,
  yarn_type_id: "",
  batch_plan_id: "",
  status_id: undefined,
  yarn_type_name: undefined,
  plan_name: undefined,
});

/** Check if a line has any user-entered data. */
export const lineHasAnyData = (line: EditableAssignLine): boolean =>
  Boolean(line.yarn_type_id || line.batch_plan_id);

/** Check if a line is complete (both fields filled). */
export const lineIsComplete = (line: EditableAssignLine): boolean =>
  Boolean(line.yarn_type_id && line.batch_plan_id);

/** Check if a line is a draft (unsaved or status 21). */
export const isDraft = (line: EditableAssignLine): boolean =>
  !line.batch_daily_assign_id || line.status_id === 21;
```

**Step 4: Create mappers file**

```typescript
// batchAssignMappers.ts

import type {
  BatchDailyAssignRow,
  EditableAssignLine,
  YarnTypeRecord,
  BatchPlanRecord,
  Option,
} from "../types/batchAssignTypes";
import { generateLineId } from "./batchAssignFactories";

/** Map API rows to editable lines. */
export const mapApiToEditableLines = (
  rows: BatchDailyAssignRow[]
): EditableAssignLine[] =>
  rows.map((row) => ({
    id: generateLineId(),
    batch_daily_assign_id: row.batch_daily_assign_id,
    yarn_type_id: String(row.yarn_type_id),
    batch_plan_id: String(row.batch_plan_id),
    status_id: row.status_id,
    yarn_type_name: row.yarn_type_name,
    plan_name: row.plan_name,
  }));

/** Map yarn types to Autocomplete options. */
export const mapYarnTypesToOptions = (types: YarnTypeRecord[]): Option[] =>
  types.map((t) => ({
    label: t.jute_yarn_type_name,
    value: String(t.jute_yarn_type_id),
  }));

/** Map batch plans to Autocomplete options. */
export const mapBatchPlansToOptions = (plans: BatchPlanRecord[]): Option[] =>
  plans.map((p) => ({
    label: p.plan_name,
    value: String(p.batch_plan_id),
  }));

/** Build an editable line from create form submission. */
export const mapEditableToCreatePayload = (
  line: EditableAssignLine,
  branchId: number,
  assignDate: string
) => ({
  branch_id: branchId,
  assign_date: assignDate,
  yarn_type_id: Number(line.yarn_type_id),
  batch_plan_id: Number(line.batch_plan_id),
});

/** Build a label lookup map from an array. */
export const buildLabelMap = <T>(
  items: T[],
  getId: (item: T) => string,
  getLabel: (item: T) => string
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(getId(item), getLabel(item));
  }
  return map;
};
```

**Step 5: Commit**

```bash
git add src/app/dashboardportal/jutePurchase/batchPlan/edit/
git commit -m "feat: add batch assign types, constants, factories, mappers"
```

---

### Task F3: Create Setup Hook

**Files:**
- Create: `src/app/dashboardportal/jutePurchase/batchPlan/edit/hooks/useBatchAssignSetup.ts`

**Step 1: Create the hook**

```typescript
// useBatchAssignSetup.ts
"use client";

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
  YarnTypeRecord,
  BatchPlanRecord,
} from "../types/batchAssignTypes";

interface UseBatchAssignSetupResult {
  yarnTypes: YarnTypeRecord[];
  batchPlans: BatchPlanRecord[];
  loading: boolean;
  error: string | null;
}

export function useBatchAssignSetup(
  coId: string | undefined,
  branchId: string | undefined
): UseBatchAssignSetupResult {
  const [yarnTypes, setYarnTypes] = React.useState<YarnTypeRecord[]>([]);
  const [batchPlans, setBatchPlans] = React.useState<BatchPlanRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!coId || !branchId) return;

    let cancelled = false;
    const fetchSetup = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`;
        const response = await fetchWithCookie(url);
        if (cancelled) return;
        setYarnTypes((response.yarn_types || []) as YarnTypeRecord[]);
        setBatchPlans((response.batch_plans || []) as BatchPlanRecord[]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load setup data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSetup();
    return () => { cancelled = true; };
  }, [coId, branchId]);

  return { yarnTypes, batchPlans, loading, error };
}
```

**Step 2: Commit**

```bash
git add src/app/dashboardportal/jutePurchase/batchPlan/edit/hooks/useBatchAssignSetup.ts
git commit -m "feat: add useBatchAssignSetup hook"
```

---

### Task F4: Build List Page

**Files:**
- Modify: `src/app/dashboardportal/jutePurchase/batchPlan/page.tsx` (replace placeholder)

**Step 1: Replace the placeholder with the full list page**

Pattern reference: `src/app/dashboardportal/jutePurchase/juteIssue/page.tsx`

```typescript
"use client";

import * as React from "react";
import { Alert, Chip } from "@mui/material";
import type {
  GridColDef,
  GridPaginationModel,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BatchAssignSummaryRow = {
  id: string;
  assign_date: string;
  assign_date_raw: string;
  branch_id: number;
  branch_name: string;
  total_assignments: number;
  status: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (value?: string): string => {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

const getStatusColor = (
  status: string
): "success" | "warning" | "info" | "default" => {
  if (status === "Approved") return "success";
  if (status.includes("Partial")) return "warning";
  if (status.includes("Draft")) return "info";
  return "default";
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BatchDailyAssignListPage() {
  const router = useRouter();
  const coId = useSelectedCompanyCoId();

  const [rows, setRows] = React.useState<BatchAssignSummaryRow[]>([]);
  const [totalRows, setTotalRows] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [paginationModel, setPaginationModel] =
    React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [searchValue, setSearchValue] = React.useState("");

  // Read selected branch from localStorage
  const branchId = React.useMemo(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = localStorage.getItem("sidebar_selectedBranches");
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0
        ? String(parsed[0])
        : undefined;
    } catch {
      return undefined;
    }
  }, []);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams({
        branch_id: branchId,
        page: String(paginationModel.page + 1),
        limit: String(paginationModel.pageSize),
      });
      if (searchValue.trim()) params.set("search", searchValue.trim());

      const url = `${apiRoutesPortalMasters.BATCH_DAILY_ASSIGN_TABLE}?${params}`;
      const response = await fetchWithCookie(url);

      const mapped: BatchAssignSummaryRow[] = (response.data || []).map(
        (row: Record<string, unknown>) => ({
          id: `${row.assign_date}-${row.branch_id}`,
          assign_date: formatDate(row.assign_date as string),
          assign_date_raw: row.assign_date as string,
          branch_id: row.branch_id as number,
          branch_name: (row.branch_name as string) || "",
          total_assignments: (row.total_assignments as number) || 0,
          status: (row.status as string) || "Draft",
        })
      );

      setRows(mapped);
      setTotalRows(response.total ?? 0);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to fetch assignments"
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, paginationModel, searchValue]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Column definitions
  const columns: GridColDef<BatchAssignSummaryRow>[] = React.useMemo(
    () => [
      {
        field: "assign_date",
        headerName: "Date",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "branch_name",
        headerName: "Branch",
        flex: 1,
        minWidth: 150,
      },
      {
        field: "total_assignments",
        headerName: "Assignments",
        flex: 0.7,
        minWidth: 120,
        type: "number",
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.8,
        minWidth: 130,
        renderCell: (params: GridRenderCellParams<BatchAssignSummaryRow>) => (
          <Chip
            label={params.value as string}
            size="small"
            color={getStatusColor(params.value as string)}
          />
        ),
      },
    ],
    []
  );

  // Handlers
  const handleView = React.useCallback(
    (row: BatchAssignSummaryRow) => {
      router.push(
        `/dashboardportal/jutePurchase/batchPlan/edit?mode=view&date=${row.assign_date_raw}&branch_id=${row.branch_id}`
      );
    },
    [router]
  );

  const handleEdit = React.useCallback(
    (row: BatchAssignSummaryRow) => {
      router.push(
        `/dashboardportal/jutePurchase/batchPlan/edit?mode=edit&date=${row.assign_date_raw}&branch_id=${row.branch_id}`
      );
    },
    [router]
  );

  const handleCreate = React.useCallback(() => {
    router.push(`/dashboardportal/jutePurchase/batchPlan/edit?mode=create`);
  }, [router]);

  const handlePaginationModelChange = React.useCallback(
    (model: GridPaginationModel) => {
      setPaginationModel(model);
    },
    []
  );

  const handleSearchChange: React.ChangeEventHandler<HTMLInputElement> =
    React.useCallback((e) => {
      setSearchValue(e.target.value);
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }, []);

  return (
    <IndexWrapper
      title="Batch Plan Assignment"
      subtitle="Daily batch plan assignments by yarn type and branch."
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchValue,
        onChange: handleSearchChange,
        placeholder: "Search by date or branch",
        debounceDelayMs: 500,
      }}
      onView={handleView}
      onEdit={handleEdit}
      createAction={{
        label: "New Assignment",
        onClick: handleCreate,
      }}
    >
      {errorMessage ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}
    </IndexWrapper>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/dashboardportal/jutePurchase/batchPlan/page.tsx
git commit -m "feat: build batch daily assign list page"
```

---

### Task F5: Build Detail/Edit Page

**Files:**
- Create: `src/app/dashboardportal/jutePurchase/batchPlan/edit/page.tsx`

**Step 1: Create the detail page**

This is the largest file. Pattern reference: `juteIssue/edit/page.tsx`.

The page should implement:
1. Three modes (create/edit/view) from URL search params
2. Header: branch selector (create only) + date picker
3. Table of assignment lines: Yarn Type (Autocomplete) + Batch Plan (Autocomplete) + Status chip + Delete button
4. "Add Row" button to add blank lines
5. "Save" button: POST each unsaved complete line
6. Approval bar: Open All / Approve All / Reject All (bulk)
7. Checkbox selection for approval actions
8. Auto-fetch max date + 1 day for create mode
9. Load existing assignments for edit/view mode

Key behaviors:
- Yarn Type dropdown excludes already-assigned yarn types (filter `usedYarnTypeIds`)
- Both fields must be filled for a line to be saveable
- Delete only works on draft rows
- After save, reload data from API to get server IDs
- Status chips use color coding from constants

**Implementation approach:**
- Use the `useBatchAssignSetup` hook for dropdown options
- Maintain `lineItems: EditableAssignLine[]` in local state
- Memoize dropdown options filtering
- Use `fetchWithCookie` for all API calls
- Wrap in `<Suspense>` for search params

Full code is ~600-800 lines. The agent should follow `juteIssue/edit/page.tsx` as the structural template but simplify since there's no stock dialog — just direct dropdown selection on each row.

The key difference from jute issue: instead of a two-step dialog (select stock → enter quantity), each row is simply two dropdowns (yarn type + batch plan) in a table.

**Step 2: Verify the page works**

Run: `pnpm dev` and navigate to `/dashboardportal/jutePurchase/batchPlan/edit?mode=create`

Expected: Page loads with header form and empty table, "Add Row" button works.

**Step 3: Commit**

```bash
git add src/app/dashboardportal/jutePurchase/batchPlan/edit/
git commit -m "feat: build batch daily assign detail page with approval workflow"
```

---

### Task F6: TypeScript Verification

**Step 1: Run TypeScript check**

```bash
cd c:/code/vowerp3ui && npx tsc --noEmit
```

Expected: No errors related to batchPlan files.

**Step 2: Fix any type errors found**

If errors exist, fix them in the relevant files.

**Step 3: Commit if any fixes were made**

```bash
git add -A && git commit -m "fix: resolve TypeScript errors in batch assign"
```

---

### Task F7: Lint Check

**Step 1: Run lint**

```bash
cd c:/code/vowerp3ui && pnpm lint
```

Expected: No lint errors in batchPlan files.

**Step 2: Fix any lint errors**

**Step 3: Final commit if needed**

```bash
git add -A && git commit -m "fix: resolve lint errors in batch assign"
```

---

## Task Dependencies

```
Backend:  B1 → B2 → B3 → B4 → B5
Frontend: F1 → F2 → F3 → F4 → F5 → F6 → F7

Cross-dependency: F4 and F5 need backend running (B4 complete) for end-to-end testing.
F1-F3 can run in parallel with backend tasks (no API calls needed).
```

## Verification Checklist

After both agents complete:

- [ ] Backend: `jute_batch_daily_assign` table exists with correct schema
- [ ] Backend: All 9 endpoints respond correctly (test with curl/Postman)
- [ ] Frontend: List page shows day+branch grouped assignments
- [ ] Frontend: Create mode: can add yarn type → batch plan rows and save
- [ ] Frontend: Edit mode: loads existing, can delete drafts, approval workflow works
- [ ] Frontend: View mode: all fields read-only
- [ ] Frontend: Yarn type dropdown filters out already-assigned types
- [ ] Frontend: `pnpm build` passes (no TypeScript/lint errors)
- [ ] Unique constraint enforced: can't assign same yarn type twice per day+branch
