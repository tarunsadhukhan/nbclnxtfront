# Beaming Entry — Fortnight Header/Lines (legacy "Prod - Beaming" parity)

**Date:** 2026-09-13 · **Tenant DB:** `nbcl` · **Page:** `dashboardportal/production/beamproduction`
**Backend:** `pyhback/src/production/beaming.py` (router prefix `/api/production`, unchanged)
**Out of scope:** `dashboardportal/juteProduction/beaming` (separate engineering module), payroll consumption of Rate1–3, menu rows.

## 1. Source of truth

Legacy Smart Eye payroll, SQL Server DB `Smart_Eye_Jute_Northbrook_Live`:
`PayOProdBmg` (header, 1460 rows) + `PayProdBmg1` (lines). The screenshot is `PayOProdBmg.DocEntry = 1448`
(NJB, FNE 2026-08-31, shift C, SM0001).

One document = **fortnight-end date × shift × machine**. Lines = quality code, prod qty, rate, amount.
Period label `AUG/26/02` = `MON/YY/FN` where FN = `01` (1st–15th) or `02` (16th–month end); F/N E. Date is the
15th or the last day of the month.

### Formulas (verified on 1353/1355 legacy headers with lost hours; misses are legacy typos)

| Field | Formula |
|---|---|
| Eff HR | `mach_hrs − lost_hrs` |
| Div HR | `mach_hrs × 3` |
| Prod | `Σ line prod_qty` |
| Prod Value (`pv`) | `Σ line rate × prod_qty` (unrounded for downstream math) |
| L.HR Value (`lhv`) | `pv ÷ eff_hrs × lost_hrs`; `0` when `eff_hrs = 0` |
| Total Value (`tv`) | `pv + lhv` |
| KAV | `tv ÷ 20` |
| Rate1 | `(tv − KAV) ÷ div_hrs` (= `tv × 19/20 ÷ div_hrs`) |
| Rate2 | `KAV ÷ 32` |
| Rate3 | `KAV ÷ 48` |

Display rounding: Prod Value / L.HR Value / Total Value → 2 dp; KAV / Rate1–3 → 6 dp, always computed from the
**unrounded** `tv` (legacy KAV = 0.01505 for pv 0.301 displayed as 0.30).
Payroll (legacy `SP_WagesProcessing_GetOthAmt`): Beamer Sirdar (0701) = R1+R2, Head Beamer (0703) = R1+R3,
Beamer (0702) = R1 — informational only, not built here.

**Acceptance numbers**
- Screenshot (Mach 96, Lost 0, lines 0035×100000@0.000757, 0015×17@0.3): Div 288, Eff 96, Prod 100017,
  Prod Value 80.80, L.HR 0.00, Total 80.80, KAV 4.040000, Rate1 0.266528, Rate2 0.126250, Rate3 0.084167.
- nbcl existing data SM0001 / C / 2025-11-15 (Mach 88, same lines) = legacy DocEntry 1390:
  KAV 4.040000, Rate1 0.290758, Rate2 0.126250, Rate3 0.084167.

## 2. Database (nbcl) — `pyhback/dbqueries/migrations/beaming_prod_hdr.sql`

Pre-check done 2026-09-13: 48 active rows → 20 (branch, date, shift, machine) groups, every group has exactly one
non-null `wk_hrs` and no conflicting `lost_hrs`. MySQL 8.0.46.

```sql
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
```

`beaming_production` becomes the lines table:
1. `ADD beaming_hdr_id INT NULL`.
2. Backfill headers: `INSERT … SELECT branch_id, prod_date, shift, machine_id, MAX(wk_hrs), COALESCE(MAX(lost_hrs),0)
   … GROUP BY branch_id, prod_date, shift, machine_id`; set each line's `beaming_hdr_id` by joining on those four.
3. `MODIFY beaming_hdr_id INT NOT NULL`, `ADD KEY idx_beaming_prod_hdr (beaming_hdr_id)`.
4. `DROP COLUMN divisible_hrs, wk_hrs, lost_hrs, prod_date, shift, machine_id` (generated column first).
   Kept: `beaming_prod_id, branch_id, quality_id, prod_qty, rate, amount (generated), remarks, active`.

View (derived table so aliases can be reused; MySQL cannot reference a SELECT alias in the same SELECT):

