# Design: Dynamic hierarchical report menu (report-type pages)

**Date:** 2026-06-24
**Status:** Approved (design)
**Repos:** `vowerp3ui` (frontend) + `vowerp3be` (backend)
**First target page:** `src/app/dashboardportal/jutePurchase/reports/page.tsx`

## Problem

The report selector on report-type pages (e.g. the Jute reports page) is a flat,
hardcoded MUI `<Select>` with a fixed list of reports. We want the report selector to
be **dynamically filled from the database** and presented as a **menu → submenu →
sub-submenu** hierarchy, so reports can be added/reorganised in the DB without a
frontend change.

## Scope & guardrails

- Applies to **report-type pages only**, starting with the Jute reports page.
- **MUST NOT touch the left sidebar menu logic** — no changes to
  `src/components/dashboard/sidebarContext.tsx`, `sidebar.tsx`, or the portal menu
  loading. This feature uses its own dedicated fetch and component.
- The existing **Report** `<Select>` on the Jute page (Jute Stock / Batch Cost / MR
  List, rendered inline) **stays exactly as-is**. We **add** a second, dynamic control
  next to it.

## Data source

Table `menu_mst` (tenant DB, e.g. `dev3`), already has a `report INT` column.
Rows flagged `report = 1` are report entries. Hierarchy is via `menu_parent_id`.
The tree for a page is the set of `report = 1` rows that are **descendants of that
page's own menu** (resolved by `menu_path`).

Current data under the Jute reports page (menu_id 10, `jutePurchase/reports`):

| menu_id | menu_name                | menu_path             | parent | report |
|---------|--------------------------|-----------------------|--------|--------|
| 799     | Jute Purchase Report 1   | `jutereport/rep1`     | 10     | 1      |
| 805     | Jute Purchase sub repo1  | `jutereport/subrep1`  | 799    | 1      |
| 804     | Jute Purchase Report 2   | `jutereport/rep2`     | 10     | 1      |

So: **Jute Purchase Report 1** (799) → child **Jute Purchase sub repo1** (805);
**Jute Purchase Report 2** (804) is a leaf. (`menu_mst` is tenant-global — not
company/branch scoped — so the catalog fetch needs no `co_id`/`branch_id`.)

## Decisions (from brainstorming)

1. **Data source:** Backend report catalog from `menu_mst` where `report = 1`.
2. **Leaf action:** Navigate to the leaf's `menu_path` route
   (`/dashboardportal/{menu_path}`). The menu is pure navigation.
3. **UI form:** Chained dropdowns — up to three Selects (Menu → Submenu →
   Sub-submenu); each subsequent Select appears only when the prior selection has
   children.
4. **Existing reports:** Keep the existing inline reports + add the dynamic control
   alongside (two separate controls).

## Backend (`vowerp3be`)

### 1. Query — `src/common/portal/query.py`
`get_report_menu_tree(root_path)` returns a SQLAlchemy `text()` query using a
**recursive CTE** (MySQL 8, supported by dev3):
- Resolve the root menu by `menu_path = :root_path` (normalised, active).
- Recursively collect active descendants.
- Final `SELECT` filters `report = 1`, returns
  `menu_id, menu_name, menu_path, menu_parent_id, order_by`,
  ordered by `menu_parent_id, order_by, menu_id`.
- Also return the resolved `root_menu_id` (separate small query or first CTE term) so
  the frontend can identify top-level nodes.

### 2. Endpoint — `src/common/portal/menu.py`
`GET /report_menu_tree?root_path=...` (mounted under `/api/admin/PortalData`):
- Auth via existing `get_portal_token_payload` dependency.
- Session via `get_tenant_db` (tenant-scoped by subdomain — automatic).
- Response: `{ "root_menu_id": <int|null>, "data": [ { menu_id, menu_name,
  menu_path, menu_parent_id, order_by } ] }`.
- `root_path` is normalised the same way `_normalise_path` does (strip
  `dashboardportal/` prefix, lowercase, trim slashes) before matching.
- If the root path matches no menu, return `{ root_menu_id: null, data: [] }`.

### 3. Test — `src/test/`
Pytest stub asserting the endpoint returns the report subtree for a known root_path
and an empty payload for an unknown path (mock the tenant session per repo test
patterns).

## Frontend (`vowerp3ui`)

### 4. Route constant — `src/utils/api.ts`
Add to the portal `apiRoutes` group:
`REPORT_MENU_TREE: ${API_URL}/admin/PortalData/report_menu_tree`.

### 5. Service — `src/utils/reportMenuService.ts` (new, shared)
- `fetchReportMenuTree(rootPath: string)` calls the endpoint via `fetchWithCookie`,
  passing `root_path` as a query param.
- Zod schema validates the response; types via `z.infer<>`.
- Returns `{ rootMenuId, nodes }` typed.

### 6. Component — `src/components/ui/ReportMenuSelect.tsx` (new, shared)
- `"use client"`, JSDoc, explicit prop interface.
- Prop: `rootPath: string` (the page's menu_path, e.g. `"jutePurchase/reports"`);
  optional `label`.
- On mount: fetch the tree, build a `parent_id → children[]` map (children sorted by
  `order_by`).
- Render **chained MUI Selects** (cap 3 levels, but driven by data depth):
  - Level 1: top-level nodes (`menu_parent_id === rootMenuId`, with a fallback that
    nodes whose parent isn't in the returned set are also treated as top-level).
  - Selecting a node **with children** → reveal the next-level Select (no navigation).
  - Selecting a **leaf** (no children) → `router.push('/dashboardportal/' + menu_path)`.
  - Changing an upper-level selection resets the lower levels.
- Empty / disabled state when the page has no `report = 1` rows.
- No hardcoded colors; follow theme tokens / minimal `sx`.

### 7. Wire-in — `jutePurchase/reports/page.tsx`
Add `<ReportMenuSelect rootPath="jutePurchase/reports" />` to the existing filter
toolbar, alongside the untouched existing controls.

## Known limitations / follow-ups

- **Dynamic routes may 404 today.** Rows like `jutereport/rep1` have no matching
  app-router page yet. This task delivers the **navigation**; building those report
  pages is a separate follow-up. The menu routes correctly once those pages exist.
- The recursive CTE requires MySQL 8 (dev3 supports it). If a target tenant runs an
  older MySQL, a two-pass fetch-and-build fallback would be needed (out of scope now).

## Out of scope

- Adopting the component on the Sales / Procurement reports pages (can reuse later).
- Creating the actual report destination pages for the dynamic `menu_path`s.
- Any change to sidebar/left-menu loading or permission tokens.
