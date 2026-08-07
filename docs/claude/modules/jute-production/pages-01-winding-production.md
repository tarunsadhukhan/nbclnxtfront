# Jute Production Pages — Part 1: Winding Production

Last verified: 2026-07-30

> Scope: the **Winding Production** page — Doff / Jugar / Quality tabs — now shipped and being
> rebuilt **person-keyed** (EB no) per the locked design in
> `../vowerp3be/docs/winding-person-keyed-entry-spec.md`. **Read that spec first — it is the source
> of truth**; this file describes the page shaped by its §4 API contract. This catalog previously
> described a design that was never actually built under those endpoint names (`doff_entry_create_setup`,
> `doff_entries_by_date`, etc.) — the real router uses the names below, verified against
> `src/utils/api.ts` and `../vowerp3be/src/juteProduction/winding_entry.py`/`winding_query.py`.
> Legacy-era logic + formulas (superseded for the doff/jugar/quality math, kept as the historical
> record) live in `../vowerp3be/docs/winding-production-design.md`.

## Winding Production — `juteProduction/winding/`

Single `page.tsx` with **three tabs**, one per entry screen. As of 2026-07-30 the ORM
(`winding_models.py`), the SQL layer (`winding_query.py`), the business rules
(`services/winding_rules.py`), and the FE calc mirror (`utils/windingCalc.ts`) are already
person-keyed; the router (`winding_entry.py`) and the FE hooks/forms/grids listed below are
**mid-migration** — still wired to the machine-keyed contract this file used to describe. Treat the
person-keyed shape below as the target every layer converges on.

### Tab 1 — Doff Entry
Weigh a wound trolly — **one weighing by one winder** (EB no). No machine appears on the form.

- Inputs: date, spell, **worker** (EB no, picked from the `/workers` list), trolly no, spool code,
  quality (prefilled from the person → quality map on the Quality tab, editable inline), gross
  weight.
