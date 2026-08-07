---
name: module-ctrldesk
description: Cross-repo guide for the Control Desk dashboard (dashboardctrldesk) — the VOW team's own high-level admin for managing organizations/tenants, system menus, control-desk roles and users. Use when asked which ctrldesk page does what or which /ctrldskAdmin endpoints a page uses. Covers vowerp3ui pages and vowerp3be src/common/ctrldskAdmin routers.
tools: Read, Grep, Glob
---

# Module Guide: Control Desk

Last verified: 2026-06-12

## 1. Module overview

**Persona distinction (critical):** `dashboardctrldesk` is the high-level control desk used by the
**VOW (vendor) team itself — not by tenants**. It is where VOW staff onboard and manage
organizations/tenants, maintain the system-wide portal menu template, configure control-desk roles
and users, map modules to organizations, and bootstrap each tenant's first admin user. Tenants
never see this dashboard (their equivalents are `dashboardadmin` and `dashboardportal`).

**Backend:** every route lives in `../vowerp3be/src/common/ctrldskAdmin/` under prefix
`/api/ctrldskAdmin` and opens `Session(default_engine)` directly against the central
**`vowconsole3`** database — **never `get_tenant_db`**. Auth dependency is `verify_access_token`
(not `get_current_user_with_refresh`). Login: `POST /api/authRoutes/loginconsole`
(`SUPERADMINLOGINCONSOLE` in `src/utils/api.ts`) — matches `con_user_master` rows with
`con_user_type = 0 AND con_org_id IS NULL`.

**Frontend:** all route constants live in the **`apiRoutesconsole`** object in `src/utils/api.ts`,
called via `fetchWithCookie`. There are **no approval workflows** and **no co_id/branch_id sidebar
scoping** here — list endpoints are system-wide; where scoping exists it is **org-level**, passed
as an explicit `org_id` path/query parameter (no `SidebarContext`).

