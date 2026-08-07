# Tenant Admin Pages — Part 2: Users, Roles, Approval Hierarchy

Last verified: 2026-06-12

> Scope: the access-control half of the dashboard — userManagement, userManagementAdmin,
> roleManagement, roleManagementAdmin, approvalHierarchy. The "...Admin" pages manage
> **tenant-admin console accounts** (vowconsole3 `con_*` tables); the plain pages manage
> **portal accounts** (tenant DB `user_mst`/`roles_mst`). BE paths relative to `../vowerp3be/`.

## The two user/role planes (critical distinction)

| | Tenant-admin plane (`...Admin` pages) | Portal plane (plain pages) |
|---|---|---|
| Who logs in where | `dashboardadmin` console users | `dashboardportal` operational users |
| User table | `vowconsole3.con_user_master` (`con_user_type = 1`, `con_org_id = org`) | `{tenant_db}.user_mst` |
| Role tables | `con_role_master` + `con_role_menu_map` (menus from `con_menu_master`) | `roles_mst` + `role_menu_map` (menus from `menu_mst`) |
| User↔role link | `con_user_role_mapping` (one role per user) | `user_role_map` — one row **per branch**: `(user_id, co_id, branch_id, role_id)` |
| BE prefix / files | `/companyAdmin` → `src/common/companyAdmin/users.py`, `roles.py` | `/admin/PortalData` → `src/common/portal/users.py`, `roles.py` |
| DB session | `Session(default_engine)` + `get_org_id_from_subdomain` | `Depends(get_tenant_db)` |
| FE constants | `apiRoutes.*TENANT_ADMIN*` | `apiRoutes.*PORTAL*` |

Menu access levels (both planes use `access_type_id`): 0 Not Accessible, 1 Read, 2 Print,
3 Write, 4 Edit — same scale the portal middleware enforces via `portal_permission_token`.

## User Management Admin — tenant-admin console users

- List page: `src/app/dashboardadmin/userManagementAdmin/page.tsx` — paginated list via
  `GET_USER_TENANT_ADMIN`; edit links carry user data as URL params.
- Create/edit: `userManagementAdmin/createUserAdmin/page.tsx` (thin wrapper) +
  `createUserAdmin/userAdmin.tsx` (form: name, email, password, role dropdown, active;
  edit mode sends a change-tracking payload).
- Endpoints (BE file `src/common/companyAdmin/users.py`, prefix `/companyAdmin`):

| api.ts const | URL | Purpose |
|---|---|---|
| `GET_USER_TENANT_ADMIN` | `/get_user_tenant_admin` | Paginated org-scoped list of `con_user_master` rows |
| `ROLES_DROPDOWN_TENANT_ADMIN` | `/get_roles_tenant_admin_assign` | Assignable `con_role_master` roles |
| `CREATE_USER_TENANT_ADMIN` | `/create_user_tenant_admin` | POST — inserts `con_user_master` (`con_user_type=1`, `con_org_id` from subdomain, hashed password) + `con_user_role_mapping` |
| `EDIT_USER_TENANT_MENU` | `/edit_user_tenant_admin` | POST — updates role/active (payload always carries `roleId` + `active`) |

## Role Management Admin — tenant-admin console roles

- List page: `roleManagementAdmin/page.tsx` — `ROLES_COMP_CONSOLE` (`/roles_tenant_admin`).
- Create/edit: `roleManagementAdmin/createRoleAdmin/page.tsx` — role name + checkbox tree over
  the **con_menu_master** menus with per-menu access-level dropdown; submits
  `{roleName, selectedMenuIds, menuAccessList:[{menuId, accessTypeId}]}`.
- Endpoints (BE file `src/common/companyAdmin/roles.py`):

| api.ts const | URL | Purpose |
|---|---|---|
| `ROLES_COMP_CONSOLE` | `/roles_tenant_admin` | Org-scoped role list |
| `TENANT_ALL_MENUS` | `/admin_tenant_menu_full` | Full `con_menu_master` tree (create mode) |
| `ADMIN_TENANT_MENU_BY_ROLEID` | `/admin_tenant_menu_by_roleid/{role_id}` | Tree + current mappings + roleName (edit mode) |
| `CREATE_ROLE_TENANT_ADMIN` | `/create_role_tenant_admin` | **PUT** — inserts `con_role_master` (org-scoped) + `con_role_menu_map` rows with `access_type_id` |
| `EDIT_ROLE_TENANT_MENU` | `/edit_role_tenant_admin` | PUT — replaces role's menu mappings |

## User Management — portal users

The hook-based page pair (the most structured pages in this dashboard).

- List page: `userManagement/page.tsx` + `hooks/useUserList.ts` (+ test) — paginated grid via
  `USERS_PORTAL`; passes `user_id` from localStorage.
