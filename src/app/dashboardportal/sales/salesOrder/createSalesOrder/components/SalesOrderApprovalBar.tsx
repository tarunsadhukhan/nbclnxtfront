import React from "react";
import { ApprovalActionsBar, type ApprovalInfo, type ApprovalActionPermissions } from "@/components/ui/transaction";

type SalesOrderApprovalBarProps = {
	approvalInfo: ApprovalInfo;
	permissions: ApprovalActionPermissions;
	loading: boolean;
	onApprove: () => Promise<void> | void;
	onReject: (reason: string) => Promise<void> | void;
	onOpen: () => Promise<void> | void;
	onCancelDraft: () => Promise<void> | void;
	onReopen: () => Promise<void> | void;
	onSendForApproval: () => Promise<void> | void;
	onViewApprovalLog?: () => void;
};

export function SalesOrderApprovalBar({
	approvalInfo,
	permissions,
	loading,
	onApprove,
	onReject,
	onOpen,
	onCancelDraft,
	onReopen,
	onSendForApproval,
	onViewApprovalLog,
}: SalesOrderApprovalBarProps) {
	return (
		<ApprovalActionsBar
			approvalInfo={approvalInfo}
			permissions={permissions}
			onApprove={onApprove}
			onReject={onReject}
			onOpen={onOpen}
			onCancelDraft={onCancelDraft}
			onReopen={onReopen}
			onSendForApproval={onSendForApproval}
			onViewApprovalLog={onViewApprovalLog}
			loading={loading}
		/>
	);
}

export default SalesOrderApprovalBar;
