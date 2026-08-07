# Pay Register Display Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack HRMS setup master that lets users manage rows of `tbl_payslip_print_component`, which drive which pay components appear (and how) on the Pay Register Excel export and Payslip PDF.

**Architecture:** A list + add/edit-dialog master page at `/dashboardportal/hrms/payRegisterDispSet` (mirrors `designationMaster`). The dialog has dropdowns (Pay Scheme, Branch, Pay Component cascaded from the scheme, Fixed/Variable) and checkboxes (Total Print, Payslip Print, Active). Backend is a new FastAPI router `src/hrms/payslipPrintComponent.py` with raw `text()` reads from `query.py` and an ORM model for writes, registered under `/api/hrms`. A sidebar menu entry is added last via the `add-menu` skill.

**Tech Stack:** Backend — FastAPI, SQLAlchemy (`text()` reads + ORM writes), pytest. Frontend — Next.js 15 App Router, React 19, TypeScript (strict), MUI `Dialog`/`DataGrid`, `MuiForm`, Vitest.

## Global Constraints

- **No `any`** in TypeScript — use `unknown` + type guards (CLAUDE.md). (`fetchWithCookie` is generic `<T = any>`; destructure `{ data, error }` and cast locally with explicit types.)
- **Never call APIs directly in components** — use service functions in `src/utils/hrmsService.ts`; routes only in `src/utils/api.ts` (`apiRoutesPortalMasters`).
- **API response envelope:** `{ "data": ... }` (lists also return `{ data, total }`).
- **Backend routers register under `prefix="/api/hrms"`**; frontend constants use `${API_URL}/hrms/...`.
- **Tenant DB** access via `Depends(get_tenant_db)`; auth via `Depends(get_current_user_with_refresh)`.
- **`fixed_var_cols`** values are exactly `"F"` (Fixed) / `"V"` (Variable), stored in `char(2)`.
- **`company_id`** always comes from the request `co_id` — never from the client body.
- **Status semantics:** export/payslip read `is_active = 1`; deactivation (Active off → `is_active = 0`) is the only "delete". No hard delete.
- Backend repo root: `d:\vownextjs\vowerp3be`. Frontend repo root: `d:\vownextjs\vowerp3ui`. Run backend commands from the backend root, frontend commands from the frontend root.

---

### Task 1: Backend query functions for `tbl_payslip_print_component`

**Files:**
- Modify: `d:\vownextjs\vowerp3be\src\hrms\query.py` (append new functions after `get_company_name()`, ~line 670)
- Test: `d:\vownextjs\vowerp3be\src\test\test_hrms_payslip_print_component.py` (create)

**Interfaces:**
- Consumes: existing `get_pay_scheme_dropdown()` (`query.py:331`) and `get_pay_scheme_details_by_scheme_id()` (`query.py:309`).
- Produces (imported by Task 2 router):
  - `list_payslip_print_components() -> TextClause` — binds `:company_id, :branch_ids, :payscheme_id, :search, :page_size, :offset`
  - `count_payslip_print_components() -> TextClause` — binds `:company_id, :branch_ids, :payscheme_id, :search`
  - `get_payslip_print_component_by_id() -> TextClause` — binds `:pay_id, :company_id`
  - `check_payslip_print_component_duplicate() -> TextClause` — binds `:payscheme_id, :company_id, :branch_id, :component_id, :exclude_pay_id`

- [ ] **Step 1: Write the failing test**

Create `d:\vownextjs\vowerp3be\src\test\test_hrms_payslip_print_component.py`:

```python
"""Tests for tbl_payslip_print_component query functions (src/hrms/query.py)."""

from sqlalchemy import text
from src.hrms.query import (
    list_payslip_print_components,
    count_payslip_print_components,
    get_payslip_print_component_by_id,
    check_payslip_print_component_duplicate,
)


class TestPayslipPrintComponentQueries:
    def test_list_returns_text_with_binds(self):
        sql = str(list_payslip_print_components())
        assert isinstance(list_payslip_print_components(), type(text("")))
        assert "tbl_payslip_print_component" in sql
        for bind in (":company_id", ":branch_ids", ":payscheme_id", ":search", ":page_size", ":offset"):
            assert bind in sql
        # joins for display names
        assert "pay_scheme_master" in sql
        assert "pay_components" in sql
        assert "branch_mst" in sql

    def test_count_returns_text_with_binds(self):
        sql = str(count_payslip_print_components())
        assert "COUNT(" in sql.upper()
        for bind in (":company_id", ":branch_ids", ":payscheme_id", ":search"):
            assert bind in sql

    def test_by_id_returns_text_with_binds(self):
        sql = str(get_payslip_print_component_by_id())
        assert ":pay_id" in sql
        assert ":company_id" in sql

    def test_duplicate_check_returns_text_with_binds(self):
        sql = str(check_payslip_print_component_duplicate())
        for bind in (":payscheme_id", ":company_id", ":branch_id", ":component_id", ":exclude_pay_id"):
            assert bind in sql
        assert "is_active = 1" in sql
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest src/test/test_hrms_payslip_print_component.py -v`
Expected: FAIL with `ImportError: cannot import name 'list_payslip_print_components'`.

- [ ] **Step 3: Add the query functions**

Append to `d:\vownextjs\vowerp3be\src\hrms\query.py` (after `get_company_name()`):

