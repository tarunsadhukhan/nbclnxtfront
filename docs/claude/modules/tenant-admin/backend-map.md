# Tenant Admin Backend Map

Last verified: 2026-06-12

> Scope: every router serving the `dashboardadmin` dashboard — the six `/api/companyAdmin`
> routers, the four `/api/admin/PortalData` routers, and the two borrowed business prefixes
> (`/api/mechMaster`, `/api/hrms`) its pages call. All endpoints verified against router source.
> Registered in `../vowerp3be/src/main.py:119-132` (+ `:136` mechMaster, `:212`/`:216` hrms).

## `/api/companyAdmin` — `../vowerp3be/src/common/companyAdmin/`

Auth: `Depends(verify_access_token)` on every route. Two DB patterns — noted per router.

| Router file | DB | Endpoints |
|---|---|---|
| `menu.py` | vowconsole3 (`default_engine`) | GET `/company_console_menu_items` (full `con_menu_master` tree), GET `/tenant_console_menu_items_roleid` (sidebar menus for the logged-in admin's role via `con_role_menu_map`) |
| `roles.py` | vowconsole3, org-scoped via `get_org_id_from_subdomain` | GET `/roles_tenant_admin`, GET `/admin_tenant_menu_full`, GET `/admin_tenant_menu_by_roleid/{role_id}`; PUT `/create_role_tenant_admin` (inserts `con_role_master` + `con_role_menu_map` with `access_type_id`), PUT `/edit_role_tenant_admin` |
| `users.py` | vowconsole3, org-scoped | GET `/get_user_tenant_admin`, GET `/get_roles_tenant_admin_assign`; POST `/create_user_tenant_admin` (inserts `con_user_master` `con_user_type=1` + `con_user_role_mapping`), POST `/edit_user_tenant_admin` |
| `company.py` | **tenant DB** (`get_tenant_db`) | GET `/get_co_data_all`, `/get_co_data_by_id/{co_id}`, `/create_co_setup_data`; POST `/create_co_data`, `/edit_co_data` (table `co_mst`); GET `/co_config`, POST `/company_config` (table `co_config` + `currency_mst`); GET `/co_invoice_type_map_setup`, POST `/co_invoice_type_map_save` (tables `invoice_type_mst`, `invoice_type_co_map`, delete-and-recreate); POST `/upload_co_logo`, GET `/get_co_logo/{co_id}`, DELETE `/delete_co_logo/{co_id}` |
| `branch.py` | tenant DB | GET `/get_branch_data_all`, `/get_branch_data_by_id/{branch_id}`, `/create_branch_setup_data`; POST `/create_branch_data`, `/edit_branch_data` (table `branch_mst`) |
| `dept_subdept.py` | tenant DB | GET `/get_department_data_all`, `/get_subdepartment_data_all` (read-only join over `sub_dept_mst`), `/get_department_data_by_id/{dept_id}`; POST `/create_department_data`, `/edit_department_data` (table `dept_mst`); DELETE `/delete_department_data/{dept_id}`; **duplicates** GET `/get_branch_data_by_id/{branch_id}` and GET `/create_branch_setup_data` already defined in `branch.py` |

SQL in `query.py`; ORM in `models.py` (`ConMenuMaster`, `ConRoleMenuMap`, `ConUser`,
`ConOrgMaster`, `conRoleMaster`, `ConUserRoleMapping`, `CoMst`, `BranchMst`, `DeptMst`,
`CoConfig`, `CurrencyMst`, `CountryMst`, `StateMst`); Pydantic in `schemas.py`.

## `/api/admin/PortalData` — `../vowerp3be/src/common/portal/`

All routers: tenant DB via `Depends(get_tenant_db)`.

| Router file | Endpoints |
|---|---|
| `roles.py` | GET `/get_roles_portal`, `/portal_menu_full` (`menu_mst` tree), `/portal_menu_by_roleid/{role_id}`; POST `/create_role_portal` (inserts `roles_mst` + `role_menu_map` with `access_type_id`), PUT `/edit_role_portal` |
| `users.py` | GET `/get_users_portal`, `/get_user_create_setup_data` (companies+branches+roles), `/get_user_edit_setup_data/{portal_user_id}`; POST `/create_user_portal` (inserts `user_mst` + per-branch `user_role_map` rows), POST `/edit_user_portal` |
| `menu.py` | GET `/portal_menu_items`, POST `/portal_menu_permissions/check`, GET `/portal_menu_permissions` — serves the **portal** sidebar + permission middleware, not any dashboardadmin page (kept here because it shares the prefix) |
| `approval.py` | GET `/co_branch_submenu`; POST `/approval_level_data_setup`, POST `/approval_level_data_setup_submit` (table `approval_mst`, delete-then-recreate per menu+branch) |

SQL in `query.py` (`get_co_brnach_all`, `get_submenu_by_branch`, `get_users_approval_portal`,
`get_max_approval`, `get_approval_data`, ...); ORM in `models.py` (`ConUser`→`user_mst`,
`conRoleMaster`→`roles_mst`, `ConRoleMenuMap`→`role_menu_map`, `UserRoleMap`, `ApprovalMst`,
`CoMst`, `BranchMst`). Note the misleading `Con*` class names — these map to **tenant-DB**
tables here, not vowconsole3.

## Borrowed business prefixes used by dashboardadmin pages

| Router file | Prefix | Endpoints used by this dashboard |
|---|---|---|
| `../vowerp3be/src/masters/mechineMaster.py` | `/api/mechMaster` | GET `/mechine_type_master_table`, POST `/mechine_type_master_create`, GET `/mechine_master_view` (page `mechineTypeMasterAdmin`); router has more endpoints — owned by the Masters module |
| `../vowerp3be/src/hrms/payScheme.py` | `/api/hrms` | GET `/pay_scheme_list`, `/pay_scheme_by_id/{payscheme_id}`, `/pay_scheme_create_setup`; POST `/pay_scheme_create`; PUT `/pay_scheme_update/{payscheme_id}` (tables `pay_scheme_master`/`pay_scheme_details`) |
| `../vowerp3be/src/hrms/payComponent.py` | `/api/hrms` | GET `/pay_component_list`, `/pay_component_by_id/{component_id}`, `/pay_component_create_setup`; POST `/pay_component_create`; PUT `/pay_component_update/{component_id}` |

## Known quirks (verified 2026-06-12)

- **Sub-department writes are broken**: `createSubDept/handleCreateEdit.tsx` posts to the
  department endpoints; `dept_subdept.py` has no `sub_dept_mst` create/edit route.
- **Duplicate route registrations**: `dept_subdept.py` re-declares `/get_branch_data_by_id/{id}`
  and `/create_branch_setup_data`; `branch.py` (registered first in `main.py:131`) wins.
- **GET to POST-only setup URLs**: dept/subdept create flows fetch `CREATE_DEPARTMENT` with GET
  for setup data — fails silently; the forms fetch their own dropdowns.
- **Method asymmetry**: tenant-admin role create/edit are **PUT**; portal role create is POST and
  edit is PUT; all user create/edit endpoints are POST.
- `companyManagement/page1.tsx` is dead legacy code (not a route).
- `mechineTypeMasterAdmin` reads the portal sidebar's localStorage for co/branch scope and
  contains a dead `/apix/mechineTypeMaster/mechine_master_view` fallback URL.
