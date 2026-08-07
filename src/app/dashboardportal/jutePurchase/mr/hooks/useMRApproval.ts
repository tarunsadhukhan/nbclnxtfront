/**
 * @file useMRApproval.ts
 * @description Hook for managing MR approval workflow actions.
 * 
 * MR Workflow (MR arrives in Open status):
 * 1. Open → Approval levels → Approved/Rejected
 * 2. Open → Pending (terminal state, handled by external system)
 */

import React from "react";
import { toast } from "@/hooks/use-toast";
import type { MuiFormMode } from "@/components/ui/muiform";
import type { ApprovalInfo, ApprovalActionPermissions, ApprovalStatusId } from "@/components/ui/transaction";
import { MR_STATUS_IDS, MR_STATUS_LABELS, type MRStatusId } from "../utils/mrConstants";
import { openMR, pendingMR, approveMR, rejectMR, cancelMR } from "../utils/mrService";
import type { JuteMRHeader } from "../types/mrTypes";

type UseMRApprovalParams = {
	mode: MuiFormMode;
	mrId: string;
	header: JuteMRHeader | null;
	coId?: string;
	partyBranchesLoaded: boolean;
	partyBranchOptions: Array<{ party_mst_branch_id: number }>;
	/** Resolves the MR menu_id so approval actions can walk the hierarchy. */
	getMenuId: () => string;
	onRefresh: () => Promise<void>;
};

/**
 * Centralises approval-state derivation and the action handlers (pending/approve/reject/cancel).
 * MR arrives in Open status, so there's no Draft→Open transition.
 */
