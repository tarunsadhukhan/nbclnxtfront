# Project Context - vowerp3ui

> **Note:** This file provides additional context for Cursor AI. Keep it updated as your project evolves.

## Business Domain

**What this project does:**
- Multi-tenant ERP system with procurement, master data, and reporting modules
- Supports multiple companies (tenants) with separate databases
- Role-based access control with different dashboards (portal, admin, ctrldesk)

**Key Modules:**
- **Procurement:** Indents, Purchase Orders, etc.
- **Masters:** Items, Branches, Departments, Projects, etc.
- **Reporting:** Various business reports

## Technical Stack

- **Framework:** Next.js 14+ (App Router)
- **UI Library:** Material-UI (MUI) + Tailwind CSS
- **State Management:** React hooks + Context API
- **API Client:** Custom wrapper around axios (`apiClient2.ts`)
- **Forms:** Custom `MuiForm` component with schema-driven approach
- **Data Grid:** MUI DataGrid wrapped in `MuiDataGrid` component

## Critical Requirements

### 1. Multi-Tenancy
- Always use `useSelectedCompanyCoId()` to get the current company ID
- All API calls must include `co_id` parameter
- Branch/department filtering must respect tenant boundaries

### 2. Permissions
- Use `useSidebarContext().hasMenuAccess(pathname, action)` for permission checks
- `access_type_id` values:
  - `1` = read only
  - `2` = read + print
  - `3` = read + print + create
  - `4` = read + print + create + edit

### 3. Page Modes
- All transaction pages must support: `create`, `edit`, `view` modes
- Use `MuiForm` with `mode` prop to handle all three states
- Line items must be read-only in `view` mode

### 4. Code Organization
- **Pages:** `src/app/dashboardportal/**` or `src/app/dashboardadmin/**`
- **UI Components:** `src/components/ui/**` (only place for raw MUI imports)
- **Services:** `src/utils/**` (API calls, data transformations)
- **Hooks:** `src/hooks/**` (reusable stateful logic)
- **Types:** `src/types/**` (TypeScript interfaces/types)

## Common Patterns

### Transaction Page Pattern
1. Wrap in `TransactionWrapper`
2. Use `MuiForm` for header fields
3. Use `useLineItems` hook for line items
4. Use `useTransactionSetup` for dropdown options
5. Use `useDeferredOptionCache` for dependent dropdowns
6. Use `useTransactionPreview` for metadata

### Index/List Page Pattern
1. Use `IndexWrapper` component
2. Fetch paged data with search/filter
3. Use `MuiDataGrid` for table display
4. Handle permissions for create/edit actions

### API Service Pattern
```typescript
// In src/utils/[module]Service.ts
export const fetchSomething = async (params: Params) => {
  const response = await fetchWithCookie(
    apiRoutes.SOME_ENDPOINT,
    'GET',
    undefined,
    { params }
  );
  if (response.error) throw new Error(response.error);
  return response.data;
};
```

## Key Files to Reference

### When building transaction pages:
- `src/app/dashboardportal/procurement/indent/createIndent/page.tsx` (reference implementation)
- `src/components/ui/TransactionWrapper.tsx`
- `src/components/ui/transaction/index.ts` (hooks and utilities)
- `src/utils/indentService.ts` (API service example)

### When building list/index pages:
- `src/app/dashboardportal/masters/itemMaster/page.tsx` (reference implementation)
- `src/components/ui/IndexWrapper.tsx`
- `src/components/ui/muiDataGrid.tsx`

### When building forms:
- `src/components/ui/muiform.tsx`
- Check existing transaction pages for schema examples

### When building API services:
- `src/utils/apiClient2.ts` (API client wrapper)
- `src/utils/api.ts` (route constants)
- `src/utils/indentService.ts` (service example)

## Design System

### Theme
- Use `src/theme/muiTheme.ts` for MUI theme tokens
- Use `tailwind.config.ts` for Tailwind utilities
- **Never** use hardcoded colors/sizes in components

### Spacing
- Use `theme.spacing()` for MUI components
- Use Tailwind spacing classes (e.g., `p-4`, `gap-2`)

### Colors
- Use theme palette: `theme.palette.primary`, `theme.palette.error`, etc.
- Use Tailwind color classes mapped to design tokens

## Data Flow

```
User Action
  ↓
Page Component (uses hooks)
  ↓
Hooks (useTransactionSetup, useLineItems, etc.)
  ↓
Service Functions (indentService.ts, etc.)
  ↓
apiClient2.ts (fetchWithCookie)
  ↓
Backend API
```

## Common Gotchas

1. **Don't import MUI directly in pages** - use wrappers from `src/components/ui`
2. **Don't mutate shared option arrays** - clone them per row/item
3. **Always validate with Zod** - don't skip validation
4. **Handle loading/error states** - every async operation needs all three states
5. **Use label resolvers** - use `buildLabelMap`/`createLabelResolver` for consistent labels
6. **Clear dependent fields** - when changing a dropdown, clear downstream fields first

## Testing & Development

### Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm test` - Run tests
- `pnpm storybook` - Start Storybook
- `npx tsc --noEmit` - Type check

### Manual Verification
When adding new features, manually test:
- Create mode (new record)
- Edit mode (existing record)
- View mode (read-only)
- Permission checks (different access_type_id values)
- Multi-tenant isolation (different co_id values)

## Future Enhancements

- [ ] Add more examples to this file
- [ ] Document API contracts
- [ ] Add architecture diagrams
- [ ] Document testing patterns

---

**Last Updated:** [Update this date when you modify this file]

