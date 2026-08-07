# R-08-15 Yarn QR & CV % — Implementation Spec

**Module:** Jute SQC → Spinning (Portal persona)
**New tab in:** `vowerp3ui/src/app/dashboardportal/juteSQC/spinning/page.tsx`
**Backend:** `vowerp3be/src/juteSQC/spinning_sqc.py` (+ `spinning_sqc_query.py`, `models.py`)
**Status:** READY — all design decisions resolved (§2). No open blockers.
**Author:** generated 2026-06-18

---

## 1. Goal

Add a 4th tab — **"R-08-15 Yarn QR & CV %"** — to the Spinning SQC screen. The tab
is layered **on top of the existing R-08-16 (Yarn Parameter / Count Observations)**
data. For a user-selected date it:

1. Shows each yarn quality that has R-08-16 readings that day, with its
   **observed count** and **MR% obtained** (both averaged from R-08-16).
2. Lets the inspector enter, per yarn item: a **machine no**, then **6 spindle
   nos**, each with **5 readings** (= 30 readings per machine + yarn item).
3. Computes and displays per **machine + yarn item**: **max, min, standard
   deviation, average b/s, QR%, CV%**.

> **Terminology:** "yarn" / "yarn item" here = a **single `item_id`** in `item_mst`
> whose item type is *yarn* (`item_type_id=4`). It is NOT a "yarn group" — the item
> *belongs to* a yarn group via its item type. Every key, reading set, and stat in
> this spec is scoped to one `item_id`, never to a yarn-group. The 30-reading unit
> (a "reading set" / "test") is keyed by `(entry_date, mc_id, item_id)`.

### Formulas (authoritative)

```
b/s           = bundle/lea strength reading the inspector enters (5 per spindle)
avg_bs        = mean(all 30 readings in the group)
max           = max(readings)
min           = min(readings)
std_dev       = SAMPLE standard deviation of readings  (n-1, STDDEV_SAMP)
observed_count= AVG(observed_count) of R-08-16 rows for that (date, item_id)   ← READ from R-08-16 saved values, AVG per item_id
mr_pct        = AVG(mr_pct)         of R-08-16 rows for that (date, item_id)   ← READ from R-08-16 saved values, AVG per item_id
QR%           = (avg_bs / observed_count) * 100
CV%           = (std_dev / QR%)          * 100
```

