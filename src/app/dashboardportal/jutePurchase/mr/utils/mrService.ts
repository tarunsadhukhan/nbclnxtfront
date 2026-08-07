/**
 * @file mrService.ts
 * @description API service functions for Jute Material Receipt (MR) module.
 */

import axios from "axios";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { ApprovalActionPermissions } from "@/components/ui/transaction";

// =============================================================================
// TYPES
// =============================================================================

export type MRDetails = {
	id: number;
	branchMrNo: number | null;
	mrDate: string;
	branch: string;
	branchId: number;
	supplier: string | null;
	party: string | null;
	partyId: string | null;
	partyBranchId: number | null;
	status?: string;
	statusId?: number;
	approvalLevel?: number | null;
	maxApprovalLevel?: number | null;
	permissions?: ApprovalActionPermissions;
};

export type StatusChangeResponse = {
	success: boolean;
	message: string;
	mr_id: number;
	status_id?: number;
	status_name?: string;
	branch_mr_no?: number;
};

// =============================================================================
// STATUS CHANGE FUNCTIONS
// =============================================================================

/**
 * Open MR - Changes status from Draft (21) to Open (1).
 * Requires party_id and party_branch_id to be filled.
 */
export async function openMR(mrId: string, branchId: string): Promise<StatusChangeResponse> {
	const payload = {
		mr_id: mrId,
		branch_id: branchId,
	};

	const { data, error } = await fetchWithCookie<StatusChangeResponse>(
		apiRoutesPortalMasters.JUTE_MR_OPEN,
		"POST",
		payload
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from open API");
	}

	return data;
}

/**
 * Set MR to Pending - Changes status from Open (1) to Pending (13).
 * This is a terminal state on this screen (handled by external system).
 */
export async function pendingMR(mrId: string, branchId: string): Promise<StatusChangeResponse> {
	const payload = {
		mr_id: mrId,
		branch_id: branchId,
	};

	const { data, error } = await fetchWithCookie<StatusChangeResponse>(
		apiRoutesPortalMasters.JUTE_MR_PENDING,
		"POST",
		payload
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from pending API");
	}

	return data;
}

/**
 * Approve MR - Changes status to Approved (3) or next approval level.
 * If party_branch_id is provided, it will be saved along with the approval.
 * For final approval, mr_date is MANDATORY and mr_no will be auto-generated.
 */
export async function approveMR(
	mrId: string,
	branchId: string,
	partyBranchId?: number | null,
	mrDate?: string | null,
	menuId?: string | null
): Promise<StatusChangeResponse> {
	const payload: Record<string, unknown> = {
		mr_id: mrId,
		branch_id: branchId,
	};

	// Include party_branch_id if provided (handles case where it was selected but not saved)
	if (partyBranchId != null) {
		payload.party_branch_id = partyBranchId;
	}

	// Include mr_date if provided (mandatory for final approval)
	if (mrDate) {
		payload.mr_date = mrDate;
	}

	// Include menu_id so the backend walks the approval hierarchy (level-based
	// approval via process_approval). Without it, approval is single-step.
	if (menuId) {
		payload.menu_id = Number(menuId);
	}

	const { data, error } = await fetchWithCookie<StatusChangeResponse>(
		apiRoutesPortalMasters.JUTE_MR_APPROVE,
		"POST",
		payload
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from approve API");
	}

	return data;
}

/**
 * Reject MR - Changes status to Rejected (4).
 */
export async function rejectMR(
	mrId: string,
	branchId: string,
	reason: string,
	menuId?: string | null
): Promise<StatusChangeResponse> {
	const payload: Record<string, unknown> = {
		mr_id: mrId,
		branch_id: branchId,
		reason,
	};

	// Reject only fires from Pending Approval (status 20); menu_id lets the
	// backend enforce the current approval level via process_rejection.
	if (menuId) {
		payload.menu_id = Number(menuId);
	}

	const { data, error } = await fetchWithCookie<StatusChangeResponse>(
		apiRoutesPortalMasters.JUTE_MR_REJECT,
		"POST",
		payload
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from reject API");
	}

	return data;
}

/**
 * Cancel MR - Changes status from Open to Cancelled (6).
 */
export async function cancelMR(mrId: string, branchId: string): Promise<StatusChangeResponse> {
	const payload = {
		mr_id: mrId,
		branch_id: branchId,
	};

	const { data, error } = await fetchWithCookie<StatusChangeResponse>(
		apiRoutesPortalMasters.JUTE_MR_CANCEL,
		"POST",
		payload
	);

	if (error) {
		throw new Error(error);
	}

	if (!data) {
		throw new Error("Empty response from cancel API");
	}

	return data;
}

// =============================================================================
// EXCEL DOWNLOAD
// =============================================================================

export interface FetchJuteMRDownloadParams {
	coId: number | string;
	search?: string | null;
	fromDate?: string | null;
	toDate?: string | null;
	statusId?: number | null;
}

/**
 * Download the Jute MR list as an .xlsx blob, applying the same filters
 * (search, from_date, to_date) used by the index grid.
 */
export async function fetchJuteMRDownload(
	params: FetchJuteMRDownloadParams,
): Promise<Blob> {
	const { coId, search, fromDate, toDate, statusId } = params;
	const qs = new URLSearchParams();
	qs.append("co_id", String(coId));
	if (search && search.trim()) qs.append("search", search.trim());
	if (fromDate) qs.append("from_date", fromDate);
	if (toDate) qs.append("to_date", toDate);
	if (statusId != null) qs.append("status_id", String(statusId));

	const url = `${apiRoutesPortalMasters.JUTE_MR_DOWNLOAD}?${qs.toString()}`;
	try {
		const response = await axios.get<Blob>(url, {
			responseType: "blob",
			withCredentials: true,
		});
		return response.data;
	} catch (err: unknown) {
		if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
			try {
				const text = await err.response.data.text();
				const parsed = JSON.parse(text) as { detail?: string };
				throw new Error(parsed.detail ?? "Jute MR download failed");
			} catch {
				throw new Error("Jute MR download failed");
			}
		}
		throw err instanceof Error ? err : new Error(String(err));
	}
}
