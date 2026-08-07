---
name: module-tenant-admin
description: Cross-repo guide for the Tenant Admin dashboard (dashboardadmin) — where each tenant configures companies, branches, departments, users, roles, and the approval hierarchy. Use when asked which dashboardadmin page does what or which /companyAdmin or /admin/PortalData endpoints a page uses. Covers vowerp3ui pages and vowerp3be src/common routers.
tools: Read, Grep, Glob
---

# Module Guide: Tenant Admin

Last verified: 2026-06-12

## 1. Module overview

`/dashboardadmin` is the **Tenant Admin** dashboard — where **each tenant (organisation)
configures itself**: the tenant→company (`co_id`)→branch (`branch_id`) hierarchy is *created
here*, along with departments/sub-departments, per-company configuration flags, invoice-type
mapping, machine types, pay schemes, and — critically — users, roles, and the multi-level
approval hierarchy that portal transactions execute. Do not confuse it with `dashboardctrldesk`
(the VOW vendor team's own console managing all orgs) or `dashboardportal` (daily operations).

Backend: prefix `/api/companyAdmin` → `../vowerp3be/src/common/companyAdmin/` (6 routers) and
prefix `/api/admin/PortalData` → `../vowerp3be/src/common/portal/` (4 routers). Two DB planes:
`users.py`/`roles.py`/`menu.py` in companyAdmin hit **vowconsole3** `con_*` tables org-scoped via
the subdomain; `company.py`/`branch.py`/`dept_subdept.py` and everything under PortalData hit the
**tenant DB** (`co_mst`, `branch_mst`, `dept_mst`, `user_mst`, `roles_mst`, `approval_mst`, ...).
FE constants live in `apiRoutes` and `apiRoutesconsole` in `src/utils/api.ts` (plus
`apiRoutesPortalMasters` for the borrowed `/mechMaster` and `/hrms` pages). Pages scope by
per-form company/branch dropdowns — not the portal `SidebarContext`.

## 2. Knowledge docs (read for detail)

- `docs/claude/modules/tenant-admin/_index.md` — hierarchy diagram + file registry + DB split
- `docs/claude/modules/tenant-admin/pages-01-company-org-structure.md`
- `docs/claude/modules/tenant-admin/pages-02-users-roles-approvals.md`
- `docs/claude/modules/tenant-admin/backend-map.md`

(From vowerp3be, prepend `../vowerp3ui/`.)

## 3. Page quick-map

| FE page (src/app/dashboardadmin/...) | Purpose | BE prefix | Detailed in |
|---|---|---|---|
| `page.tsx` | Static placeholder landing (no API) | — | pages-01 |
| `companyManagement/` + `createCompany/` | Companies (`co_mst`) incl. logo (`page1.tsx` is dead legacy) | `/companyAdmin` | pages-01 |
| `branchManagement/` + `createBranch/` | Branches (`branch_mst`) | `/companyAdmin` | pages-01 |
| `deptManagement/` + `createDept/` | Departments (`dept_mst`) | `/companyAdmin` | pages-01 |
| `subDeptManagement/` + `createSubDept/` | Sub-dept list; **create posts to dept endpoints (defect)** | `/companyAdmin` | pages-01 |
| `CompanyConfiguration/` + `editConfiguration/` | Per-company flags (`co_config`: GST/TDS/indent/PO/inspection...) | `/companyAdmin` | pages-01 |
| `coInvoiceTypeMap/` | Company ↔ invoice-type mapping (`invoice_type_co_map`) | `/companyAdmin` | pages-01 |
| `mechineTypeMasterAdmin/` | Machine types (production-typo name; dialog-based create) | `/mechMaster` | pages-01 |
| `paySchemeCreation/` + `create/` | HRMS pay schemes (`pay_scheme_master`/`_details`) | `/hrms` | pages-01 |
| `paySchemeParameters/` + `create/` | HRMS pay components | `/hrms` | pages-01 |
| `userManagementAdmin/` + `createUserAdmin/` | **Tenant-admin console users** (`con_user_master`, `con_user_type=1`) | `/companyAdmin` | pages-02 |
| `roleManagementAdmin/` + `createRoleAdmin/` | **Tenant-admin roles** (`con_role_master` + `con_role_menu_map`) | `/companyAdmin` | pages-02 |
| `userManagement/` + `CreateUser/` (capital C) | **Portal users** (`user_mst` + per-branch `user_role_map`) | `/admin/PortalData` | pages-02 |
| `roleManagement/` + `createRole/` | **Portal roles** (`roles_mst` + `role_menu_map`, access 0/1/2/3/4) | `/admin/PortalData` | pages-02 |
| `approvalHierarchy/` | Approval levels per menu+branch (`approval_mst`) — config for portal approvals | `/admin/PortalData` | pages-02 |

No service files — pages/hooks call `fetchWithCookie` with `api.ts` constants directly.
Sidebar: `layout.tsx` → `sidebarCompanyConsole.tsx`; menus via `GET_TENANT_ADMIN_MENU_ROLE`.

## 4. Backend quick-map

| Router (../vowerp3be/src/common/...) | main.py prefix | DB | Highlights |
|---|---|---|---|
| `companyAdmin/menu.py` | `/api/companyAdmin` | vowconsole3 | Sidebar menus (`con_menu_master` by role) |
| `companyAdmin/roles.py` | `/api/companyAdmin` | vowconsole3 (org) | Tenant-admin roles; create/edit are **PUT** |
| `companyAdmin/users.py` | `/api/companyAdmin` | vowconsole3 (org) | `con_user_type=1` users + `con_user_role_mapping` |
| `companyAdmin/company.py` | `/api/companyAdmin` | tenant DB | `co_mst`, `co_config`, invoice-type map, logo upload |
| `companyAdmin/branch.py` | `/api/companyAdmin` | tenant DB | `branch_mst` CRUD |
| `companyAdmin/dept_subdept.py` | `/api/companyAdmin` | tenant DB | `dept_mst` CRUD; `sub_dept_mst` list only; duplicates two branch routes |
| `portal/roles.py` | `/api/admin/PortalData` | tenant DB | `roles_mst` + `role_menu_map` (access_type_id) |
| `portal/users.py` | `/api/admin/PortalData` | tenant DB | `user_mst` + `user_role_map` (co/branch/role) |
| `portal/menu.py` | `/api/admin/PortalData` | tenant DB | Serves the *portal* sidebar/permissions, not these pages |
| `portal/approval.py` | `/api/admin/PortalData` | tenant DB | `approval_mst` setup/submit (delete-then-recreate) |

Borrowed: `../vowerp3be/src/masters/mechineMaster.py` (`/api/mechMaster`),
`../vowerp3be/src/hrms/payScheme.py` + `payComponent.py` (`/api/hrms`).

## 5. Approval workflow summary

This dashboard does not run document approvals itself — `approvalHierarchy/` **configures** them:
`approval_mst` rows (menu_id, branch_id, user_id, approval_level, optional single/day/month amount
caps) drive the portal 20→20(next level)→3 flow and value-capped approvals. Detail:
`docs/claude/modules/tenant-admin/pages-02-users-roles-approvals.md` (§Approval Hierarchy).

## 6. Related docs & skills

- Roles/users/permissions across dashboards: `docs/claude/roles-and-users.md`
- Persona architecture: `CLAUDE.md` (Three-Dashboard) and `../vowerp3be/CLAUDE.md` (Three-Persona)
- Skills: `wire-api` (new endpoints), `add-menu` (menu rows incl. `con_menu_master`/`menu_mst`) —
  canonical in `../vowerp3be/.claude/skills/`

## 7. Maintenance

Last verified date is at the top of this file and each knowledge doc.

Drift signals — while answering, watch for: a referenced path that no longer exists; a page folder
under `dashboardadmin/` not in the quick-map; an endpoint listed here that is absent from the
backend router (or vice versa); the sub-department defect getting fixed (then update pages-01 and
backend-map); DB-plane changes (a companyAdmin router switching between `default_engine` and
`get_tenant_db`).

When drift is detected: **flag the staleness in your answer and ask the user whether to update
this agent / the knowledge docs. Never silently self-edit.** On approval: update the affected
part file and quick-map row, then bump the Last verified stamps.