This dashboard owns two of the four menu levels (see `../vowerp3be/.claude/agents/dbmanager.md` §7):
`control_desk_menu` (its own sidebar, role-mapped via `con_role_menu_map`) and `portal_menu_mst`
(the master template later copied into each tenant DB's `menu_mst`) — both in `vowconsole3`.

## 2. Page quick-map

13 routable pages under `src/app/dashboardctrldesk/` (detail inline below):

| FE page (src/app/dashboardctrldesk/...) | Purpose | Backend file |
|---|---|---|
| `page.tsx` | Landing — static sample cards, no API calls | — |
| `settings/organisationsetup/` + `createOrg/` | Organisation (tenant) list / create-edit | `orgs.py` |
| `menuManagementAdmin/` + `createMenuAdmin/` | Portal menu **template** (`portal_menu_mst`) list / create-edit | `menuportal.py` |
| `orgModuleMapManagement/` + `editOrgModuleMapAdmin/` | Org ↔ module mapping list / edit | `menuportal.py` |
| `roleManagementAdmin/` + `createRoleAdmin/` | Control-desk roles list / create-edit (menu tree) | `roles.py` |
| `userManagementAdmin/` + `createUserAdmin/` | Control-desk console users list / create-edit | `users.py` |
| `tenantAdminUserMgmt/` + `createPortalUser/` | Bootstrap a tenant's admin user (superadmin role + all menus) | `users.py` |

## 3. Page catalog

### Organisation Setup — list/create/edit
- Page: `src/app/dashboardctrldesk/settings/organisationsetup/page.tsx`
- Create page: `.../createOrg/page.tsx` + `orgForm.tsx` + `handleCreateEdit.tsx` (fetch/submit logic)
- How it works: list uses `SearchablePaginatedTable`; the edit link serializes org fields into URL
  query params. `handleCreateEdit.tsx` loads dropdowns (modules, countries, states, statuses) from
  the setup endpoint, then POSTs create or edit.
- Endpoints:
  | api.ts const (`apiRoutesconsole`) | URL (`/api` +) | vowerp3be file |
  |---|---|---|
  | `GET_ORG_ALL` | GET `/ctrldskAdmin/get_org_data_all` | `src/common/ctrldskAdmin/orgs.py` |
  | `GET_ORG_BY_ID` | GET `/ctrldskAdmin/get_org_data_by_id/{org_id}` | `orgs.py` |
  | `CREATE_ORG_SETUP` | GET `/ctrldskAdmin/create_org_setup_data` | `orgs.py` |
  | `CREATE_ORG` | POST `/ctrldskAdmin/create_org_data` | `orgs.py` |
  | `EDIT_ORG` | POST `/ctrldskAdmin/edit_org_data` | `orgs.py` |
- Tables: `con_org_master` (incl. `con_modules_selected` JSON column), `con_module_masters`,
  country/state/status masters; `con_org_module_mapping` is touched in the edit path.
- Scope: none (system-wide list of all orgs). Approval: no.

### Menu Management (portal menu template) — list/create/edit
- Page: `src/app/dashboardctrldesk/menuManagementAdmin/page.tsx`
- Create page: `.../createMenuAdmin/page.tsx` + `menuForm.tsx` + `handleCreateEdit.tsx`
- How it works: edits `vowconsole3.portal_menu_mst` — the **template** for tenant portal menus
  (level 3 of the menu system); tenant copies live in `{tenant_db}.menu_mst`. Edit flow loads the
  menu by id plus dropdowns (modules, parent menus, menu types); `menuForm.tsx` checks name
  uniqueness before submit.
- Endpoints:
  | api.ts const | URL (`/api` +) | vowerp3be file |
  |---|---|---|
  | `GET_PORTAL_MENU_CTRLDSK_ADMIN` | GET `/ctrldskAdmin/portal_menu_details` | `src/common/ctrldskAdmin/menuportal.py` |
  | `GET_PORTAL_ALLMENU_CTRLDSK_ADMIN` | GET `/ctrldskAdmin/portal_allmenu_details` | `menuportal.py` |
  | `GET_PORTAL_ALLMENU_CTRLDSK_ADMIN_BY_ID` | GET `/ctrldskAdmin/portal_allmenu_details_by_id/{id}` | `menuportal.py` (path param is named `co_id` but is a **menu_id**) |
  | `GET_PORTAL_MENU_NAME` | GET `/ctrldskAdmin/portalmenuname/{name}/{menu_id}` | `menuportal.py` (duplicate-name check) |
  | `PORTAL_MENU_CREATE` | POST `/ctrldskAdmin/portalmenucreate` | `menuportal.py` (ORM `PortalMenuMst`) |
  | `PORTAL_MENU_EDIT` | POST `/ctrldskAdmin/portalmenuedit` | `menuportal.py` |
- Tables: `portal_menu_mst`, `con_module_masters`, `menu_type_mst` (all `vowconsole3`).
- Scope: none. Approval: no.
- Quirk: `menuManagementAdmin/page1.tsx` is a non-routable leftover (Next.js only routes
  `page.tsx`); it references `GET_CO_ALL`, a `/companyAdmin` endpoint — ignore it.

### Org ↔ Module Map — list/edit
- Page: `src/app/dashboardctrldesk/orgModuleMapManagement/page.tsx`
- Edit page: `.../editOrgModuleMapAdmin/page.tsx`
- How it works: list shows each org with its selected modules (read from the
  `con_org_master.con_modules_selected` JSON array via `JSON_TABLE`, orgs with
  `con_org_master_status = 3` only). The edit page loads the org dropdown, the per-org module
  checklist, and PUTs the new selection — the endpoint **overwrites the JSON column** (it does not
  maintain `con_org_module_mapping`).
- Endpoints:
  | api.ts const | URL (`/api` +) | vowerp3be file |
  |---|---|---|
  | `ORG_MODULE_MAP` | GET `/ctrldskAdmin/orgmodulemapdetails` | `src/common/ctrldskAdmin/menuportal.py` |
  | `ORGS_DROPDOWN_CTRLDSK_ADMIN` | GET `/ctrldskAdmin/admin_ctrldsk_dropdown_org` | `menuportal.py` |
  | `ADMIN_CTRLDSK_MODULE_BY_ORGID` | GET `/ctrldskAdmin/admin_ctrldsk_module_by_orgid/{org_id}` | `menuportal.py` (path param is named `role_id` but is an **org_id**) |
  | `CTRLDSK_ALL_MENUS` | GET `/ctrldskAdmin/admin_ctrldsk_menu_full` | `roles.py` (also fetched here) |
  | `EDIT_ORG_MODULE_MAP_CTRLDSK` | PUT `/ctrldskAdmin/edit_org_module_map_ctrldesk` | `menuportal.py` |
- Quirk: the page's no-`roleId` ("create") branch PUTs to `CREATE_ROLE_CTRLDSK_ADMIN` (the
  role-creation endpoint in `roles.py`) — only the edit path is genuinely wired for module mapping.
- Tables: `con_org_master`, `con_module_masters`.
- Scope: org-level via explicit org id in the path. Approval: no.

### Role Management (control-desk roles) — list/create/edit
- Page: `src/app/dashboardctrldesk/roleManagementAdmin/page.tsx`
- Create page: `.../createRoleAdmin/page.tsx`
- How it works: lists org-less roles (`con_role_master WHERE ifnull(con_org_id,0) = 0` — i.e.
  control-desk roles). Create/edit renders the `control_desk_menu` tree as checkboxes and saves
  role→menu mappings into `con_role_menu_map`.