```python
# ─── Payslip Print Component config (tbl_payslip_print_component) ────


def list_payslip_print_components():
    """Configured payslip/export columns, joined to scheme/component/branch names.

    Filters: company (required), optional branch CSV (FIND_IN_SET), optional
    payscheme, optional search on component name/print label. Paginated.
    """
    return text("""
        SELECT
            t.pay_id,
            t.payscheme_id,
            t.company_id,
            t.branch_id,
            t.component_id,
            t.desc_print,
            t.payslip_order,
            t.fixed_var_cols,
            t.total_print,
            t.payslip_print,
            t.is_active,
            ps.payscheme_name,
            ps.payscheme_code,
            pc.NAME AS component_name,
            pc.CODE AS component_code,
            b.branch_name
        FROM tbl_payslip_print_component t
        LEFT JOIN pay_scheme_master ps ON ps.payscheme_id = t.payscheme_id
        LEFT JOIN pay_components pc ON pc.ID = t.component_id
        LEFT JOIN branch_mst b ON b.branch_id = t.branch_id
        WHERE t.company_id = :company_id
          AND (:branch_ids IS NULL OR FIND_IN_SET(t.branch_id, :branch_ids))
          AND (:payscheme_id IS NULL OR t.payscheme_id = :payscheme_id)
          AND (:search IS NULL OR pc.NAME LIKE :search OR t.desc_print LIKE :search)
        ORDER BY t.payscheme_id, t.payslip_order, t.pay_id
        LIMIT :page_size OFFSET :offset
    """)


def count_payslip_print_components():
    return text("""
        SELECT COUNT(*) AS total
        FROM tbl_payslip_print_component t
        LEFT JOIN pay_components pc ON pc.ID = t.component_id
        WHERE t.company_id = :company_id
          AND (:branch_ids IS NULL OR FIND_IN_SET(t.branch_id, :branch_ids))
          AND (:payscheme_id IS NULL OR t.payscheme_id = :payscheme_id)
          AND (:search IS NULL OR pc.NAME LIKE :search OR t.desc_print LIKE :search)
    """)


def get_payslip_print_component_by_id():
    return text("""
        SELECT
            t.pay_id,
            t.payscheme_id,
            t.company_id,
            t.branch_id,
            t.component_id,
            t.desc_print,
            t.payslip_order,
            t.fixed_var_cols,
            t.total_print,
            t.payslip_print,
            t.is_active
        FROM tbl_payslip_print_component t
        WHERE t.pay_id = :pay_id
          AND t.company_id = :company_id
    """)


def check_payslip_print_component_duplicate():
    """Existing ACTIVE row for the same scheme+company+branch+component.

    Pass :exclude_pay_id = the row being edited (or 0 on create) to ignore self.
    """
    return text("""
        SELECT t.pay_id
        FROM tbl_payslip_print_component t
        WHERE t.payscheme_id = :payscheme_id
          AND t.company_id = :company_id
          AND t.branch_id = :branch_id
          AND t.component_id = :component_id
          AND t.is_active = 1
          AND t.pay_id <> :exclude_pay_id
        LIMIT 1
    """)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest src/test/test_hrms_payslip_print_component.py -v`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add src/hrms/query.py src/test/test_hrms_payslip_print_component.py
git commit -m "feat(hrms): add tbl_payslip_print_component query functions + tests"
```

---

### Task 2: Backend ORM model + CRUD router + registration

**Files:**
- Modify: `d:\vownextjs\vowerp3be\src\models\hrms.py` (append model)
- Create: `d:\vownextjs\vowerp3be\src\hrms\payslipPrintComponent.py`
- Modify: `d:\vownextjs\vowerp3be\src\main.py` (import ~line 96, include_router ~line 237)
- Test: `d:\vownextjs\vowerp3be\src\test\test_hrms_payslip_print_component.py` (extend)

**Interfaces:**
- Consumes: Task 1 query functions; `get_pay_scheme_dropdown`, `get_pay_scheme_details_by_scheme_id` from `query.py`; `get_tenant_db`, `get_current_user_with_refresh`.
- Produces: `router` (APIRouter) with endpoints listed below; ORM model `TblPayslipPrintComponent`.

- [ ] **Step 1: Write the failing test (router import + route surface)**

Append to `d:\vownextjs\vowerp3be\src\test\test_hrms_payslip_print_component.py`:

```python
class TestPayslipPrintComponentRouter:
    def test_router_exposes_expected_routes(self):
        from src.hrms.payslipPrintComponent import router
        paths = {r.path for r in router.routes}
        assert "/payslip_print_component_list" in paths
        assert "/payslip_print_component_setup" in paths
        assert "/pay_scheme_components" in paths
        assert "/payslip_print_component_by_id/{pay_id}" in paths
        assert "/payslip_print_component_create" in paths
        assert "/payslip_print_component_update/{pay_id}" in paths

    def test_model_maps_table(self):
        from src.models.hrms import TblPayslipPrintComponent
        assert TblPayslipPrintComponent.__tablename__ == "tbl_payslip_print_component"
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest src/test/test_hrms_payslip_print_component.py::TestPayslipPrintComponentRouter -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.hrms.payslipPrintComponent'`.

- [ ] **Step 3a: Add the ORM model**

Append to `d:\vownextjs\vowerp3be\src\models\hrms.py`:

```python
# tbl_payslip_print_component -> payslip/export column config per scheme/company/branch
class TblPayslipPrintComponent(Base):
	__tablename__ = "tbl_payslip_print_component"
	pay_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
	component_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
	desc_print: Mapped[str | None] = mapped_column(String(100), nullable=True)
	payslip_order: Mapped[int | None] = mapped_column(Integer, nullable=True, server_default="1")
	payscheme_id: Mapped[int] = mapped_column(Integer, nullable=False)
	company_id: Mapped[int] = mapped_column(Integer, nullable=False)
	branch_id: Mapped[int] = mapped_column(Integer, nullable=False)
	fixed_var_cols: Mapped[str] = mapped_column(String(2), nullable=False)
	is_active: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
	total_print: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
	payslip_print: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
```

- [ ] **Step 3b: Create the router**

Create `d:\vownextjs\vowerp3be\src\hrms\payslipPrintComponent.py`:

