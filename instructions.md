# IDE Agent Instructions – Reusable Approval Actions Component

## Overview

This document provides instructions for implementing and using the **reusable approval actions component** (`ApprovalActionsBar`) for transaction pages across the application.

## Component Location

The `ApprovalActionsBar` component is located at:
```
src/components/ui/transaction/ApprovalActionsBar.tsx
```

It is exported from:
```
src/components/ui/transaction/index.ts
```

## Status & Flow Contract

The following status IDs and meanings are **fixed across modules** and must be respected:

- `21` – **Drafted** - Initial state when creating/editing a document
- `1`  – **Open** - Document is ready to be sent for approval (document number generated)
- `20` – **Pending Approval level "n"** - Document is in approval workflow (use `approval_level` field to store the level number)
- `3`  – **Approved** - Document has been fully approved
- `4`  – **Rejected** - Document was rejected during approval
- `5`  – **Closed** - Document is closed (not driven by approval flow)
- `6`  – **Cancelled** - Document was cancelled (typically at Draft stage)

### Important Behavior Rules

1. **Document number generation** happens **only when moving to Open**.
2. **Draft stage (21)**:
   - New / edited record = Drafted
   - User can **Save**, **Open**, or **Cancel Draft**
   - No individual line item close logic here
3. **Open (1)**:
   - Ready to be sent for approval
   - When first changed to Open, backend generates the document number
4. **Pending Approval (20)**:
   - Status = 20, plus a numeric `approval_level = n`
   - On **Approve**, system either:
     - Moves to next level (stays 20, increments `approval_level`), or
     - If current level is highest for this menu+company+branch → status becomes **Approved (3)**
5. **Cancelled vs Rejected**:
   - **Cancelled (6):** used at Draft stage; can be reopened later
   - **Rejected (4):** used after Open (during approval); approver rejects the document
6. **Closed (5)**:
   - Not driven by this approval flow
   - Set by a different API when the next process has fully consumed the quantities

## Component Usage

### Importing the Component

```typescript
import {
  ApprovalActionsBar,
  type ApprovalInfo,
  type ApprovalActionPermissions,
  type ApprovalStatusId,
} from "@/components/ui/transaction";
```

### Component Props

```typescript
type ApprovalActionsBarProps = {
  approvalInfo: ApprovalInfo;
  permissions: ApprovalActionPermissions;
  menuCode?: string;
  onSave?: () => void;
  onOpen?: () => void;
  onCancelDraft?: () => void;
  onReopen?: () => void;
  onSendForApproval?: () => void;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onViewApprovalLog?: () => void;
  onClone?: () => void;
  loading?: boolean;
  disabled?: boolean;
};

type ApprovalInfo = {
  statusId: ApprovalStatusId;
  statusLabel: string;
  approvalLevel?: number | null;
  maxApprovalLevel?: number | null;
  isFinalLevel?: boolean;
};

type ApprovalActionPermissions = {
  canSave?: boolean;
  canOpen?: boolean;
  canCancelDraft?: boolean;
  canReopen?: boolean;
  canSendForApproval?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  canViewApprovalLog?: boolean;
  canClone?: boolean;
};

type ApprovalStatusId = 1 | 3 | 4 | 5 | 6 | 20 | 21;
```

### Button Visibility Rules

The component automatically determines which buttons to show based on `statusId` and `permissions`:

**Drafted (21)**
- Save (if `permissions.canSave`)
- Open (if `permissions.canOpen`)
- Cancel Draft (if `permissions.canCancelDraft`)

**Cancelled (6)**
- Re-Open (if `permissions.canReopen`)
- Save (optional, if `permissions.canSave`)

**Open (1)**
- Save (if `permissions.canSave`)
- Send for Approval (if `permissions.canSendForApproval`)

**Pending Approval (20)**
- Approve (if `permissions.canApprove`)
- Reject (if `permissions.canReject`)
- Save (optional, if `permissions.canSave`)
- View Approval Log (if `permissions.canViewApprovalLog`)

**Approved (3)**
- View Approval Log (if `permissions.canViewApprovalLog`)
- Clone/Copy (if `permissions.canClone`)

**Rejected (4)**
- Re-Open (if `permissions.canReopen`)
- Clone/Copy (if `permissions.canClone`)
- View Approval Log (if `permissions.canViewApprovalLog`)

**Closed (5)**
- View Approval Log (if `permissions.canViewApprovalLog`)