> **Resolved:** "b/s" = bundle/lea strength (the per-spindle reading). QR% and CV%
> are both **multiplied by ×100** (true percentages). `observed_count` + `mr_pct`
> are **read from the values R-08-16 already saved** in `jute_sqc_spinning_count`
> (the `.observed_count` / `.mr_pct` columns persisted by `POST /sqc_count_save`) and
> **averaged per `item_id`** at read (D1) — NOT recomputed from raw inputs, and NOT
> re-stored in the QR/CV tables (the source is already saved by R-08-16). Guard
> divide-by-zero: QR% → null when `observed_count` is 0/null; CV% → null when
> `QR%` is 0/null. (Note: this CV% definition is the lab's own — `std_dev / QR% ×
> 100` — not the textbook `std_dev / mean × 100`; implemented as specified.)

---

## 2. Locked design decisions

| # | Decision | Choice |
|---|----------|--------|
| D1 | observed_count + MR% per yarn item / `item_id` (R-08-16 has multiple readings) | **AVG over the date's R-08-16 readings** (`AVG(observed_count)`, `AVG(mr_pct)`). |
| D2 | "machine no" mapping | **FK to `machine_mst.machine_id`** (spinning-type, same dropdown as R-08-16 `mc_id`). |
| D2b | "spindle no" mapping | **User-entered actual spindle position number**, stored per reading row. |
| D3 | Std-dev convention | **Sample (n-1) → `STDDEV_SAMP`** / Python `statistics.stdev`. |
| D4 | Save semantics | **Insert-only, multi-observation** (like R-08-16 count). Each save inserts a new group; duplicates allowed; DELETE removes a whole group. |
| D5 | QR%/CV%/max/min/avg/std | **Computed at read time** from the stored readings (raw readings stored only; no persisted stats). |
| D6 | observed_count + mr_pct | **Read from R-08-16's already-saved values** (`jute_sqc_spinning_count.observed_count` / `.mr_pct`, saved by `POST /sqc_count_save`), averaged per `item_id` at read (D1). NOT recomputed from raw inputs; NOT re-stored in the QR/CV tables. |
| D7 | QR%/CV% scaling + b/s | **×100** (true percentages); **b/s = bundle/lea strength** reading. |

---

## 3. Data model — new tables (header + detail)

A group = one saved test for `(date, machine, item_id)` carrying 30 readings. Because
save is insert-only and a group is deleted as a unit, use a **header + detail**
pair (the dominant ERP pattern in this codebase; the flat SQC tables don't fit a
30-row group cleanly). **No observed_count/mr_pct columns** — those are read from
R-08-16's already-saved values in `jute_sqc_spinning_count` at read time (D6).

### 3.1 Header — `jute_sqc_spinning_qr_cv`

| Column | Type | Notes |
|--------|------|-------|
| `spinning_sqc_qr_cv_id` | INT PK AI | group id |
| `co_id` | INT NOT NULL, index | tenant scope |
| `branch_id` | INT NULL | optional scope (same idiom as count) |
| `entry_date` | DATE NOT NULL, index | user-selected date |
| `mc_id` | INT NULL | machine — FK semantics → `machine_mst.machine_id` (D2). Nullable to mirror count's optional machine, but the FE requires it. |
| `item_id` | INT NOT NULL, index | yarn quality (`item_mst.item_id`, `item_type_id=4`) |
| `active` | INT NOT NULL default 1 | soft-delete (`active=1` on all reads) |
| `updated_by` | INT NULL | audit |
| `updated_date_time` | TIMESTAMP default CURRENT_TIMESTAMP | audit |

### 3.2 Detail — `jute_sqc_spinning_qr_cv_dtl`

| Column | Type | Notes |
|--------|------|-------|
| `spinning_sqc_qr_cv_dtl_id` | INT PK AI | |
| `spinning_sqc_qr_cv_id` | INT NOT NULL, index | FK → header |
| `spindle_no` | INT NOT NULL | user-entered spindle position (D2b); 6 distinct per group |
| `reading_no` | SMALLINT NOT NULL | 1..5 slot index within a spindle |
| `reading_val` | DECIMAL(10,3) NULL | the b/s (bundle/lea strength) reading |

No `active` on detail — detail visibility follows the header's `active` flag
(soft-delete the header only). 30 detail rows per active header.

### 3.3 DDL — `dbqueries/migrations/create_jute_sqc_spinning_qr_cv.sql`

```sql
-- R-08-15 Yarn QR & CV %  (header + detail). Layered on R-08-16 count data.
-- observed_count / mr_pct are NOT stored here; they are read from R-08-16's
-- already-saved values in jute_sqc_spinning_count (AVG per item_id) at read time.
-- Rollback:
--   DROP TABLE IF EXISTS jute_sqc_spinning_qr_cv_dtl;
--   DROP TABLE IF EXISTS jute_sqc_spinning_qr_cv;

CREATE TABLE IF NOT EXISTS jute_sqc_spinning_qr_cv (
    spinning_sqc_qr_cv_id INT NOT NULL AUTO_INCREMENT,
    co_id                 INT NOT NULL,
    branch_id             INT NULL,
    entry_date            DATE NOT NULL,
    mc_id                 INT NULL,
    item_id               INT NOT NULL,
    active                INT NOT NULL DEFAULT 1,
    updated_by            INT NULL,
    updated_date_time     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (spinning_sqc_qr_cv_id),
    KEY idx_qrcv_co (co_id),
    KEY idx_qrcv_date (entry_date),
    KEY idx_qrcv_item (item_id)
);

CREATE TABLE IF NOT EXISTS jute_sqc_spinning_qr_cv_dtl (
    spinning_sqc_qr_cv_dtl_id INT NOT NULL AUTO_INCREMENT,
    spinning_sqc_qr_cv_id     INT NOT NULL,
    spindle_no                INT NOT NULL,
    reading_no                SMALLINT NOT NULL,
    reading_val               DECIMAL(10,3) NULL,
    PRIMARY KEY (spinning_sqc_qr_cv_dtl_id),
    KEY idx_qrcv_dtl_hdr (spinning_sqc_qr_cv_id)
);
```

> Apply to **dev3** first (run-migration skill / pymysql per CLAUDE.md). Then a
> paired `sls_create_jute_sqc_spinning_qr_cv.sql` for the `sls` tenant, matching
> the precedent `sls_create_jute_sqc_spinning_tables.sql`. **Ask the user which
> tenants** before running. Audit columns (`updated_by`, `updated_date_time`)
> match the existing SQC tables exactly.

### 3.4 ORM — append to `vowerp3be/src/juteSQC/models.py`

Use the same legacy `Column(...)` style as the other classes in that file (they
reuse `Base` from `src/models/mst.py`).

```python
class JuteSqcSpinningQrCv(Base):
    """R-08-15 QR/CV group header. One saved test per (date, machine, item_id);
    insert-only (duplicates allowed). observed_count/mr_pct are NOT stored — they
    are read from R-08-16's saved values in jute_sqc_spinning_count (AVG per item_id) at read."""

    __tablename__ = "jute_sqc_spinning_qr_cv"

    spinning_sqc_qr_cv_id = Column(Integer, primary_key=True, autoincrement=True)
    co_id = Column(Integer, nullable=False, index=True)
    branch_id = Column(Integer, nullable=True)
    entry_date = Column(Date, nullable=False, index=True)
    mc_id = Column(Integer, nullable=True)
    item_id = Column(Integer, nullable=False, index=True)
    active = Column(Integer, nullable=False, default=1, server_default="1")
    updated_by = Column(Integer, nullable=True)
    updated_date_time = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())