```python
"""HRMS Pay Register Display Setup — CRUD for tbl_payslip_print_component.

These rows configure which pay components appear (and how) on the Pay Register
Excel export and the Payslip PDF. Read by get_payslip_print_components()
(see payRegister.py). This router only manages the configuration rows.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from src.config.db import get_tenant_db
from src.authorization.utils import get_current_user_with_refresh
from src.models.hrms import TblPayslipPrintComponent
from .query import (
    list_payslip_print_components,
    count_payslip_print_components,
    get_payslip_print_component_by_id,
    check_payslip_print_component_duplicate,
    get_pay_scheme_dropdown,
    get_pay_scheme_details_by_scheme_id,
)

router = APIRouter()

# fixed_var_cols accepted values
_ALLOWED_FIXED_VAR = {"F", "V"}


def _to_int(value, default=0):
    if value is None or value == "":
        return default
    return int(value)


# ─── List ───────────────────────────────────────────────────────────

@router.get("/payslip_print_component_list")
async def payslip_print_component_list(
    request: Request,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    try:
        co_id_raw = request.query_params.get("co_id")
        if not co_id_raw:
            raise HTTPException(status_code=400, detail="co_id is required")
        company_id = int(co_id_raw)

        branch_raw = request.query_params.get("branch_id")
        branch_ids = branch_raw if branch_raw else None
        payscheme_raw = request.query_params.get("payscheme_id")
        payscheme_id = int(payscheme_raw) if payscheme_raw else None
        search_raw = request.query_params.get("search")
        search = f"%{search_raw}%" if search_raw else None
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("limit", 10))

        params = {
            "company_id": company_id,
            "branch_ids": branch_ids,
            "payscheme_id": payscheme_id,
            "search": search,
            "page_size": page_size,
            "offset": (page - 1) * page_size,
        }
        rows = db.execute(list_payslip_print_components(), params).fetchall()
        data = [dict(r._mapping) for r in rows]

        total_row = db.execute(
            count_payslip_print_components(),
            {k: params[k] for k in ("company_id", "branch_ids", "payscheme_id", "search")},
        ).fetchone()
        total = total_row._mapping["total"] if total_row else 0

        return {"data": data, "total": total, "page": page, "limit": page_size}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Setup (pay schemes dropdown) ───────────────────────────────────

@router.get("/payslip_print_component_setup")
async def payslip_print_component_setup(
    request: Request,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    try:
        co_id_raw = request.query_params.get("co_id")
        co_id = int(co_id_raw) if co_id_raw else None
        scheme_rows = db.execute(get_pay_scheme_dropdown(), {"co_id": co_id}).fetchall()
        pay_schemes = [dict(r._mapping) for r in scheme_rows]
        return {"data": {"pay_schemes": pay_schemes}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Scheme components (cascade) ────────────────────────────────────

@router.get("/pay_scheme_components")
async def pay_scheme_components(
    request: Request,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    try:
        payscheme_raw = request.query_params.get("payscheme_id")
        if not payscheme_raw:
            raise HTTPException(status_code=400, detail="payscheme_id is required")
        rows = db.execute(
            get_pay_scheme_details_by_scheme_id(),
            {"payscheme_id": int(payscheme_raw)},
        ).fetchall()
        data = [
            {
                "component_id": r._mapping["component_id"],
                "component_name": r._mapping["component_name"],
                "component_code": r._mapping["component_code"],
                "type": r._mapping["type"],
            }
            for r in rows
        ]
        return {"data": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── By ID ──────────────────────────────────────────────────────────

@router.get("/payslip_print_component_by_id/{pay_id}")
async def payslip_print_component_by_id(
    pay_id: int,
    request: Request,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    try:
        co_id_raw = request.query_params.get("co_id")
        if not co_id_raw:
            raise HTTPException(status_code=400, detail="co_id is required")
        row = db.execute(
            get_payslip_print_component_by_id(),
            {"pay_id": pay_id, "company_id": int(co_id_raw)},
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Config row not found")
        return {"data": dict(row._mapping)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Create ─────────────────────────────────────────────────────────

def _validate_and_extract(body: dict, company_id: int):
    payscheme_id = body.get("payscheme_id")
    branch_id = body.get("branch_id")
    component_id = body.get("component_id")
    fixed_var_cols = (body.get("fixed_var_cols") or "").strip()
    if not payscheme_id:
        raise HTTPException(status_code=400, detail="Pay scheme is required")
    if not branch_id:
        raise HTTPException(status_code=400, detail="Branch is required")
    if not component_id:
        raise HTTPException(status_code=400, detail="Pay component is required")
    if fixed_var_cols not in _ALLOWED_FIXED_VAR:
        raise HTTPException(status_code=400, detail="Fixed/Variable must be F or V")
    return {
        "payscheme_id": int(payscheme_id),
        "company_id": company_id,
        "branch_id": int(branch_id),
        "component_id": int(component_id),
        "desc_print": (body.get("desc_print") or "").strip() or None,
        "payslip_order": _to_int(body.get("payslip_order"), 1),
        "fixed_var_cols": fixed_var_cols,
        "total_print": _to_int(body.get("total_print"), 0),
        "payslip_print": _to_int(body.get("payslip_print"), 0),
        "is_active": _to_int(body.get("is_active"), 1),
    }


@router.post("/payslip_print_component_create")
async def payslip_print_component_create(
    request: Request,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    try:
        co_id_raw = request.query_params.get("co_id")
        if not co_id_raw:
            raise HTTPException(status_code=400, detail="co_id is required")
        company_id = int(co_id_raw)
        body = await request.json()
        fields = _validate_and_extract(body, company_id)

        dup = db.execute(
            check_payslip_print_component_duplicate(),
            {
                "payscheme_id": fields["payscheme_id"],
                "company_id": company_id,
                "branch_id": fields["branch_id"],
                "component_id": fields["component_id"],
                "exclude_pay_id": 0,
            },
        ).fetchone()
        if dup:
            raise HTTPException(
                status_code=400,
                detail="This component is already configured for the selected scheme and branch",
            )

        rec = TblPayslipPrintComponent(**fields)
        db.add(rec)
        db.commit()
        return {"data": {"pay_id": rec.pay_id, "message": "Configuration created successfully"}}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Update ─────────────────────────────────────────────────────────

@router.put("/payslip_print_component_update/{pay_id}")
async def payslip_print_component_update(
    pay_id: int,
    request: Request,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    try:
        co_id_raw = request.query_params.get("co_id")
        if not co_id_raw:
            raise HTTPException(status_code=400, detail="co_id is required")
        company_id = int(co_id_raw)
        body = await request.json()
        fields = _validate_and_extract(body, company_id)

        rec = db.query(TblPayslipPrintComponent).filter(
            TblPayslipPrintComponent.pay_id == pay_id,
            TblPayslipPrintComponent.company_id == company_id,
        ).first()
        if not rec:
            raise HTTPException(status_code=404, detail="Config row not found")

        # Only enforce duplicate when the row will remain active
        if fields["is_active"] == 1:
            dup = db.execute(
                check_payslip_print_component_duplicate(),
                {
                    "payscheme_id": fields["payscheme_id"],
                    "company_id": company_id,
                    "branch_id": fields["branch_id"],
                    "component_id": fields["component_id"],
                    "exclude_pay_id": pay_id,
                },
            ).fetchone()
            if dup:
                raise HTTPException(
                    status_code=400,
                    detail="This component is already configured for the selected scheme and branch",
                )

        for key, value in fields.items():
            setattr(rec, key, value)
        db.commit()
        return {"data": {"pay_id": pay_id, "message": "Configuration updated successfully"}}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 3c: Register the router in `main.py`**

In `d:\vownextjs\vowerp3be\src\main.py`, add the import next to the other HRMS router imports (after line 96, `from src.hrms.payComponent import router as hrms_pay_component_router`):

```python
from src.hrms.payslipPrintComponent import router as hrms_payslip_print_component_router
```

And add the registration next to the other HRMS `include_router` calls (after line 237, the `hrms_pay_component_router` line):

```python
app.include_router(hrms_payslip_print_component_router, prefix="/api/hrms", tags=["hrms-payslip-print-component"])
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest src/test/test_hrms_payslip_print_component.py -v`
Expected: PASS (all tests, including `TestPayslipPrintComponentRouter`).

- [ ] **Step 5: Verify the app imports cleanly**

Run: `python -c "import src.main"`
Expected: no output, exit code 0 (no import or registration errors).

- [ ] **Step 6: Commit**

```bash
git add src/hrms/payslipPrintComponent.py src/models/hrms.py src/main.py src/test/test_hrms_payslip_print_component.py
git commit -m "feat(hrms): add Pay Register Display Setup CRUD endpoints"
```

---

### Task 3: Frontend API constants + service functions

**Files:**
- Modify: `d:\vownextjs\vowerp3ui\src\utils\api.ts` (after line 606, inside the HRMS Pay Register block, before the Pay Roll block)
- Modify: `d:\vownextjs\vowerp3ui\src\utils\hrmsService.ts` (append after `printPaySlips`, ~line 404)
- Test: `d:\vownextjs\vowerp3ui\src\utils\payslipPrintComponentService.test.ts` (create)

**Interfaces:**
- Consumes: `apiRoutesPortalMasters`, `fetchWithCookie` (`<T = any>(url, method, body?) => Promise<{ data, error, status }>`).
- Produces (used by Tasks 4 & 5):
  - `fetchPayslipPrintComponentList(coId: string, params?: { page?: number; limit?: number; search?: string; branch_id?: string; payscheme_id?: number | string })`
  - `fetchPayslipPrintComponentSetup(coId: string)`
  - `fetchPaySchemeComponents(coId: string, payschemeId: number | string)`
  - `fetchPayslipPrintComponentById(coId: string, payId: number | string)`
  - `createPayslipPrintComponent(coId: string, data: Record<string, unknown>)`
  - `updatePayslipPrintComponent(coId: string, payId: number | string, data: Record<string, unknown>)`

- [ ] **Step 1: Write the failing test**

Create `d:\vownextjs\vowerp3ui\src\utils\payslipPrintComponentService.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
vi.mock("@/utils/apiClient2", () => ({
  fetchWithCookie: (...args: unknown[]) => fetchMock(...args),
}));

