# Spinning & Winding Production Planning — Database & Calculation Logic

**Purpose:** Logical reference for the Spinning & Winding production planning module. It defines the data sources (tables and columns), how every value in the planning grid is derived, and the end-to-end data flow across the **Spinning planning table**, the **Winding section**, and the **SQC entries** that feed them.

**Scope of this document:** logic and data flow only — *what* each field means, *where* it comes from, and *how* it is calculated. It is not a build/API/UI spec. Table and column names below are logical (inferred from the source planning sheet) and should be mapped onto the existing physical schema.

> **Key modelling principle — stored vs. computed.** Several grid values are **not stored as a final value**; they are obtained by **query** at read time:
> - **Standards** (std speed, std tpi, std eff) live in the **parameter/map table** as dated `standard` rows and are resolved by last-date logic (they change, but infrequently).
> - **Act Count** is the **average of count observations**, computed per date + quality from `sqc_count_entry`.
> - **Quality-wise winding total** is an **aggregate query** over raw winding production, scoped per quality + date + shift.

---

## 1. Domain glossary

| Term | Meaning |
|---|---|
| **Frame** | A spinning (ring) frame machine. Identified by a machine id. |
| **Spell** | A working sub-period. `A1` = **5 hours**, `A2` = **3 hours**. The planning grid is captured at **spell** level. |
| **Shift** | A full shift = its spells combined. Shift `A` = `A1` + `A2` = **8 hours**. Frame-wise production and winding allocation roll up to **shift** level. |
| **Doff** | A completed bobbin/cop removal cycle on the spinning frame; **Act Prod Doff** is the actual spun production measured at the frame (kg). |
| **Winding** | The downstream process that rewinds spun yarn onto cones. **Winding production** is measured per quality and allocated back to frames at shift level. |
| **Count** | Yarn count (fineness). `Act Count` is measured many times daily and **averaged**; `Std Count` is the quality standard. |
| **TPI** | Twist per inch. `Std TPI` (standard, in map table), `Actual TPI` (single measured entry via SQC), `Target TPI` (planning target). |
| **Speed** | Spindle speed (rpm). `Std Speed` (standard, in map table), `Actual Speed` (single measured entry via SQC), `Target Speed` (planning target). |
| **Eff** | Efficiency = actual production / 100% (theoretical) production. |
| **SQC entry** | Spinning Quality Control. Single-entry actuals (speed, TPI) in `sqc_entry`; multi-entry count observations in `sqc_count_entry`. |
| **MIS entry** | Management-entered planning targets (target speed, TPI, eff) — held in the parameter/map table. |
| **100% Prod** | Theoretical production at 100% efficiency for the given inputs — the denominator/basis for all efficiency figures. |

### 1.1 Spell vs. Shift (important)

Data is captured at **spell** granularity but is most useful **rolled up to shift**. The two levels must be kept distinct everywhere:

```
Shift A (8 h)
 ├── Spell A1  (5 h)   <- planning grid rows are at this level
 └── Spell A2  (3 h)
```

- **Spell level (A1, A2):** each planning row, `100prod`, std/target production, `Act Prod Doff`, and the doff-share used for winding allocation.
- **Shift level (A):** frame-wise rollup, winding totals, and shift efficiencies — computed by summing the spells of the shift.
- **minutes** per row reflect the spell length: `A1 = 300` (5 h), `A2 = 180` (3 h); the shift line uses `480` (8 h).

Winding totals and doff-share allocation operate **shift-wise** (within a quality and date) — see section 5.

---

## 2. Source tables (logical structure)

These are the inferred entities behind the planning grid. Map them onto the existing physical tables.

### 2.1 Spinning Machine Master — `spinning_mc_mst`
Standing data per spinning frame. **`std_speed` no longer lives here** — it moved to the parameter/map table (section 2.5).

| Column | Description |
|---|---|
| `mc_id` | Frame / machine identifier (primary key). |
| `spindles` | Number of spindles on the frame. *(Drives **Spindles**.)* |

### 2.2 Yarn Quality Master — `yarn_quality_mst`
Standing data per yarn quality. **`std_tpi` and `std_eff` no longer live here** — they moved to the parameter/map table (section 2.5). `std_count` remains.

