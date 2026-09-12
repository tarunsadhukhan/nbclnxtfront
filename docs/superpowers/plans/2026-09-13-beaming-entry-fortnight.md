# Beaming Entry (Fortnight Header/Lines) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Beaming Production entry so it matches the legacy Smart Eye "Prod - Beaming" screen — one fortnight header per shift + machine with quality lines, and derived Eff/Div HR, Prod Value, L.HR Value, Total Value, KAV and Rate1–3.

**Architecture:** New `beaming_prod_hdr` table holds the keyed header (F/N end date, shift, machine, machine/lost hours); `beaming_production` becomes its lines table; a view `vw_beaming_prod_hdr` derives every total. The FastAPI module `src/production/beaming.py` is rewritten in place (same URLs) to read the view and write header + lines in one transaction. The Next.js page `production/beamproduction` is rebuilt to the legacy layout with a pure TS mirror of the formulas for live preview.

**Tech Stack:** MySQL 8.0.46 (tenant `nbcl`), FastAPI + SQLAlchemy (sync `def` endpoints, `parse_json_body`), pytest; Next.js 15, React 19, MUI 7, Zod 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-13-beaming-entry-fortnight-design.md` (nxtfront repo)

## Global Constraints

- Repos: frontend `E:\test\nbcl\nxtfront` (branch `feat/beaming-entry-fortnight`, already created); backend `e:\test\nbcl\pyhback` (currently `main` with unrelated dirty files — create branch `feat/beaming-entry-fortnight` and only ever `git add` the files named in a task).
- Database: tenant `nbcl` only. The migration is executed **only by the controller after explicit user confirmation** (Task 3). Implementers never run SQL that writes.
- Python: `e:\test\nbcl\pyhback\.venv\Scripts\python.exe`; run pytest from `e:\test\nbcl\pyhback`. `src/models/hrms.py` is **tab-indented**.
- Backend style: raw `Request` + `parse_json_body(request)`, `Depends(get_tenant_db)` + `Depends(get_current_user_with_refresh)`, no Pydantic (matches sibling production modules).
- Frontend rules (CLAUDE.md): no `any`; Zod validation before submit; colours only from theme/`entryGrid` helpers (never hardcoded); company/branch from `useSidebarContext()`; API calls via `fetchWithCookie`; no `console.log`.
- Formulas (verbatim from spec): Eff HR = `mach_hrs − lost_hrs`; Div HR = `mach_hrs × 3`; Prod Value `pv = Σ rate × prod_qty`; L.HR Value `lhv = pv ÷ eff_hrs × lost_hrs` (0 when eff_hrs = 0); Total `tv = pv + lhv`; KAV = `tv ÷ 20`; Rate1 = `(tv − KAV) ÷ div_hrs`; Rate2 = `KAV ÷ 32`; Rate3 = `KAV ÷ 48`. Values 2 dp, KAV/rates 6 dp, always from unrounded `tv`.
- Acceptance numbers: screenshot (Mach 96, Lost 0, lines 0035×100000@0.000757 + 0015×17@0.3) → Div 288, Prod 100017, Prod Value 80.80, Total 80.80, KAV 4.040000, Rate1 0.266528, Rate2 0.126250, Rate3 0.084167. Same lines with Mach 88 (nbcl SM0001 / C / 2025-11-15) → Rate1 0.290758.
- API validation messages (exact): `fne_date is required`, `fne_date must be YYYY-MM-DD`, `F/N E. Date must be the 15th or the last day of the month`, `shift is required`, `mach_hrs must be greater than 0`, `lost_hrs cannot exceed mach_hrs`, `At least one line is required`, `Line N: prod_qty must be greater than 0`, `Line N: duplicate quality in this entry`, `This machine already has an entry for this F/N date and shift — edit it instead`.

## Execution lanes

- **Backend lane:** Task 1 → Task 2 (one agent, sequential).
- **Frontend lane:** Task 4 → Task 5 → Task 6 (one agent, sequential). Runs in parallel with the backend lane; it only depends on the API contract in the spec §3.
- **Controller:** Task 3 (migration, after both lanes' reviews and user confirmation), then Task 7 (verification + browser QA).

## File map

| File | Responsibility |
|---|---|
| `pyhback/dbqueries/migrations/beaming_prod_hdr.sql` | DDL: header table, lines backfill + column drops, view, rollback block |
| `pyhback/dbqueries/migrations/run_beaming_prod_hdr.py` | One-shot runner with acceptance assertion |
| `pyhback/src/models/hrms.py` | ORM `BeamingProdHdr`; slimmed `BeamingProduction` |
| `pyhback/src/production/beaming.py` | Parser + endpoints (setup, list, by-id, create, edit, delete) |
| `pyhback/src/test/test_production_beaming.py` | Parser tests |
| `nxtfront/src/app/dashboardportal/production/beamproduction/beamingTotals.ts` | Pure formula + fortnight-date helpers |
| `nxtfront/.../beamproduction/beamingTotals.test.ts` | Vitest acceptance numbers |
| `nxtfront/.../beamproduction/types.ts` | Types for header rows, lines, setup |
| `nxtfront/.../beamproduction/page.tsx` | List page (one row per header) |
| `nxtfront/.../beamproduction/CreateBeamProductionPage.tsx` | Legacy-layout entry dialog |
| `nxtfront/src/utils/api.ts` | Remove `BEAMING_PROD_BULK_CREATE` |

---

### Task 1: Migration files + ORM models (backend lane)

**Files:**
- Create: `e:\test\nbcl\pyhback\dbqueries\migrations\beaming_prod_hdr.sql`
- Create: `e:\test\nbcl\pyhback\dbqueries\migrations\run_beaming_prod_hdr.py`
- Modify: `e:\test\nbcl\pyhback\src\models\hrms.py:128-147` (the `BeamingProduction` class and its comment)

**Interfaces:**
- Produces: table `beaming_prod_hdr(beaming_hdr_id, branch_id, fne_date, shift, machine_id, mach_hrs, lost_hrs, eff_hrs*, div_hrs*, active)`; lines `beaming_production(beaming_prod_id, beaming_hdr_id, branch_id, quality_id, prod_qty, rate, amount*, remarks, active)`; view `vw_beaming_prod_hdr(beaming_hdr_id, branch_id, fne_date, period, shift, machine_id, mach_hrs, lost_hrs, eff_hrs, div_hrs, active, prod_qty, line_count, prod_value, lhr_value, total_value, kav, rate1, rate2, rate3)`; ORM classes `BeamingProdHdr`, `BeamingProduction` in `src.models.hrms`. (`*` = generated)

- [ ] **Step 1: Create the backend branch**

Run (from `e:\test\nbcl\pyhback`): `git checkout -b feat/beaming-entry-fortnight`
Expected: `Switched to a new branch 'feat/beaming-entry-fortnight'` (unrelated modified files stay unstaged — do not add them).

- [ ] **Step 2: Write the migration SQL**

Create `dbqueries/migrations/beaming_prod_hdr.sql` with exactly:

```sql
-- Beaming production -> fortnight header + quality lines.
-- Mirrors legacy Smart Eye Smart_Eye_Jute_Northbrook_Live.PayOProdBmg (header)
-- + PayProdBmg1 (lines). One header per branch + F/N end date + shift + machine
-- carries machine/lost hours; beaming_production keeps the quality lines;
-- vw_beaming_prod_hdr derives Prod, Prod Value, L.HR Value, Total Value, KAV
-- and Rate1-3 (formulas verified on 1353/1355 legacy headers).
-- Spec: nxtfront/docs/superpowers/specs/2026-09-13-beaming-entry-fortnight-design.md
-- Target DB: nbcl. MySQL DDL auto-commits - apply once via run_beaming_prod_hdr.py.
-- Pre-check 2026-09-13: 48 lines -> 20 headers, one wk_hrs per group, no conflicts.

CREATE TABLE beaming_prod_hdr (
    beaming_hdr_id INT PRIMARY KEY AUTO_INCREMENT,
    branch_id INT NOT NULL,
    fne_date DATE NOT NULL,
    shift VARCHAR(5) NOT NULL,
    machine_id INT NOT NULL,
    mach_hrs DOUBLE NOT NULL,
    lost_hrs DOUBLE NOT NULL DEFAULT 0,
    eff_hrs DOUBLE GENERATED ALWAYS AS (mach_hrs - lost_hrs) STORED,
    div_hrs DOUBLE GENERATED ALWAYS AS (mach_hrs * 3) STORED,
    active INT NOT NULL DEFAULT 1,
    KEY idx_bph_branch_fne (branch_id, fne_date),
    KEY idx_bph_machine (machine_id)
);

ALTER TABLE beaming_production ADD COLUMN beaming_hdr_id INT NULL AFTER beaming_prod_id;

INSERT INTO beaming_prod_hdr (branch_id, fne_date, shift, machine_id, mach_hrs, lost_hrs, active)
SELECT branch_id, prod_date, shift, machine_id,
       COALESCE(MAX(wk_hrs), 0), COALESCE(MAX(lost_hrs), 0), MAX(active)
FROM beaming_production
GROUP BY branch_id, prod_date, shift, machine_id;

UPDATE beaming_production b
JOIN beaming_prod_hdr h
  ON h.branch_id = b.branch_id AND h.fne_date = b.prod_date
 AND h.shift = b.shift AND h.machine_id = b.machine_id
SET b.beaming_hdr_id = h.beaming_hdr_id;

ALTER TABLE beaming_production
    MODIFY beaming_hdr_id INT NOT NULL,
    ADD KEY idx_beaming_prod_hdr (beaming_hdr_id);

ALTER TABLE beaming_production DROP COLUMN divisible_hrs;

ALTER TABLE beaming_production
    DROP COLUMN wk_hrs,
    DROP COLUMN lost_hrs,
    DROP COLUMN prod_date,
    DROP COLUMN shift,
    DROP COLUMN machine_id;

