import type { TransactionAction } from "../TransactionWrapper";
import type { ApprovalInfo, ApprovalActionPermissions } from "./ApprovalActionsBar";

export type ApprovalActionHandlers = {
	onOpen?: () => void;
	onCancelDraft?: () => void;
	onReopen?: () => void;
	onSendForApproval?: () => void;
	onApprove?: () => void;
	onReject?: () => void;
	onViewApprovalLog?: () => void;
	onClone?: () => void;
};

export type BuildApprovalActionsOptions = {
	approvalInfo: ApprovalInfo;
	permissions: ApprovalActionPermissions;
	handlers: ApprovalActionHandlers;
	loading?: boolean;
	disabled?: boolean;
};

/**
 * Converts approval state + permissions + handlers into TransactionAction[] format
 * for use with TransactionWrapper.primaryActions.
 *
 * Mirrors the button logic from ApprovalActionsBar.getVisibleButtons but outputs
 * TransactionAction[] instead of rendered JSX.
 */
export function buildApprovalTransactionActions({
	approvalInfo,
	permissions,
	handlers,
	loading = false,
	disabled = false,
}: BuildApprovalActionsOptions): TransactionAction[] {
	const { statusId } = approvalInfo;
	const isDisabled = disabled || loading;
	const actions: TransactionAction[] = [];

	// Draft (21)
	if (statusId === 21) {
		if (permissions.canOpen && handlers.onOpen) {
			actions.push({
				label: "Open",
				onClick: handlers.onOpen,
				disabled: isDisabled,
				loading,
			});
		}
		if (permissions.canCancelDraft && handlers.onCancelDraft) {
			actions.push({
				label: "Cancel Draft",
				onClick: handlers.onCancelDraft,
				variant: "ghost",
				disabled: isDisabled,
			});
		}
	}

	// Cancelled (6)
	if (statusId === 6) {
		if (permissions.canReopen && handlers.onReopen) {
			actions.push({
				label: "Re-Open",
				onClick: handlers.onReopen,
				variant: "secondary",
				disabled: isDisabled,
			});
		}
	}

	// Open (1)
	if (statusId === 1) {
		if (permissions.canApprove && handlers.onApprove) {
			actions.push({
				label: "Approve",
				onClick: handlers.onApprove,
				disabled: isDisabled,
				className: "bg-green-600 hover:bg-green-700 text-white",
			});
		}
	}

	// Pending Approval (20)
	if (statusId === 20) {
		if (permissions.canApprove && handlers.onApprove) {
			actions.push({
				label: "Approve",
				onClick: handlers.onApprove,
				disabled: isDisabled,
				className: "bg-green-600 hover:bg-green-700 text-white",
			});
		}
		if (permissions.canReject && handlers.onReject) {
			actions.push({
				label: "Reject",
				onClick: handlers.onReject,
				variant: "destructive",
				disabled: isDisabled,
			});
		}
		if (permissions.canViewApprovalLog && handlers.onViewApprovalLog) {
			actions.push({
				label: "View Approval Log",
				onClick: handlers.onViewApprovalLog,
				variant: "outline",
				disabled: isDisabled,
			});
		}
	}

	// Approved (3)
	if (statusId === 3) {
		if (permissions.canViewApprovalLog && handlers.onViewApprovalLog) {
			actions.push({
				label: "View Approval Log",
				onClick: handlers.onViewApprovalLog,
				variant: "outline",
				disabled: isDisabled,
			});
		}
		if (permissions.canClone && handlers.onClone) {
			actions.push({
				label: "Clone",
				onClick: handlers.onClone,
				variant: "outline",
				disabled: isDisabled,
			});
		}
	}

	// Rejected (4)
	if (statusId === 4) {
		if (permissions.canReopen && handlers.onReopen) {
			actions.push({
				label: "Re-Open",
				onClick: handlers.onReopen,
				variant: "secondary",
				disabled: isDisabled,
			});
		}
		if (permissions.canClone && handlers.onClone) {
			actions.push({
				label: "Clone",
				onClick: handlers.onClone,
				variant: "outline",
				disabled: isDisabled,
			});
		}
		if (permissions.canViewApprovalLog && handlers.onViewApprovalLog) {
			actions.push({
				label: "View Approval Log",
				onClick: handlers.onViewApprovalLog,
				variant: "outline",
				disabled: isDisabled,
			});
		}
	}

	// Closed (5)
	if (statusId === 5) {
		if (permissions.canViewApprovalLog && handlers.onViewApprovalLog) {
			actions.push({
				label: "View Approval Log",
				onClick: handlers.onViewApprovalLog,
				variant: "outline",
				disabled: isDisabled,
			});
		}
	}

	return actions;
}