| Column | Description |
|---|---|
| `quality_id` | Quality identifier (primary key). |
| `std_count` | Standard yarn count. *(Drives **Std Count**.)* |

### 2.3 SQC Entry — `sqc_entry` (single-entry actuals)
Holds the **infrequently-changed, single-value** measured actuals: **Actual Speed** and **Actual TPI**. Both are read by last-date logic (section 6.2). TPI is not changed every day, so it is a single entry value here (not averaged).

| Column | Description |
|---|---|
| `entry_id` | Primary key. |
| `date` | Observation date. |
| `mc_id` | Frame observed. |
| `quality_id` | Quality being run. |
| `actual_speed` | Measured actual spindle speed. *(Drives **Actual Speed**, last-date logic.)* |
| `actual_tpi` | Measured actual TPI. *(Drives **Actual TPI**, last-date logic.)* |

### 2.4 SQC Count Entry — `sqc_count_entry` (multi-entry, averaged) — *renamed from swc_entry*
Count is measured **every day, potentially multiple times**. This table stores each raw count observation. The grid's **Act Count is not stored** — it is the **average** of these observations, queried per date + quality (section 6.1). **`spell` is included** as a usable column.

| Column | Description |
|---|---|
| `entry_id` | Primary key. |
| `date` | Observation date. |
| `spell` | Spell the observation was taken in (`A1`, `A2`). |
| `mc_id` | Frame observed. |
| `quality_id` | Quality being run. |
| `observed_count` | A single measured count reading (one of many per day). |

### 2.5 Parameter / Mapping table — `spng_target_map`
A generic, dated key-value table that now holds **standards, targets (and actuals where mapped)** for speed / TPI / eff, against either a machine or a quality. This is where `std_speed` (from `spinning_mc_mst`) and `std_tpi`, `std_eff` (from `yarn_quality_mst`) now live as `standard` rows — they change from time to time but infrequently, so the applicable value is resolved **as of the requested date** (last-date logic, section 6.3).

| Column | Description |
|---|---|
| `mapping_id` | Primary key. |
| `date` | Effective date of the parameter value. |
| `id` | The entity id this row applies to — a **`mc_id` or `quality_id`** (see `id_type`). |
| `id_type` | Whether `id` refers to a machine (`mcid`) or quality (`qid`). |
| `actual_target` | Value role: **`standard`**, `target`, or `actual`. |
| `param` | Which parameter: `speed`, `tpi`, or `eff`. |
| `type` | Parameter type discriminator (`speed` / `tpi` / `eff`) — mirrors `param`; keep whichever the physical schema uses. |
| `value` | The numeric parameter value. |

Resolution map (each resolved by last-date <= requested date):

| Grid field | id_type | actual_target | param |
|---|---|---|---|
| Std Speed | mcid | standard | speed |
| Std TPI | qid | standard | tpi |
| Std Eff | qid | standard | eff |
| Target Speed | mcid | target | speed |
| Target TPI | qid | target | tpi |
| Target Eff | qid | target | eff |

### 2.6 Doff Table — `doff` (transactional)
Actual spun production captured at the frame per date/spell. **A frame is doffed multiple times in a
spell — each doff is one row.** The grid's **Act Prod Doff (`V`) is the SUM of all doff rows** for that
date + spell + frame (not a single entry); see section 4 row 22 and section 5.1.

| Column | Description |
|---|---|
| `doff_id` | Primary key. |
| `date` | Production date. |
| `mc_id` | Frame. |
| `spell` | Spell (`A1`, `A2`). |
| `quality_id` | Quality produced. |
| `act_prod_doff` | Actual spun production for one doff event, kg. Multiple rows per date/spell/frame; **summed** to the grid's `V`. *(Drives **Act Prod Doff**, `V`.)* |

### 2.7 Winding Production — `winding_prod` (transactional, queried as aggregate)
Raw winding output records. The grid's **winding total is not taken as a stored value** — it is an **aggregate query** (sum) over these records for the relevant quality + date + shift ("winding prod query").

