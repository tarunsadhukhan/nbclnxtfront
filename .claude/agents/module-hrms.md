---
name: module-hrms
description: Cross-repo guide for the HRMS module (employee database/wizard, leave type master, leave request, pay scheme, pay param, pay roll, pay register). Use when asked which HRMS page does what, which backend endpoints a page uses, or how the payroll chain and HRMS status lifecycles behave. Covers vowerp3ui pages and vowerp3be routers.
tools: Read, Grep, Glob
---

# Module Guide: HRMS

Last verified: 2026-06-12

## 1. Module overview

HRMS covers the **people** side (Employee Database — a multi-step wizard over `hrms_ed_*` tables
with a lifecycle status machine — plus Leave Type master and a Leave Request transaction) and the
**payroll chain**: Pay Scheme (component formulas) → employee salary structure (wizard Salary
step) → Pay Param (pay period) → Pay Roll (per-employee custom values) → Pay Register (process the
period: evaluates formulas, writes `pay_employee_payroll`/`pay_employee_payperiod`, then
approve/reject). Persona: **Portal** — tenant DB, `co_id`/`branch_id` from the sidebar; tables
prefixed `hrms_` and `pay_`.

Two structural quirks: (1) HR reference masters (designation, category, shift, spell) are served
under `/api/hrmsMasters` from `../vowerp3be/src/masters/` and belong to **module-masters**; only
`leaveType.py` under that prefix lives in `src/hrms/`. (2) The Leave Request frontend is complete
but **all eight of its backend routes are missing** — dead routes until built.

## 2. Knowledge docs (read for detail)

- `docs/claude/modules/hrms/_index.md` — payroll chain diagram + file registry
- `docs/claude/modules/hrms/pages-01-employee-leave.md`
- `docs/claude/modules/hrms/pages-02-payroll.md`
- `docs/claude/modules/hrms/backend-map.md`
- `docs/claude/modules/hrms/approval-flows.md`

(From vowerp3be, prepend `../vowerp3ui/`.)

## 3. Page quick-map

| FE page (src/app/dashboardportal/...) | Purpose | BE prefix | Detailed in |
|---|---|---|---|
| `hrms/employeeDatabase/page.tsx` + `addEmployee/` | Employee list (Active/Inactive/Total tabs) / 7-step wizard incl. salary structure | `/api/hrms` | pages-01 |
| `hrms/hrmsmasters/leaveRequest/page.tsx` + `createLeaveRequest/` | Leave request list / create-edit-view + approve/reject | `/api/hrms` (**backend missing**) | pages-01 |
| `hrmsmasters/LeaveMaster/page.tsx` (+ `CreateLeaveTypePage.tsx` dialog) | Leave Type master CRUD — **separate top-level folder** | `/api/hrmsMasters` | pages-01 |
| `hrms/payScheme/page.tsx` + `createPayScheme/` | Pay scheme list / header + formula lines | `/api/hrms` | pages-02 |
| `hrms/payParam/page.tsx` + `createPayParam/` | Pay period CRUD | `/api/hrms` | pages-02 |
| `hrms/payRegister/page.tsx` + `createPayRegister/` + `viewPayRegister/` | Payroll run: create+auto-process / pivoted salary grid + approve/reject | `/api/hrms` | pages-02 |
| `hrms/payRoll/page.tsx` | Per-employee custom component values (editable grid + Excel up/down) | `/api/hrms` | pages-02 |

Service: `src/utils/hrmsService.ts` (single service wrapping every HRMS call; constants in
`apiRoutesPortalMasters`). Adjacent: pay components are managed from the **Tenant Admin** pages
`src/app/dashboardadmin/paySchemeParameters/` (see `module-tenant-admin`).

## 4. Backend quick-map

| Router (../vowerp3be/src/hrms/) | main.py prefix | Highlights |
|---|---|---|
| `employee.py` | `/api/hrms` | List/wizard section-save/photo/status-update + salary check (formula preview) & save |
| `payScheme.py` | `/api/hrms` | `pay_scheme_master` + `pay_scheme_details`; update soft-deletes + re-inserts lines |
| `payParam.py` | `/api/hrms` | `pay_period` CRUD; scheme dropdown quirk (reads `pay_components`) |
| `payRegister.py` | `/api/hrms` | create+auto-process, supersede prior run, formula engine, pivoted salary grid |
| `payRoll.py` | `/api/hrms` | `pay_components_custom` grid save, Excel template/upload; 3 fetch endpoints are ack stubs |
| `payComponent.py` | `/api/hrms` | Component CRUD (consumed by Tenant Admin dashboard) |
| `leaveType.py` | `/api/hrmsMasters` | `hrms_leave_types_mst` CRUD (shares prefix with module-masters routers) |

Registered in `../vowerp3be/src/main.py:211-217`. Shared SQL: `src/hrms/query.py`.

## 5. Approval workflow summary

No multi-level approval hierarchy and no `ApprovalActionsBar` anywhere in HRMS.
**Pay Register** (real, simplified): 1 Open → 28 Processed (auto on create / `pay_register_process`)
→ 3 Approved / 4 Rejected via free-form `pay_register_update` (no server-side transition guard;
prior Processed runs are superseded to 4). Note: code uses **28** for Processed
(`payRegister.py:421`); the design doc's 32 is stale. **Employee**: lifecycle status machine
(21 Draft → 35 Joined → 39/40/41/42/46, resign details + `active=0`). **Leave Request**: standard
flow planned in FE types; backend absent. Diagrams: `docs/claude/modules/hrms/approval-flows.md`.

## 6. Related docs & skills

- Deep-dive: `../vowerp3be/docs/hrms-payroll-design.md` — pay register create & process step by
  step (status-ID 32/28 discrepancy noted above)
- Masters overlap: `module-masters` (designation/category/shift/spell under `/api/hrmsMasters`)
- Skills: `wire-api` (new endpoints — needed for the missing leave-request backend), `add-menu`
  (sidebar entries) — canonical in `../vowerp3be/.claude/skills/`

## 7. Maintenance

Last verified date is at the top of this file and each knowledge doc.

Drift signals — while answering, watch for: a referenced path that no longer exists; a page folder
under `hrms/` or `hrmsmasters/` not in the quick-map; an endpoint listed here that is absent from
the router (or vice versa — especially if the `leave_request_*` backend lands, which obsoletes the
"dead routes" warnings); status behavior in code contradicting the state diagrams.

When drift is detected: **flag the staleness in your answer and ask the user whether to update this
agent / the knowledge docs. Never silently self-edit.** On approval: update the affected part file
and quick-map row, then bump the Last verified stamps.