```sql
CREATE OR REPLACE VIEW vw_beaming_prod_hdr AS
SELECT v.beaming_hdr_id, v.branch_id, v.fne_date,
       CONCAT(UPPER(DATE_FORMAT(v.fne_date, '%b')), '/', DATE_FORMAT(v.fne_date, '%y'), '/',
              IF(DAY(v.fne_date) <= 15, '01', '02')) AS period,
       v.shift, v.machine_id, v.mach_hrs, v.lost_hrs, v.eff_hrs, v.div_hrs, v.active,
       v.prod_qty, v.line_count,
       ROUND(v.pv, 2)                                        AS prod_value,
       ROUND(v.lhv, 2)                                       AS lhr_value,
       ROUND(v.pv + v.lhv, 2)                                AS total_value,
       ROUND((v.pv + v.lhv) / 20, 6)                         AS kav,
       ROUND((v.pv + v.lhv) * 19 / 20 / NULLIF(v.div_hrs, 0), 6) AS rate1,
       ROUND((v.pv + v.lhv) / 20 / 32, 6)                    AS rate2,
       ROUND((v.pv + v.lhv) / 20 / 48, 6)                    AS rate3
FROM (
    SELECT h.*, COALESCE(t.prod_qty, 0) AS prod_qty, COALESCE(t.line_count, 0) AS line_count,
           COALESCE(t.pv, 0) AS pv,
           COALESCE(COALESCE(t.pv, 0) / NULLIF(h.eff_hrs, 0) * h.lost_hrs, 0) AS lhv
    FROM beaming_prod_hdr h
    LEFT JOIN (
        SELECT beaming_hdr_id, SUM(prod_qty) AS prod_qty, COUNT(*) AS line_count,
               SUM(rate * prod_qty) AS pv
        FROM beaming_production WHERE active = 1 GROUP BY beaming_hdr_id
    ) t ON t.beaming_hdr_id = h.beaming_hdr_id
) v;
```

Rollback (commented block in the same file): re-add `prod_date, shift, machine_id, wk_hrs, lost_hrs` to lines,
back-fill from the header (hours only onto the lowest `beaming_prod_id` per header), re-add
`divisible_hrs GENERATED (wk_hrs * 3)`, restore the two old indexes, `DROP VIEW vw_beaming_prod_hdr`,
drop `beaming_hdr_id`, `DROP TABLE beaming_prod_hdr`.

ORM (`src/models/hrms.py`): add `BeamingProdHdr` (Computed `eff_hrs`, `div_hrs`); `BeamingProduction` loses the six
columns and gains `beaming_hdr_id`.

## 3. Backend API contract (`/api/production`)

All endpoints keep `Depends(get_tenant_db)` + `Depends(get_current_user_with_refresh)` and the raw-`Request`
parsing style of the sibling production modules.

### GET `/beaming_prod_setup?co_id=&branch_id=` (branch_id required)
```json
{"data": {
  "dept": {"dept_id": 15139, "dept_code": "07", "dept_desc": "BEAMING"},
  "machines": [{"value": "3894", "label": "SM0001", "code": "SM0001", "name": "SM0001"}],
  "shifts": [{"value": "C", "label": "C"}],
  "qualities": [{"value": "19", "label": "0035 - Katta (YDS)", "code": "0035", "name": "Katta (YDS)", "quality_rate": 0.000757}]
}}
```
Machines and qualities are restricted to the BEAMING `dept_mst` row **of that branch** (`d.branch_id = :branch_id`).
`dept` is `null` if the branch has no BEAMING department.

### GET `/get_beaming_prod_table?co_id=&branch_id=&search=&from_date=&to_date=&page=&limit=`
Rows from `vw_beaming_prod_hdr` joined to `branch_mst` (co filter) and `machine_mst`, `active = 1`,
ordered `fne_date DESC, shift, machine_name`. Search matches machine name, shift or period.
```json
{"data": [{"beaming_hdr_id": 12, "branch_id": 87, "fne_date": "2025-11-15", "period": "NOV/25/01",
  "shift": "C", "machine_id": 3894, "machine_name": "SM0001", "mach_hrs": 88, "lost_hrs": 0, "eff_hrs": 88,
  "div_hrs": 264, "prod_qty": 100017, "line_count": 2, "prod_value": 80.8, "lhr_value": 0, "total_value": 80.8,
  "kav": 4.04, "rate1": 0.290758, "rate2": 0.12625, "rate3": 0.084167}],
 "total": 20, "page": 1, "limit": 10}
```

### GET `/get_beaming_prod_by_id/{beaming_hdr_id}`
`{"data": {…same header fields as a table row…, "lines": [{"beaming_prod_id", "quality_id", "quality_code",
"quality_desc", "prod_qty", "rate", "amount"}]}}` — lines ordered by `beaming_prod_id`; 404 if missing/inactive.

### POST `/beaming_prod_create` · PUT `/beaming_prod_edit/{beaming_hdr_id}`
```json
{"branch_id": 87, "fne_date": "2026-08-31", "shift": "C", "machine_id": 3894,
 "mach_hrs": 96, "lost_hrs": 0,
 "lines": [{"quality_id": 19, "prod_qty": 100000}, {"quality_id": 4, "prod_qty": 17}]}
```
Create → `{"message", "beaming_hdr_id"}`. Edit → `{"message", "beaming_hdr_id"}`; edit updates the header and
replaces its lines (old lines hard-deleted, new ones inserted) in one transaction.