import {
  fetchPayslipPrintComponentList,
  fetchPaySchemeComponents,
  createPayslipPrintComponent,
  updatePayslipPrintComponent,
} from "@/utils/hrmsService";

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ data: { data: [] }, error: null });
});

describe("payslip print component service", () => {
  it("list builds co_id + filters into the query string", async () => {
    await fetchPayslipPrintComponentList("5", { page: 2, limit: 10, search: "hra", branch_id: "3", payscheme_id: 7 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("payslip_print_component_list");
    expect(url).toContain("co_id=5");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=10");
    expect(url).toContain("search=hra");
    expect(url).toContain("branch_id=3");
    expect(url).toContain("payscheme_id=7");
    expect(fetchMock.mock.calls[0][1]).toBe("GET");
  });

  it("scheme components passes co_id + payscheme_id", async () => {
    await fetchPaySchemeComponents("5", 7);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("pay_scheme_components");
    expect(url).toContain("co_id=5");
    expect(url).toContain("payscheme_id=7");
  });

  it("create POSTs to the create route with co_id and body", async () => {
    await createPayslipPrintComponent("5", { payscheme_id: 7 });
    expect(fetchMock.mock.calls[0][0]).toContain("payslip_print_component_create?co_id=5");
    expect(fetchMock.mock.calls[0][1]).toBe("POST");
    expect(fetchMock.mock.calls[0][2]).toEqual({ payscheme_id: 7 });
  });

  it("update PUTs to the update route with pay_id and co_id", async () => {
    await updatePayslipPrintComponent("5", 42, { is_active: 0 });
    expect(fetchMock.mock.calls[0][0]).toContain("payslip_print_component_update/42?co_id=5");
    expect(fetchMock.mock.calls[0][1]).toBe("PUT");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- payslipPrintComponentService` (from `d:\vownextjs\vowerp3ui`)
Expected: FAIL — `fetchPayslipPrintComponentList is not a function` (exports don't exist yet).

- [ ] **Step 3a: Add the API constants**

In `d:\vownextjs\vowerp3ui\src\utils\api.ts`, immediately after line 606 (`HRMS_PAY_REGISTER_PAYSLIPS: ...`) and before the blank line + Pay Roll comment:

```ts
    // HRMS Pay Register Display Setup (tbl_payslip_print_component) endpoints
    HRMS_PAYSLIP_PRINT_COMPONENT_LIST: `${API_URL}/hrms/payslip_print_component_list`,
    HRMS_PAYSLIP_PRINT_COMPONENT_SETUP: `${API_URL}/hrms/payslip_print_component_setup`,
    HRMS_PAY_SCHEME_COMPONENTS: `${API_URL}/hrms/pay_scheme_components`,
    HRMS_PAYSLIP_PRINT_COMPONENT_BY_ID: `${API_URL}/hrms/payslip_print_component_by_id`,
    HRMS_PAYSLIP_PRINT_COMPONENT_CREATE: `${API_URL}/hrms/payslip_print_component_create`,
    HRMS_PAYSLIP_PRINT_COMPONENT_UPDATE: `${API_URL}/hrms/payslip_print_component_update`,
```

- [ ] **Step 3b: Add the service functions**

In `d:\vownextjs\vowerp3ui\src\utils\hrmsService.ts`, append after `printPaySlips` (~line 404):

```ts
// ─── Pay Register Display Setup (tbl_payslip_print_component) ───────

export const fetchPayslipPrintComponentList = async (
  coId: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    branch_id?: string;
    payscheme_id?: number | string;
  },
) => {
  const qs = new URLSearchParams({ co_id: coId });
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  if (params?.branch_id) qs.set("branch_id", params.branch_id);
  if (params?.payscheme_id) qs.set("payscheme_id", String(params.payscheme_id));
  return fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAYSLIP_PRINT_COMPONENT_LIST}?${qs.toString()}`,
    "GET",
  );
};

export const fetchPayslipPrintComponentSetup = async (coId: string) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAYSLIP_PRINT_COMPONENT_SETUP}?co_id=${coId}`,
    "GET",
  );

export const fetchPaySchemeComponents = async (
  coId: string,
  payschemeId: number | string,
) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_COMPONENTS}?co_id=${coId}&payscheme_id=${payschemeId}`,
    "GET",
  );

export const fetchPayslipPrintComponentById = async (
  coId: string,
  payId: number | string,
) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAYSLIP_PRINT_COMPONENT_BY_ID}/${payId}?co_id=${coId}`,
    "GET",
  );

export const createPayslipPrintComponent = async (
  coId: string,
  data: Record<string, unknown>,
) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAYSLIP_PRINT_COMPONENT_CREATE}?co_id=${coId}`,
    "POST",
    data,
  );

export const updatePayslipPrintComponent = async (
  coId: string,
  payId: number | string,
  data: Record<string, unknown>,
) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAYSLIP_PRINT_COMPONENT_UPDATE}/${payId}?co_id=${coId}`,
    "PUT",
    data,
  );
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- payslipPrintComponentService`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/api.ts src/utils/hrmsService.ts src/utils/payslipPrintComponentService.test.ts
git commit -m "feat(hrms): add payslip print component API routes + service fns"
```