class JuteSqcSpinningQrCvDtl(Base):
    """One spindle reading for a QR/CV group (6 spindles x 5 readings = 30 rows)."""

    __tablename__ = "jute_sqc_spinning_qr_cv_dtl"

    spinning_sqc_qr_cv_dtl_id = Column(Integer, primary_key=True, autoincrement=True)
    spinning_sqc_qr_cv_id = Column(Integer, nullable=False, index=True)
    spindle_no = Column(Integer, nullable=False)
    reading_no = Column(Integer, nullable=False)
    reading_val = Column(DECIMAL(10, 3), nullable=True)
```

(`DECIMAL` is already imported in `models.py`.)

---

## 4. Backend endpoints (append to the existing `spinning_sqc` router)

Prefix `/api/juteSQC` (already registered in `src/main.py:187` — **no new router
registration needed**). Reuse helpers already in `spinning_sqc.py`:
`_require_co_id`, `_optional_branch_id`, `_require_entry_date`, `_f`, `_i`,
`_fetch_machines`, `_fetch_qualities`.

### 4.1 `GET /api/juteSQC/sqc_qr_cv_setup`

Returns dropdown data + the per-yarn R-08-16 averages (the read-only "observed
count / MR% obtained" the screen displays) + existing groups for the date.

Response:
```json
{ "data": {
    "machines":   [ { "machine_id", "machine_name", "mech_code", "branch_id" } ],
    "yarn_items": [ { "item_id", "item_code", "item_name", "std_count", "std_mr_pct" } ],
    "yarn_obs":   [ { "item_id", "item_code", "item_name",
                      "observed_count", "mr_pct", "obs_count" } ],
    "groups":     [ <group-with-readings-and-stats, see 4.3 by_date shape> ]
} }
```

- `machines` ← `_fetch_machines`; `yarn_items` ← `_fetch_qualities`.
- `yarn_obs` ← **new query** `get_sqc_count_obs_mr_avg_query` (§5): per-yarn
  `AVG(observed_count)`, `AVG(mr_pct)`, `COUNT(*)` from `jute_sqc_spinning_count`
  for `(co_id, entry_date, branch_id)`. **This is the source for the displayed
  observed count + MR% (D1).** Only yarns with R-08-16 rows that day appear.
- `groups` ← same builder as `sqc_qr_cv_by_date` (read existing groups for re-view,
  with observed_count/mr_pct read from R-08-16's saved values + computed stats).

### 4.2 `POST /api/juteSQC/sqc_qr_cv_save`

Body:
```json
{ "co_id": 1, "branch_id": 2, "entry_date": "2026-06-18",
  "entries": [
    { "mc_id": 12, "item_id": 44,
      "spindles": [
        { "spindle_no": 101, "readings": [r1, r2, r3, r4, r5] }
        // ... 6 spindles total
      ] }
  ] }