CREATE OR REPLACE VIEW vw_beaming_prod_hdr AS
SELECT v.beaming_hdr_id, v.branch_id, v.fne_date,
       CONCAT(UPPER(DATE_FORMAT(v.fne_date, '%b')), '/', DATE_FORMAT(v.fne_date, '%y'), '/',
              IF(DAY(v.fne_date) <= 15, '01', '02')) AS period,
       v.shift, v.machine_id, v.mach_hrs, v.lost_hrs, v.eff_hrs, v.div_hrs, v.active,
       v.prod_qty, v.line_count,
       ROUND(v.pv, 2) AS prod_value,
       ROUND(v.lhv, 2) AS lhr_value,
       ROUND(v.pv + v.lhv, 2) AS total_value,
       ROUND((v.pv + v.lhv) / 20, 6) AS kav,
       ROUND((v.pv + v.lhv) * 19 / 20 / NULLIF(v.div_hrs, 0), 6) AS rate1,
       ROUND((v.pv + v.lhv) / 20 / 32, 6) AS rate2,
       ROUND((v.pv + v.lhv) / 20 / 48, 6) AS rate3
FROM (
    SELECT h.beaming_hdr_id, h.branch_id, h.fne_date, h.shift, h.machine_id,
           h.mach_hrs, h.lost_hrs, h.eff_hrs, h.div_hrs, h.active,
           COALESCE(t.prod_qty, 0) AS prod_qty,
           COALESCE(t.line_count, 0) AS line_count,
           COALESCE(t.pv, 0) AS pv,
           COALESCE(COALESCE(t.pv, 0) / NULLIF(h.eff_hrs, 0) * h.lost_hrs, 0) AS lhv
    FROM beaming_prod_hdr h
    LEFT JOIN (
        SELECT beaming_hdr_id, SUM(prod_qty) AS prod_qty, COUNT(*) AS line_count,
               SUM(rate * prod_qty) AS pv
        FROM beaming_production
        WHERE active = 1
        GROUP BY beaming_hdr_id
    ) t ON t.beaming_hdr_id = h.beaming_hdr_id
) v;

-- ROLLBACK (run manually, in order):
--   DROP VIEW vw_beaming_prod_hdr
--   ALTER TABLE beaming_production ADD COLUMN prod_date DATE NULL, ADD COLUMN shift VARCHAR(5) NULL, ADD COLUMN machine_id INT NULL, ADD COLUMN wk_hrs DOUBLE NULL, ADD COLUMN lost_hrs DOUBLE NULL
--   UPDATE beaming_production b JOIN beaming_prod_hdr h ON h.beaming_hdr_id = b.beaming_hdr_id SET b.prod_date = h.fne_date, b.shift = h.shift, b.machine_id = h.machine_id
--   UPDATE beaming_production b JOIN beaming_prod_hdr h ON h.beaming_hdr_id = b.beaming_hdr_id JOIN (SELECT beaming_hdr_id, MIN(beaming_prod_id) first_id FROM beaming_production GROUP BY beaming_hdr_id) f ON f.first_id = b.beaming_prod_id SET b.wk_hrs = h.mach_hrs, b.lost_hrs = NULLIF(h.lost_hrs, 0)
--   ALTER TABLE beaming_production MODIFY prod_date DATE NOT NULL, MODIFY shift VARCHAR(5) NOT NULL DEFAULT 'A', MODIFY machine_id INT NOT NULL, ADD COLUMN divisible_hrs DOUBLE GENERATED ALWAYS AS (wk_hrs * 3) STORED AFTER lost_hrs, ADD KEY idx_beaming_prod_machine (machine_id), DROP KEY idx_beaming_prod_branch_date, ADD KEY idx_beaming_prod_branch_date (branch_id, prod_date)
--   ALTER TABLE beaming_production DROP KEY idx_beaming_prod_hdr, DROP COLUMN beaming_hdr_id
--   DROP TABLE beaming_prod_hdr
```

- [ ] **Step 3: Write the runner**

Create `dbqueries/migrations/run_beaming_prod_hdr.py` with exactly:

```python
"""Apply beaming_prod_hdr.sql (beaming production -> fortnight header + lines).

Usage:
    python dbqueries/migrations/run_beaming_prod_hdr.py [--db nbcl]

Not re-runnable: aborts if beaming_prod_hdr already exists. MySQL DDL
auto-commits, so a failure midway needs the ROLLBACK block in the .sql file.
After applying it asserts the spec's acceptance numbers against existing data.
"""
import pathlib
import sys

import pymysql
from dotenv import dotenv_values

ROOT = pathlib.Path(__file__).resolve().parents[2]
ENV = dotenv_values(ROOT / "env" / "database.env")

DB = sys.argv[sys.argv.index("--db") + 1] if "--db" in sys.argv else "nbcl"
_RAW = (pathlib.Path(__file__).parent / "beaming_prod_hdr.sql").read_text()
# Drop comment lines first — a bare split on ";" would cut inside one.
SQL = "\n".join(l for l in _RAW.splitlines() if not l.lstrip().startswith("--"))

con = pymysql.connect(
    host=ENV["DATABASE_HOST"],
    port=int(ENV.get("DATABASE_PORT") or 3306),
    user=ENV["DATABASE_USER"],
    password=ENV["DATABASE_PASSWORD"],
    database=DB,
    charset="utf8mb4",
)
cur = con.cursor()

cur.execute("SHOW TABLES LIKE 'beaming_prod_hdr'")
if cur.fetchone():
    sys.exit(f"beaming_prod_hdr already exists in {DB} — migration already applied")

for stmt in (s for s in SQL.split(";") if s.strip()):
    cur.execute(stmt)
con.commit()

