/**
 * @deprecated Use `buildApprovalTransactionActions` + `useRejectDialog` from
 * `@/components/ui/transaction` instead. Approval buttons are now rendered
 * via TransactionWrapper.primaryActions for unified save/approval display.
 * See .github/patterns/unified-action-bar.md for the recommended pattern.
 */
import React from "react";
import { ApprovalActionsBar, type ApprovalInfo, type ApprovalActionPermissions } from "@/components/ui/transaction";

type IndentApprovalBarProps = {
	approvalInfo: ApprovalInfo;
	permissions: ApprovalActionPermissions;
	loading: boolean;
	disabled?: boolean;
	onSave?: () => Promise<void>;
	onApprove?: () => Promise<void>;
	onReject?: (reason: string) => Promise<void>;
	onOpen?: () => Promise<void>;
	onCancelDraft?: () => Promise<void>;
	onReopen?: () => Promise<void>;
	onSendForApproval?: () => Promise<void>;
	onViewApprovalLog?: () => void;
	onClone?: () => void;
};

/**
 * Wraps ApprovalActionsBar so page.tsx stays focused on orchestration logic.
 */
export function IndentApprovalBar({
	approvalInfo,
	permissions,
	loading,
	disabled,
	onSave,
	onApprove,
	onReject,
	onOpen,
	onCancelDraft,
	onReopen,
	onSendForApproval,
	onViewApprovalLog,
	onClone,
}: IndentApprovalBarProps) {
	return (
		<ApprovalActionsBar
			approvalInfo={approvalInfo}
			permissions={permissions}
			menuCode="INDENT"
			onSave={permissions.canSave ? onSave : undefined}
			onOpen={permissions.canOpen ? onOpen : undefined}
			onCancelDraft={permissions.canCancelDraft ? onCancelDraft : undefined}
			onReopen={permissions.canReopen ? onReopen : undefined}
			onSendForApproval={permissions.canSendForApproval ? onSendForApproval : undefined}
			onApprove={permissions.canApprove ? onApprove : undefined}
			onReject={permissions.canReject ? onReject : undefined}
			onViewApprovalLog={permissions.canViewApprovalLog ? onViewApprovalLog : undefined}
			onClone={permissions.canClone ? onClone : undefined}
			loading={loading}
			disabled={disabled}
		/>
	);
}

export default IndentApprovalBar;