### Example Implementation

See `src/app/dashboardportal/procurement/indent/createIndent/page.tsx` for a complete implementation example.

```typescript
// 1. Map status to status ID (if backend returns status name instead of ID)
const mapStatusToId = (status?: string | null): ApprovalStatusId | null => {
  if (!status) return null;
  const normalized = String(status).toLowerCase().trim();
  if (normalized.includes("draft") || normalized === "21") return 21;
  if (normalized === "open" || normalized === "1") return 1;
  if (normalized.includes("pending") || normalized.includes("approval") || normalized === "20") return 20;
  if (normalized === "approved" || normalized === "3") return 3;
  if (normalized === "rejected" || normalized === "4") return 4;
  if (normalized === "closed" || normalized === "5") return 5;
  if (normalized === "cancelled" || normalized === "6") return 6;
  return null;
};

// 2. Get approval permissions from backend
const getApprovalPermissions = (
  statusId: ApprovalStatusId | null,
  mode: MuiFormMode
): ApprovalActionPermissions => {
  // TODO: Replace with actual backend permission check
  // This should fetch permissions from backend based on:
  // - Current user
  // - Document status
  // - Document type/menu
  // - Approval hierarchy
  
  // Placeholder implementation based on status
  if (!statusId || mode === "view") {
    return {
      canViewApprovalLog: true,
      canClone: true,
    };
  }
  
  if (statusId === 21) {
    return {
      canSave: true,
      canOpen: true,
      canCancelDraft: true,
    };
  }
  
  // ... other status-based permissions
  return {};
};

// 3. Create approval info object
const approvalInfo: ApprovalInfo = {
  statusId: statusId ?? 21,
  statusLabel: documentDetails?.status ?? "Drafted",
  approvalLevel: documentDetails?.approvalLevel ?? null,
  maxApprovalLevel: documentDetails?.maxApprovalLevel ?? null,
  isFinalLevel: /* calculate based on level */,
};

// 4. Implement approval action handlers
const handleSave = async () => {
  // Call backend API to save document
};

const handleOpen = async () => {
  // Call backend API to change status to Open
  // This should trigger document number generation
};

const handleSendForApproval = async () => {
  // Call backend API to send document for approval
  // This should set status to 20 and approval_level to 1
};

const handleApprove = async () => {
  // Call backend API to approve document
  // Backend should either:
  // - Increment approval_level if more levels exist
  // - Set status to 3 (Approved) if this is the final level
};

const handleReject = async (reason: string) => {
  // Call backend API to reject document
  // Backend should set status to 4 (Rejected)
};

// 5. Render the component
<ApprovalActionsBar
  approvalInfo={approvalInfo}
  permissions={approvalPermissions}
  menuCode="INDENT"
  onSave={approvalPermissions.canSave ? handleSave : undefined}
  onOpen={approvalPermissions.canOpen ? handleOpen : undefined}
  onSendForApproval={approvalPermissions.canSendForApproval ? handleSendForApproval : undefined}
  onApprove={approvalPermissions.canApprove ? handleApprove : undefined}
  onReject={approvalPermissions.canReject ? handleReject : undefined}
  onViewApprovalLog={approvalPermissions.canViewApprovalLog ? handleViewApprovalLog : undefined}
  onClone={approvalPermissions.canClone ? handleClone : undefined}
  loading={approvalLoading}
  disabled={saving || loading}
/>
```

## Backend Integration

### Required Backend Data

The backend should provide:

1. **Status Information**:
   - `status_id` (required) - Numeric status ID (1, 3, 4, 5, 6, 20, 21)
   - `status_name` (optional) - Human-readable status label
   - `approval_level` (required when status_id = 20) - Current approval level number
   - `max_approval_level` (optional) - Maximum approval level for this document type

2. **Permission Flags** (based on current user and document state):
   - `can_save`
   - `can_open`
   - `can_cancel_draft`
   - `can_reopen`
   - `can_send_for_approval`
   - `can_approve`
   - `can_reject`
   - `can_view_approval_log`
   - `can_clone`

### Required Backend APIs

Implement the following endpoints for each document type:

1. **Open Document**: `POST /api/{menu}/open`
   - Changes status from 21 (Drafted) to 1 (Open)
   - Generates document number if not already generated

2. **Cancel Draft**: `POST /api/{menu}/cancel`
   - Changes status from 21 (Drafted) to 6 (Cancelled)