cur.execute("SELECT COUNT(*) FROM beaming_prod_hdr")
print("headers:", cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM beaming_production")
print("lines:", cur.fetchone()[0])

cur.execute(
    "SELECT v.prod_qty, v.prod_value, v.total_value, v.kav, v.rate1, v.rate2, v.rate3"
    " FROM vw_beaming_prod_hdr v JOIN machine_mst m ON m.machine_id = v.machine_id"
    " WHERE m.machine_name = 'SM0001' AND v.shift = 'C' AND v.fne_date = '2025-11-15'")
row = cur.fetchone()
print("SM0001 / C / 2025-11-15:", row)
got = tuple(round(float(x), 6) for x in row[3:]) if row else None
# Legacy PayOProdBmg DocEntry 1390.
assert got == (4.04, 0.290758, 0.12625, 0.084167), got
print("acceptance numbers match legacy DocEntry 1390")
con.close()
```

- [ ] **Step 4: Update the ORM models**

In `src/models/hrms.py`, replace lines 128–147 (the comment starting `# Beaming production: one row per machine + date + shift + quality` through the end of `class BeamingProduction`) with the block below. **Use tabs for indentation** like the rest of the file.

```python
# Beaming production header: one per branch + F/N end date + shift + machine
# (legacy Smart Eye PayOProdBmg). Prod, Prod Value, L.HR Value, Total Value,
# KAV and Rate1-3 are derived by the view vw_beaming_prod_hdr.
class BeamingProdHdr(Base):
	__tablename__ = "beaming_prod_hdr"
	beaming_hdr_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
	branch_id: Mapped[int] = mapped_column(Integer, nullable=False)
	fne_date: Mapped[Date] = mapped_column(Date, nullable=False)
	shift: Mapped[str] = mapped_column(String(5), nullable=False)
	machine_id: Mapped[int] = mapped_column(Integer, nullable=False)
	mach_hrs: Mapped[float] = mapped_column(Float, nullable=False)
	lost_hrs: Mapped[float] = mapped_column(Float, nullable=False, default=0)
	eff_hrs: Mapped[float | None] = mapped_column(
		Float, Computed("mach_hrs - lost_hrs", persisted=True), nullable=True)
	div_hrs: Mapped[float | None] = mapped_column(
		Float, Computed("mach_hrs * 3", persisted=True), nullable=True)
	active: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


# Beaming production line: one quality per header (legacy PayProdBmg1).
# Rate is snapshotted from tbl_nbcl_wages_quality_mst.quality_rate; amount is generated.
class BeamingProduction(Base):
	__tablename__ = "beaming_production"
	beaming_prod_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
	beaming_hdr_id: Mapped[int] = mapped_column(Integer, nullable=False)
	branch_id: Mapped[int] = mapped_column(Integer, nullable=False)
	quality_id: Mapped[int] = mapped_column(Integer, nullable=False)
	prod_qty: Mapped[float] = mapped_column(Float, nullable=False)
	rate: Mapped[float] = mapped_column(Float, nullable=False)
	amount: Mapped[float | None] = mapped_column(
		Float, Computed("round(rate * prod_qty, 2)", persisted=True), nullable=True)
	remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
	active: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
```

Also update the `PressProduction` comment on the next class from `# Same shape as BeamingProduction, but divisible_hrs = wk_hrs * 4 (not * 3).` to `# divisible_hrs = wk_hrs * 4; beaming uses a header table (BeamingProdHdr) instead.`

- [ ] **Step 5: Verify the models import and the SQL parses into the expected statements**

Run:
```
e:\test\nbcl\pyhback\.venv\Scripts\python.exe -c "from src.models.hrms import BeamingProdHdr, BeamingProduction; print(sorted(c.name for c in BeamingProduction.__table__.columns)); import pathlib; raw=pathlib.Path('dbqueries/migrations/beaming_prod_hdr.sql').read_text(); sql='\n'.join(l for l in raw.splitlines() if not l.lstrip().startswith('--')); print(len([s for s in sql.split(';') if s.strip()]))"
```
Expected:
```
['active', 'amount', 'beaming_hdr_id', 'beaming_prod_id', 'branch_id', 'prod_qty', 'quality_id', 'rate', 'remarks']
8
```

- [ ] **Step 6: Commit (backend repo)**

```
git add dbqueries/migrations/beaming_prod_hdr.sql dbqueries/migrations/run_beaming_prod_hdr.py src/models/hrms.py
git commit -m "feat(production): beaming fortnight header table, lines backfill and totals view"
```
(End the message with the `Co-Authored-By` trailer from the session.)

---

### Task 2: Beaming API rewrite + parser tests (backend lane)

**Files:**
- Modify (full rewrite): `e:\test\nbcl\pyhback\src\production\beaming.py`
- Modify (full rewrite): `e:\test\nbcl\pyhback\src\test\test_production_beaming.py`

**Interfaces:**
- Consumes: `BeamingProdHdr`, `BeamingProduction` from Task 1; view `vw_beaming_prod_hdr`.
- Produces: `_parse_entry(body: dict) -> tuple[dict, list[dict]]`; endpoints exactly as spec §3 (`/beaming_prod_setup`, `/get_beaming_prod_table`, `/get_beaming_prod_by_id/{hdr_id}`, `/beaming_prod_create`, `/beaming_prod_edit/{hdr_id}`, `/beaming_prod_delete/{hdr_id}`). `beaming_prod_bulk_create` is removed. Router registration in `src/main.py` is unchanged.

- [ ] **Step 1: Write the failing tests**

Replace the whole of `src/test/test_production_beaming.py` with:

```python
"""Smallest check for the Beaming Production (fortnight header + lines) payload parser."""

from datetime import date

import pytest
from fastapi import HTTPException

from src.production.beaming import _parse_entry

BASE = {
    "branch_id": "87", "fne_date": "2026-08-31", "shift": " c ", "machine_id": "3894",
    "mach_hrs": "96", "lost_hrs": "0",
    "lines": [{"quality_id": "19", "prod_qty": "100000"}, {"quality_id": "4", "prod_qty": "17"}],
}


def test_parse_entry_normalises_screenshot_entry():
    header, lines = _parse_entry(BASE)
    assert header == {"branch_id": 87, "fne_date": date(2026, 8, 31), "shift": "C",
                      "machine_id": 3894, "mach_hrs": 96.0, "lost_hrs": 0.0}
    assert lines == [{"quality_id": 19, "prod_qty": 100000.0},
                     {"quality_id": 4, "prod_qty": 17.0}]


def test_parse_entry_defaults_lost_hrs_and_accepts_15th():
    header, _ = _parse_entry({**BASE, "fne_date": "2026-02-15", "lost_hrs": None})
    assert (header["fne_date"], header["lost_hrs"]) == (date(2026, 2, 15), 0.0)


def test_parse_entry_accepts_leap_february_end():
    header, _ = _parse_entry({**BASE, "fne_date": "2028-02-29"})
    assert header["fne_date"] == date(2028, 2, 29)


@pytest.mark.parametrize("bad, message", [
    ({"branch_id": ""}, "branch_id is required"),
    ({"machine_id": None}, "machine_id is required"),
    ({"shift": "  "}, "shift is required"),
    ({"fne_date": ""}, "fne_date is required"),
    ({"fne_date": "31-08-2026"}, "fne_date must be YYYY-MM-DD"),
    ({"fne_date": "2026-08-30"}, "F/N E. Date must be the 15th or the last day of the month"),
    ({"mach_hrs": "0"}, "mach_hrs must be greater than 0"),
    ({"mach_hrs": "abc"}, "mach_hrs must be a number"),
    ({"lost_hrs": "-1"}, "lost_hrs must be zero or more"),
    ({"lost_hrs": "97"}, "lost_hrs cannot exceed mach_hrs"),
    ({"lines": []}, "At least one line is required"),
])
def test_parse_entry_rejects_bad_header(bad, message):
    with pytest.raises(HTTPException) as exc:
        _parse_entry({**BASE, **bad})
    assert exc.value.detail == message


def test_parse_entry_rejects_bad_line_with_prefix():
    with pytest.raises(HTTPException) as exc:
        _parse_entry({**BASE, "lines": [BASE["lines"][0], {"quality_id": "4", "prod_qty": "0"}]})
    assert exc.value.detail == "Line 2: prod_qty must be greater than 0"


def test_parse_entry_rejects_duplicate_quality():
    with pytest.raises(HTTPException) as exc:
        _parse_entry({**BASE, "lines": [BASE["lines"][0], dict(BASE["lines"][0])]})
    assert exc.value.detail == "Line 2: duplicate quality in this entry"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `e:\test\nbcl\pyhback`): `.venv\Scripts\python.exe -m pytest src/test/test_production_beaming.py -q`
Expected: collection error — `ImportError: cannot import name '_parse_entry' from 'src.production.beaming'`.

- [ ] **Step 3: Rewrite the module**

Replace the whole of `src/production/beaming.py` with:

```python
"""
Beaming production entries — production/beamproduction.

Mirrors the legacy Smart Eye "Prod - Beaming" screen (PayOProdBmg + PayProdBmg1):
one header per branch + F/N end date + shift + machine carrying machine and lost
hours (beaming_prod_hdr), with one line per quality (beaming_production). Line
rates are NOT keyed in: they are resolved from the wages quality master
(tbl_nbcl_wages_quality_mst, BEAMING dept) and snapshotted; amount is a stored
generated column. Prod, Prod Value, L.HR Value, Total Value, KAV and Rate1-3
are derived by the view vw_beaming_prod_hdr.

Spec: nxtfront/docs/superpowers/specs/2026-09-13-beaming-entry-fortnight-design.md
"""

import calendar
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy.sql import text

from src.authorization.utils import get_current_user_with_refresh
from src.common.utils import parse_json_body
from src.config.db import get_tenant_db
from src.hrms.outsiderRate import get_rate_shifts_query
from src.models.hrms import BeamingProdHdr, BeamingProduction

router = APIRouter()

# ponytail: dept matched by name within the branch — make it configurable if
# another tenant names its beaming department differently
_BEAMING_DEPT = "BEAMING"

_HDR_COLUMNS = """
    v.beaming_hdr_id, v.branch_id, v.fne_date, v.period, v.shift,
    v.machine_id, mc.machine_name, v.mach_hrs, v.lost_hrs, v.eff_hrs, v.div_hrs,
    v.prod_qty, v.line_count, v.prod_value, v.lhr_value, v.total_value,
    v.kav, v.rate1, v.rate2, v.rate3
"""


# ─── SQL Queries ──────────────────────────────────────────────────────────


def get_beaming_prod_list_query():
    return text(f"""
        SELECT {_HDR_COLUMNS}
        FROM vw_beaming_prod_hdr v
        INNER JOIN branch_mst bm ON bm.branch_id = v.branch_id
        LEFT JOIN machine_mst mc ON mc.machine_id = v.machine_id
        WHERE v.active = 1
          AND bm.co_id = :co_id
          AND (:branch_id IS NULL OR v.branch_id = :branch_id)
          AND (:from_date IS NULL OR v.fne_date >= :from_date)
          AND (:to_date IS NULL OR v.fne_date <= :to_date)
          AND (:search IS NULL
               OR mc.machine_name LIKE :search
               OR v.shift LIKE :search
               OR v.period LIKE :search)
        ORDER BY v.fne_date DESC, v.shift, mc.machine_name
    """)


def get_beaming_prod_hdr_query():
    return text(f"""
        SELECT {_HDR_COLUMNS}
        FROM vw_beaming_prod_hdr v
        LEFT JOIN machine_mst mc ON mc.machine_id = v.machine_id
        WHERE v.beaming_hdr_id = :hdr_id AND v.active = 1
    """)


def get_beaming_prod_lines_query():
    return text("""
        SELECT b.beaming_prod_id, b.quality_id, q.quality_code, q.quality_desc,
               b.prod_qty, b.rate, b.amount
        FROM beaming_production b
        LEFT JOIN tbl_nbcl_wages_quality_mst q ON q.quality_id = b.quality_id
        WHERE b.beaming_hdr_id = :hdr_id AND b.active = 1
        ORDER BY b.beaming_prod_id
    """)


def get_beaming_dept_query():
    return text("""
        SELECT dept_id, dept_code, dept_desc FROM dept_mst
        WHERE branch_id = :branch_id AND dept_desc = :dept_desc
        ORDER BY dept_id
        LIMIT 1
    """)


def get_beaming_machines_query():
    return text("""
        SELECT machine_id, machine_name, mech_code
        FROM machine_mst
        WHERE active = 1 AND dept_id = :dept_id
        ORDER BY machine_name
    """)


def get_quality_options_query():
    return text("""
        SELECT quality_id, quality_code, quality_desc, quality_rate
        FROM tbl_nbcl_wages_quality_mst
        WHERE active = 1 AND dept_id = :dept_id
        ORDER BY quality_code
    """)


def get_quality_rate_query():
    return text("""
        SELECT quality_rate FROM tbl_nbcl_wages_quality_mst
        WHERE quality_id = :quality_id AND active = 1
    """)


def _duplicate_query():
    """Same branch + F/N date + shift + machine already entered (ignoring one header)."""
    return text("""
        SELECT COUNT(*) AS cnt FROM beaming_prod_hdr
        WHERE active = 1
          AND branch_id = :branch_id
          AND fne_date = :fne_date
          AND shift = :shift
          AND machine_id = :machine_id
          AND (:hdr_id IS NULL OR beaming_hdr_id <> :hdr_id)
    """)


# ─── Helpers ──────────────────────────────────────────────────────────────


def _branch_param(request: Request) -> int | None:
    raw = request.query_params.get("branch_id")
    return int(raw) if raw not in (None, "", "null") else None


def _int(body: dict, name: str) -> int:
    v = body.get(name)
    if v in (None, "", "null"):
        raise HTTPException(status_code=400, detail=f"{name} is required")
    try:
        return int(v)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"{name} must be an integer")


def _num_or_none(body: dict, name: str) -> float | None:
    v = body.get(name)
    if v in (None, ""):
        return None
    try:
        val = float(v)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"{name} must be a number")
    if val < 0:
        raise HTTPException(status_code=400, detail=f"{name} must be zero or more")
    return val


def _is_fortnight_end(d: date) -> bool:
    """Legacy F/N E. Date: the 15th or the last day of the month."""
    return d.day == 15 or d.day == calendar.monthrange(d.year, d.month)[1]


