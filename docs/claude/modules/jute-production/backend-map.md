# Jute Production Backend Map — Winding

Last verified: 2026-07-30

> Scope: the **shipped** winding routers under `../vowerp3be/src/juteProduction/` and the
> legacy → vowerp3 endpoint mapping. Winding is **built** — Portal persona
> (`Depends(get_tenant_db)` + `get_current_user_with_refresh`), `{"data": …}` responses, soft
> delete (`active = 0`), **no approval workflow**. Registered in `../vowerp3be/src/main.py:270`
> (`winding_entry_router`, prefix `/api/windingProd`) and `:284` (`winding_reports_router`, prefix
> `/api/juteProductionReports`). Entry is moving from machine-keyed to **person-keyed** (EB no) per
> the locked design `../vowerp3be/docs/winding-person-keyed-entry-spec.md` — read that spec first,
> it is the source of truth for the current contract. `../vowerp3be/docs/winding-production-design.md`
> is the historical record of the legacy formulas this replaced.

## Routers (actual)

| Router file | Prefix | Endpoints |
|---|---|---|
| `winding_entry.py` | `/api/windingProd` | **Workers:** GET `workers` (new — HRMS-sourced picker). **Doff:** GET `doff_setup`, `doff_prev_state` (renamed from `doff_machine_prev_state`), `doff_by_date`; POST `doff_create`; PUT `doff_edit/{id}`; DELETE `doff_delete/{id}`. **Jugar:** GET `jugar_setup`, `jugar_prev_state`, `jugar_by_date`; POST `jugar_save`; PUT `jugar_update/{id}`. **Quality:** GET `quality_setup` (per-person carry-forward auto-seed), `quality_by_date`; POST `quality_add` (new); DELETE `quality_delete/{id}` (new); PUT `quality_save/{id}` |
| `winding_reports.py` | `/api/juteProductionReports` | GET `winding_spell_report`, `winding_quality_wise` — production KG only, no target/efficiency math (no winding target master, no attendance link); each response carries an explicit `LIMITATION_NOTE`. Neither has a frontend yet |

Supporting files (mirror spreader/drawing): `winding_query.py` (SQL — already re-keyed to `eb_id`),
`services/winding_rules.py` (net calc, jugar carry-forward — already re-keyed, `compute_winding_net`
takes `(grosswt, trollywt, spoolwt)`, no `nomc`), `constants.py` (`WINDING_NET_MIN/MAX`,
`JUGAR_MIN/MAX`, `SPINDLE_MIN/MAX`, `WINDING_MACHINE_TYPE_NAME`).

**No `winding_masters.py` exists, and none is planned.** An earlier draft of this map proposed that
router (`winding_machine_attr_list/create/edit`) plus a `jute_prod_winding_machine_attr` table.
**Neither was ever built** — dropping the machine entirely from the doff row
(`docs/winding-person-keyed-entry-spec.md` D3) removes the only reason a per-machine winding
attribute master would exist. Treat both as fictional; do not scaffold them.

## Tables (tenant DB, `jute_prod_winding_`) — actual

`jute_prod_winding_doff` (replaces legacy `WINDING_SPELL_EB_PROD_QLTY`), `jute_prod_winding_jugar`
(replaces `WINDING_JUGAR_ENTRY`), `jute_prod_winding_daily_qlty` (replaces `WINDING_DAILY_SPELL_EB`
— the person → quality map). All scoped by `co_id` (+ `branch_id`); reuse `trolly_mst` for
trolly/spool (`trolly_type` 'T'/'S', replacing legacy `trollymst.process_type` 39/101).

Person-keyed migration (`dbqueries/migrations/winding_person_keyed_entry.sql`): `operator_id`
**renamed** `eb_id` on all three tables; `machine_id` (and `no_of_machines` on the doff table)
become NULL-able and are no longer written. Applied to dev3 and sls on 2026-07-30, and every
pre-change row was hard-deleted at the same time (dev3: 19 doff / 8 jugar / 25 quality, all
`eb_id IS NULL`; sls was already empty) — there is no legacy-row cohort keeping the old columns;
both tenants now hold zero winding rows under the new schema. No FK on `eb_id` (references
`hrms_ed_personal_details.eb_id`, consistent with the rest of jute production). Full column list:
`docs/winding-person-keyed-entry-spec.md` §3.

`jute_prod_winding_machine_attr` **was proposed in an earlier draft and never built.** It has no
replacement — see the router note above.

## Legacy → vowerp3 endpoint mapping

| Legacy controller method (code3i) | vowerp3 endpoint (actual, person-keyed) |
|---|---|
| `mcno1_data` / `getwndprvDoffData` | `doff_prev_state` (was `doff_machine_prev_state`; MC#1 lookup replaced by the chosen worker) |
| `trolly_data`, `spool_data`, dropdowns | folded into `doff_setup` (returns `workers`, not `machines`) |
| `savewnddoff_data` | `doff_create` — writes exactly **one** row (`eb_id`; no equal-split across machines) |
| `get_records` / `getwndDoffdata` | `doff_by_date` |
| `deleteRecord` | `doff_delete/{id}` |
| `mcno1_jugardata`, `jugmcno1_data` / `getwndprvjugarData` | `jugar_prev_state` (by `eb_id`) |
| `savejugdoff_data` | `jugar_save` |
| `updatejugdoff_data` | `jugar_update/{id}` |
| `get_jugarrecords` / `getjugDoffdata` | `jugar_by_date` |
| `getwndqcode_data` / `getwndqcData` (auto-seed per machine) | `quality_setup` (auto-seed per **person**, carried forward from the previous spell) |
| — (no legacy equivalent — legacy has no "add/remove one machine's row") | `quality_add` / `quality_delete/{id}` (new; needed because the person set changes day to day, unlike a fixed machine roster) |
| `savewndqc_data` | `quality_save/{id}` |
| `get_wndqcrecords` / `getwndqcrecorddata` | `quality_by_date` |
| `getfinishalldata`, `get_wndreprecords`, `get_wndqcwisereport` | `winding_spell_report`, `winding_quality_wise` |
| `get_wndperrecords`, `get_wndindreprecords` | **not built** — no `winding_performance` / `winding_individual` endpoint exists |

> Legacy report logic lives in views (`view_winding_all_data`, `view_winding_qualitywise_data`,
> `spellwindingdata`, `view_proc_spellwindingdata`); vowerp3 reimplements the reconciliation
> formula (§4.2 of `winding-production-design.md`, re-keyed to `eb_id` per the person-keyed spec
> §6) directly in `winding_query.py` rather than depending on those DB views.

## Status (2026-07-30) — person-keyed rework is complete

The whole winding stack is person-keyed and the tables above describe what the code actually
returns, not a target: `winding_models.py`, `winding_query.py`, `services/winding_rules.py`,
`winding_entry.py` (router/handlers), and `winding_reports.py` are all migrated, and the winding
block of the spinning day-slice in `spinning_query.py` was re-keyed in the same pass so
`winding_total` / `eff_winding` keep working. Frontend (page, components, hooks, types,
`src/utils/api.ts`) is wired to this contract.

Schema is live on **dev3 and sls**; any other tenant still needs
`dbqueries/migrations/winding_person_keyed_entry.sql` applied **before** this code deploys, because
`machine_id` is `NOT NULL` until the migration lands and the new insert leaves it NULL.

Contract source of truth: `docs/winding-person-keyed-entry-spec.md`.