- Create/edit: `userManagement/CreateUser/page.tsx` (note **capital C** folder) +
  `CreateUser/ControlledFormFieldWrapper.tsx` + `hooks/useUserForm.ts` (+ test) +
  `types.ts` (User, Company, Branch, Role, UserSetupData).
- How it works: `useUserForm` loads setup (companies→branches tree + portal roles), renders a
  **role dropdown per branch** (`branchRoleAssignments: Record<branchId, roleId>`), and submits
  email/password/name/active + the per-branch role picks. Edit mode pre-loads via
  `PORTAL_USER_EDIT_BY_USERID`.
- Endpoints (BE file `src/common/portal/users.py`, prefix `/admin/PortalData`):

| api.ts const | URL | Purpose |
|---|---|---|
| `USERS_PORTAL` | `/get_users_portal` | Paginated `user_mst` list |
| `PORTAL_USER_CREATE_FULL` | `/get_user_create_setup_data` | Companies (with branches) + roles for the assignment matrix |
| `PORTAL_USER_EDIT_BY_USERID` | `/get_user_edit_setup_data/{portal_user_id}` | User + current branch-role assignments |
| `CREATE_PORTAL_USER` | `/create_user_portal` | POST — inserts `user_mst` (hashed password) + one `user_role_map` row per `(co_id, branch_id, role_id)` |
| `EDIT_PORTAL_USER` | `/edit_user_portal` | POST — updates active status + role mappings |

- Scope: a portal user only sees the companies/branches present in their `user_role_map` rows —
  this page is where that scoping is granted.

## Role Management — portal roles

- List page: `roleManagement/page.tsx` — `ROLES_PORTAL` (`/get_roles_portal`, `roles_mst`).
- Create/edit: `roleManagement/createRole/page.tsx` — checkbox tree over the tenant's
  **menu_mst** portal menus, per-menu access dropdown (0 Not Accessible / 1 Read / 2 Print /
  3 Write / 4 Edit); submits `{roleName|roleId, menuAccessList:[{menuId, accessTypeId}]}`.
- Endpoints (BE file `src/common/portal/roles.py`, prefix `/admin/PortalData`):

| api.ts const | URL | Purpose |
|---|---|---|
| `ROLES_PORTAL` | `/get_roles_portal` | Paginated portal role list |
| `PORTAL_MENU_FULL` | `/portal_menu_full` | Full `menu_mst` tree (create mode) |
| `GET_PORTAL_MENU_BY_ROLEID` | `/portal_menu_by_roleid/{role_id}` | Tree + current `role_menu_map` access (edit mode) |
| `CREATE_PORTAL_ROLE` | `/create_role_portal` | POST — inserts `roles_mst` + `role_menu_map` rows with `access_type_id` |
| `EDIT_PORTAL_ROLE` | `/edit_role_portal` | PUT — replaces the role's menu access |

- These roles + access levels are what the portal middleware turns into the
  `portal_permission_token` action checks (view/print/create/edit).

## Approval Hierarchy — configures portal transaction approvals

This page **configures** the multi-level approval (status 20, levels 1..N) that portal
transactions (Indent, PO, ...) execute. It manages the tenant DB table **`approval_mst`**
(`menu_id`, `branch_id`, `user_id`, `approval_level`, `max_amount_single`, `day_max_amount`,
`month_max_amount`, `updated_by`, `updated_date_time` — model `ApprovalMst` in
`src/common/portal/models.py:121`).

- Page: `approvalHierarchy/page.tsx` + `ApprovalLevelsTable.tsx` (+ test) +
  `hooks/useApprovalHierarchy.ts` (+ test) + `types.ts`.
- How it works: cascading Company → Branch → Menu dropdowns (`PORTAL_CO_BRANCH_SUBMENU`;
  menus are those reachable for the branch via branch → role → menu). Selecting branch+menu
  loads the level table (per level: approver users + optional amount caps). Submit filters out
  empty levels and saves.
- Endpoints (BE file `src/common/portal/approval.py`, prefix `/admin/PortalData`):

| api.ts const | URL | Purpose |
|---|---|---|
| `PORTAL_CO_BRANCH_SUBMENU` | `/co_branch_submenu` | GET dependent dropdown data (companies, branches per company, menus per branch) |
| `PORTAL_APPROVAL_LEVELS_DATA` | `/approval_level_data_setup` | POST `{menuId, branchId}` → `{[menuId]: {maxLevel, userOptions, data}}` — eligible users, current levels |
| `PORTAL_APPROVAL_LEVELS_DATA_SUBMIT` | `/approval_level_data_setup_submit` | POST `{menuId, branchId, data:[{level, users[], maxSingle?, maxDay?, maxMonth?}]}` — **delete-then-recreate** all `approval_mst` rows for that menu+branch |

- Downstream: portal transactions read this config (e.g. indent's `/get_approval_flow`) to drive
  20→20 (next level) →3 approval; `max_amount_single`/day/month enable value-capped approvals
  (e.g. `approve_indent_with_value`).