export const useMRApproval = ({
	mode,
	mrId,
	header,
	coId,
	partyBranchesLoaded,
	partyBranchOptions,
	getMenuId,
	onRefresh,
}: UseMRApprovalParams) => {
	const [approvalLoading, setApprovalLoading] = React.useState(false);

	/**
	 * Maps status string to status ID. Used when statusId is not directly available.
	 */
	const mapStatusToId = React.useCallback((status?: string | null): MRStatusId | null => {
		if (!status) return null;
		const normalized = status.toLowerCase();
		if (normalized.includes("draft")) return MR_STATUS_IDS.DRAFT;
		if (normalized === "open") return MR_STATUS_IDS.OPEN;
		if (normalized === "pending" && !normalized.includes("approval")) return MR_STATUS_IDS.PENDING;
		if (normalized.includes("pending") || normalized.includes("approval")) return MR_STATUS_IDS.PENDING_APPROVAL;
		if (normalized === "approved") return MR_STATUS_IDS.APPROVED;
		if (normalized === "rejected" || normalized === "reject") return MR_STATUS_IDS.REJECTED;
		if (normalized === "closed") return MR_STATUS_IDS.CLOSED;
		if (normalized === "cancelled") return MR_STATUS_IDS.CANCELLED;
		return null;
	}, []);

	/**
	 * Derive statusId from header, falling back to OPEN (1) when not available.
	 * MR arrives in Open status by default.
	 */
	const statusId = React.useMemo<MRStatusId>(() => {
		if (header?.status_id) return header.status_id as MRStatusId;
		return mapStatusToId(header?.status) ?? MR_STATUS_IDS.OPEN;
	}, [header, mapStatusToId]);

	/**
	 * Check if party has no branches (prevents approval actions that require party branch).
	 */
	const partyHasNoBranches = React.useMemo((): boolean => {
		return Boolean(partyBranchesLoaded && header?.party_id && partyBranchOptions.length === 0);
	}, [partyBranchesLoaded, header?.party_id, partyBranchOptions.length]);

	/**
	 * Determine approval permissions based on current status and mode.
	 * MR workflow: Open → Pending OR Open → Approval levels → Approved/Rejected
	 */
	const getApprovalPermissions = React.useCallback(
		(status: MRStatusId, currentMode: MuiFormMode): ApprovalActionPermissions => {
			// View mode only allows viewing log
			if (currentMode === "view") {
				return { canViewApprovalLog: true };
			}

			// Open / Pending Approval fallback — used only when backend
			// permissions are not yet available (menu_id unresolved / loading).
			// Deliberately DOES NOT grant Approve/Reject: those are level-aware
			// and must come from the backend, so we fail closed until they load.
			if (status === MR_STATUS_IDS.OPEN) {
				return {
					canSave: true,
					canCancelDraft: true, // Cancel action (Open only)
					canViewApprovalLog: true,
				};
			}

			if (status === MR_STATUS_IDS.PENDING_APPROVAL) {
				return {
					canSave: true,
					canViewApprovalLog: true,
				};
			}

			// Pending (external system): terminal state, read-only
			if (status === MR_STATUS_IDS.PENDING) {
				return { canViewApprovalLog: true };
			}

			// Approved: terminal state
			if (status === MR_STATUS_IDS.APPROVED) {
				return { canViewApprovalLog: true };
			}

			// Rejected: can view log
			if (status === MR_STATUS_IDS.REJECTED) {
				return { canViewApprovalLog: true };
			}

			// Cancelled: can view log
			if (status === MR_STATUS_IDS.CANCELLED) {
				return { canViewApprovalLog: true };
			}

			// Draft: can save and open (if party + branch are selected)
			if (status === MR_STATUS_IDS.DRAFT) {
				const hasParty = Boolean(header?.party_id);
				const hasPartyBranch = Boolean(header?.party_branch_id);
				return {
					canSave: true,
					canOpen: hasParty && hasPartyBranch,
					canViewApprovalLog: true,
				};
			}

			return {};
		},
		[partyHasNoBranches, header?.party_id, header?.party_branch_id],
	);

	const approvalPermissions = React.useMemo(() => {
		if (mode === "view") return { canViewApprovalLog: true };
		// Prefer backend level-aware permissions — Approve/Reject follow the
		// MR's current approval level (only the current-level approver sees
		// them). Fall back to status-based defaults (no Approve) while they
		// load or when no menu_id is available.
		const backend = header?.permissions;
		if (backend && Object.keys(backend).length > 0) {
			return {
				...backend,
				canApprove: Boolean(backend.canApprove) && !partyHasNoBranches,
			};
		}
		return getApprovalPermissions(statusId, mode);
	}, [statusId, mode, header?.permissions, partyHasNoBranches, getApprovalPermissions]);

	/**
	 * Whether the Open button should be shown (only from Draft status).
	 * Disabled if party or party branch is not set.
	 */
	const canSetOpen = React.useMemo(() => {
		return mode !== "view" && statusId === MR_STATUS_IDS.DRAFT;
	}, [mode, statusId]);

	// Approval-level state (populated by the backend when a menu_id is supplied).
	const currentApprovalLevel = header?.approval_level ?? null;
	const maxApprovalLevel = header?.max_approval_level ?? null;

	/**
	 * The MR is at its highest approval level when it has walked up to (or past)
	 * the configured max, OR when at most one level is configured (single-step /
	 * no hierarchy → the first approver is already the highest).
	 */
	const isFinalLevel = React.useMemo(() => {
		if (maxApprovalLevel == null || maxApprovalLevel <= 1) return true;
		return currentApprovalLevel != null && currentApprovalLevel >= maxApprovalLevel;
	}, [currentApprovalLevel, maxApprovalLevel]);

	/**
	 * Whether the Pending button should be shown. Pending parks the MR to the
	 * external system and is offered ONLY to the highest-level approver — so it
	 * requires the current-level approve permission AND the MR being at its
	 * final approval level.
	 */
	const canSetPending = React.useMemo(() => {
		return mode !== "view" && Boolean(approvalPermissions.canApprove) && isFinalLevel;
	}, [mode, approvalPermissions.canApprove, isFinalLevel]);

	/**
	 * Approval info for the approval bar.
	 * Cast statusId to ApprovalStatusId for compatibility, handling Pending (13) specially.
	 */
	const approvalInfo: ApprovalInfo = React.useMemo(() => {
		// For Pending (13), we use CLOSED (5) visually but with custom label
		const displayStatusId: ApprovalStatusId = statusId === MR_STATUS_IDS.PENDING 
			? (MR_STATUS_IDS.CLOSED as ApprovalStatusId) // Use Closed for visual compatibility
			: (statusId as ApprovalStatusId);
		
		return {
			statusId: displayStatusId,
			statusLabel: MR_STATUS_LABELS[statusId] ?? header?.status ?? "Open",
			approvalLevel: currentApprovalLevel,
			maxApprovalLevel: maxApprovalLevel,
			isFinalLevel: isFinalLevel,
		};
	}, [statusId, header?.status, currentApprovalLevel, maxApprovalLevel, isFinalLevel]);

	/**
	 * Status chip props for TransactionWrapper.
	 */
	const statusChipProps = React.useMemo(() => {
		type StatusChipColor = "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info";
		const color: StatusChipColor =
			statusId === MR_STATUS_IDS.APPROVED
				? "success"
				: statusId === MR_STATUS_IDS.REJECTED || statusId === MR_STATUS_IDS.CANCELLED
					? "error"
					: statusId === MR_STATUS_IDS.PENDING_APPROVAL || statusId === MR_STATUS_IDS.PENDING
						? "warning"
						: statusId === MR_STATUS_IDS.OPEN
							? "info"
							: "default";
		return {
			label: MR_STATUS_LABELS[statusId] ?? header?.status ?? "Open",
			color,
		};
	}, [statusId, header?.status]);

	const branchId = String(header?.branch_id ?? "");

	/**
	 * Handle Open action - sets MR from Draft (21) to Open (1).
	 * Validates party and party_branch are set first.
	 */
	const handleOpen = React.useCallback(async () => {
		if (!mrId || !branchId) {
			toast({ variant: "destructive", title: "Missing required information" });
			return;
		}

		if (!header?.party_id) {
			toast({
				variant: "destructive",
				title: "Party required",
				description: "Please select a party before opening the MR.",
			});
			return;
		}

		if (!header?.party_branch_id) {
			toast({
				variant: "destructive",
				title: "Party branch required",
				description: "Please select a party branch before opening the MR.",
			});
			return;
		}

		setApprovalLoading(true);
		try {
			await openMR(mrId, branchId);
			toast({ title: "MR opened successfully" });
			await onRefresh();
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Unable to open MR",
				description: error instanceof Error ? error.message : "Please try again.",
			});
		} finally {
			setApprovalLoading(false);
		}
	}, [mrId, branchId, header?.party_id, header?.party_branch_id, onRefresh]);

	/**
	 * Handle Pending action - sets MR to Pending status (external system).
	 * Available from Open status.
	 */
	const handlePending = React.useCallback(async () => {
		if (!mrId || !branchId) {
			toast({ variant: "destructive", title: "Missing required information" });
			return;
		}

		setApprovalLoading(true);
		try {
			await pendingMR(mrId, branchId);
			toast({ title: "MR set to Pending" });
			await onRefresh();
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Unable to set MR to Pending",
				description: error instanceof Error ? error.message : "Please try again.",
			});
		} finally {
			setApprovalLoading(false);
		}
	}, [mrId, branchId, onRefresh]);

	// Get party_branch_id from header for approval
	const partyBranchId = header?.party_branch_id ?? null;

	// State for approval dialog
	const [approvalDialogOpen, setApprovalDialogOpen] = React.useState(false);

	/**
	 * Approve action. At intermediate levels this advances the MR to the next
	 * approval level directly. At the final level it opens the dialog to collect
	 * the (mandatory) MR date before the final approval.
	 */
	const handleApprove = React.useCallback(async () => {
		if (!mrId || !branchId) {
			toast({ variant: "destructive", title: "Missing required information" });
			return;
		}

		// Validate party branch is selected before approving
		if (header?.party_id && !partyBranchId) {
			toast({
				variant: "destructive",
				title: "Party branch required",
				description: "Please select a party branch before approving."
			});
			return;
		}

		// Final level → collect MR date via the dialog (mandatory on final approval).
		if (isFinalLevel) {
			setApprovalDialogOpen(true);
			return;
		}

		// Intermediate level → advance to the next approval level (no date needed).
		setApprovalLoading(true);
		try {
			await approveMR(mrId, branchId, partyBranchId, null, getMenuId());
			toast({ title: "MR moved to next approval level" });
			await onRefresh();
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Unable to approve MR",
				description: error instanceof Error ? error.message : "Please try again.",
			});
		} finally {
			setApprovalLoading(false);
		}
	}, [mrId, branchId, partyBranchId, header?.party_id, isFinalLevel, getMenuId, onRefresh]);

	/**
	 * Close the approval dialog.
	 */
	const handleApprovalDialogClose = React.useCallback(() => {
		setApprovalDialogOpen(false);
	}, []);

	/**
	 * Confirm approval with the provided MR date.
	 * Called when user confirms in the approval dialog.
	 */
	const handleApproveConfirm = React.useCallback(async (mrDate: string) => {
		if (!mrId || !branchId) {
			toast({ variant: "destructive", title: "Missing required information" });
			return;
		}

		setApprovalLoading(true);
		try {
			await approveMR(mrId, branchId, partyBranchId, mrDate, getMenuId());
			toast({ title: "MR approved successfully" });
			setApprovalDialogOpen(false);
			await onRefresh();
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Unable to approve MR",
				description: error instanceof Error ? error.message : "Please try again.",
			});
		} finally {
			setApprovalLoading(false);
		}
	}, [mrId, branchId, partyBranchId, getMenuId, onRefresh]);

	/**
	 * Handle Reject action.
	 */
	const handleReject = React.useCallback(
		async (reason: string) => {
			if (!mrId || !branchId) {
				toast({ variant: "destructive", title: "Missing required information" });
				return;
			}

			setApprovalLoading(true);
			try {
				await rejectMR(mrId, branchId, reason, getMenuId());
				toast({ title: "MR rejected" });
				await onRefresh();
			} catch (error) {
				toast({
					variant: "destructive",
					title: "Unable to reject MR",
					description: error instanceof Error ? error.message : "Please try again.",
				});
			} finally {
				setApprovalLoading(false);
			}
		},
		[mrId, branchId, getMenuId, onRefresh],
	);

	/**
	 * Handle Cancel action - cancels MR from Open status.
	 */
	const handleCancel = React.useCallback(async () => {
		if (!mrId || !branchId) {
			toast({ variant: "destructive", title: "Missing required information" });
			return;
		}

		setApprovalLoading(true);
		try {
			await cancelMR(mrId, branchId);
			toast({ title: "MR cancelled" });
			await onRefresh();
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Unable to cancel MR",
				description: error instanceof Error ? error.message : "Please try again.",
			});
		} finally {
			setApprovalLoading(false);
		}
	}, [mrId, branchId, onRefresh]);

	/**
	 * Handle View Approval Log action.
	 */
	const handleViewApprovalLog = React.useCallback(() => {
		if (!mrId) return;
		// TODO: Implement approval log modal
		toast({ title: "Opening approval log...", description: "Feature coming soon" });
	}, [mrId]);

	return {
		approvalLoading,
		approvalInfo,
		approvalPermissions,
		statusChipProps,
		statusId,
		canSetOpen,
		canSetPending,
		partyHasNoBranches,
		// Approval dialog state
		approvalDialogOpen,
		handleApprovalDialogClose,
		handleApproveConfirm,
		// Action handlers
		handleOpen,
		handlePending,
		handleApprove,
		handleReject,
		handleCancel,
		handleViewApprovalLog,
	};
};