def _parse_line(line, index: int) -> dict:
    """One quality line; errors are prefixed with the 1-based line number."""
    try:
        if not isinstance(line, dict):
            raise HTTPException(status_code=400, detail="line must be an object")
        prod_qty = _num_or_none(line, "prod_qty")
        if not prod_qty:
            raise HTTPException(status_code=400, detail="prod_qty must be greater than 0")
        return {"quality_id": _int(line, "quality_id"), "prod_qty": prod_qty}
    except HTTPException as e:
        raise HTTPException(status_code=400, detail=f"Line {index + 1}: {e.detail}")


def _parse_entry(body: dict) -> tuple[dict, list[dict]]:
    """Validate + normalise a create/edit payload into (header columns, lines).
    Rates are never read from the body — they come from the quality master."""
    raw_date = str(body.get("fne_date") or "").strip()
    if not raw_date:
        raise HTTPException(status_code=400, detail="fne_date is required")
    try:
        fne_date = date.fromisoformat(raw_date[:10])
    except ValueError:
        raise HTTPException(status_code=400, detail="fne_date must be YYYY-MM-DD")
    if not _is_fortnight_end(fne_date):
        raise HTTPException(
            status_code=400,
            detail="F/N E. Date must be the 15th or the last day of the month",
        )

    shift = str(body.get("shift") or "").strip().upper()[:5]
    if not shift:
        raise HTTPException(status_code=400, detail="shift is required")

    mach_hrs = _num_or_none(body, "mach_hrs")
    if not mach_hrs:
        raise HTTPException(status_code=400, detail="mach_hrs must be greater than 0")
    lost_hrs = _num_or_none(body, "lost_hrs") or 0.0
    if lost_hrs > mach_hrs:
        raise HTTPException(status_code=400, detail="lost_hrs cannot exceed mach_hrs")

    raw_lines = body.get("lines")
    if not isinstance(raw_lines, list) or not raw_lines:
        raise HTTPException(status_code=400, detail="At least one line is required")
    lines: list[dict] = []
    seen: set[int] = set()
    for i, raw in enumerate(raw_lines):
        line = _parse_line(raw, i)
        if line["quality_id"] in seen:
            raise HTTPException(
                status_code=400, detail=f"Line {i + 1}: duplicate quality in this entry",
            )
        seen.add(line["quality_id"])
        lines.append(line)

    header = {
        "branch_id": _int(body, "branch_id"),
        "fne_date": fne_date,
        "shift": shift,
        "machine_id": _int(body, "machine_id"),
        "mach_hrs": mach_hrs,
        "lost_hrs": lost_hrs,
    }
    return header, lines


def _resolve_rate(db: Session, quality_id: int) -> float:
    """Beaming rate as per the wages quality master — never trusted from the client."""
    row = db.execute(get_quality_rate_query(), {"quality_id": quality_id}).fetchone()
    if not row or row.quality_rate is None:
        raise HTTPException(status_code=400, detail="Selected beaming quality not found")
    return float(row.quality_rate)


def _assert_not_duplicate(db: Session, header: dict, hdr_id: int | None) -> None:
    dup = db.execute(_duplicate_query(), {
        "branch_id": header["branch_id"],
        "fne_date": header["fne_date"],
        "shift": header["shift"],
        "machine_id": header["machine_id"],
        "hdr_id": hdr_id,
    }).fetchone()
    if dup and dup.cnt > 0:
        raise HTTPException(
            status_code=400,
            detail="This machine already has an entry for this F/N date and shift — edit it instead",
        )


def _build_lines(db: Session, header: dict, hdr_id: int, lines: list[dict]) -> list[BeamingProduction]:
    """Line rows with the rate snapshotted from the quality master."""
    records = []
    for i, line in enumerate(lines):
        try:
            rate = _resolve_rate(db, line["quality_id"])
        except HTTPException as e:
            raise HTTPException(status_code=400, detail=f"Line {i + 1}: {e.detail}")
        records.append(BeamingProduction(
            beaming_hdr_id=hdr_id,
            branch_id=header["branch_id"],
            quality_id=line["quality_id"],
            prod_qty=line["prod_qty"],
            rate=rate,
            active=1,
        ))
    return records