3. **Send for Approval**: `POST /api/{menu}/send-for-approval`
   - Changes status from 1 (Open) to 20 (Pending Approval)
   - Sets `approval_level` to 1

4. **Approve**: `POST /api/{menu}/approve`
   - If not final level: increments `approval_level` (stays status 20)
   - If final level: changes status to 3 (Approved)

5. **Reject**: `POST /api/{menu}/reject`
   - Accepts `reason` parameter
   - Changes status to 4 (Rejected)

6. **Reopen**: `POST /api/{menu}/reopen`
   - Changes status from 6 (Cancelled) or 4 (Rejected) back to 1 (Open) or 21 (Drafted)

7. **Get Approval Permissions**: `GET /api/{menu}/{id}/permissions`
   - Returns permission flags for current user

## Component Responsibilities

### What the Component Does

- ✅ Renders status badge with appropriate color coding
- ✅ Determines which buttons to show based on status and permissions
- ✅ Shows confirmation/reason dialog for reject action
- ✅ Emits high-level events via callbacks
- ✅ Handles loading and disabled states
- ✅ Maintains consistent button ordering

### What the Component Does NOT Do

- ❌ Does NOT make API calls directly
- ❌ Does NOT manage document state
- ❌ Does NOT determine permissions (receives them as props)
- ❌ Does NOT handle business logic

### What the Page/Container Must Do

- ✅ Fetch document data from backend
- ✅ Get approval permissions from backend
- ✅ Map status name/ID to `ApprovalStatusId` type
- ✅ Implement actual API calls for each approval action
- ✅ Refresh document data after approval actions
- ✅ Handle errors and show appropriate messages

## Visual Design

The component displays:

1. **Status Badge** (left side):
   - Color-coded per status (neutral, primary, warning, success, error)
   - Shows status label (e.g., "Drafted", "Pending Approval L2")

2. **Action Buttons** (right side):
   - Consistent order: Save | Open | Cancel Draft | Re-Open | Send for Approval | Approve | Reject | View Approval Log | Clone
   - Buttons are shown/hidden based on status and permissions
   - Uses existing design system (shadcn/ui Button component)

## Extensibility

To add new actions:

1. Add new permission flag to `ApprovalActionPermissions` type
2. Add new callback prop to `ApprovalActionsBarProps` type
3. Update `getVisibleButtons` function in `ApprovalActionsBar.tsx` to include new button logic
4. Add button to the component's render logic
5. Update this documentation

## Status Badge Colors

- **Drafted (21)**: `default` (neutral gray)
- **Open (1)**: `primary` (blue)
- **Pending Approval (20)**: `warning` (amber/yellow)
- **Approved (3)**: `success` (green)
- **Rejected (4)**: `error` (red)
- **Closed (5)**: `default` (neutral gray)
- **Cancelled (6)**: `default` (neutral gray)

## Best Practices

1. **Always validate permissions on backend** - Never rely solely on frontend permission flags
2. **Refresh data after approval actions** - Always refetch document data after any approval action completes
3. **Handle errors gracefully** - Show user-friendly error messages if approval actions fail
4. **Provide loading feedback** - Use the `loading` prop to show loading state during API calls
5. **Map status correctly** - Ensure status IDs match the contract (21, 1, 20, 3, 4, 5, 6)
6. **Use TypeScript types** - Leverage the exported types for type safety

## Troubleshooting

### Buttons not showing

- Check that `permissions` object has the correct flags set
- Verify `statusId` matches expected values (1, 3, 4, 5, 6, 20, 21)
- Ensure callbacks are provided for actions that should be visible

### Status not mapping correctly

- Verify backend returns `status_id` (preferred) or `status_name`
- Check `mapStatusToId` function handles all status name variations
- Consider updating backend to return `status_id` directly

### Approval actions not working

- Verify backend APIs are implemented and accessible
- Check API endpoints match expected format
- Ensure error handling displays user-friendly messages
- Verify data is refreshed after successful actions

## Related Components

- `TransactionWrapper` - Main wrapper component for transaction pages
- `useTransactionPreview` - Hook for transaction preview data
- `useTransactionSetup` - Hook for transaction setup data

## Implementation Example

See `src/app/dashboardportal/procurement/indent/createIndent/page.tsx` for a complete working example of integrating `ApprovalActionsBar` into a transaction page.

