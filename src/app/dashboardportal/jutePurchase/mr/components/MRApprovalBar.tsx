/**
 * @file MRApprovalBar.tsx
 * @description Approval actions bar for Jute Material Receipt.
 * 
 * MR Workflow (MR arrives in Open status):
 * 1. Open → Approval levels → Approved/Rejected
 * 2. Open → Pending (terminal state, handled by external system)
 */

import React from "react";
import { Button } from "@mui/material";
import { ApprovalActionsBar, type ApprovalInfo, type ApprovalActionPermissions } from "@/components/ui/transaction";

type MRApprovalBarProps = {
	approvalInfo: ApprovalInfo;
	permissions: ApprovalActionPermissions;
	loading: boolean;
	canSetOpen: boolean;
	canSetPending: boolean;
	partyHasNoBranches: boolean;
	onOpen: () => Promise<void>;
	onApprove: () => void | Promise<void>;
	onReject: (reason: string) => Promise<void>;
	onPending: () => Promise<void>;
	onCancel: () => Promise<void>;
	onViewApprovalLog?: () => void;
};

/**
 * Wraps ApprovalActionsBar and adds custom Pending button for MR workflow.
 * MR arrives in Open status, so actions available are: Pending, Approve, Reject, Cancel.
 */
export function MRApprovalBar({
	approvalInfo,
	permissions,
	loading,
	canSetOpen,
	canSetPending,
	partyHasNoBranches,
	onOpen,
	onApprove,
	onReject,
	onPending,
	onCancel,
	onViewApprovalLog,
}: MRApprovalBarProps) {
	return (
		<div className="flex items-center gap-2 flex-wrap">
			{/* Custom Pending Button - only shown when in Open status */}
			{canSetPending && (
				<Button
					variant="outlined"
					color="warning"
					size="small"
					disabled={loading}
					onClick={onPending}
					title="Set MR to Pending status (handled by external system)"
				>
					Pending
				</Button>
			)}
			
			{/* Standard Approval Actions Bar */}
			<ApprovalActionsBar
				approvalInfo={approvalInfo}
				permissions={{
					...permissions,
					// Disable Approve if party has no branches
					canApprove: permissions.canApprove && !partyHasNoBranches,
				}}
				onOpen={onOpen}
				onApprove={onApprove}
				onReject={onReject}
				onCancelDraft={onCancel}
				onViewApprovalLog={onViewApprovalLog}
				loading={loading}
			/>
		</div>
	);
}

export default MRApprovalBar;
