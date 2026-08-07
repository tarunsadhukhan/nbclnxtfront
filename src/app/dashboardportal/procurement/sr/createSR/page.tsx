"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Alert, Paper, CircularProgress } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import TransactionWrapper from "@/components/ui/TransactionWrapper";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { toast } from "@/hooks/use-toast";

import type { SRHeader, SRLineItem, SRHeaderRaw, SRLineItemRaw, WarehouseOption, AdditionalChargeOption, SRAdditionalChargeRaw, PoAdditionalCandidate, PoAdditionalCandidateReason } from "./types/srTypes";
import { mapSRHeader, mapSRLineItems } from "./utils/srMappers";
import { calculateTotals } from "./utils/srCalculations";
import { getStatusColor } from "./utils/srConstants";
import { useSRFormState } from "./hooks/useSRFormState";
import { useSRLineItems } from "./hooks/useSRLineItems";
import { useSRApproval } from "./hooks/useSRApproval";
import { useSRAdditionalCharges } from "./hooks/useSRAdditionalCharges";
import { SRHeaderForm } from "./components/SRHeaderForm";
import { useSRLineItemColumns } from "./components/SRLineItemsTable";
import { SRTotalsDisplay } from "./components/SRTotalsDisplay";
import { SRPreview } from "./components/SRPreview";
import { SRAdditionalCharges } from "./components/SRAdditionalCharges";

// Reason → user-facing toast description when PO additional charges cannot be auto-filled
function reasonToMessage(reason: PoAdditionalCandidateReason): string {
	switch (reason) {
		case "no_po":
			return "No PO is linked to this inward.";
		case "missing_po_on_line":
			return "One or more line items have no PO reference.";
		case "multiple_pos":
			return "Line items span multiple POs.";
		case "incomplete_po_coverage":
			return "Not all lines of the PO are included in this inward.";
		default:
			return "Unknown reason.";
	}
}

// Loading fallback for Suspense
function SRPageLoading() {
	return (
		<div className="flex items-center justify-center min-h-100">
			<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
		</div>
	);
}

export default function SRTransactionPage() {
	return (
		<Suspense fallback={<SRPageLoading />}>
			<SRTransactionPageContent />
		</Suspense>
	);
}

function SRTransactionPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const inwardId = searchParams?.get("id") || "";
	const modeParam = searchParams?.get("mode") || "edit";
	const isViewMode = modeParam === "view";
	const { coId } = useSelectedCompanyCoId();

	// State
	const [header, setHeader] = React.useState<SRHeader | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [pageError, setPageError] = React.useState<string | null>(null);
	const [warehouseOptions, setWarehouseOptions] = React.useState<WarehouseOption[]>([]);
	const [additionalChargeOptions, setAdditionalChargeOptions] = React.useState<AdditionalChargeOption[]>([]);
	// Tracks whether there are unsaved edits to the form — used to gate the Approve button
	// so users can't approve with in-flight changes that would be lost.
	const [isDirty, setIsDirty] = React.useState(false);

	// Form state hook
	const {
		srDate,
		setSRDate,
		srRemarks,
		setSRRemarks,
		editableHeader,
		setEditableHeaderField,
		resetFormState,
	} = useSRFormState();

	// Line items hook
	const { lineItems, setLineItems, handleLineItemChange } = useSRLineItems({ header });

	// Additional charges hook
	const mode = isViewMode ? "view" : "edit";
	const {
		charges: additionalCharges,
		addCharge,
		removeCharge,
		updateCharge,
		replaceCharges,
		mapRawToCharges,
		getChargesToSave,
		totalChargesAmount,
		chargesTotals,
	} = useSRAdditionalCharges({ mode, header });

	// Dirty-tracking wrappers around user-driven change handlers. fetchSRData calls
	// the raw setters (setSRDate via resetFormState, setLineItems, replaceCharges)
	// directly so a fresh server load does NOT mark the form dirty.
	const handleSRDateChange = React.useCallback((value: string) => {
		setSRDate(value);
		setIsDirty(true);
	}, [setSRDate]);

	const handleSRRemarksChange = React.useCallback((value: string) => {
		setSRRemarks(value);
		setIsDirty(true);
	}, [setSRRemarks]);

	// Dirty-tracked single-field updater for editable inward header fields.
	const handleEditableHeaderFieldChange = React.useCallback<typeof setEditableHeaderField>((field, value) => {
		setEditableHeaderField(field, value);
		setIsDirty(true);
	}, [setEditableHeaderField]);

	const handleLineItemChangeDirty = React.useCallback<typeof handleLineItemChange>((...args) => {
		handleLineItemChange(...args);
		setIsDirty(true);
	}, [handleLineItemChange]);

	const handleAddCharge = React.useCallback(() => {
		addCharge();
		setIsDirty(true);
	}, [addCharge]);

	const handleRemoveCharge = React.useCallback((id: string) => {
		removeCharge(id);
		setIsDirty(true);
	}, [removeCharge]);

	const handleUpdateCharge = React.useCallback<typeof updateCharge>((...args) => {
		updateCharge(...args);
		setIsDirty(true);
	}, [updateCharge]);

	// Supplier GST-state picker (direct/no-PO inwards). Updating the header's
	// supplier state re-triggers the line-item GST recompute in useSRLineItems.
	const handleSupplierBranchChange = React.useCallback((branchId: number | null) => {
		setHeader((prev) => {
			if (!prev) return prev;
			const opt = prev.supplier_branch_options.find((o) => o.party_mst_branch_id === branchId);
			return {
				...prev,
				supplier_branch_id: branchId,
				supplier_state_id: opt?.state_id ?? null,
				supplier_state_name: opt?.state_name ?? "",
			};
		});
		setIsDirty(true);
	}, []);

	// Fetch SR data
	const fetchSRData = React.useCallback(async () => {
		if (!inwardId) {
			setPageError("No inward ID provided");
			setLoading(false);
			return;
		}

		setLoading(true);
		setPageError(null);

		try {
			const query = new URLSearchParams();
			if (coId) query.set("co_id", String(coId));
			// branch_id can be added here if available from header or context
			// if (branchId) query.set("branch_id", String(branchId));

			const url = `${apiRoutesPortalMasters.SR_GET_BY_INWARD_ID}/${inwardId}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const result = data as {
				header?: SRHeaderRaw;
				line_items?: SRLineItemRaw[];
				warehouses?: Array<{ warehouse_id: number; warehouse_name: string; warehouse_path?: string; branch_id?: number }>;
				additional_charges_options?: AdditionalChargeOption[];
				additional_charges?: SRAdditionalChargeRaw[];
				po_additional_candidate?: PoAdditionalCandidate;
			};

			// Map header
			const mappedHeader = mapSRHeader(result.header);
			setHeader(mappedHeader);

			// Reset form state with header values
			resetFormState(mappedHeader);

			// Map line items
			const mappedItems = mapSRLineItems(result.line_items, mappedHeader);
			setLineItems(mappedItems);

			// Map warehouse options (filter by branch if needed, dedupe by warehouse_id)
			const warehouseData = result.warehouses ?? [];
			const branchId = mappedHeader.branch_id;
			const filteredWarehouses = branchId
				? warehouseData.filter((wh) => !wh.branch_id || wh.branch_id === branchId)
				: warehouseData;
			
			// Dedupe by warehouse_id to avoid duplicate key errors
			const seenIds = new Set<string>();
			const uniqueWarehouses = filteredWarehouses.filter((wh) => {
				const id = String(wh.warehouse_id);
				if (seenIds.has(id)) return false;
				seenIds.add(id);
				return true;
			});
			
			const mappedWarehouses: WarehouseOption[] = uniqueWarehouses.map((wh) => ({
				label: wh.warehouse_path || wh.warehouse_name,
				value: String(wh.warehouse_id),
				branchId: wh.branch_id,
			}));

			// Ensure any warehouse referenced by line items is included in options
			// (handles case where the warehouse list from API doesn't include the saved value)
			const warehouseValueSet = new Set(mappedWarehouses.map((w) => w.value));
			for (const li of mappedItems) {
				if (li.warehouse_id && !warehouseValueSet.has(String(li.warehouse_id))) {
					mappedWarehouses.push({
						label: li.warehouse_path || li.warehouse_name || `Warehouse ${li.warehouse_id}`,
						value: String(li.warehouse_id),
					});
					warehouseValueSet.add(String(li.warehouse_id));
				}
			}

			setWarehouseOptions(mappedWarehouses);

			// Map additional charge options
			setAdditionalChargeOptions(result.additional_charges_options ?? []);

			// Map existing additional charges
			const hasSavedCharges = (result.additional_charges?.length ?? 0) > 0;
			if (hasSavedCharges) {
				const mappedCharges = mapRawToCharges(result.additional_charges!);
				replaceCharges(mappedCharges);
			}

			// Auto-populate from PO on first load only:
			// - SR has no saved charges yet
			// - SR has never been saved (sr_no is empty)
			const hasBeenSaved = Boolean(mappedHeader.sr_no);
			const candidate = result.po_additional_candidate;
			if (!hasSavedCharges && !hasBeenSaved && candidate) {
				if (candidate.eligible && candidate.charges.length > 0) {
					const mapped = mapRawToCharges(candidate.charges);
					replaceCharges(mapped);
					toast({
						title: "Additional charges loaded",
						description: "Auto-filled from the originating PO. Review before saving.",
					});
				} else if (candidate.reason) {
					toast({
						title: "Additional charges not auto-filled",
						description: reasonToMessage(candidate.reason),
						variant: "destructive",
					});
				}
			}

			// Form state now mirrors the server — clear any pending dirty flag from a prior edit.
			setIsDirty(false);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load SR data";
			setPageError(message);
		} finally {
			setLoading(false);
		}
	}, [inwardId, coId, resetFormState, setLineItems, mapRawToCharges, replaceCharges]);

	// Initial fetch
	React.useEffect(() => {
		fetchSRData();
	}, [fetchSRData]);

	// Approval hook
	const {
		saving,
		canEdit,
		isDraftSaved,
		isOpen,
		handleSave,
		handleOpen,
		handleApprove,
		handleReject,
	} = useSRApproval({
		inwardId,
		header,
		srDate,
		srRemarks,
		editableHeader,
		lineItems,
		additionalCharges,
		getChargesToSave,
		onRefresh: fetchSRData,
	});

	// Column definitions
	const columns = useSRLineItemColumns({
		canEdit: canEdit && !isViewMode,
		onLineItemChange: handleLineItemChangeDirty,
		warehouseOptions,
	});

	// Calculate totals
	const totals = React.useMemo(() => calculateTotals(lineItems), [lineItems]);

	// Navigation
	const handleBack = React.useCallback(() => {
		router.push("/dashboardportal/procurement/sr");
	}, [router]);

	// Build actions for TransactionWrapper
	const primaryActions = React.useMemo(() => {
		const actions: Array<{
			label: string;
			onClick: () => void;
			disabled: boolean;
			loading: boolean;
			variant: "default" | "outline" | "destructive";
		}> = [];

		// Save button — always available when editing is possible
		if (canEdit && !isViewMode) {
			actions.push({
				label: "Save",
				onClick: handleSave,
				disabled: saving,
				loading: saving,
				variant: "outline" as const,
			});
		}

		// Open for Approval — only after the SR has been saved at least once
		// (isDraftSaved is true only when sr_status === DRAFT, not when 0/unsaved)
		if (canEdit && !isViewMode && isDraftSaved) {
			actions.push({
				label: "Open for Approval",
				onClick: handleOpen,
				disabled: saving,
				loading: saving,
				variant: "default" as const,
			});
		}

		// Reject — available whenever the SR is Open (unsaved edits are discarded anyway on reject).
		if (isOpen) {
			actions.push({
				label: "Reject",
				onClick: handleReject,
				disabled: saving,
				loading: saving,
				variant: "destructive" as const,
			});
		}

		// Approve — hidden while the form has unsaved edits, since SR_APPROVE does not
		// persist in-flight field changes and would approve stale values.
		if (isOpen && !isDirty) {
			actions.push({
				label: "Approve",
				onClick: handleApprove,
				disabled: saving,
				loading: saving,
				variant: "default" as const,
			});
		}

		return actions;
	}, [canEdit, isViewMode, isDraftSaved, isOpen, isDirty, saving, handleSave, handleOpen, handleApprove, handleReject]);

	// Error state
	if (pageError && !loading) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error" sx={{ mb: 2 }}>
					{pageError}
				</Alert>
				<button
					type="button"
					className="inline-flex items-center gap-2 text-sm"
					onClick={handleBack}
				>
					<ArrowLeft size={16} />
					Back to List
				</button>
			</Box>
		);
	}

	return (
		<TransactionWrapper
			title="Stores Receipt"
			subtitle="Enter accepted rates and approve stores receipt"
			statusChip={
				header
					? {
							label: header.sr_no ? `SR: ${header.sr_no} - ${header.sr_status_name}` : header.sr_status_name || "Pending",
							color: getStatusColor(header.sr_status || 0),
						}
					: undefined
			}
			backAction={{
				label: "Back to List",
				onClick: handleBack,
			}}
			loading={loading}
			primaryActions={primaryActions}
			actionsAfterFooter
			lineItems={{
				title: "Line Items",
				subtitle: "Items from inspected Inward",
				items: lineItems,
				getItemId: (item: SRLineItem) => item.id,
				canEdit: canEdit && !isViewMode,
				columns,
				selectable: false,
			}}
			footer={
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					{/* Additional Charges Section */}
					<SRAdditionalCharges
						charges={additionalCharges}
						options={additionalChargeOptions}
						canEdit={canEdit && !isViewMode}
						onAddCharge={handleAddCharge}
						onRemoveCharge={handleRemoveCharge}
						onChargeChange={handleUpdateCharge}
					/>
					<SRTotalsDisplay totals={totals} chargesTotals={chargesTotals} />
				</Box>
			}
			preview={
				<SRPreview
					header={header}
					lineItems={lineItems}
					totals={totals}
					chargesTotals={chargesTotals}
					additionalCharges={additionalCharges}
					srDate={srDate}
					srRemarks={srRemarks}
					coId={coId}
				/>
			}
		>
			<Paper variant="outlined" sx={{ p: 3 }}>
				<SRHeaderForm
					header={header}
					srDate={srDate}
					onSRDateChange={handleSRDateChange}
					srRemarks={srRemarks}
					onSRRemarksChange={handleSRRemarksChange}
					editableHeader={editableHeader}
					onEditableHeaderFieldChange={handleEditableHeaderFieldChange}
					onSupplierBranchChange={handleSupplierBranchChange}
					canEdit={canEdit && !isViewMode}
				/>
			</Paper>
		</TransactionWrapper>
	);
}