| Column | Description |
|---|---|
| `wind_id` | Primary key. |
| `date` | Production date. |
| `shift` | Shift the winding belongs to (`A`, ...). |
| `quality_id` | Quality wound. |
| `qty_wind` | A winding production record (kg). Summed per quality + date + shift to form the **winding total** (`W`). |

### 2.8 Hard-coded constants
Used in the production formula (section 3): `c1 = 36`, `c2 = 14400`, `c3 = 2.204`. Fixed unit/conversion constants, not stored per row.

---

## 3. Core production formula (basis of everything)

All efficiency figures are built on a single theoretical-production value, **100% Prod** (the `S` column, "100prod").

```
100% Prod (kg) = (Std Speed x minutes x Act Count x Spindles)
                 ---------------------------------------------
                 (c1 x c2 x c3 x Std TPI)

             = (s x m x c x sp) / (36 x tpi x 14400 x 2.204)
```

Symbol map:

| Symbol | Grid field | Source |
|---|---|---|
| `s` | Std Speed | `spng_target_map` (mcid, standard, speed), last-date |
| `m` | minutes | run minutes for the spell (A1 = 300, A2 = 180) |
| `c` | Act Count | **computed**: AVG(`sqc_count_entry.observed_count`) per date + quality |
| `sp` | Spindles | `spinning_mc_mst.spindles` |
| `tpi` | Std TPI | `spng_target_map` (qid, standard, tpi), last-date |
| `c1, c2, c3` | 36, 14400, 2.204 | hard-coded constants |

The result is **rounded to 0 decimals**.

> Note on the formula: it uses **standard speed and standard TPI** but **(averaged) actual count and actual spindles/minutes**, giving the theoretical (100% efficiency) production for the running condition. It is the denominator for every efficiency value below.

**Worked example (sample data, frame 1 / spell A1):**
`s=4000, m=300, c=12.5, sp=120, tpi=4` ->
`(4000 x 300 x 12.5 x 120) / (36 x 14400 x 2.204 x 4) = 1,800,000,000 / 4,570,214.4 = 393.9 -> 394`.
A 100-spindle frame under the same conditions gives `328`.

---

## 4. Spinning planning table — field-by-field derivation

"Input" = stored/entered value; "Calc" = computed; "Query" = resolved from a table by lookup/aggregate at read time. Rows are at **spell** level.

| # | Field | Type | Source / Formula |
|---|---|---|---|
| 1 | Date | Input | Planning date. |
| 2 | Spell | Input | Spell code (`A1`, `A2`). |
| 3 | Frame | Input | `mc_id`. |
| 4 | Spindles | Input | `spinning_mc_mst.spindles`. |
| 5 | Act Count | Query | AVG(`sqc_count_entry.observed_count`) for the row's date + quality (section 6.1). |
| 6 | Std Count | Input | `yarn_quality_mst.std_count`. |
| 7 | Std Speed | Query | `spng_target_map` (mcid, standard, speed), last-date. |
| 8 | Actual Speed | Query | `sqc_entry.actual_speed`, last-date (section 6.2). |
| 9 | Target Speed | Query | `spng_target_map` (mcid, target, speed), last-date. |
| 10 | Std TPI | Query | `spng_target_map` (qid, standard, tpi), last-date. |
| 11 | Actual TPI | Query | `sqc_entry.actual_tpi`, last-date (section 6.2). |
| 12 | Target TPI | Query | `spng_target_map` (qid, target, tpi), last-date. |
| 13 | minutes | Input | Run minutes for the spell (A1 = 300, A2 = 180). |
| 14 | Std Eff | Query | `spng_target_map` (qid, standard, eff), last-date. |
| 15 | Target Eff | Query | `spng_target_map` (qid, target, eff), last-date. |
| 16-18 | c1, c2, c3 | Const | 36, 14400, 2.204. |
| 19 | **100prod** | Calc | `ROUND((Std Speed x minutes x Act Count x Spindles) / (c1 x c2 x c3 x Std TPI), 0)` — see section 3. |
| 20 | **Std Production** | Calc | `100prod x Std Eff`. |
| 21 | **Target Production** | Calc | `100prod x Target Eff`. |
| 22 | **Act Prod Doff** | Query | `SUM(doff.act_prod_doff)` over all doff rows for the row's date + spell + frame (`V`) — a frame is doffed many times per spell; the entries are added up. |
| 23 | **Winding total** | Query | SUM(`winding_prod.qty_wind`) per quality + date + shift (`W`) — section 5. |
| 24 | **Act Prod Wind** | Calc | `W x (V / SUM V_group)` — winding allocated by doff share within quality+date+shift, see section 5. |
| 25 | **Eff Doff** | Calc | `Act Prod Doff / 100prod` = `V / S`. |
| 26 | **Eff Winding** | Calc | `Act Prod Wind / 100prod` = `X / S`. |