Validation (400 with a readable `detail`; line errors prefixed `Line N: `):
- `branch_id`, `machine_id` integers; `shift` non-empty → `strip().upper()[:5]`.
- `fne_date` ISO date whose day is 15 or the month's last day → else `"F/N E. Date must be the 15th or the last day of the month"`.
- `mach_hrs` > 0; `lost_hrs` ≥ 0 (default 0) and ≤ `mach_hrs`.
- `lines` non-empty list; each `quality_id` integer, `prod_qty` > 0; no `quality_id` twice → `"Line N: duplicate quality in this entry"`.
- Every quality must exist (active) — rate snapshotted server-side, never read from the body.
- Duplicate guard: no other active header with the same `branch_id, fne_date, shift, machine_id` →
  `"This machine already has an entry for this F/N date and shift — edit it instead"`.

### DELETE `/beaming_prod_delete/{beaming_hdr_id}`
Soft delete: header `active = 0` and its lines `active = 0`.

The former `beaming_prod_bulk_create` endpoint is removed (merged into create).

## 4. Frontend (`src/app/dashboardportal/production/beamproduction/`)

Files: `page.tsx` (list), `CreateBeamProductionPage.tsx` (dialog), `types.ts`, new `beamingTotals.ts`
(pure formula mirror for the live preview) + `beamingTotals.test.ts` (Vitest, acceptance numbers above).
`src/utils/api.ts`: remove `BEAMING_PROD_BULK_CREATE`; other constants unchanged.

### Entry dialog (full screen beside sidebar, reuses `entryGrid` helpers)
- **Header row:** Company (`selectedCompany.co_name`, read-only) · Location (selected branch `branch_name`,
  read-only) · F/N E. Date (`type="date"`, inline error unless 15th/month-end) · Period (read-only label derived
  from the date) · W. Shift (select from setup) · Department (`dept_desc` + `dept_code`, read-only).
- **Left panel:** Machine (Autocomplete on machines; shows code and name side by side) · Mach. HR (input) ·
  Lost HR (input) · read-only: Eff. HR, L.HR Value, KAV, Div. HR, Prod., Prod. Value, Total Value, Rate1, Rate2,
  Rate3 — computed live by `beamingTotals()`; server/view remains the source of truth.
- **Right grid:** SlNo · Q. Code (Autocomplete showing `code - name`) · Q. Name (read-only) · Prod_KG (input) ·
  Rate (read-only, 6 dp) · Amt (read-only, 2 dp). A trailing blank row is auto-added when the last row is
  complete; rows can be removed; blank rows are ignored on save.
- **Footer:** Save (disabled until valid) · Cancel (reset to the loaded/blank state) · Delete (edit mode only,
  with confirm — `IndexWrapper` has no row delete action) · Close. After a successful create the form keeps
  F/N E. Date + shift and clears machine, hours and lines for the next machine.
- Form payload validated with a Zod schema mirroring §3 before submit; server errors shown in the snackbar.
- Create mode: F/N E. Date defaults to the current fortnight end. Edit mode loads header + lines via by-id.
- Company/branch come from `SidebarContext`; `branch_id` = first selected branch (existing behaviour).

### List page
IndexWrapper columns: F/N E. Date · Period · Shift · Machine · Mach HR · Lost HR · Eff HR · Div HR · Prod ·
Prod Value · L.HR Value · Total · KAV · Rate1 · Rate2 · Rate3 (rates 6 dp). Row id = `beaming_hdr_id`;
Edit opens the dialog. Search placeholder: "Search by machine, shift or period".

## 5. Verification
1. `pyhback`: `pytest src/test/test_production_beaming.py` — parser rules (fne_date rule, lost ≤ mach, lines,
   in-payload duplicate quality, line prefix).
2. `nxtfront`: `pnpm test beamingTotals` — screenshot + DocEntry 1390 numbers; `npx tsc --noEmit`; `pnpm lint`.
3. After migration on nbcl: `SELECT kav, rate1, rate2, rate3 FROM vw_beaming_prod_hdr` for SM0001 / C /
   2025-11-15 equals the DocEntry 1390 numbers; row count of headers = 20, lines = 48.
4. Browser (FE :3001 / BE :8001, branch 87): create the screenshot entry for FNE 2026-08-31 / C / SM0001 and
   compare every read-only field with the screenshot; try a bad F/N date, lost > mach, duplicate quality, and a
   duplicate header; edit and delete.

## 6. Rollout
Migration runs on `nbcl` only after explicit confirmation (run-migration skill). Backend and frontend ship
together — the old flat payload is not supported after the migration.