def _active_header(db: Session, hdr_id: int) -> BeamingProdHdr:
    existing = db.query(BeamingProdHdr).filter(
        BeamingProdHdr.beaming_hdr_id == hdr_id,
        BeamingProdHdr.active == 1,
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Beaming production entry not found")
    return existing


# ─── Endpoints ────────────────────────────────────────────────────────────


@router.get("/beaming_prod_setup")
def beaming_prod_setup(
    request: Request,
    response: Response,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    """Dropdown options for one branch: its BEAMING department, that department's
    machines and quality codes (with per-unit rate), and the shifts."""
    try:
        branch_id = _branch_param(request)
        if branch_id is None:
            raise HTTPException(status_code=400, detail="branch_id is required")

        dept = db.execute(get_beaming_dept_query(), {
            "branch_id": branch_id, "dept_desc": _BEAMING_DEPT,
        }).fetchone()
        shifts = db.execute(get_rate_shifts_query()).fetchall()
        machines, qualities = [], []
        if dept:
            machines = db.execute(get_beaming_machines_query(), {"dept_id": dept.dept_id}).fetchall()
            qualities = db.execute(get_quality_options_query(), {"dept_id": dept.dept_id}).fetchall()

        return {
            "data": {
                "dept": dict(dept._mapping) if dept else None,
                "machines": [
                    {
                        "value": str(r.machine_id),
                        "label": r.machine_name,
                        "code": r.mech_code or r.machine_name,
                        "name": r.machine_name,
                    }
                    for r in machines
                ],
                "shifts": [{"value": r.spell_name, "label": r.spell_name} for r in shifts],
                "qualities": [
                    {
                        "value": str(r.quality_id),
                        "label": f"{r.quality_code} - {r.quality_desc or ''}".rstrip(" -"),
                        "code": r.quality_code,
                        "name": r.quality_desc or "",
                        "quality_rate": float(r.quality_rate) if r.quality_rate is not None else None,
                    }
                    for r in qualities
                ],
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get_beaming_prod_table")
def get_beaming_prod_table(
    request: Request,
    response: Response,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    """Paginated list of beaming entries (one row per header) for the selected company/branch."""
    try:
        co_id = request.query_params.get("co_id")
        if not co_id:
            raise HTTPException(status_code=400, detail="co_id is required")

        search = request.query_params.get("search")
        page = int(request.query_params.get("page", 1))
        limit = int(request.query_params.get("limit", 10))

        rows = db.execute(get_beaming_prod_list_query(), {
            "co_id": int(co_id),
            "branch_id": _branch_param(request),
            "from_date": request.query_params.get("from_date") or None,
            "to_date": request.query_params.get("to_date") or None,
            "search": f"%{search}%" if search else None,
        }).fetchall()
        all_data = [dict(r._mapping) for r in rows]

        # ponytail: in-memory pagination like the sibling pages; SQL LIMIT if it grows
        total = len(all_data)
        start = (page - 1) * limit
        return {
            "data": all_data[start:start + limit],
            "total": total,
            "page": page,
            "limit": limit,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get_beaming_prod_by_id/{hdr_id}")
def get_beaming_prod_by_id(
    hdr_id: int,
    request: Request,
    response: Response,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    """One entry: derived header fields from the view plus its quality lines."""
    try:
        row = db.execute(get_beaming_prod_hdr_query(), {"hdr_id": hdr_id}).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Beaming production entry not found")
        lines = db.execute(get_beaming_prod_lines_query(), {"hdr_id": hdr_id}).fetchall()
        return {"data": {**dict(row._mapping), "lines": [dict(r._mapping) for r in lines]}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/beaming_prod_create")
def beaming_prod_create(
    request: Request,
    response: Response,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    """Create one beaming entry — header + quality lines — in a single commit."""
    try:
        header, lines = _parse_entry(parse_json_body(request))
        _assert_not_duplicate(db, header, None)

        hdr = BeamingProdHdr(**header, active=1)
        db.add(hdr)
        db.flush()  # assigns beaming_hdr_id for the lines
        db.add_all(_build_lines(db, header, hdr.beaming_hdr_id, lines))
        db.commit()
        return {
            "message": "Beaming production entry created successfully",
            "beaming_hdr_id": hdr.beaming_hdr_id,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/beaming_prod_edit/{hdr_id}")
def beaming_prod_edit(
    hdr_id: int,
    request: Request,
    response: Response,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    """Update the header and replace its quality lines in a single commit."""
    try:
        header, lines = _parse_entry(parse_json_body(request))
        existing = _active_header(db, hdr_id)
        _assert_not_duplicate(db, header, hdr_id)

        for k, v in header.items():
            setattr(existing, k, v)
        # ponytail: lines have no identity of their own — replace them wholesale
        db.query(BeamingProduction).filter(
            BeamingProduction.beaming_hdr_id == hdr_id,
        ).delete(synchronize_session=False)
        db.add_all(_build_lines(db, header, hdr_id, lines))
        db.commit()
        return {
            "message": "Beaming production entry updated successfully",
            "beaming_hdr_id": hdr_id,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/beaming_prod_delete/{hdr_id}")
def beaming_prod_delete(
    hdr_id: int,
    request: Request,
    response: Response,
    db: Session = Depends(get_tenant_db),
    token_data: dict = Depends(get_current_user_with_refresh),
):
    """Soft-delete (active = 0) the header and its lines, matching the list filter."""
    try:
        existing = _active_header(db, hdr_id)
        existing.active = 0
        db.query(BeamingProduction).filter(
            BeamingProduction.beaming_hdr_id == hdr_id,
        ).update({"active": 0}, synchronize_session=False)
        db.commit()
        return {"message": "Beaming production entry deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv\Scripts\python.exe -m pytest src/test/test_production_beaming.py -q`
Expected: `16 passed`.

- [ ] **Step 5: Confirm the app still imports**

Run: `.venv\Scripts\python.exe -c "import src.main"`
Expected: exits 0 with no traceback (router registration in `src/main.py` is untouched).

- [ ] **Step 6: Commit (backend repo)**

```
git add src/production/beaming.py src/test/test_production_beaming.py
git commit -m "feat(production): beaming entry API as fortnight header + quality lines"
```

---

### Task 3: Apply the migration on nbcl (controller only)

**Files:** none (executes Task 1's runner).

**Interfaces:**
- Consumes: Tasks 1–2 merged on the backend branch and reviewed.
- Produces: live schema + view on `nbcl` for Task 7.

- [ ] **Step 1: Ask the user for explicit confirmation**

Ask: "Run `run_beaming_prod_hdr.py` against **nbcl** now? It creates `beaming_prod_hdr`, moves the 48 existing lines under 20 headers, drops six columns from `beaming_production` and creates `vw_beaming_prod_hdr`." Do not continue without a yes.

- [ ] **Step 2: Run the migration**

Run (from `e:\test\nbcl\pyhback`): `.venv\Scripts\python.exe dbqueries/migrations/run_beaming_prod_hdr.py --db nbcl`
Expected:
```
headers: 20
lines: 48
SM0001 / C / 2025-11-15: (100017.0, 80.8, 80.8, 4.04, 0.290758, 0.12625, 0.084167)
acceptance numbers match legacy DocEntry 1390
```
If it fails midway, stop and apply the ROLLBACK block from the `.sql` file statement by statement, then report to the user.

---

### Task 4: Formula + fortnight-date helpers (frontend lane)

**Files:**
- Create: `E:\test\nbcl\nxtfront\src\app\dashboardportal\production\beamproduction\beamingTotals.ts`
- Test: `E:\test\nbcl\nxtfront\src\app\dashboardportal\production\beamproduction\beamingTotals.test.ts`

**Interfaces:**
- Produces:
  - `interface BeamingLineInput { prodQty: number; rate: number }`
  - `interface BeamingTotals { effHrs; divHrs; prodQty; prodValue; lhrValue; totalValue; kav; rate1; rate2; rate3 }` (all `number`)
  - `beamingTotals(machHrs: number, lostHrs: number, lines: BeamingLineInput[]): BeamingTotals`
  - `periodLabel(isoDate: string): string` — `"2026-08-31"` → `"AUG/26/02"`, `""` if invalid
  - `isFortnightEnd(isoDate: string): boolean`
  - `fortnightEndFor(isoDate: string): string` — next 15th or month end on/after the date

- [ ] **Step 1: Write the failing test**

Create `beamingTotals.test.ts`:

```ts
import { beamingTotals, fortnightEndFor, isFortnightEnd, periodLabel } from "./beamingTotals";

const SCREENSHOT_LINES = [
  { prodQty: 100000, rate: 0.000757 },
  { prodQty: 17, rate: 0.3 },
];

describe("beamingTotals", () => {
  it("matches the legacy screenshot (PayOProdBmg DocEntry 1448)", () => {
    expect(beamingTotals(96, 0, SCREENSHOT_LINES)).toEqual({
      effHrs: 96,
      divHrs: 288,
      prodQty: 100017,
      prodValue: 80.8,
      lhrValue: 0,
      totalValue: 80.8,
      kav: 4.04,
      rate1: 0.266528,
      rate2: 0.12625,
      rate3: 0.084167,
    });
  });

  it("matches nbcl SM0001 / C / 2025-11-15 (legacy DocEntry 1390) with 88 machine hours", () => {
    const t = beamingTotals(88, 0, SCREENSHOT_LINES);
    expect([t.divHrs, t.kav, t.rate1, t.rate2, t.rate3]).toEqual([264, 4.04, 0.290758, 0.12625, 0.084167]);
  });

  it("values lost hours at the effective-hour rate", () => {
    expect(beamingTotals(56, 8, [{ prodQty: 1, rate: 78.32 }])).toMatchObject({
      effHrs: 48,
      divHrs: 168,
      prodValue: 78.32,
      lhrValue: 13.05,
      totalValue: 91.37,
      kav: 4.568667,
      rate1: 0.516694,
      rate2: 0.142771,
      rate3: 0.095181,
    });
  });

  it("gives zero lost value and zero Rate1 when there are no hours", () => {
    const t = beamingTotals(0, 0, SCREENSHOT_LINES);
    expect([t.lhrValue, t.rate1, t.totalValue]).toEqual([0, 0, 80.8]);
  });
});

describe("fortnight dates", () => {
  it("labels the period like the legacy form", () => {
    expect(periodLabel("2026-08-31")).toBe("AUG/26/02");
    expect(periodLabel("2025-11-15")).toBe("NOV/25/01");
    expect(periodLabel("bad")).toBe("");
  });

  it("accepts only the 15th or the month end", () => {
    expect(["2026-08-15", "2026-08-31", "2028-02-29", "2026-02-28"].map(isFortnightEnd)).toEqual([
      true, true, true, true,
    ]);
    expect(["2026-08-30", "2028-02-28", "2026-13-15", ""].map(isFortnightEnd)).toEqual([
      false, false, false, false,
    ]);
  });

  it("defaults to the fortnight end for a date", () => {
    expect(fortnightEndFor("2026-09-13")).toBe("2026-09-15");
    expect(fortnightEndFor("2026-09-16")).toBe("2026-09-30");
    expect(fortnightEndFor("2028-02-20")).toBe("2028-02-29");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run (from `E:\test\nbcl\nxtfront`): `pnpm exec vitest run --project unit src/app/dashboardportal/production/beamproduction/beamingTotals.test.ts`
Expected: FAIL — `Failed to resolve import "./beamingTotals"`.

- [ ] **Step 3: Implement**

Create `beamingTotals.ts`:

```ts
/**
 * Beaming entry formulas — a live-preview mirror of the database view
 * vw_beaming_prod_hdr (legacy Smart Eye PayOProdBmg). The view stays the
 * source of truth; keep both in step.
 * Spec: docs/superpowers/specs/2026-09-13-beaming-entry-fortnight-design.md
 */

export interface BeamingLineInput {
  prodQty: number;
  rate: number;
}

export interface BeamingTotals {
  effHrs: number;
  divHrs: number;
  prodQty: number;
  prodValue: number;
  lhrValue: number;
  totalValue: number;
  kav: number;
  rate1: number;
  rate2: number;
  rate3: number;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Derived header values; KAV and rates come from the unrounded total. */
export function beamingTotals(machHrs: number, lostHrs: number, lines: BeamingLineInput[]): BeamingTotals {
  const effHrs = machHrs - lostHrs;
  const divHrs = machHrs * 3;
  const prodQty = lines.reduce((sum, l) => sum + l.prodQty, 0);
  const pv = lines.reduce((sum, l) => sum + l.prodQty * l.rate, 0);
  const lhv = effHrs > 0 ? (pv / effHrs) * lostHrs : 0;
  const tv = pv + lhv;
  const kav = tv / 20;
  return {
    effHrs,
    divHrs,
    prodQty,
    prodValue: round(pv, 2),
    lhrValue: round(lhv, 2),
    totalValue: round(tv, 2),
    kav: round(kav, 6),
    rate1: divHrs > 0 ? round((tv - kav) / divHrs, 6) : 0,
    rate2: round(kav / 32, 6),
    rate3: round(kav / 48, 6),
  };
}

/** "2026-08-31" -> "AUG/26/02" (MON/YY/fortnight); "" for an invalid date. */
export function periodLabel(isoDate: string): string {
  const m = ISO_DATE.exec(isoDate);
  const mon = m ? MONTHS[Number(m[2]) - 1] : undefined;
  if (!m || !mon) return "";
  return `${mon}/${m[1].slice(2)}/${Number(m[3]) <= 15 ? "01" : "02"}`;
}

/** True when the ISO date is the 15th or the last day of its month. */
export function isFortnightEnd(isoDate: string): boolean {
  const m = ISO_DATE.exec(isoDate);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  return day === 15 || day === new Date(year, month, 0).getDate();
}

/** The fortnight end (15th or month end) on or after an ISO date. */
export function fortnightEndFor(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const end = day <= 15 ? 15 : new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(end).padStart(2, "0")}`;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm exec vitest run --project unit src/app/dashboardportal/production/beamproduction/beamingTotals.test.ts`
Expected: `7 passed`.

- [ ] **Step 5: Commit (frontend repo)**

```
git add src/app/dashboardportal/production/beamproduction/beamingTotals.ts src/app/dashboardportal/production/beamproduction/beamingTotals.test.ts
git commit -m "feat(beaming): formula and fortnight-date helpers mirroring the legacy screen"
```

---

### Task 5: Types, route constants and list page (frontend lane)

**Files:**
- Modify (full rewrite): `E:\test\nbcl\nxtfront\src\app\dashboardportal\production\beamproduction\types.ts`
- Modify (full rewrite): `E:\test\nbcl\nxtfront\src\app\dashboardportal\production\beamproduction\page.tsx`
- Modify: `E:\test\nbcl\nxtfront\src\utils\api.ts:903-910`

**Interfaces:**
- Consumes: API contract spec §3.
- Produces (used by Task 6): `BeamingHdrRow`, `BeamingLineRecord`, `BeamingEntryRecord`, `Option`, `MachineOption`, `QualityOption`, `BeamingDept`, `BeamingProdSetup`, `BeamingGridLine` from `./types`. `page.tsx` renders `<CreateBeamProductionPage open onClose onSaved editId />` — Task 6 keeps that prop contract.

- [ ] **Step 1: Rewrite `types.ts`**

```ts
/**
 * Types for Beaming Production entries — fortnight header (beaming_prod_hdr)
 * with quality lines (beaming_production); derived values come from the view
 * vw_beaming_prod_hdr. Single type file for the page — do not split
 * (avoids circular deps).
 */

/** A row of GET /production/get_beaming_prod_table (one per header). */
export interface BeamingHdrRow {
  id?: number;
  beaming_hdr_id: number;
  branch_id: number;
  fne_date: string;
  period: string;
  shift: string;
  machine_id: number;
  machine_name: string | null;
  mach_hrs: number;
  lost_hrs: number;
  eff_hrs: number;
  div_hrs: number;
  prod_qty: number;
  line_count: number;
  prod_value: number;
  lhr_value: number;
  total_value: number;
  kav: number;
  rate1: number | null;
  rate2: number;
  rate3: number;
  [key: string]: unknown;
}

/** One quality line of a loaded entry. */
export interface BeamingLineRecord {
  beaming_prod_id: number;
  quality_id: number;
  quality_code: string | null;
  quality_desc: string | null;
  prod_qty: number;
  rate: number;
  amount: number | null;
}

/** GET /production/get_beaming_prod_by_id/{beaming_hdr_id}. */
export interface BeamingEntryRecord extends BeamingHdrRow {
  lines: BeamingLineRecord[];
}

export interface Option {
  label: string;
  value: string;
}

export interface MachineOption extends Option {
  code: string;
  name: string;
}

/** Quality option carries the master rate so the dialog can preview amounts. */
export interface QualityOption extends Option {
  code: string;
  name: string;
  quality_rate: number | null;
}

export interface BeamingDept {
  dept_id: number;
  dept_code: string | null;
  dept_desc: string;
}

/** Body of GET /production/beaming_prod_setup (per branch). */
export interface BeamingProdSetup {
  dept: BeamingDept | null;
  machines: MachineOption[];
  shifts: Option[];
  qualities: QualityOption[];
}

/** One grid line of the entry dialog (numeric input kept as a string). */
export interface BeamingGridLine {
  quality_id: number | "";
  prod_qty: string;
}
```

- [ ] **Step 2: Update route constants in `src/utils/api.ts`**

Replace lines 903–910:

```ts
    // Beaming Production (beaming_production) — rate resolved from the wages quality master
    BEAMING_PROD_SETUP: `${API_URL}/production/beaming_prod_setup`,
    BEAMING_PROD_TABLE: `${API_URL}/production/get_beaming_prod_table`,
    BEAMING_PROD_BY_ID: `${API_URL}/production/get_beaming_prod_by_id`,
    BEAMING_PROD_CREATE: `${API_URL}/production/beaming_prod_create`,
    BEAMING_PROD_EDIT: `${API_URL}/production/beaming_prod_edit`,
    BEAMING_PROD_DELETE: `${API_URL}/production/beaming_prod_delete`,
    BEAMING_PROD_BULK_CREATE: `${API_URL}/production/beaming_prod_bulk_create`,
```

with:

```ts
    // Beaming Production — fortnight header (beaming_prod_hdr) + quality lines (beaming_production)
    BEAMING_PROD_SETUP: `${API_URL}/production/beaming_prod_setup`,
    BEAMING_PROD_TABLE: `${API_URL}/production/get_beaming_prod_table`,
    BEAMING_PROD_BY_ID: `${API_URL}/production/get_beaming_prod_by_id`,
    BEAMING_PROD_CREATE: `${API_URL}/production/beaming_prod_create`,
    BEAMING_PROD_EDIT: `${API_URL}/production/beaming_prod_edit`,
    BEAMING_PROD_DELETE: `${API_URL}/production/beaming_prod_delete`,
```

- [ ] **Step 3: Rewrite `page.tsx`**

```tsx
"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import CreateBeamProductionPage from "./CreateBeamProductionPage";
import type { BeamingHdrRow } from "./types";

/** Fixed-decimal cell formatter; blank for null. */
const fixed = (dp: number) => (value: number | null) => (value != null ? value.toFixed(dp) : "");

/**
 * Beaming Production — fortnight entries per shift + machine, as on the legacy
 * Smart Eye "Prod - Beaming" screen. Each row is one header (beaming_prod_hdr)
 * with its derived Eff/Div HR, Prod Value, L.HR Value, Total, KAV and Rate1-3
 * from vw_beaming_prod_hdr. Scoped by the sidebar company/branch selection.
 */
export default function BeamProductionPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<BeamingHdrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fetchEntries = useCallback(async () => {
    if (coId == null) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        co_id: String(coId),
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
      });
      if (branchId != null) params.append("branch_id", String(branchId));
      if (searchQuery) params.append("search", searchQuery);

      const { data, error } = await fetchWithCookie<{
        data: BeamingHdrRow[];
        total: number;
      }>(`${apiRoutesPortalMasters.BEAMING_PROD_TABLE}?${params}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch beaming production");

      setRows((data.data || []).map((r) => ({ ...r, id: r.beaming_hdr_id })));
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error fetching beaming production",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [coId, branchId, paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const handleCreate = useCallback(() => {
    setSelectedId(undefined);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((row: BeamingHdrRow) => {
    setSelectedId(row.beaming_hdr_id);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedId(undefined);
  }, []);

  const handleSaved = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: "success" });
      void fetchEntries();
    },
    [fetchEntries],
  );

  const columns = useMemo<GridColDef<BeamingHdrRow>[]>(
    () => [
      { field: "fne_date", headerName: "F/N E. DATE", width: 110 },
      { field: "period", headerName: "PERIOD", width: 100 },
      { field: "shift", headerName: "SHIFT", width: 70 },
      { field: "machine_name", headerName: "MACHINE", width: 100 },
      { field: "mach_hrs", headerName: "MACH HR", type: "number", width: 85 },
      { field: "lost_hrs", headerName: "LOST HR", type: "number", width: 85 },
      { field: "eff_hrs", headerName: "EFF HR", type: "number", width: 80 },
      { field: "div_hrs", headerName: "DIV HR", type: "number", width: 80 },
      { field: "prod_qty", headerName: "PROD", type: "number", width: 100 },
      { field: "prod_value", headerName: "PROD VALUE", type: "number", width: 110, valueFormatter: fixed(2) },
      { field: "lhr_value", headerName: "L.HR VALUE", type: "number", width: 105, valueFormatter: fixed(2) },
      { field: "total_value", headerName: "TOTAL", type: "number", width: 95, valueFormatter: fixed(2) },
      { field: "kav", headerName: "KAV", type: "number", width: 100, valueFormatter: fixed(6) },
      { field: "rate1", headerName: "RATE1", type: "number", width: 100, valueFormatter: fixed(6) },
      { field: "rate2", headerName: "RATE2", type: "number", width: 100, valueFormatter: fixed(6) },
      { field: "rate3", headerName: "RATE3", type: "number", width: 100, valueFormatter: fixed(6) },
    ],
    [],
  );

  return (
    <IndexWrapper
      title="Beaming Production"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setSearchQuery(e.target.value);
          setPaginationModel((prev) => ({ ...prev, page: 0 }));
        },
        placeholder: "Search by machine, shift or period",
        debounceDelayMs: 500,
      }}
      createAction={{ label: "Create Entry", onClick: handleCreate }}
      onEdit={handleEdit}
    >
      <CreateBeamProductionPage
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={handleSaved}
        editId={selectedId}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
```

- [ ] **Step 4: Confirm the bulk constant is gone everywhere**

Run: `pnpm exec rg -n "BEAMING_PROD_BULK_CREATE" src` (or the Grep tool)
Expected: no matches.

- [ ] **Step 5: Commit** — after Task 6 (the dialog still imports the old types until then; commit Tasks 5 and 6 together in Task 6 Step 5).

---

### Task 6: Legacy-layout entry dialog (frontend lane)

**Files:**
- Modify (full rewrite): `E:\test\nbcl\nxtfront\src\app\dashboardportal\production\beamproduction\CreateBeamProductionPage.tsx`

**Interfaces:**
- Consumes: `beamingTotals`, `fortnightEndFor`, `isFortnightEnd`, `periodLabel` (Task 4); types from Task 5; `entryGridCellColorsSx`, `fullScreenBesideSidebar`, `handleGridEnterKey` from `@/components/ui/entryGrid`; `todayIso` from `@/components/reports/reportDates`.
- Produces: default export `CreateBeamProductionPage({ open, onClose, onSaved?, editId? })`.

- [ ] **Step 1: Rewrite the dialog**

```tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  createFilterOptions,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Trash2 as DeleteIcon, X } from "lucide-react";
import { z } from "zod";
import { entryGridCellColorsSx, fullScreenBesideSidebar, handleGridEnterKey } from "@/components/ui/entryGrid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayIso } from "@/components/reports/reportDates";
import { beamingTotals, fortnightEndFor, isFortnightEnd, periodLabel } from "./beamingTotals";
import type {
  BeamingEntryRecord,
  BeamingGridLine,
  BeamingProdSetup,
  MachineOption,
  Option,
  QualityOption,
} from "./types";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];
const EMPTY_MACHINES: MachineOption[] = Object.freeze([]) as unknown as MachineOption[];
const EMPTY_QUALITIES: QualityOption[] = Object.freeze([]) as unknown as QualityOption[];
const EMPTY_SETUP: BeamingProdSetup = Object.freeze({
  dept: null,
  machines: EMPTY_MACHINES,
  shifts: EMPTY_OPTIONS,
  qualities: EMPTY_QUALITIES,
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
}

const blankLine = (): BeamingGridLine => ({ quality_id: "", prod_qty: "" });

const isLineBlank = (l: BeamingGridLine): boolean => l.quality_id === "" && l.prod_qty.trim() === "";

/** Keyed number or NaN when empty, so Zod reports it as missing. */
const toNum = (s: string): number => (s.trim() === "" ? Number.NaN : Number(s));

const fmt = (n: number, dp: number): string => (Number.isFinite(n) ? n.toFixed(dp) : "");

const machineFilter = createFilterOptions<MachineOption>({ stringify: (o) => `${o.code} ${o.name}` });
const qualityFilter = createFilterOptions<QualityOption>({ stringify: (o) => o.label });

// Shared spreadsheet-cell styling — full grid lines and tight padding.
const cellSx = { border: "1px solid", borderColor: "divider", py: 0.5, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover" } as const;

/** Payload rules mirrored from the API (spec §3) — checked before submit. */
const entrySchema = z
  .object({
    branch_id: z.number({ error: "Select a branch in the sidebar" }).int(),
    fne_date: z.string().refine(isFortnightEnd, "F/N E. Date must be the 15th or the last day of the month"),
    shift: z.string().trim().min(1, "Select the W. Shift"),
    machine_id: z.number({ error: "Select the machine" }).int(),
    mach_hrs: z.number({ error: "Enter Mach. HR" }).positive("Mach. HR must be greater than 0"),
    lost_hrs: z.number({ error: "Lost HR must be a number" }).min(0, "Lost HR must be zero or more"),
    lines: z
      .array(
        z.object({
          quality_id: z.number({ error: "Select the Q. Code on every line" }).int(),
          prod_qty: z.number({ error: "Enter Prod_KG on every line" }).positive("Prod_KG must be greater than 0"),
        }),
      )
      .min(1, "Enter at least one quality line"),
  })
  .refine((e) => e.lost_hrs <= e.mach_hrs, { message: "Lost HR cannot exceed Mach. HR", path: ["lost_hrs"] })
  .refine((e) => new Set(e.lines.map((l) => l.quality_id)).size === e.lines.length, {
    message: "A quality code is entered twice",
    path: ["lines"],
  });

type EntryPayload = z.infer<typeof entrySchema>;

interface ReadOnlyFieldProps {
  label: string;
  value: string;
  numeric?: boolean;
}

/** Derived/display-only field; skipped by Enter navigation (readOnly). */
function ReadOnlyField({ label, value, numeric = false }: ReadOnlyFieldProps) {
  return (
    <TextField
      size="small"
      label={label}
      value={value}
      slotProps={{
        input: { readOnly: true },
        htmlInput: { tabIndex: -1, style: numeric ? { textAlign: "right" } : undefined },
        inputLabel: { shrink: true },
      }}
    />
  );
}

interface HoursFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function HoursField({ label, value, onChange }: HoursFieldProps) {
  return (
    <TextField
      type="number"
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{
        htmlInput: { step: "any", min: 0, style: { textAlign: "right" } },
        inputLabel: { shrink: true },
      }}
    />
  );
}

/**
 * "Prod - Beaming" entry dialog, laid out like the legacy Smart Eye screen:
 * company/location/F/N date/shift/department on top, machine + hours and the
 * derived Eff/Div HR, values, KAV and Rate1-3 on the left, and the quality
 * grid (SlNo, Q. Code, Q. Name, Prod_KG, Rate, Amt) on the right with a
 * trailing blank row. Derived values are previewed with beamingTotals(); the
 * server resolves rates and vw_beaming_prod_hdr is the source of truth.
 */
export default function CreateBeamProductionPage({ open, onClose, onSaved, editId }: Props) {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;
  const branchName = selectedCompany?.branches.find((b) => b.branch_id === branchId)?.branch_name ?? "";
  const isEdit = editId !== undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [setup, setSetup] = useState<BeamingProdSetup>(EMPTY_SETUP);
  const [loaded, setLoaded] = useState<BeamingEntryRecord | null>(null);

  const [fneDate, setFneDate] = useState("");
  const [shift, setShift] = useState("");
  const [machineId, setMachineId] = useState<number | "">("");
  const [machHrs, setMachHrs] = useState("");
  const [lostHrs, setLostHrs] = useState("");
  const [lines, setLines] = useState<BeamingGridLine[]>(() => [blankLine()]);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  const notifyError = useCallback((message: string) => setSnackbar({ open: true, message }), []);

  /** Load a saved entry into the form, or reset to a blank one (Cancel uses this too). */
  const applyRecord = useCallback((rec: BeamingEntryRecord | null) => {
    setFneDate(rec ? rec.fne_date.slice(0, 10) : fortnightEndFor(todayIso()));
    setShift(rec?.shift ?? "");
    setMachineId(rec?.machine_id ?? "");
    setMachHrs(rec ? String(rec.mach_hrs) : "");
    setLostHrs(rec ? String(rec.lost_hrs) : "");
    setLines([
      ...(rec?.lines ?? []).map((l) => ({ quality_id: l.quality_id, prod_qty: String(l.prod_qty) })),
      blankLine(),
    ]);
  }, []);

  // Branch-scoped dropdowns, refreshed whenever the dialog opens.
  useEffect(() => {
    if (!open || coId == null) return;
    if (branchId == null) {
      notifyError("Select a branch in the sidebar");
      return;
    }
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ co_id: String(coId), branch_id: String(branchId) });
      const { data, error } = await fetchWithCookie<{ data: BeamingProdSetup }>(
        `${apiRoutesPortalMasters.BEAMING_PROD_SETUP}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data?.data) {
        notifyError(error || "Failed to load dropdown options");
        return;
      }
      setSetup(data.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coId, branchId, notifyError]);

  // Blank form for create; header + lines for edit.
  useEffect(() => {
    if (!open) return;
    if (editId === undefined) {
      setLoaded(null);
      applyRecord(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await fetchWithCookie<{ data: BeamingEntryRecord }>(
        `${apiRoutesPortalMasters.BEAMING_PROD_BY_ID}/${editId}`,
        "GET",
      );
      setLoading(false);
      if (cancelled) return;
      if (error || !data?.data) {
        notifyError(error || "Failed to load beaming entry");
        return;
      }
      setLoaded(data.data);
      applyRecord(data.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editId, applyRecord, notifyError]);

  const machineById = useMemo(
    () => new Map(setup.machines.map((o) => [Number(o.value), o])),
    [setup.machines],
  );
  const qualityById = useMemo(
    () => new Map(setup.qualities.map((o) => [Number(o.value), o])),
    [setup.qualities],
  );

  const setLine = useCallback((index: number, patch: Partial<BeamingGridLine>) => {
    setLines((prev) => {
      const next = prev.map((l, i) => (i === index ? { ...l, ...patch } : l));
      // Always keep one trailing blank row, like the legacy "*" row.
      if (!isLineBlank(next[next.length - 1])) next.push(blankLine());
      return next;
    });
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 && isLineBlank(next[next.length - 1]) ? next : [...next, blankLine()];
    });
  }, []);

  const filledLines = useMemo(() => lines.filter((l) => !isLineBlank(l)), [lines]);

  const totals = useMemo(
    () =>
      beamingTotals(
        Number(machHrs) || 0,
        Number(lostHrs) || 0,
        filledLines.map((l) => ({
          prodQty: Number(l.prod_qty) || 0,
          rate: (l.quality_id === "" ? null : qualityById.get(l.quality_id)?.quality_rate) ?? 0,
        })),
      ),
    [machHrs, lostHrs, filledLines, qualityById],
  );

  const parsed = useMemo(
    () =>
      entrySchema.safeParse({
        branch_id: branchId ?? Number.NaN,
        fne_date: fneDate,
        shift,
        machine_id: machineId === "" ? Number.NaN : machineId,
        mach_hrs: toNum(machHrs),
        lost_hrs: lostHrs.trim() === "" ? 0 : Number(lostHrs),
        lines: filledLines.map((l) => ({
          quality_id: l.quality_id === "" ? Number.NaN : l.quality_id,
          prod_qty: toNum(l.prod_qty),
        })),
      }),
    [branchId, fneDate, shift, machineId, machHrs, lostHrs, filledLines],
  );
  const firstIssue = parsed.success ? null : (parsed.error.issues[0]?.message ?? "Invalid entry");
  const touched = machineId !== "" || filledLines.length > 0 || machHrs.trim() !== "";
  const fneDateInvalid = fneDate !== "" && !isFortnightEnd(fneDate);

  const handleSave = async () => {
    if (!parsed.success) {
      notifyError(firstIssue ?? "Invalid entry");
      return;
    }
    const body: EntryPayload = parsed.data;
    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await fetchWithCookie(`${apiRoutesPortalMasters.BEAMING_PROD_EDIT}/${editId}`, "PUT", body);
        if (error) throw new Error(error);
        onSaved?.("Beaming entry updated");
        onClose();
      } else {
        const { error } = await fetchWithCookie<{ beaming_hdr_id: number }>(
          apiRoutesPortalMasters.BEAMING_PROD_CREATE,
          "POST",
          body,
        );
        if (error) throw new Error(error);
        onSaved?.("Beaming entry saved");
        // Next machine for the same fortnight and shift, like the legacy form.
        setMachineId("");
        setMachHrs("");
        setLostHrs("");
        setLines([blankLine()]);
      }
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !window.confirm("Delete this beaming entry?")) return;
    setSaving(true);
    try {
      const { error } = await fetchWithCookie(`${apiRoutesPortalMasters.BEAMING_PROD_DELETE}/${editId}`, "DELETE");
      if (error) throw new Error(error);
      onSaved?.("Beaming entry deleted");
      onClose();
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const dept = setup.dept;
  const machine = machineId === "" ? null : (machineById.get(machineId) ?? null);

  return (
    <>
      <Dialog open={open} onClose={onClose} {...fullScreenBesideSidebar}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" component="span">
            {isEdit ? "Prod - Beaming (Edit)" : "Prod - Beaming"}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              onKeyDown={handleGridEnterKey}
              sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2, ...entryGridCellColorsSx }}
            >
              {/* Header: company, location, fortnight, shift, department */}
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "2fr 1fr 1fr 1fr" },
                }}
              >
                <ReadOnlyField label="Company" value={selectedCompany?.co_name ?? ""} />
                <TextField
                  type="date"
                  size="small"
                  label="F/N E. Date"
                  value={fneDate}
                  onChange={(e) => setFneDate(e.target.value)}
                  error={fneDateInvalid}
                  helperText={fneDateInvalid ? "Must be the 15th or the month end" : undefined}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                />
                <ReadOnlyField label="Period" value={periodLabel(fneDate)} />
                <TextField
                  select
                  size="small"
                  label="W. Shift"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  required
                >
                  {setup.shifts.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
                <ReadOnlyField label="Location" value={branchName} />
                <ReadOnlyField
                  label="Department"
                  value={dept ? `${dept.dept_desc}${dept.dept_code ? ` / ${dept.dept_code}` : ""}` : ""}
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", md: "minmax(300px, 400px) 1fr" },
                  alignItems: "start",
                }}
              >
                {/* Left: machine, hours and derived values (legacy two-column block) */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                    <Autocomplete
                      autoHighlight
                      options={setup.machines}
                      filterOptions={machineFilter}
                      getOptionLabel={(o) => o.code}
                      value={machine}
                      onChange={(_, v) => setMachineId(v ? Number(v.value) : "")}
                      isOptionEqualToValue={(o, v) => o.value === v.value}
                      size="small"
                      renderInput={(params) => <TextField {...params} label="Machine" required />}
                    />
                    <ReadOnlyField label="Machine Name" value={machine?.name ?? ""} />
                    <HoursField label="Mach. HR" value={machHrs} onChange={setMachHrs} />
                    <ReadOnlyField label="Div. HR" value={fmt(totals.divHrs, 2)} numeric />
                    <HoursField label="Lost HR" value={lostHrs} onChange={setLostHrs} />
                    <ReadOnlyField label="Prod." value={fmt(totals.prodQty, 2)} numeric />
                    <ReadOnlyField label="Eff. HR" value={fmt(totals.effHrs, 2)} numeric />
                    <ReadOnlyField label="Prod. Value" value={fmt(totals.prodValue, 2)} numeric />
                    <ReadOnlyField label="L.HR Value" value={fmt(totals.lhrValue, 2)} numeric />
                    <ReadOnlyField label="Total Value" value={fmt(totals.totalValue, 2)} numeric />
                    <ReadOnlyField label="KAV" value={fmt(totals.kav, 6)} numeric />
                    <span />
                    <span />
                    <ReadOnlyField label="Rate1" value={fmt(totals.rate1, 6)} numeric />
                    <span />
                    <ReadOnlyField label="Rate2" value={fmt(totals.rate2, 6)} numeric />
                    <span />
                    <ReadOnlyField label="Rate3" value={fmt(totals.rate3, 6)} numeric />
                  </Box>
                </Box>

                {/* Right: quality lines */}
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table
                    size="small"
                    sx={{ minWidth: 640, borderCollapse: "collapse", "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCellSx, width: 52 }}>SlNo</TableCell>
                        <TableCell sx={{ ...headCellSx, minWidth: 130 }}>Q. Code</TableCell>
                        <TableCell sx={{ ...headCellSx, minWidth: 200 }}>Q. Name</TableCell>
                        <TableCell align="right" sx={{ ...headCellSx, minWidth: 110 }}>
                          Prod_KG
                        </TableCell>
                        <TableCell align="right" sx={{ ...headCellSx, minWidth: 90 }}>
                          Rate
                        </TableCell>
                        <TableCell align="right" sx={{ ...headCellSx, minWidth: 90 }}>
                          Amt
                        </TableCell>
                        <TableCell sx={{ ...headCellSx, width: 44 }} aria-label="Remove line" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lines.map((l, i) => {
                        const q = l.quality_id === "" ? null : (qualityById.get(l.quality_id) ?? null);
                        const qty = Number(l.prod_qty);
                        const amt =
                          q?.quality_rate != null && l.prod_qty.trim() !== "" && Number.isFinite(qty)
                            ? qty * q.quality_rate
                            : null;
                        const trailing = i === lines.length - 1 && isLineBlank(l);
                        return (
                          <TableRow key={`beam-line-${i}`}>
                            <TableCell sx={cellSx}>{trailing ? "*" : i + 1}</TableCell>
                            <TableCell sx={cellSx}>
                              <Autocomplete
                                autoHighlight
                                options={setup.qualities}
                                filterOptions={qualityFilter}
                                getOptionLabel={(o) => o.code}
                                renderOption={(props, o) => {
                                  const { key, ...rest } = props;
                                  return (
                                    <li key={key} {...rest}>
                                      {o.label}
                                    </li>
                                  );
                                }}
                                value={q}
                                onChange={(_, v) => setLine(i, { quality_id: v ? Number(v.value) : "" })}
                                isOptionEqualToValue={(o, v) => o.value === v.value}
                                size="small"
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    variant="standard"
                                    placeholder="Q. Code"
                                    InputProps={{ ...params.InputProps, disableUnderline: true }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell sx={cellSx}>{q?.name ?? ""}</TableCell>
                            <TableCell align="right" sx={cellSx}>
                              <TextField
                                type="number"
                                size="small"
                                variant="standard"
                                value={l.prod_qty}
                                onChange={(e) => setLine(i, { prod_qty: e.target.value })}
                                InputProps={{ disableUnderline: true }}
                                inputProps={{
                                  step: "any",
                                  min: 0,
                                  "aria-label": `Line ${i + 1} Prod_KG`,
                                  style: { textAlign: "right" },
                                }}
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={cellSx}>
                              {q?.quality_rate != null ? q.quality_rate.toFixed(6) : ""}
                            </TableCell>
                            <TableCell align="right" sx={cellSx}>
                              {amt != null ? amt.toFixed(2) : ""}
                            </TableCell>
                            <TableCell align="center" sx={cellSx}>
                              {!trailing && (
                                <Tooltip title="Remove line">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeLine(i)}
                                    aria-label={`Remove line ${i + 1}`}
                                  >
                                    <DeleteIcon size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {touched && firstIssue && <Alert severity="info">{firstIssue}</Alert>}

              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button variant="contained" onClick={handleSave} disabled={!parsed.success || saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button onClick={() => applyRecord(loaded)} disabled={saving}>
                    Cancel
                  </Button>
                  {isEdit && (
                    <Button color="error" onClick={handleDelete} disabled={saving}>
                      Delete
                    </Button>
                  )}
                </Box>
                <Button variant="outlined" onClick={onClose}>
                  Close
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
```

- [ ] **Step 2: Type-check the page folder**

Run (from `E:\test\nbcl\nxtfront`): `npx tsc --noEmit 2>&1 | Select-String "beamproduction|utils/api.ts"`
Expected: no output (pre-existing errors elsewhere in the repo are out of scope). If MUI's `renderOption` props type rejects destructuring `key`, change that line to `const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: React.Key };`.

- [ ] **Step 3: Lint the page folder**

Run: `pnpm exec eslint src/app/dashboardportal/production/beamproduction src/utils/api.ts`
Expected: no errors.

- [ ] **Step 4: Re-run the unit test**

Run: `pnpm exec vitest run --project unit src/app/dashboardportal/production/beamproduction`
Expected: `7 passed`.

- [ ] **Step 5: Commit Tasks 5 + 6 (frontend repo)**

```
git add src/app/dashboardportal/production/beamproduction/types.ts src/app/dashboardportal/production/beamproduction/page.tsx src/app/dashboardportal/production/beamproduction/CreateBeamProductionPage.tsx src/utils/api.ts
git commit -m "feat(beaming): legacy Prod-Beaming entry dialog and fortnight list page"
```

---

### Task 7: End-to-end verification (controller)

**Files:** none unless a bug is found (fix it in the owning task's file, re-run that task's checks, commit separately).

- [ ] **Step 1: Automated checks**

Run backend `.venv\Scripts\python.exe -m pytest src/test/test_production_beaming.py -q` → `16 passed`.
Run frontend `pnpm exec vitest run --project unit src/app/dashboardportal/production/beamproduction` → `7 passed`.

- [ ] **Step 2: Servers**

Backend on :8001 and frontend on :3001 (this workspace; the `D:\vownextjs` copy uses :3000/:8000). Confirm with `Invoke-WebRequest http://localhost:8001/docs -UseBasicParsing` (200) and `http://localhost:3001` (200); restart the backend if it was running before Task 2 without reload.

- [ ] **Step 3: Browser QA on branch 87 (Playwright/Chrome DevTools)**

Open Beaming Production and check:
1. List shows 20 entries; SM0001 / C / 2025-11-15 row reads KAV 4.040000, Rate1 0.290758, Rate2 0.126250, Rate3 0.084167.
2. Create: F/N E. Date 2026-08-31 → Period `AUG/26/02`; shift C; machine SM0001; Mach. HR 96; lines 0035 × 100000 and 0015 × 17 → left panel shows Div. HR 288.00, Prod. 100017.00, Prod. Value 80.80, Eff. HR 96.00, L.HR Value 0.00, Total Value 80.80, KAV 4.040000, Rate1 0.266528, Rate2 0.126250, Rate3 0.084167; grid shows Amt 75.70 and 5.10. Save → success, form clears machine/hours/lines and keeps date + shift.
3. Negative cases: F/N date 2026-08-30 (Save disabled, date field red); Lost HR 100 with Mach 96 (message "Lost HR cannot exceed Mach. HR"); same Q. Code twice ("A quality code is entered twice"); save SM0001 / C / 2026-08-31 again (server message "This machine already has an entry for this F/N date and shift — edit it instead").
4. Edit the new entry: change Lost HR to 8 → Eff. HR 88.00, L.HR Value 7.35, Total Value 88.15, KAV 4.407273, Rate1 0.290758, Rate2 0.137727, Rate3 0.091818; Save; reopen and confirm the values persisted (list row shows the same numbers from the view).
5. Delete it from the edit dialog → row disappears from the list.

- [ ] **Step 4: DB spot check**

`SELECT COUNT(*) FROM beaming_prod_hdr WHERE active = 1` → 20 after the delete in step 3.5; `SELECT * FROM vw_beaming_prod_hdr WHERE active = 0 ORDER BY beaming_hdr_id DESC LIMIT 1` shows the deleted test entry.

- [ ] **Step 5: Report**

Summarise to the user: commits on both `feat/beaming-entry-fortnight` branches, test results, QA results, and anything left open.