```

Logic (mirrors `sqc_count_save` insert-only pattern, lines 473-523):
1. For each entry: INSERT header (`co_id, branch_id, entry_date, mc_id, item_id`,
   `active=1`, `updated_by=user_id`), read `result.lastrowid`. **No observed_count
   / mr_pct stored** (read from R-08-16's saved values at read — D6).
2. INSERT each `(spindle_no, reading_no 1..5, reading_val)` detail row.
3. `db.commit()`. Return `{ "data": { "saved": <#groups>, "ids": [header_ids] } }`.
4. try/except with `db.rollback()` on error (POST pattern).

Pydantic:
```python
class SqcQrCvSpindle(BaseModel):
    spindle_no: int
    readings: List[Optional[float]] = Field(default_factory=list)  # up to 5

class SqcQrCvRow(BaseModel):
    mc_id: Optional[int] = None
    item_id: int
    spindles: List[SqcQrCvSpindle] = Field(default_factory=list)

class SqcQrCvSave(BaseModel):
    co_id: int
    branch_id: Optional[int] = None
    entry_date: date
    entries: List[SqcQrCvRow] = Field(default_factory=list)
```

### 4.3 `GET /api/juteSQC/sqc_qr_cv_by_date`

Returns saved groups (readings) + observed_count/mr_pct from R-08-16's saved values + computed stats.

Response:
```json
{ "data": {
    "groups": [
      { "spinning_sqc_qr_cv_id", "entry_date", "mc_id", "mech_code", "machine_name",
        "item_id", "item_code", "item_name", "observed_count", "mr_pct",
        "readings": [ { "spindle_no", "reading_no", "reading_val" } ],
        "stats": { "max", "min", "std_dev", "avg_bs", "qr_pct", "cv_pct", "n" }
      }
    ]
} }
```

- Fetch active headers for `(co_id, entry_date, branch_id)` + their detail rows
  (`get_sqc_qr_cv_by_date_query` + `get_sqc_qr_cv_dtl_query`).
- **observed_count/mr_pct from saved R-08-16 (D6):** call
  `get_sqc_count_obs_mr_avg_query` once for `(co_id, entry_date, branch_id)`, build a
  `{item_id → (avg_obs, avg_mr)}` map over the **already-saved** `observed_count` /
  `mr_pct` columns, and attach to each group by its `item_id`. (One query, not per-group.)
- **Compute `stats` server-side** (D5, D7) per header in Python from its readings:
  ```python
  vals = [r["reading_val"] for r in readings if r["reading_val"] is not None]
  n = len(vals)
  avg_bs = sum(vals) / n if n else None
  mx, mn = (max(vals), min(vals)) if vals else (None, None)
  std_dev = statistics.stdev(vals) if n >= 2 else (0.0 if n == 1 else None)  # sample (n-1)
  observed_count = obs_map.get(item_id, {}).get("observed_count")            # AVG of saved R-08-16 values
  qr_pct = (avg_bs / observed_count) * 100 if (avg_bs is not None and observed_count) else None
  cv_pct = (std_dev / qr_pct) * 100 if (qr_pct not in (None, 0) and std_dev is not None) else None
  ```
  (Python `statistics.stdev` = sample/n-1, matching D3. Guard divide-by-zero on
  `observed_count` and `qr_pct`. Round to 2 dp in the row-out helper.)

### 4.4 `DELETE /api/juteSQC/sqc_qr_cv_delete/{qr_cv_id}`

Soft-delete the header (`active=0`); detail rows stay (orphaned but hidden via the
active-header join). Mirror `sqc_count_delete` (lines 568-593): guard 404 if no
active header, `db.commit()`, rollback on error.

---

## 5. New query builders — append to `spinning_sqc_query.py`

```python
def get_sqc_count_obs_mr_avg_query():
    """Per-yarn AVG(observed_count) + AVG(mr_pct) for a co/entry_date (branch
    optional). Source for R-08-15 observed count + MR% obtained (D1), read from
    R-08-16's already-saved observed_count/mr_pct columns (D6). Optional :item_id
    narrows to one yarn item."""
    return text("""
        SELECT c.item_id, im.item_code, im.item_name,
               AVG(c.observed_count) AS observed_count,
               AVG(c.mr_pct)         AS mr_pct,
               COUNT(*)              AS obs_count
        FROM jute_sqc_spinning_count c
        LEFT JOIN item_mst im ON im.item_id = c.item_id
        WHERE c.co_id = :co_id
          AND c.entry_date = :entry_date
          AND c.active = 1
          AND (:branch_id IS NULL OR c.branch_id = :branch_id OR c.branch_id IS NULL)
          AND (:item_id IS NULL OR c.item_id = :item_id)
        GROUP BY c.item_id, im.item_code, im.item_name
        ORDER BY im.item_name
    """)

def get_sqc_qr_cv_by_date_query():
    """Active QR/CV group headers for a co/entry_date (branch optional), labelled."""
    return text("""
        SELECT h.spinning_sqc_qr_cv_id, h.co_id, h.branch_id, h.entry_date,
               h.mc_id, m.mech_code, m.machine_name,
               h.item_id, im.item_code, im.item_name
        FROM jute_sqc_spinning_qr_cv h
        LEFT JOIN machine_mst m ON m.machine_id = h.mc_id
        LEFT JOIN item_mst im   ON im.item_id   = h.item_id
        WHERE h.co_id = :co_id
          AND h.entry_date = :entry_date
          AND h.active = 1
          AND (:branch_id IS NULL OR h.branch_id = :branch_id OR h.branch_id IS NULL)
        ORDER BY im.item_name, h.spinning_sqc_qr_cv_id
    """)

def get_sqc_qr_cv_dtl_query():
    """Reading rows for a set of group ids (single round-trip, expanding bind)."""
    return text("""
        SELECT spinning_sqc_qr_cv_id, spindle_no, reading_no, reading_val
        FROM jute_sqc_spinning_qr_cv_dtl
        WHERE spinning_sqc_qr_cv_id IN :ids
        ORDER BY spinning_sqc_qr_cv_id, spindle_no, reading_no
    """).bindparams(bindparam("ids", expanding=True))   # from sqlalchemy import bindparam

def insert_sqc_qr_cv_header_query():
    return text("""
        INSERT INTO jute_sqc_spinning_qr_cv
            (co_id, branch_id, entry_date, mc_id, item_id, active, updated_by)
        VALUES
            (:co_id, :branch_id, :entry_date, :mc_id, :item_id, 1, :updated_by)
    """)

def insert_sqc_qr_cv_dtl_query():
    return text("""
        INSERT INTO jute_sqc_spinning_qr_cv_dtl
            (spinning_sqc_qr_cv_id, spindle_no, reading_no, reading_val)
        VALUES (:hdr_id, :spindle_no, :reading_no, :reading_val)
    """)

def get_sqc_qr_cv_active_row_query():
    return text("""
        SELECT spinning_sqc_qr_cv_id FROM jute_sqc_spinning_qr_cv
        WHERE spinning_sqc_qr_cv_id = :id AND active = 1
    """)

def soft_delete_sqc_qr_cv_query():
    return text("""
        UPDATE jute_sqc_spinning_qr_cv SET active = 0, updated_by = :updated_by
        WHERE spinning_sqc_qr_cv_id = :id
    """)
```

> Use the `:x IS NULL OR ...` optional-branch idiom and `active = 1` soft-delete
> exactly as the existing builders do. For `lastrowid` after the header insert,
> read `result.lastrowid` from `db.execute(...)` (PyMySQL exposes it). If the
> expanding `IN :ids` bind is awkward, fall back to one `get_sqc_qr_cv_dtl_query`
> call per header id (the group count per date is small).

---

## 6. Frontend — types (`types/sqcSpinningTypes.ts`)

Append:

```ts
// ─── R-08-15 Yarn QR & CV % (Tab 4) ─────────────────────────────────────────

// Per-yarn R-08-16 averages displayed as read-only context (read from saved R-08-16 values).
export type SqcYarnObs = {
    item_id: number;
    item_code?: string | null;
    item_name?: string | null;
    observed_count: number;   // AVG of R-08-16 observed_count
    mr_pct: number | null;    // AVG of R-08-16 mr_pct
    obs_count: number;        // # R-08-16 readings averaged
};

export type SqcQrCvSetup = {
    machines: SqcMachine[];
    yarn_items: YarnItemOption[];
    yarn_obs: SqcYarnObs[];
    groups: SqcQrCvGroup[];
};

export type SqcQrCvReading = { spindle_no: number; reading_no: number; reading_val: number | null };

export type SqcQrCvStats = {
    max: number | null; min: number | null; std_dev: number | null;
    avg_bs: number | null; qr_pct: number | null; cv_pct: number | null; n: number;
};

export type SqcQrCvGroup = {
    spinning_sqc_qr_cv_id?: number;
    entry_date: string;
    mc_id?: number | null;
    mech_code?: string | null;
    machine_name?: string | null;
    item_id: number;
    item_code?: string | null;
    item_name?: string | null;
    observed_count?: number | null;  // AVG of saved R-08-16 values (not stored in QR/CV)
    mr_pct?: number | null;          // AVG of saved R-08-16 values (not stored in QR/CV)
    readings: SqcQrCvReading[];
    stats?: SqcQrCvStats | null;
};

// POST sqc_qr_cv_save payload (no observed_count/mr_pct — server reads them from saved R-08-16)
export type SqcQrCvSpindlePayload = { spindle_no: number; readings: (number | null)[] };
export type SqcQrCvSavePayloadRow = {
    mc_id?: number | null;
    item_id: number;
    spindles: SqcQrCvSpindlePayload[];
};
export type SqcQrCvByDateResponse = { groups: SqcQrCvGroup[] };
```

---

## 7. Frontend — API route constants (`src/utils/api.ts`)

Add inside `apiRoutesPortalMasters`, next to the Spinning SQC block (after
line 820), mirroring the `SPINNING_SQC_COUNT_*` naming. `..._DELETE` is a base
path; the grid appends `/${id}`.

```ts
    // R-08-15 Yarn QR & CV % (router prefix /api/juteSQC)
    SPINNING_SQC_QR_CV_SETUP: `${API_URL}/juteSQC/sqc_qr_cv_setup`,
    SPINNING_SQC_QR_CV_SAVE: `${API_URL}/juteSQC/sqc_qr_cv_save`,
    SPINNING_SQC_QR_CV_BY_DATE: `${API_URL}/juteSQC/sqc_qr_cv_by_date`,
    SPINNING_SQC_QR_CV_DELETE: `${API_URL}/juteSQC/sqc_qr_cv_delete`,
```

---

## 8. Frontend — hooks (`hooks/`)

Two new hooks, copied structurally from `useSqcCountSetup.ts` /
`useSqcCountByDate.ts` (same `coId/branchId==null` guard, `version` refresh,
`cancelled` cleanup, `fetchWithCookie`):

- `useSqcQrCvSetup(coId, entryDate, branchId)` → `{ setup: SqcQrCvSetup|null, loading, error, refresh }`
  hitting `SPINNING_SQC_QR_CV_SETUP?co_id&entry_date&branch_id`.
- `useSqcQrCvByDate(coId, entryDate, branchId)` → `{ groups, loading, error, refresh }`
  hitting `SPINNING_SQC_QR_CV_BY_DATE`.

---

## 9. Frontend — components (`_components/`)

### 9.1 `YarnQrCvForm.tsx` (mirror `CountForm.tsx`)
Props: `{ coId, branchId, entryDate, setup: SqcQrCvSetup, onSaved }`.

- **Yarn selector** — Autocomplete over `setup.yarn_obs` (only yarns with R-08-16
  data that day). On select, show read-only **Observed Count** + **MR% obtained**
  from the chosen `SqcYarnObs`. If `yarn_obs` is empty, show an Alert: "No R-08-16
  count readings for this date — enter them on the R-08-16 tab first."
- **Machine** — Autocomplete over `setup.machines` (required here; D2). Reuse the
  `Machine (MC No.)` pattern from `CountForm.tsx:124-133`.
- **6 spindle blocks** — render 6 rows, each = a `spindle_no` number field + 5
  `reading_val` number fields (`type="number"`, `step:"any"`, `min:0`).
- **Live preview** (client-side, server is authoritative): compute `avg_bs`,
  `max`, `min`, sample `std_dev`, `qr_pct = (avg_bs/observed_count)*100`,
  `cv_pct = (std_dev/qr_pct)*100` from the filled readings using the selected
  yarn's `observed_count`. Add a small helper in
  `juteProduction/spinning/utils/spinningCalc.ts` (e.g. `sampleStdDev(nums)`).
  Guard divide-by-zero.
- **Save** — POST `SPINNING_SQC_QR_CV_SAVE` with one `SqcQrCvSavePayloadRow`
  (machine + yarn + 6 spindles); on success Snackbar + clear readings (keep
  machine/yarn for fast re-entry) + `onSaved()`. Validation: machine + yarn
  required; require all 6 `spindle_no` filled; blank readings → server stores
  NULL and stats ignore NULLs.

### 9.2 `YarnQrCvGrid.tsx` (mirror `CountGrid.tsx`)
Props: `{ coId, groups: SqcQrCvGroup[], loading, onDeleted }`.

- A **summary DataGrid**: one row per saved group showing QUALITY, MC No.,
  OBS COUNT, MR%, MAX, MIN, AVG B/S, STD DEV, QR%, CV%, and a **Delete** action
  (DELETE `SPINNING_SQC_QR_CV_DELETE/${id}` → `onDeleted()`).
- Optional expandable detail showing the 6×5 reading matrix.
- Collision-free grid key like CountGrid's `_gridId = ${serverId(r) ?? "new"}-${i}`.

### 9.3 Page wiring (`page.tsx`)
1. Line 21 — extend TABS:
   ```ts
   const TABS = ["R-08-16 Yarn Parameter", "Speed / TPI Entry", "RHMR", "R-08-15 Yarn QR & CV %"] as const;
   ```
2. Imports — add `YarnQrCvForm`, `YarnQrCvGrid`, `useSqcQrCvSetup`, `useSqcQrCvByDate`.
3. State (mirror Count tab, lines 75-91): `qrCvDate` (default `todayISO()`),
   `useSqcQrCvSetup(coId, qrCvDate, branchId)`, `useSqcQrCvByDate(...)`,
   `onQrCvSaved = useCallback(refreshQrCv, [...])`.
4. Render — add a `{tab === 3 ? (...) : null}` block after the RHMR block
   (after line 295): date `TextField type="date"`, then `YarnQrCvForm` (guarded
   by `qrCvSetupLoading || !qrCvSetup` spinner), then `YarnQrCvGrid`. Reuse the
   existing `mounted`/`pageBranchId` gating — no changes there.

---

## 10. Tests (`vowerp3be/src/test/test_spinning_sqc_qr_cv.py`)

Mirror the existing SQC count tests (`test_spinning_sqc.py`). Patch
`src.juteSQC.spinning_sqc.get_tenant_db` + `...get_current_user_with_refresh`.
Cases:
- `sqc_qr_cv_setup` success → `data.machines/yarn_items/yarn_obs/groups` present.
- `sqc_qr_cv_setup` missing `co_id` → 400; missing `entry_date` → 400.
- `sqc_qr_cv_save` inserts header + 30 detail rows (no observed_count/mr_pct stored).
- `sqc_qr_cv_by_date` returns groups with observed_count/mr_pct from saved R-08-16 + `stats`
  (assert sample std dev; assert `qr_pct = avg_bs/observed_count*100` and
  `cv_pct = std_dev/qr_pct*100` on a known fixture; assert divide-by-zero guards →
  null when observed_count=0).
- `sqc_qr_cv_delete` soft-deletes (404 when absent).

Run: `pytest src/test/test_spinning_sqc_qr_cv.py -v`.

---

## 11. Notes / minor follow-ups (non-blocking)

- **Reading/spindle counts** are fixed at **5 readings × 6 spindles** per the
  request. The header/detail model supports any count — only FE field rendering
  is hard-coded at 6×5. Make configurable later if the lab varies it.
- **Yarn with zero R-08-16 readings** is not selectable in R-08-15 (`yarn_obs`
  only lists yarns with count data, and QR% needs `observed_count`).
- **Saved-source caveat (D6):** if all R-08-16 readings for a (date, item_id) are
  later soft-deleted, `observed_count` becomes null → QR%/CV% render as "—" for
  that group. Expected, since QR% has no denominator.

---

## 12. File-change checklist

**Backend (`vowerp3be`)**
- [ ] `dbqueries/migrations/create_jute_sqc_spinning_qr_cv.sql` (+ `sls_` copy)
- [ ] `src/juteSQC/models.py` — `JuteSqcSpinningQrCv`, `JuteSqcSpinningQrCvDtl`
- [ ] `src/juteSQC/spinning_sqc_query.py` — 7 new builders (§5)
- [ ] `src/juteSQC/spinning_sqc.py` — Pydantic + 4 endpoints (§4); `import statistics`, `bindparam`
- [ ] `src/test/test_spinning_sqc_qr_cv.py`
- [ ] (no `main.py` change — router already mounted)

**Frontend (`vowerp3ui`)**
- [ ] `…/juteSQC/spinning/types/sqcSpinningTypes.ts` — new types (§6)
- [ ] `src/utils/api.ts` — 4 route consts (§7)
- [ ] `…/juteSQC/spinning/hooks/useSqcQrCvSetup.ts`, `useSqcQrCvByDate.ts`
- [ ] `…/juteSQC/spinning/_components/YarnQrCvForm.tsx`, `YarnQrCvGrid.tsx`
- [ ] `…/juteSQC/spinning/page.tsx` — TABS + tab-3 block (§9.3)
- [ ] `…/juteProduction/spinning/utils/spinningCalc.ts` — `sampleStdDev` helper
```
