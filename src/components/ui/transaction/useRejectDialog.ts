import React from "react";

export type UseRejectDialogReturn = {
	rejectDialogOpen: boolean;
	rejectReason: string;
	setRejectReason: React.Dispatch<React.SetStateAction<string>>;
	openRejectDialog: () => void;
	handleRejectConfirm: () => void;
	handleRejectCancel: () => void;
};

/**
 * Manages reject dialog state. Extracted from ApprovalActionsBar so it can be
 * reused when approval buttons are rendered via TransactionWrapper.primaryActions.
 *
 * Usage:
 * - Pass `openRejectDialog` as the `onReject` handler to `buildApprovalTransactionActions`
 * - Render a Dialog in JSX using the returned state
 * - `handleRejectConfirm` calls the actual `onReject(reason)` API handler
 */
export function useRejectDialog(
	onReject?: (reason: string) => void | Promise<void>,
): UseRejectDialogReturn {
	const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
	const [rejectReason, setRejectReason] = React.useState("");

	const openRejectDialog = React.useCallback(() => {
		if (!onReject) return;
		setRejectDialogOpen(true);
	}, [onReject]);

	const handleRejectConfirm = React.useCallback(() => {
		if (!onReject) return;
		onReject(rejectReason.trim() || "No reason provided");
		setRejectDialogOpen(false);
		setRejectReason("");
	}, [onReject, rejectReason]);

	const handleRejectCancel = React.useCallback(() => {
		setRejectDialogOpen(false);
		setRejectReason("");
	}, []);

	return {
		rejectDialogOpen,
		rejectReason,
		setRejectReason,
		openRejectDialog,
		handleRejectConfirm,
		handleRejectCancel,
	};
}