- Lookups on the fly: trolly weight, spool weight; previous doff prefill via `GET /doff_prev_state`
  for the chosen worker (was `doff_machine_prev_state`, keyed by MC#1).
- Server formula (`services/winding_rules.py`, mirrored client-side in `utils/windingCalc.ts`):
  `net = grosswt − trollywt − spoolwt` — no split, no `no_of_machines`, one row written per doff.
  Save gate: `net > 0` and `1 ≤ net ≤ 500` kg (`WINDING_NET_MIN`/`MAX`).
- Validation: worker + trolly + spool + quality required; `grosswt > 0`.
- Day grid (`GET /doff_by_date`) lists date/spell/worker rows — `emp_code` / `worker_name` replace
  `mech_code` / `machine_name`, and `no_of_machines` is dropped from the payload. Row delete = soft
  delete (`DELETE /doff_delete/{id}`, unchanged).
- No legacy machine-keyed rows survive: dev3's 19 doff rows (sls had none) were hard-deleted on
  2026-07-30 when the migration landed, rather than kept with `machine_id` and `eb_id IS NULL` and
  read as legacy (D6, revised). The grid still LEFT JOINs the worker — defensively, in case an
  `eb_id` points at an HRMS row that is later deactivated or deleted, not to tolerate legacy rows,
  which no longer exist.

### Tab 2 — Jugar Entry (open/close)
Spindle leftover weight at shift boundary, **per worker** (was per machine), Opening ('O') /
Closing ('C').

- Inputs: date, spell, worker, open/close, jugar weight (`0 < wt ≤ 100`); a prev date/spell ref
  drives carry-forward.
- Carry-forward (`GET /jugar_prev_state`, mechanics unchanged, `eb_id` replaces `machine_id`):
  Opening defaults to the matching prior opening, else the most recent prior **closing** (last
  shift's leftover); Closing defaults to the prior closing. Existing record → form switches Save →
  Update (`PUT /jugar_update/{id}`).
- Duplicate guard: `(co_id, tran_date, spell_id, eb_id, open_close)`.

### Tab 3 — Quality Entry
Assign yarn quality + spindle count **per worker** for the date/spell — a person → quality map, not
a per-machine grid.

- `GET /quality_setup` auto-seeds one row **per person carried forward from the previous spell**;
  with no prior spell it seeds **nothing** (empty map — the clerk adds winders by hand, it does not
  invent rows).
- `POST /quality_add` adds a winder to the day's map (400 on duplicate `(co, date, spell, eb_id)`).
- `DELETE /quality_delete/{id}` soft-deletes a winder who is absent that spell (drops a
  carried-forward row).
- `PUT /quality_save/{id}` updates item + spindle for one row; duplicate guard re-keyed to `eb_id`.
- Spindle bounds: `1 ≤ no_of_spindle ≤ 30` (`SPINDLE_MIN`/`MAX`, `constants.py`) — the legacy "1 to
  16" alert text was a documentation error, already resolved.

### Daily reconciliation (reports, not data entry)
Actual production is computed (not stored), **grouped per person instead of per machine**:
`Σ(doff.production_qty) − opening_jugar + closing_jugar` per `(co_id, branch_id, tran_date,
spell_id, eb_id)`. Quality is `COALESCE(doff.item_id, quality_map.item_id)`. The old machine-keyed
rows that used to trip this up (`eb_id IS NULL`, never matching a jugar row) were hard-deleted on
2026-07-30 along with the rest of the pre-change data — that limitation can no longer occur. Full
formulas: `../vowerp3be/docs/winding-person-keyed-entry-spec.md` §5–§6; the
kg↔bundle / target / efficiency math in `winding-production-design.md` §4.3 is unaffected by the
person-keying and still applies wherever a winding target master eventually exists.

### Worker picker (new — replaces the machine picker)
`GET /workers` (`co_id` required, `branch_id?`, `search?`, `limit?` default 200) returns
`{eb_id, emp_code, worker_name, designation, label}`, sourced from **HRMS masters**
(`hrms_ed_official_details` + `hrms_ed_personal_details`) — **never** attendance. dev3 has zero
winding attendance and zero winding designations, so the picker cannot depend on either. `label` is
server-concatenated (e.g. `"02413 - LAXMI DEBI"`, same convention as spinning's active-worker
picker); `designation` is display-only and is **never** used as a filter — winding designations
(`WINDER SPOOL`, `SPOOL WINDER SWP/HWP`, `HESS WFT WINDER`, `RE WINDER`, ...) share no common prefix
or substring, unlike spinning's `spinner%` gate.

### Structure (mirror spreader/drawing)
- `hooks/`: `useWindingDoffSetup`, `useWindingDoffPrevState`, `useDoffByDate`, `useJugarSetup`,
  `useJugarPrevState`, `useJugarByDate`, `useQualitySetup`, `useQualityByDate` (existing — payload
  shapes still mid-migration to `eb_id`); a `useWorkers` hook for `GET /workers` is not yet wired.
- `_components/`: `DoffForm`, `DoffGrid`, `JugarForm`, `JugarGrid`, `QualityGrid` (existing —
  `DoffForm`, `JugarForm`, `useWindingDoffPrevState`, `useJugarPrevState`, `QualityGrid`, and
  `windingTypes.ts` still reference `machine_id` as of this writing).
- `types/windingTypes.ts`; `utils/windingCalc.ts` — **already person-keyed**: `computeWindingNet`
  takes `(grosswt, trollywt, spoolwt)`, no `nomc` argument, mirroring the BE exactly.

### Endpoints (BE `src/juteProduction/winding_entry.py`, prefix `/api/windingProd`)

| api.ts const | URL (base path — `/{id}` appended by the caller where noted) | Purpose |
|---|---|---|
| `WINDING_WORKERS` | `/windingProd/workers` | worker picker (HRMS masters, not attendance) |
| `WINDING_DOFF_SETUP` | `/windingProd/doff_setup` | workers, yarn items, trollies/spools, spells — **no machines** |
| `WINDING_DOFF_PREV_STATE` | `/windingProd/doff_prev_state` | prefill from a worker's last active doff — renamed from `doff_machine_prev_state`, takes `eb_id` |
| `WINDING_DOFF_CREATE` | `/windingProd/doff_create` | insert exactly one doff row (`eb_id`; no `machine_ids`/`no_of_machines`) |
| `WINDING_DOFF_BY_DATE` | `/windingProd/doff_by_date` | day/spell grid, optional `eb_id` filter |
| `WINDING_DOFF_EDIT` | `/windingProd/doff_edit` + `/{id}` | edit (single-row recompute, no split) |
| `WINDING_DOFF_DELETE` | `/windingProd/doff_delete` + `/{id}` | soft delete |
| `WINDING_JUGAR_SETUP` | `/windingProd/jugar_setup` | workers/spells |
| `WINDING_JUGAR_PREV_STATE` | `/windingProd/jugar_prev_state` | open/close carry-forward, by `eb_id` |
| `WINDING_JUGAR_SAVE` | `/windingProd/jugar_save` | insert jugar, dup-guarded on `(co, date, spell, eb_id, open_close)` |
| `WINDING_JUGAR_UPDATE` | `/windingProd/jugar_update` + `/{id}` | update weight |
| `WINDING_JUGAR_BY_DATE` | `/windingProd/jugar_by_date` | jugar grid |
| `WINDING_QUALITY_SETUP` | `/windingProd/quality_setup` | per-person carry-forward seed + list |
| `WINDING_QUALITY_ADD` | `/windingProd/quality_add` | add a winder to the day's map |
| `WINDING_QUALITY_DELETE` | `/windingProd/quality_delete` + `/{id}` | soft-delete a winder from the map |
| `WINDING_QUALITY_SAVE` | `/windingProd/quality_save` + `/{id}` | update item + spindle |
| `WINDING_QUALITY_BY_DATE` | `/windingProd/quality_by_date` | quality grid |

`WINDING_DOFF_CREATE_SETUP` / `WINDING_DOFF_MACHINE_PREV_STATE` / `WINDING_DOFF_ENTRIES_BY_DATE`
never existed as router paths — an earlier draft of this catalog proposed those names before the
page was built. The real router has always used `doff_setup` / `doff_machine_prev_state` (now
being renamed `doff_prev_state`) / `doff_by_date`; see `backend-map.md` for the full legacy →
vowerp3 mapping.

## Winding Machine Master — never built, and now moot

An earlier draft of this catalog proposed a `masters/windingMachineAttr/` page and a
`windingMasters` router (`WINDING_MACHINE_ATTR_*`, plus a winding quality master). **Neither was
ever built.** The person-keyed design removes the reason to build the machine-attribute half of it:
the doff form has no machine field at all (`docs/winding-person-keyed-entry-spec.md` D3), so a
per-machine winding attribute master has no consumer. Quality stays the yarn `item_mst` row — there
is still no separate winding quality master. See `backend-map.md` for the corresponding backend-side
correction.
