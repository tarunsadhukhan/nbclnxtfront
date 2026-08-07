import React from "react";
import { ApprovalActionsBar, type ApprovalInfo, type ApprovalActionPermissions } from "@/components/ui/transaction";

type SalesInvoiceApprovalBarProps = {
	approvalInfo: ApprovalInfo;
	permissions: ApprovalActionPermissions;
	loading: boolean;
	onApprove: () => Promise<void>;
	onReject: (reason: string) => Promise<void>;
	onOpen: () => Promise<void>;
	onCancelDraft: () => Promise<void>;
	onReopen: () => Promise<void>;
	onSendForApproval: () => Promise<void>;
	onViewApprovalLog?: () => void;
};

export function SalesInvoiceApprovalBar({
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
}: SalesInvoiceApprovalBarProps) {
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

export default SalesInvoiceApprovalBar;