- Endpoints:
  | api.ts const | URL (`/api` +) | vowerp3be file |
  |---|---|---|
  | `ROLES_CTRLDSK` | GET `/ctrldskAdmin/roles_ctrldsk_admin` | `src/common/ctrldskAdmin/roles.py` |
  | `CTRLDSK_ALL_MENUS` | GET `/ctrldskAdmin/admin_ctrldsk_menu_full` | `roles.py` (reads `control_desk_menu`) |
  | `ADMIN_CTRLDSK_MENU_BY_ROLEID` | GET `/ctrldskAdmin/admin_ctrldsk_menu_by_roleid/{role_id}` | `roles.py` |
  | `CREATE_ROLE_CTRLDSK_ADMIN` | PUT `/ctrldskAdmin/create_role_ctrldsk_admin` | `roles.py` |
  | `EDIT_ROLE_CTRLDSK_MENU` | PUT `/ctrldskAdmin/edit_role_ctrldsk_admin` | `roles.py` |
- Tables: `con_role_master`, `control_desk_menu`, `con_role_menu_map`. Shared query fns live in
  `../vowerp3be/src/common/query.py` (`get_roles_ctrldsk_admin`, `get_roles_ctrldsk_full_menu`).
- Scope: none (roles are org-less by definition here). Approval: no.

### User Management (control-desk console users) — list/create/edit
- Page: `src/app/dashboardctrldesk/userManagementAdmin/page.tsx`
- Create page: `.../createUserAdmin/page.tsx` + `userAdmin.tsx` (form + submit)
- How it works: lists `con_user_master` rows with `con_org_id IS NULL`, joined to
  `con_user_role_mapping` + `con_role_master`. Create assigns one role from the dropdown; edit
  updates role/active. Edit data normally arrives via URL query params from the list page.
- Endpoints:
  | api.ts const | URL (`/api` +) | vowerp3be file |
  |---|---|---|
  | `GET_USER_CTRLDSK_ADMIN` | GET `/ctrldskAdmin/get_user_ctrldsk_admin` | `src/common/ctrldskAdmin/users.py` |
  | `ROLES_DROPDOWN_CTRLDSK_ADMIN` | GET `/ctrldskAdmin/get_roles_ctrldsk_admin_assign` | `users.py` |
  | `CREATE_USER_CTRLDESK_ADMIN` | POST `/ctrldskAdmin/create_user_ctrldsk_admin` | `users.py` |
  | `EDIT_USER_CTRLDESK_MENU` / `EDIT_USER_CTRLDSK_MENU` | POST `/ctrldskAdmin/edit_user_ctrldsk_admin` | `users.py` (two constants, same URL) |
- Quirks: `createUserAdmin/page.tsx` has a fallback that GETs
  `edit_user_ctrldsk_admin/{userId}` — **no such GET route exists** (the endpoint is POST with no
  path param), so that fallback is a dead call. Also, `create_user_ctrldsk_admin` writes
  `con_org_id=None` but `con_user_type=1`, which contradicts the documented `con_user_type=0`
  control-desk convention (the login filter on `con_org_id IS NULL` is what matters in practice).
- Scope: none (`con_org_id IS NULL` filter). Approval: no.

### Tenant Admin User Mgmt (bootstrap a tenant's admin) — list/create
- Page: `src/app/dashboardctrldesk/tenantAdminUserMgmt/page.tsx`
- Create page: `.../createPortalUser/page.tsx` + `portalUserForm.tsx`
- How it works: lists **org-scoped** `con_user_master` rows (joined to `con_org_master` + role).
  The create form picks an org and POSTs name/email/password (default `vowjute@1234`). The backend
  then: validates the org, checks duplicate email within the org, creates-or-reuses a
  `superadmin` role for that org in `con_role_master`, maps **all** active `con_menu_master`
  menus to it via `con_role_menu_map` (idempotent), creates the user (`con_org_id = org_id`,
  `con_user_type = 1`) and the `con_user_role_mapping` row. This is the user the tenant logs into
  `dashboardadmin` with.
- Endpoints:
  | api.ts const | URL (`/api` +) | vowerp3be file |
  |---|---|---|
  | `GET_PORTAL_ADMIN_USERS` | GET `/ctrldskAdmin/get_portal_admin_users` | `src/common/ctrldskAdmin/users.py` |
  | `GET_ORGS_DROPDOWN_PORTAL_USER` | GET `/ctrldskAdmin/get_orgs_dropdown_portal_user` | `users.py` |
  | `CREATE_PORTAL_ADMIN_USER` | POST `/ctrldskAdmin/create_portal_admin_user` | `users.py` |
- Scope: org-level — every row/action is tied to an explicit `org_id`. Approval: no.