**Internal helper:** doff share `AB = V / SUM V` where `SUM V` is the total Act Prod Doff over the allocation group (quality + date + shift; section 5). Used only to compute Act Prod Wind.

---

## 5. Winding section

The winding total is obtained by an **aggregate query** over `winding_prod` (sum of `qty_wind`) and is scoped **per quality + date + shift** — it is not a stored final figure. Winding production is **not measured per frame**; it is captured per quality at shift level and then **allocated to each frame/spell in proportion to that frame's doff production** within the same quality + date + shift.

### 5.1 Allocation logic (shift-wise, within quality + date)

```
group              = (quality_id, date, shift)
winding_total      = SUM(winding_prod.qty_wind) for the group                (W)
doff_share(row)    = Act Prod Doff(row) / SUM Act Prod Doff(all spell rows in the group)
Act Prod Wind(row) = winding_total x doff_share(row)
```

Because the shares within a group sum to 1, the allocated **Act Prod Wind** values sum back exactly to that group's winding total.

> **Allocation group = quality + date + shift.** The doff-share denominator must be restricted to spell rows of the **same quality, date and shift**. (In the sample sheet there is a single quality and a single shift A, so the denominator is the total of all doff rows `SUM V6:V12 = 1540` and the allocation sums to the shift's winding total `1450`.)

**Worked example (one quality, shift A, total winding = 1450, total doff = 1540):**

| Frame/Spell | Act Prod Doff (V) | Share (V/1540) | Act Prod Wind (x1450) |
|---|---|---|---|
| F1/A1 | 280 | 0.1818 | 263.6 |
| F1/A2 | 150 | 0.0974 | 141.2 |
| F2/A1 | 270 | 0.1753 | 254.2 |
| F2/A2 | 145 | 0.0942 | 136.5 |
| F3/A1 | 270 | 0.1753 | 254.2 |
| F3/A2 | 145 | 0.0942 | 136.5 |
| F4/A1 | 280 | 0.1818 | 263.6 |
| **Total** | **1540** | **1.000** | **1450.0** |

### 5.2 Winding efficiency

```
Eff Winding(row) = Act Prod Wind(row) / 100prod(row)
```

### 5.3 Frame-wise (shift) aggregation

Spells of a frame are rolled up to a shift line. For shift `A` = spells `A1 + A2` of a frame:

```
Prod Doff (shift)        = SUM Act Prod Doff of the frame's spells
Prod Winding (shift)     = SUM Act Prod Wind of the frame's spells
Doff Eff (shift)         = SUM Act Prod Doff / SUM 100prod      (over the frame's spells)
Spng/Winding Eff (shift) = SUM Act Prod Wind / SUM 100prod
```

Supporting fields on the shift line: `Shift`, `Frame`, winding total reference, `mins` (= 480 for a full A1+A2 shift), `Spindles`.

> Efficiency is aggregated as **SUM(production) / SUM(100prod)**, *not* as an average of per-spell efficiencies — sum the numerators and denominators separately, then divide.

---

## 6. SQC entry logic (count, speed, TPI)

### 6.1 Act Count — computed average (`sqc_count_entry`)
Act Count is **never stored as a final value on the planning row**. Count is measured every day, potentially multiple times, into `sqc_count_entry`. When a planning row needs Act Count it is **computed by query**, scoped to the row's **date and quality**:

```
Act Count(row) = AVG(sqc_count_entry.observed_count)
                 where quality_id = row.quality_id and date = row.date
```

This is why, in the sample, every spell/frame of the same quality on a date shows the same Act Count (12.5) — it is the day's average for that quality, not a per-row entry. `spell` is captured on each observation and is available if spell-level averaging is required later.

### 6.2 Single-entry actuals — last-date logic (`sqc_entry`)
Actual Speed and Actual TPI are **single entries that change infrequently** (TPI especially is not entered daily). For a planning row, take the **most recent entry on or before the planning date** for that `mc_id` (and `quality_id`):

```
Actual Speed(row) = sqc_entry.actual_speed  where mc_id matches and date = MAX(date <= planning_date)
Actual TPI(row)   = sqc_entry.actual_tpi    where mc_id matches and date = MAX(date <= planning_date)
```

### 6.3 Standards & targets — last-date logic (`spng_target_map`)
Standards (std speed/tpi/eff) and targets (target speed/tpi/eff) both come from `spng_target_map`, selected by `id`/`id_type` (machine or quality), `param`, and `actual_target` (`standard` or `target`), resolved by **last-date <= planning date**. Standards change from time to time but less frequently, so the value effective as of the requested date is used.

---

## 7. End-to-end data flow

```
        +---------------------+            +----------------------+
        | spinning_mc_mst     |            | yarn_quality_mst     |
        | spindles            |            | std_count            |
        +----------+----------+            +-----------+----------+
                   |                                   |
                   v                                   v
   spng_target_map (standard + target, by date) --> Std/Target Speed, TPI, Eff  (last-date)
   sqc_count_entry (many count obs) ----AVG by date+quality----> Act Count
   sqc_entry (single speed/tpi) -------last-date----------------> Actual Speed, Actual TPI
                   |                                   |
                   v                                   v
        +-----------------------------------------------+
        |  SPINNING PLANNING ROW  (spell level)         |
        |  100prod = f(std_speed, minutes, act_count,   |
        |             spindles, std_tpi, constants)     |
        |  Std Prod    = 100prod x std_eff              |
        |  Target Prod = 100prod x target_eff           |
        +----------------+------------------------------+
                         |
   doff table --> Act Prod Doff (V) --> Eff Doff = V / 100prod
                         |
   winding_prod --SUM by quality+date+shift--> Winding Total (W)
                         |
                         v
        Act Prod Wind (X) = W x (V / SUM V_group[quality,date,shift])
        Eff Winding = X / 100prod
                         |
                         v
        Frame-wise SHIFT rollup (SUM prod / SUM 100prod over A1+A2)
```

**Read order to compute a planning row:**
1. Resolve `spindles` from `spinning_mc_mst` (mc_id) and `std_count` from `yarn_quality_mst` (quality_id).
2. Resolve standards & targets (speed/tpi/eff) from `spng_target_map` by last-date.
3. Compute **Act Count** = AVG of `sqc_count_entry` for date + quality; resolve **Actual Speed/TPI** from `sqc_entry` by last-date.
4. Compute `100prod`, then `Std Production` and `Target Production`.
5. Pull `Act Prod Doff` from `doff`; compute `Eff Doff`.
6. Compute winding total = SUM(`winding_prod.qty_wind`) for quality + date + shift; compute each spell row's doff share **within that group**; compute `Act Prod Wind` and `Eff Winding`.
7. Roll up spells (A1 + A2) -> shift A per frame using SUM(prod) / SUM(100prod).

---

## 8. Open items to confirm

1. **`spng_target_map.param` vs `type`** — both columns share the domain `speed`/`tpi`/`eff`; confirm whether both are needed or one is redundant in the physical schema.
2. **Act Count averaging** — confirmed per date + quality. Confirm whether outlier/zero readings are excluded and whether spell-level averaging is ever needed (spell is stored for this).
3. **Standards resolution** — confirmed last-date logic from `spng_target_map`. Confirm there is always a `standard` row on/before any planning date (no gaps), and how `actual` rows (if used) differ from the SQC-derived actuals.
4. **minutes** — confirm whether stored per spell or derived from shift timings (A1 = 300, A2 = 180, shift = 480).