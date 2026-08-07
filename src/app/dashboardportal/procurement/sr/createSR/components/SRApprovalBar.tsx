"use client";

import * as React from "react";
import { Stack, CircularProgress } from "@mui/material";
import { Button } from "@/components/ui/button";
import { Save, Send, CheckCircle, XCircle } from "lucide-react";

type SRApprovalBarProps = {
	saving: boolean;
	canEdit: boolean;
	isDraft: boolean;
	isOpen: boolean;
	onSave: () => void;
	onOpen: () => void;
	onApprove: () => void;
	onReject: () => void;
};

/**
 * Approval action bar for SR.
 */
export const SRApprovalBar: React.FC<SRApprovalBarProps> = ({
	saving,
	canEdit,
	isDraft,
	isOpen,
	onSave,
	onOpen,
	onApprove,
	onReject,
}) => {
	return (
		<Stack direction="row" spacing={2} justifyContent="flex-end">
			{canEdit && isDraft && (
				<>
					<Button variant="outline" onClick={onSave} disabled={saving}>
						<Stack direction="row" spacing={1} alignItems="center">
							{saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
							<span>Save Draft</span>
						</Stack>
					</Button>
					<Button variant="default" onClick={onOpen} disabled={saving}>
						<Stack direction="row" spacing={1} alignItems="center">
							{saving ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
							<span>Open for Approval</span>
						</Stack>
					</Button>
				</>
			)}
			{isOpen && (
				<>
					<Button variant="destructive" onClick={onReject} disabled={saving}>
						<Stack direction="row" spacing={1} alignItems="center">
							{saving ? <CircularProgress size={16} color="inherit" /> : <XCircle size={16} />}
							<span>Reject</span>
						</Stack>
					</Button>
					<Button variant="default" onClick={onApprove} disabled={saving}>
						<Stack direction="row" spacing={1} alignItems="center">
							{saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircle size={16} />}
							<span>Approve</span>
						</Stack>
					</Button>
				</>
			)}
		</Stack>
	);
};