## 4. Backend quick-map

All registered in `../vowerp3be/src/main.py` with prefix `/api/ctrldskAdmin` (4 registrations,
tags `ctrldsk-admin-roles/-users/-orgs/-menu`). Every router uses `Session(default_engine)`
(→ `vowconsole3`) and `verify_access_token`.

| Router (../vowerp3be/src/common/ctrldskAdmin/) | Endpoints | Highlights |
|---|---|---|
| `roles.py` | `roles_ctrldsk_admin`, `admin_ctrldsk_menu_full`, `admin_ctrldsk_menu_by_roleid/{role_id}`, PUT `create_role_ctrldsk_admin`, PUT `edit_role_ctrldsk_admin` | Org-less roles + `control_desk_menu` ↔ `con_role_menu_map` |
| `users.py` | `get_user_ctrldsk_admin`, `get_roles_ctrldsk_admin_assign`, POST `create_user_ctrldsk_admin`, POST `edit_user_ctrldsk_admin`, `get_orgs_dropdown_portal_user`, POST `create_portal_admin_user`, `get_portal_admin_users` | Console users (`con_org_id IS NULL`) + tenant-admin bootstrap (superadmin role, all menus) |
| `orgs.py` | `get_org_data_all`, `get_org_data_by_id/{org_id}`, `create_org_setup_data`, POST `create_org_data`, POST `edit_org_data` | `con_org_master` CRUD incl. `con_modules_selected` JSON |
| `menuportal.py` | `portal_menu_details`, `portal_parentmenudetails`, `portalmodulename`, `portalmenutypedetails`, `portal_allmenu_details`, `portal_allmenu_details_by_id/{co_id}`, `portalmenuname/{name}/{menu_id}`, POST `portalmenucreate`, POST `portalmenuedit`, `orgmodulemapdetails`, `orgmodulemapdetails1`, `admin_ctrldsk_module_by_orgid/{role_id}`, `admin_ctrldsk_dropdown_org`, PUT `edit_org_module_map_ctrldesk` | `portal_menu_mst` template CRUD + org-module map |
| `menu.py` | `company_console_menu_items`, `tenant_console_menu_items_roleid`, `control-desk-menu` | **NOT registered in main.py — unreachable/dead file** |

Supporting files: `models.py` (ConUser, conRoleMaster, ConRoleMenuMap, ConOrgMaster,
ConUserRoleMapping, ConMenuMaster...), `query.py` (portal-menu + org-module SQL), `schemas.py`;
several role/user list queries live in `../vowerp3be/src/common/query.py`.

## 5. Sidebar & login plumbing

- Layout `src/app/dashboardctrldesk/layout.tsx` renders `SidebarConsole`
  (`src/components/dashboard/sidebarConsole.tsx`); menus come from `src/hooks/use-org-ctrldesk.tsx`
  via `apiRoutes.MENU_CTRLDESK` = `/api/companyRoutes/console_menu_items` — served by
  `../vowerp3be/src/common/companydata.py` (registered under `/api/companyRoutes`, **not**
  `/ctrldskAdmin`), which recursively reads `vowconsole3.control_desk_menu` (`user_id == 1` gets
  the full tree; other users a role-filtered variant).
- Login uses `apiRoutes.SUPERADMINLOGINCONSOLE` = `/api/authRoutes/loginconsole`
  (`login_user_console()` in `../vowerp3be/src/authorization/auth.py`); subdomain `admin`.

## 6. Related docs & skills

- Menu system (all four levels, incl. `control_desk_menu` and `portal_menu_mst`):
  `../vowerp3be/.claude/agents/dbmanager.md` §7
- Tenant provisioning: `../vowerp3be/docs/TENANT_PROVISIONING.md`
- Roles/users model across dashboards: `docs/claude/roles-and-users.md`
- Skills: `wire-api` (new endpoints — persona: Control Desk → `default_engine`, never
  `get_tenant_db`), `add-menu` (menu rows across the multi-level menu system) — canonical in
  `../vowerp3be/.claude/skills/`

## 7. Maintenance

Last verified date is at the top of this file.

Drift signals — while answering, watch for:
- a referenced file path that no longer exists
- a page folder under `dashboardctrldesk/` not in the quick-map
- an endpoint listed here that is absent from the backend router (or vice versa) — e.g. if
  `ctrldskAdmin/menu.py` gets registered, or the dead GET fallback in `createUserAdmin` gets fixed
- a `con_user_type` / `con_org_id` convention change in `users.py`

When drift is detected: **flag the staleness in your answer and ask the user whether to update
this agent / the knowledge docs. Never silently self-edit.** On approval: update the affected
catalog entry and quick-map row, then bump the Last verified stamp.