---

### Task 4: Frontend types + Add/Edit dialog (with scheme→component cascade)

**Files:**
- Create: `d:\vownextjs\vowerp3ui\src\app\dashboardportal\hrms\payRegisterDispSet\types\payRegisterDispSetTypes.ts`
- Create: `d:\vownextjs\vowerp3ui\src\app\dashboardportal\hrms\payRegisterDispSet\_components\PayRegisterDispSetDialog.tsx`

**Interfaces:**
- Consumes: service fns from Task 3; `useSelectedCompanyCoId`, `useSidebarContext`; `MuiForm`, `MuiFormHandle` (`setValue(name, value)`), `Schema`, `MuiFormMode`.
- Produces (used by Task 5):
  - Types `Option`, `PayslipPrintComponentRow`, `PayslipPrintComponentDialogProps`
  - Default export `PayRegisterDispSetDialog` (props `{ open: boolean; onClose: () => void; onSaved?: () => void; editId?: number }`)

- [ ] **Step 1: Create the types file**

Create `types/payRegisterDispSetTypes.ts`:

```ts
/** Dropdown option shape used across the Pay Register Display Setup page. */
export type Option = { label: string; value: string };

/** A row in the list grid (joined to scheme/component/branch names). */
export type PayslipPrintComponentRow = {
  id: number; // = pay_id, for DataGrid
  pay_id: number;
  payscheme_id: number;
  branch_id: number;
  component_id: number | null;
  desc_print: string | null;
  payslip_order: number | null;
  fixed_var_cols: string;
  total_print: number;
  payslip_print: number;
  is_active: number;
  payscheme_name: string | null;
  payscheme_code: string | null;
  component_name: string | null;
  component_code: string | null;
  branch_name: string | null;
  [key: string]: unknown;
};

export type PayRegisterDispSetDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  editId?: number;
};

/** fixed_var_cols dropdown — codes stored in the char(2) column. */
export const FIXED_VAR_OPTIONS: Option[] = [
  { label: "Fixed", value: "F" },
  { label: "Variable", value: "V" },
];
```

- [ ] **Step 2: Create the dialog component**

Create `_components/PayRegisterDispSetDialog.tsx`:

```tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Snackbar,
  Alert,
  IconButton,
  Typography,
  CircularProgress,
} from "@mui/material";
import { X } from "lucide-react";
import { MuiForm } from "@/components/ui/muiform";
import type { MuiFormMode, MuiFormHandle, Schema } from "@/components/ui/muiform";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchPayslipPrintComponentSetup,
  fetchPaySchemeComponents,
  fetchPayslipPrintComponentById,
  createPayslipPrintComponent,
  updatePayslipPrintComponent,
} from "@/utils/hrmsService";
import {
  type Option,
  type PayRegisterDispSetDialogProps,
  FIXED_VAR_OPTIONS,
} from "../types/payRegisterDispSetTypes";

export default function PayRegisterDispSetDialog({
  open,
  onClose,
  onSaved,
  editId,
}: PayRegisterDispSetDialogProps) {
  const { coId } = useSelectedCompanyCoId();
  const { selectedCompany, selectedBranches } = useSidebarContext();

  const [loadingSetup, setLoadingSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<MuiFormMode>("create");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" },
  );

  const [schemeOptions, setSchemeOptions] = useState<Option[]>([]);
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [componentOptions, setComponentOptions] = useState<Option[]>([]);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [formKey, setFormKey] = useState(0);

  const formRef = useRef<MuiFormHandle>(null);
  // The scheme id whose components are currently loaded; guards the cascade
  // from clearing the component on initial (edit) load.
  const loadedSchemeRef = useRef<string>("");

  const loadSchemeComponents = useCallback(
    async (payschemeId: string): Promise<Option[]> => {
      if (!coId || !payschemeId) {
        setComponentOptions([]);
        return [];
      }
      try {
        const res = await fetchPaySchemeComponents(coId, payschemeId);
        const list = (res?.data?.data ?? res?.data ?? []) as Array<Record<string, unknown>>;
        const opts: Option[] = list
          .filter((c) => c.component_id != null)
          .map((c) => ({
            label: `${String(c.component_code ?? "")} — ${String(c.component_name ?? "")}`,
            value: String(c.component_id),
          }));
        setComponentOptions(opts);
        return opts;
      } catch {
        setComponentOptions([]);
        return [];
      }
    },
    [coId],
  );

  const loadSetup = useCallback(async () => {
    if (!coId) return;
    setLoadingSetup(true);
    try {
      // Pay schemes
      const setupRes = await fetchPayslipPrintComponentSetup(coId);
      const schemes = (setupRes?.data?.pay_schemes ?? []) as Array<Record<string, unknown>>;
      setSchemeOptions(
        schemes.map((s) => ({
          label: `${String(s.payscheme_code ?? "")} — ${String(s.payscheme_name ?? "")}`,
          value: String(s.payscheme_id),
        })),
      );

      // Branches from the sidebar-selected company, narrowed to selected branch(es)
      const allBranches = selectedCompany?.branches ?? [];
      const selectedSet = new Set(selectedBranches.map(String));
      const branchOpts: Option[] = allBranches
        .filter((b) => selectedSet.size === 0 || selectedSet.has(String(b.branch_id)))
        .map((b) => ({ label: b.branch_name, value: String(b.branch_id) }));
      setBranchOptions(branchOpts);
      const defaultBranch = branchOpts.length > 0 ? branchOpts[0].value : "";

      if (editId !== undefined) {
        const detailRes = await fetchPayslipPrintComponentById(coId, editId);
        const rec = (detailRes?.data ?? {}) as Record<string, unknown>;
        const schemeId = rec.payscheme_id != null ? String(rec.payscheme_id) : "";
        loadedSchemeRef.current = schemeId;
        await loadSchemeComponents(schemeId);
        setInitialValues({
          payscheme_id: schemeId,
          branch_id: rec.branch_id != null ? String(rec.branch_id) : defaultBranch,
          component_id: rec.component_id != null ? String(rec.component_id) : "",
          desc_print: rec.desc_print ?? "",
          payslip_order: rec.payslip_order ?? 1,
          fixed_var_cols: rec.fixed_var_cols ?? "F",
          total_print: Number(rec.total_print) === 1,
          payslip_print: Number(rec.payslip_print) === 1,
          is_active: Number(rec.is_active) === 1,
        });
      } else {
        loadedSchemeRef.current = "";
        setComponentOptions([]);
        setInitialValues({
          payscheme_id: "",
          branch_id: defaultBranch,
          component_id: "",
          desc_print: "",
          payslip_order: 1,
          fixed_var_cols: "F",
          total_print: false,
          payslip_print: false,
          is_active: true,
        });
      }
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Failed to load setup", severity: "error" });
    } finally {
      setLoadingSetup(false);
    }
  }, [coId, editId, selectedCompany, selectedBranches, loadSchemeComponents]);

  useEffect(() => {
    if (open) {
      setMode(editId !== undefined ? "edit" : "create");
      loadSetup();
    } else {
      setInitialValues({});
      setComponentOptions([]);
      loadedSchemeRef.current = "";
      setFormKey(0);
    }
  }, [open, editId, loadSetup]);

  // Cascade: when the pay scheme changes, reload components and clear the picked component.
  const handleValuesChange = useCallback(
    (vals: Record<string, unknown>) => {
      const schemeId = vals.payscheme_id ? String(vals.payscheme_id) : "";
      if (schemeId && schemeId !== loadedSchemeRef.current) {
        loadedSchemeRef.current = schemeId;
        formRef.current?.setValue("component_id", "");
        void loadSchemeComponents(schemeId);
      }
    },
    [loadSchemeComponents],
  );

  const schema = useMemo<Schema>(
    () => ({
      fields: [
        { name: "payscheme_id", label: "Pay Scheme", type: "select", required: true, options: schemeOptions, grid: { xs: 12, sm: 6 } },
        { name: "branch_id", label: "Branch", type: "select", required: true, options: branchOptions, grid: { xs: 12, sm: 6 } },
        { name: "component_id", label: "Pay Component", type: "select", required: true, options: componentOptions, grid: { xs: 12, sm: 6 } },
        { name: "desc_print", label: "Print Description", type: "text", required: true, grid: { xs: 12, sm: 6 } },
        { name: "payslip_order", label: "Payslip Order", type: "number", grid: { xs: 12, sm: 6 } },
        { name: "fixed_var_cols", label: "Fixed / Variable", type: "select", required: true, options: FIXED_VAR_OPTIONS, grid: { xs: 12, sm: 6 } },
        { name: "total_print", label: "Total Print", type: "checkbox", grid: { xs: 12, sm: 4 } },
        { name: "payslip_print", label: "Payslip Print", type: "checkbox", grid: { xs: 12, sm: 4 } },
        { name: "is_active", label: "Active", type: "checkbox", grid: { xs: 12, sm: 4 } },
      ],
    }),
    [schemeOptions, branchOptions, componentOptions],
  );

  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      if (!coId) {
        setSnackbar({ open: true, message: "No company selected", severity: "error" });
        return;
      }
      setSaving(true);
      try {
        const payload = {
          payscheme_id: values.payscheme_id ? Number(values.payscheme_id) : null,
          branch_id: values.branch_id ? Number(values.branch_id) : null,
          component_id: values.component_id ? Number(values.component_id) : null,
          desc_print: (values.desc_print as string) || null,
          payslip_order: values.payslip_order ? Number(values.payslip_order) : 1,
          fixed_var_cols: values.fixed_var_cols as string,
          total_print: values.total_print ? 1 : 0,
          payslip_print: values.payslip_print ? 1 : 0,
          is_active: values.is_active ? 1 : 0,
        };
        const res =
          editId !== undefined
            ? await updatePayslipPrintComponent(coId, editId, payload)
            : await createPayslipPrintComponent(coId, payload);
        if (res?.error) throw new Error(res.error);
        setSnackbar({
          open: true,
          message: editId !== undefined ? "Configuration updated" : "Configuration created",
          severity: "success",
        });
        onSaved?.();
        onClose();
      } catch (err: unknown) {
        setSnackbar({ open: true, message: err instanceof Error ? err.message : "Save failed", severity: "error" });
      } finally {
        setSaving(false);
      }
    },
    [coId, editId, onSaved, onClose],
  );

  const title = editId !== undefined ? "Edit Pay Register Display Setup" : "Add Pay Register Display Setup";

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" component="span">{title}</Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingSetup ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ pt: 1 }}>
              <MuiForm
                ref={formRef}
                key={formKey}
                schema={schema}
                mode={mode}
                initialValues={initialValues}
                onValuesChange={handleValuesChange}
                onSubmit={handleSubmit}
                submitLabel={saving ? "Saving..." : "Save"}
                cancelLabel="Cancel"
                onCancel={onClose}
                hideModeToggle
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` (from `d:\vownextjs\vowerp3ui`)
Expected: no errors referencing `payRegisterDispSet`. (Note: `MuiForm` must accept a `ref` — confirmed it is `forwardRef` with `MuiFormHandle`. If `onValuesChange`/`ref` typing complains, verify against `src/components/ui/muiform.tsx` exports.)

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboardportal/hrms/payRegisterDispSet/types src/app/dashboardportal/hrms/payRegisterDispSet/_components
git commit -m "feat(hrms): Pay Register Display Setup dialog + types"
```

---

### Task 5: Frontend list page

**Files:**
- Create: `d:\vownextjs\vowerp3ui\src\app\dashboardportal\hrms\payRegisterDispSet\page.tsx`

**Interfaces:**
- Consumes: `fetchPayslipPrintComponentList` (Task 3); `PayRegisterDispSetDialog`, `PayslipPrintComponentRow` (Task 4); `IndexWrapper`; `useSelectedCompanyCoId`; `useSidebarContext`.
- Produces: default export `PayRegisterDispSetPage` (the route component).

- [ ] **Step 1: Create the page**

Create `page.tsx`:

```tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert, Chip } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchPayslipPrintComponentList } from "@/utils/hrmsService";
import PayRegisterDispSetDialog from "./_components/PayRegisterDispSetDialog";
import type { PayslipPrintComponentRow } from "./types/payRegisterDispSetTypes";

