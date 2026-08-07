"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, CircularProgress, Box, Typography } from "@mui/material";
import TransactionWrapper from "@/components/ui/TransactionWrapper";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useMenuId } from "@/hooks/useMenuId";
import { MRHeaderForm } from "../components/MRHeaderForm";
import { MRApprovalBar } from "../components/MRApprovalBar";
import { MRApprovalDialog } from "../components/MRApprovalDialog";
import { MRPreview } from "../components/MRPreview";
import { useMRLineItems } from "../hooks/useMRLineItems";
import { useMRApproval } from "../hooks/useMRApproval";
import { MR_STATUS_IDS } from "../utils/mrConstants";
import type { JuteMRHeader, JuteMRLineItemAPI, MRLineItem, MuiFormMode, PartyBranchOption } from "../types/mrTypes";

type JuteMRDetailsResponse = {
	header: JuteMRHeader;
	line_items: JuteMRLineItemAPI[];
};

/**
 * Calculate shortage_kgs and accepted_weight based on formulas:
 * shortage_kgs = actual_weight * (difference of allowable moisture and actual moisture % + claim_dust%)
 * accepted_weight = actual_weight - shortage_kgs
 * All values are rounded to 0 decimal places (whole kg).
 */
function calculateShortageAndAcceptedWeight(
	actualWeight: number | null,
	allowableMoisture: number | null,
	actualMoisture: number | null,
	claimDust: number | null
): { shortageKgs: number | null; acceptedWeight: number | null } {
	if (actualWeight == null || actualWeight <= 0) {
		return { shortageKgs: null, acceptedWeight: null };
	}

	const roundedWeight = Math.round(actualWeight);
	const allowable = allowableMoisture ?? 0;
	const actual = actualMoisture ?? 0;
	const dust = claimDust ?? 0;

	// Calculate moisture difference (only if actual > allowable)
	const moistureDiff = actual > allowable ? actual - allowable : 0;

	// Total deduction percentage
	const deductionPercentage = moistureDiff + dust;

	if (deductionPercentage <= 0) {
		return { shortageKgs: 0, acceptedWeight: roundedWeight };
	}

	// Formula: shortage_kgs = actual_weight * (moisture diff % + claim_dust%)
	const shortageKgs = Math.round(roundedWeight * deductionPercentage / 100.0);

	// Formula: accepted_weight = actual_weight - shortage_kgs (both integers, result is integer)
	const acceptedWeight = Math.max(0, roundedWeight - shortageKgs);

	return { shortageKgs, acceptedWeight };
}

/**
 * Distribute header actual weight to line items proportionally based on actualQty.
 * Uses the largest-remainder method to ensure the sum of line weights
 * equals the header weight exactly (no rounding loss).
 * Also recalculates shortage_kgs and accepted_weight for each line.
 */
function distributeActualWeightToLineItems(
	lineItems: MRLineItem[],
	headerActualWeight: number
): MRLineItem[] {
	if (headerActualWeight <= 0 || lineItems.length === 0) {
		return lineItems;
	}

	const roundedHeaderWeight = Math.round(headerActualWeight);

	// Calculate total actual quantity
	const totalActualQty = lineItems.reduce((sum, li) => sum + (li.actualQty ?? 0), 0);

	if (totalActualQty <= 0) {
		// If no quantities, assign all to first item (single item case)
		if (lineItems.length === 1) {
			const li = lineItems[0];
			const { shortageKgs, acceptedWeight } = calculateShortageAndAcceptedWeight(
				roundedHeaderWeight,
				li.allowableMoisture,
				li.actualMoisture,
				li.claimDust
			);
			return [{
				...li,
				actualWeight: roundedHeaderWeight,
				shortageKgs,
				acceptedWeight,
			}];
		}
		return lineItems;
	}

	// --- Largest-remainder method for fair integer distribution ---
	// 1. Compute exact proportional weights (float) and floor them
	const withQty = lineItems.map((li) => {
		const lineActualQty = li.actualQty ?? 0;
		const exactWeight = lineActualQty > 0
			? (roundedHeaderWeight * lineActualQty) / totalActualQty
			: 0;
		const flooredWeight = Math.floor(exactWeight);
		const fractionalPart = exactWeight - flooredWeight;
		return { li, lineActualQty, flooredWeight, fractionalPart };
	});

	// 2. Calculate remainder to distribute (should be a small integer, 0 to N-1)
	const flooredSum = withQty.reduce((sum, entry) => sum + entry.flooredWeight, 0);
	let remainder = roundedHeaderWeight - flooredSum;

	// 3. Sort by fractional part descending — give +1 kg to lines with highest fractions
	const sortedIndices = withQty
		.map((_, idx) => idx)
		.filter((idx) => withQty[idx].lineActualQty > 0)
		.sort((a, b) => withQty[b].fractionalPart - withQty[a].fractionalPart);

	const finalWeights = withQty.map((entry) => entry.flooredWeight);
	for (const idx of sortedIndices) {
		if (remainder <= 0) break;
		finalWeights[idx] += 1;
		remainder -= 1;
	}

	// 4. Apply distributed weights and recalculate shortage/accepted per line
	return lineItems.map((li, idx) => {
		const lineActualQty = li.actualQty ?? 0;
		if (lineActualQty <= 0) {
			return li;
		}

		const distributedWeight = finalWeights[idx];
		const { shortageKgs, acceptedWeight } = calculateShortageAndAcceptedWeight(
			distributedWeight,
			li.allowableMoisture,
			li.actualMoisture,
			li.claimDust
		);

		return {
			...li,
			actualWeight: distributedWeight,
			shortageKgs,
			acceptedWeight,
		};
	});
}

function JuteMREditPageContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { coId } = useSelectedCompanyCoId();

	const mrIdParam = searchParams?.get("id");
	const modeParam = searchParams?.get("mode") ?? "edit";
	const mode: MuiFormMode = modeParam === "view" ? "view" : "edit";

	// Resolve the MR menu_id so the backend can decide whether this user is the
	// top-ranked approver (gates the Pending action). Falls back to the sidebar
	// menu when not present in the URL.
	const menuIdFromUrl = searchParams?.get("menu_id") || "";
	const { getMenuId } = useMenuId({ transactionType: "mr", menuIdFromUrl });

	const [loading, setLoading] = React.useState(true);
	const [pageError, setPageError] = React.useState<string | null>(null);
	const [header, setHeader] = React.useState<JuteMRHeader | null>(null);
	const [lineItems, setLineItems] = React.useState<MRLineItem[]>([]);
	const [saving, setSaving] = React.useState(false);
	const [warehouseOptions, setWarehouseOptions] = React.useState<Array<{ value: number; label: string }>>([]);
	const [partyBranchOptions, setPartyBranchOptions] = React.useState<PartyBranchOption[]>([]);
	const [partyBranchLoading, setPartyBranchLoading] = React.useState(false);
	const [partyBranchesLoaded, setPartyBranchesLoaded] = React.useState(false);
	// Tracks unsaved user edits. Approval actions (Pending/Open/Approve/etc.)
	// are hidden until isDirty === false to prevent sending stale data to
	// the approval workflow before Save has persisted the latest changes.
	const [isDirty, setIsDirty] = React.useState(false);

	const handleHeaderChange = React.useCallback(
		(field: keyof JuteMRHeader, value: string | number | null) => {
			setIsDirty(true);
			setHeader((prev) => {
				if (!prev) return null;
				const updated = { ...prev, [field]: value };

				// When party_branch_id is changed, also update address and gst_no from the selected branch
				if (field === "party_branch_id") {
					if (value != null) {
						const selectedBranch = partyBranchOptions.find((b) => b.party_mst_branch_id === value);
						if (selectedBranch) {
							updated.party_address = selectedBranch.address;
							updated.party_gst_no = selectedBranch.gst_no;
						}
					} else {
						// Clear fields when party branch is deselected
						updated.party_address = null;
						updated.party_gst_no = null;
					}
				}

				return updated;
			});
		},
		[partyBranchOptions]
	);

	// Build line item columns
	const handleLineFieldChange = React.useCallback(
		(id: string, field: keyof MRLineItem, value: string | number | null) => {
			setIsDirty(true);
			setLineItems((prev) =>
				prev.map((li) => {
					if (li.id !== id) return li;

					// Round actualWeight to 0 decimals when edited manually
					const finalValue = field === "actualWeight" && typeof value === "number"
						? Math.round(value)
						: value;

					const updated = { ...li, [field]: finalValue };

					// Recalculate shortage_kgs and accepted_weight when relevant fields change
					if (
						field === "actualWeight" ||
						field === "allowableMoisture" ||
						field === "actualMoisture" ||
						field === "claimDust"
					) {
						const { shortageKgs, acceptedWeight } = calculateShortageAndAcceptedWeight(
							updated.actualWeight,
							updated.allowableMoisture,
							updated.actualMoisture,
							updated.claimDust
						);
						updated.shortageKgs = shortageKgs;
						updated.acceptedWeight = acceptedWeight;
					}

					return updated;
				})
			);
		},
		[]
	);

	const lineItemColumns = useMRLineItems({
		canEdit: mode !== "view",
		handleLineFieldChange,
		warehouseOptions,
	});

	// Calculate total accepted weight (MR weight) - round as safety net
	const totalAcceptedWeight = React.useMemo(() => {
		return Math.round(lineItems.reduce((sum, li) => sum + (li.acceptedWeight ?? 0), 0));
	}, [lineItems]);

	// Update header MR weight when total changes
	React.useEffect(() => {
		if (mode === "edit") {
			setHeader((prev) => {
				if (!prev) return null;
				// Only update if value has actually changed
				if (prev.mr_weight === totalAcceptedWeight) return prev;
				return { ...prev, mr_weight: totalAcceptedWeight };
			});
		}
	}, [totalAcceptedWeight, mode]);

	const loadWarehouseOptions = React.useCallback(async (branchId: number) => {
		try {
			const url = `${apiRoutesPortalMasters.JUTE_MR_WAREHOUSE_OPTIONS}?branch_id=${branchId}`;
			const { data, error } = await fetchWithCookie<{ warehouses: Array<{ warehouse_id: number; warehouse_name: string; warehouse_path: string }> }>(url, "GET");
			if (error || !data) return;
			
			const options = data.warehouses.map((w) => ({
				value: w.warehouse_id,
				label: w.warehouse_path || w.warehouse_name,
			}));
			setWarehouseOptions(options);
		} catch (err) {
			console.error("Error loading warehouse options:", err);
		}
	}, []);

	/**
	 * Load party branches for a given party_id.
	 * Auto-selects if only one branch exists (mandatory field).
	 */
	const loadPartyBranches = React.useCallback(async (partyId: string, currentPartyBranchId: number | null) => {
		if (!partyId) {
			setPartyBranchOptions([]);
			setPartyBranchesLoaded(false);
			return;
		}
		
		setPartyBranchLoading(true);
		setPartyBranchesLoaded(false);
		try {
			const url = `${apiRoutesPortalMasters.JUTE_MR_PARTY_BRANCHES}?party_id=${partyId}`;
			const { data, error } = await fetchWithCookie<{ branches: PartyBranchOption[] }>(url, "GET");
			if (error || !data) {
				setPartyBranchOptions([]);
				setPartyBranchesLoaded(true);
				return;
			}
			
			const branches = data.branches || [];
			setPartyBranchOptions(branches);
			setPartyBranchesLoaded(true);
			
			// Auto-select if only 1 branch and no branch is currently selected
			if (branches.length === 1 && !currentPartyBranchId) {
				setHeader((prev) => prev ? {
					...prev,
					party_branch_id: branches[0].party_mst_branch_id,
					party_branch_name: branches[0].display,
					party_address: branches[0].address,
					party_gst_no: branches[0].gst_no
				} : null);
			}
		} catch (err) {
			console.error("Error loading party branches:", err);
			setPartyBranchOptions([]);
			setPartyBranchesLoaded(true);
		} finally {
			setPartyBranchLoading(false);
		}
	}, []);

	const loadData = React.useCallback(async () => {
		if (!coId || !mrIdParam) return;
		setLoading(true);
		setPageError(null);

		try {
			const menuId = getMenuId();
			const url = `${apiRoutesPortalMasters.JUTE_MR_BY_ID}?id=${mrIdParam}${menuId ? `&menu_id=${menuId}` : ""}`;
			const { data, error } = await fetchWithCookie<JuteMRDetailsResponse>(url, "GET");
			if (error) {
				setPageError(error);
				setLoading(false);
				return;
			}
			if (!data) {
				setPageError("No data received from server");
				setLoading(false);
				return;
			}

			setHeader(data.header);

			const mappedLineItems: MRLineItem[] = data.line_items.map((li) => {
				const actualMoistureNum = li.actual_moisture
					? parseFloat(li.actual_moisture)
					: null;

				const { shortageKgs, acceptedWeight } = calculateShortageAndAcceptedWeight(
					li.actual_weight,
					li.allowable_moisture,
					actualMoistureNum,
					li.claim_dust
				);

				return {
					id: `mr-li-${li.jute_mr_li_id}`,
					juteMrLiId: li.jute_mr_li_id,
					actualItemId: li.actual_item_grp_id,
					actualItemName: li.actual_group_name || "-",
					actualQualityId: li.actual_item_id,
					actualQualityName: li.actual_quality_name || "-",
					actualQty: li.actual_qty,
					challanWeight: li.challan_weight,
					actualWeight: li.actual_weight,
					allowableMoisture: li.allowable_moisture,
					actualMoisture: actualMoistureNum,
					claimDust: li.claim_dust,
					shortageKgs: shortageKgs ?? li.shortage_kgs,
					acceptedWeight,
					rate: li.rate,
					claimRate: li.claim_rate,
					claimQuality: li.claim_quality,
					waterDamageAmount: li.water_damage_amount,
					premiumAmount: li.premium_amount,
					remarks: li.remarks,
					warehouseId: li.warehouse_id,
					warehousePath: li.warehouse_path,
					unitConversion: li.unit_conversion || null,
				};
			});

			// Auto-apply header actual weight to line items if they don't have weights yet
			const headerActualWeight = data.header.actual_weight;
			const hasExistingWeights = mappedLineItems.some((li) => li.actualWeight != null && li.actualWeight > 0);
			
			if (mode === "edit" && headerActualWeight && headerActualWeight > 0 && !hasExistingWeights) {
				const distributedLineItems = distributeActualWeightToLineItems(mappedLineItems, headerActualWeight);
				setLineItems(distributedLineItems);
			} else {
				setLineItems(mappedLineItems);
			}

			// Fresh load from server — no unsaved edits.
			setIsDirty(false);
		} catch (err) {
			setPageError(err instanceof Error ? err.message : "Failed to load MR data");
		} finally {
			setLoading(false);
		}
	}, [coId, mrIdParam, getMenuId]);

	React.useEffect(() => {
		void loadData();
	}, [loadData]);

	// Load warehouse options when header is available
	React.useEffect(() => {
		if (header?.branch_id) {
			void loadWarehouseOptions(header.branch_id);
		}
	}, [header?.branch_id, loadWarehouseOptions]);

	// Load party branches when party_id is available
	React.useEffect(() => {
		if (header?.party_id) {
			void loadPartyBranches(header.party_id, header.party_branch_id);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [header?.party_id, loadPartyBranches]);
	// Note: We intentionally don't include party_branch_id in deps to avoid re-fetching on selection

	// Approval workflow hook
	const {
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
	} = useMRApproval({
		mode,
		mrId: mrIdParam ?? "",
		header,
		coId,
		partyBranchesLoaded,
		partyBranchOptions,
		getMenuId,
		onRefresh: loadData,
	});

	// Determine if editing is allowed based on status
	const canEdit = React.useMemo(() => {
		if (mode === "view") return false;
		// Allow editing in Draft and Open status
		return statusId === MR_STATUS_IDS.DRAFT || statusId === MR_STATUS_IDS.OPEN;
	}, [mode, statusId]);

	const handleSave = React.useCallback(async () => {
		if (!coId || !header) return;

		setSaving(true);
		setPageError(null);

		try {
			const payload = {
				mr_weight: Math.round(header.mr_weight ?? 0),
				party_branch_id: header.party_branch_id,
				remarks: header.remarks,
				line_items: lineItems.map((li) => ({
					jute_mr_li_id: li.juteMrLiId,
					actual_item_grp_id: li.actualItemId,
					actual_item_id: li.actualQualityId,
					actual_qty: li.actualQty,
					actual_weight: Math.round(li.actualWeight ?? 0),
					allowable_moisture: li.allowableMoisture,
					actual_moisture: li.actualMoisture != null ? li.actualMoisture.toFixed(2) : null,
					claim_dust: li.claimDust,
					shortage_kgs: Math.round(li.shortageKgs ?? 0),
					accepted_weight: Math.round(li.acceptedWeight ?? 0),
					rate: li.rate,
					claim_rate: li.claimRate,
					claim_quality: li.claimQuality,
					water_damage_amount: li.waterDamageAmount,
					premium_amount: li.premiumAmount,
					remarks: li.remarks,
					warehouse_id: li.warehouseId,
				})),
			};

			const url = `${apiRoutesPortalMasters.JUTE_MR_UPDATE}/${header.jute_mr_id}?co_id=${coId}`;
			const { error } = await fetchWithCookie(url, "PUT", payload);
			if (error) {
				setPageError(error);
				setSaving(false);
				return;
			}

			// Reload data to get updated values
			await loadData();
		} catch (err) {
			setPageError(err instanceof Error ? err.message : "Failed to save MR");
		} finally {
			setSaving(false);
		}
	}, [coId, header, lineItems, loadData]);

	if (!mrIdParam) {
		return <Alert severity="error">MR id is required in URL.</Alert>;
	}

	if (loading || !header) {
		return (
			<div className="flex h-64 items-center justify-center">
				<CircularProgress />
			</div>
		);
	}

	const actions: Array<{
		label: string;
		onClick: () => void;
		variant: "default" | "outline";
		disabled?: boolean;
		loading?: boolean;
	}> = [
		{
			label: "Back",
			onClick: () => router.push("/dashboardportal/jutePurchase/mr"),
			variant: "outline",
		},
	];

	// Show Save button only if editing is allowed
	if (canEdit && approvalPermissions.canSave) {
		actions.push({
			label: "Save",
			onClick: handleSave,
			disabled: saving || approvalLoading,
			loading: saving,
			variant: "default",
		});
	}

	return (
		<TransactionWrapper
			title={`Material Receipt - MR #${header.branch_mr_no ?? header.jute_mr_id}`}
			loading={loading}
			statusChip={statusChipProps}
			primaryActions={actions}
			lineItems={{
				items: lineItems,
				columns: lineItemColumns,
				getItemId: (item: MRLineItem) => item.id,
				canEdit: canEdit,
				title: "Line Items",
				subtitle: `${lineItems.length} items | Total Accepted Weight: ${totalAcceptedWeight.toFixed(2)}`,
			}}
			alerts={
				pageError ? (
					<Alert severity="error" onClose={() => setPageError(null)}>
						{pageError}
					</Alert>
				) : null
			}
			contentClassName="max-w-full"
			preview={
				<MRPreview
					header={header}
					lineItems={lineItems}
					totalAcceptedWeight={totalAcceptedWeight}
				/>
			}
			footer={
				isDirty ? (
					<Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
						<Alert severity="info" sx={{ mb: 0 }}>
							<Typography variant="body2">
								You have unsaved changes. Press <strong>Save</strong> to enable approval actions
								(Open / Pending / Approve / Reject / Cancel).
							</Typography>
						</Alert>
					</Box>
				) : (
					<MRApprovalBar
						approvalInfo={approvalInfo}
						permissions={approvalPermissions}
						loading={approvalLoading}
						canSetOpen={canSetOpen}
						canSetPending={canSetPending}
						partyHasNoBranches={partyHasNoBranches}
						onOpen={handleOpen}
						onApprove={handleApprove}
						onReject={handleReject}
						onPending={handlePending}
						onCancel={handleCancel}
						onViewApprovalLog={handleViewApprovalLog}
					/>
				)
			}
		>
			<Box sx={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto", pr: 1 }}>
				<MRHeaderForm 
					header={header} 
					mode={canEdit ? mode : "view"} 
					onHeaderChange={handleHeaderChange}
					partyBranchOptions={partyBranchOptions}
					partyBranchLoading={partyBranchLoading}
					partyBranchesLoaded={partyBranchesLoaded}
					totalAcceptedWeight={totalAcceptedWeight}
				/>
			</Box>
			
			{/* MR Approval Dialog - for entering MR date before final approval */}
			<MRApprovalDialog
				open={approvalDialogOpen}
				loading={approvalLoading}
				onClose={handleApprovalDialogClose}
				onConfirm={handleApproveConfirm}
				defaultDate={header?.jute_mr_date ? String(header.jute_mr_date).slice(0, 10) : undefined}
			/>
		</TransactionWrapper>
	);
}

export default function JuteMREditPage() {
	return (
		<Suspense
			fallback={
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
					<CircularProgress />
				</Box>
			}
		>
			<JuteMREditPageContent />
		</Suspense>
	);
}