export default function PayRegisterDispSetPage() {
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches } = useSidebarContext();

  const [rows, setRows] = useState<PayslipPrintComponentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" },
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);

  const fetchRows = useCallback(async () => {
    if (!coId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchPayslipPrintComponentList(coId, {
        page: (paginationModel.page ?? 0) + 1,
        limit: paginationModel.pageSize ?? 10,
        search: searchQuery || undefined,
        branch_id: selectedBranches.length > 0 ? selectedBranches.join(",") : undefined,
      });
      if (error || !data) throw new Error(error || "Failed to load configurations");
      const list = (data.data ?? []) as Array<Record<string, unknown>>;
      setRows(
        list.map((r) => ({
          ...(r as PayslipPrintComponentRow),
          id: r.pay_id as number,
        })),
      );
      setTotalRows((data.total as number) ?? 0);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Error loading data", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [coId, paginationModel.page, paginationModel.pageSize, searchQuery, selectedBranches]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleCreate = useCallback(() => {
    setSelectedId(undefined);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((row: PayslipPrintComponentRow) => {
    setSelectedId(row.pay_id);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedId(undefined);
  }, []);

  const yesNo = (v: number) => (
    <Chip label={v === 1 ? "Yes" : "No"} size="small" color={v === 1 ? "success" : "default"} variant={v === 1 ? "filled" : "outlined"} />
  );

  const columns = useMemo<GridColDef<PayslipPrintComponentRow>[]>(
    () => [
      { field: "payscheme_name", headerName: "Pay Scheme", flex: 1.4, minWidth: 160 },
      { field: "component_name", headerName: "Component", flex: 1.4, minWidth: 160 },
      { field: "desc_print", headerName: "Print Label", flex: 1.2, minWidth: 140 },
      { field: "payslip_order", headerName: "Order", width: 80, type: "number" },
      {
        field: "fixed_var_cols",
        headerName: "Fixed/Var",
        width: 110,
        valueGetter: (value) => (value === "F" ? "Fixed" : value === "V" ? "Variable" : value),
      },
      { field: "total_print", headerName: "Total Print", width: 110, renderCell: (p) => yesNo(p.row.total_print) },
      { field: "payslip_print", headerName: "Payslip Print", width: 120, renderCell: (p) => yesNo(p.row.payslip_print) },
      { field: "is_active", headerName: "Active", width: 90, renderCell: (p) => yesNo(p.row.is_active) },
    ],
    [],
  );

  return (
    <IndexWrapper
      title="Pay Register Display Setup"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search by component or print label",
        debounceDelayMs: 500,
      }}
      createAction={{ label: "Add Setup", onClick: handleCreate }}
      onView={handleEdit}
      onEdit={handleEdit}
    >
      <PayRegisterDispSetDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={fetchRows}
        editId={selectedId}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If `GridColDef` `valueGetter` signature differs in this MUI version, match the signature used in an existing page such as `masters/itemMaster/page.tsx`.)

- [ ] **Step 3: Production build (catches route/type issues)**

Run: `pnpm build`
Expected: "Compiled successfully"; the route `/dashboardportal/hrms/payRegisterDispSet` appears in the route table.

- [ ] **Step 4: Manual verification**

Start the dev server (`pnpm dev`) and the backend (`uvicorn src.main:app --reload` from the backend root). Then:
1. Navigate to `/dashboardportal/hrms/payRegisterDispSet` (with a company + branch selected in the sidebar).
2. Click **Add Setup** → pick a Pay Scheme → confirm the Pay Component dropdown populates with that scheme's components and resets when you change the scheme.
3. Set Print Description, Order, Fixed/Variable, tick Total/Payslip Print, leave Active on → **Save**. Confirm the row appears in the grid.
4. Re-open **Add Setup**, choose the same scheme/branch/component → **Save** → confirm the duplicate is rejected with the snackbar message.
5. Edit the row, untick **Active** → Save → confirm `Active = No`.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboardportal/hrms/payRegisterDispSet/page.tsx
git commit -m "feat(hrms): Pay Register Display Setup list page"
```

---

### Task 6: Sidebar menu entry

**Files:** none in this repo — this is a DB insert into `vowconsole3.portal_menu_mst` + role mapping, performed via the `add-menu` skill.

**Interfaces:** depends on the route from Task 5 existing: `/dashboardportal/hrms/payRegisterDispSet`.

- [ ] **Step 1: Invoke the `add-menu` skill**

Invoke the `add-menu` skill with these parameters (the skill will confirm target tenant DB(s) and roles before inserting):
- **Menu label:** `Pay Register Display Setup`
- **Menu path:** `/dashboardportal/hrms/payRegisterDispSet`
- **Dashboard:** Portal (`portal_menu_mst`)
- **Parent:** the HRMS parent menu (same parent as Pay Scheme / Pay Register)
- **Default target tenant:** `dev3` (confirm with user; the skill asks)
- **Action permissions:** view/create/edit (this is a CRUD master, no print)

- [ ] **Step 2: Verify the menu appears**

Log into the portal for the target tenant with a role that was granted the menu, and confirm "Pay Register Display Setup" shows under HRMS and routes to the page. (Portal menus are DB-driven and cached in `localStorage`/`SidebarContext`; a re-login or cache clear may be needed.)

---

## Self-Review

**1. Spec coverage:**
- List page (scoped to company + sidebar branches, search) → Task 5 ✓
- Add/Edit dialog with Pay Scheme / Branch / cascaded Component / desc_print / order / Fixed-Variable / Total Print / Payslip Print / Active → Task 4 ✓
- Scheme-specific component dropdown (cascade) → Task 4 (`fetchPaySchemeComponents` + `loadSchemeComponents`) + Task 2 (`/pay_scheme_components`) ✓
- Backend CRUD (list/setup/by_id/create/update) under `/api/hrms` → Task 2 ✓
- Query functions + duplicate guard → Task 1 ✓
- `company_id` from `co_id`, never client → Task 2 (`_validate_and_extract(body, company_id)`) ✓
- `fixed_var_cols` F/V validation → Task 2 (`_ALLOWED_FIXED_VAR`) + Task 4 (`FIXED_VAR_OPTIONS`) ✓
- Soft delete via Active (no hard delete) → Task 4 checkbox maps to `is_active`; duplicate guard skipped when deactivating (Task 2 update) ✓
- Service layer (no direct API in components) → Task 3 ✓
- Menu entry → Task 6 ✓
- Tests: backend query tests (Task 1), router/model tests (Task 2), FE service tests (Task 3) ✓
- Out of scope (export/PDF generation, payroll calc) — untouched ✓

**2. Placeholder scan:** No TBD/TODO; every code step contains full code; every command has expected output.

**3. Type consistency:** `pay_id`/`payscheme_id`/`branch_id`/`component_id`/`fixed_var_cols`/`total_print`/`payslip_print`/`is_active`/`desc_print`/`payslip_order` are spelled identically across the SQL (Task 1), the ORM model + `_validate_and_extract` keys (Task 2), the service payloads (Task 3), and the dialog form (Task 4). Route constants `HRMS_PAYSLIP_PRINT_COMPONENT_*` / `HRMS_PAY_SCHEME_COMPONENTS` match between Task 3's `api.ts` additions and the service functions. `PayslipPrintComponentRow` (Task 4) matches the columns selected by `list_payslip_print_components()` (Task 1). `MuiFormHandle.setValue` (used in Task 4) matches the exported handle in `muiform.tsx`.
