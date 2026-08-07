"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Box,
	Paper,
	Typography,
	Button,
	Alert,
	TextField,
	CircularProgress,
	Divider,
	Chip,
	Stack,
	Autocomplete,
} from "@mui/material";
import { Save, ArrowLeft, CheckCircle } from "lucide-react";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import MaterialInspectionPreview from "./components/MaterialInspectionPreview";

/**
 * Editable text cell component that manages its own local state
 * to avoid focus issues with DataGrid re-renders
 */
const EditableTextCell: React.FC<{
	initialValue: string;
	disabled: boolean;
	placeholder: string;
	onCommit: (value: string) => void;
}> = ({ initialValue, disabled, placeholder, onCommit }) => {
	const [localValue, setLocalValue] = React.useState(initialValue);

	// Sync with parent when initialValue changes (e.g., on data load)
	React.useEffect(() => {
		setLocalValue(initialValue);
	}, [initialValue]);

	return (
		<TextField
			size="small"
			variant="outlined"
			value={localValue}
			disabled={disabled}
			placeholder={placeholder}
			onChange={(e) => setLocalValue(e.target.value.slice(0, 150))}
			onBlur={() => {
				if (localValue !== initialValue) {
					onCommit(localValue);
				}
			}}
			onKeyDown={(e) => e.stopPropagation()}
			inputProps={{ maxLength: 150 }}
			sx={{ width: "100%" }}
		/>
	);
};

/**
 * Editable number cell for rejected quantity
 */
const EditableNumberCell: React.FC<{
	initialValue: number;
	maxValue: number;
	disabled: boolean;
	onCommit: (value: number) => void;
}> = ({ initialValue, maxValue, disabled, onCommit }) => {
	const [localValue, setLocalValue] = React.useState<string>(String(initialValue));

	React.useEffect(() => {
		setLocalValue(String(initialValue));
	}, [initialValue]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setLocalValue(val);
		// Immediately commit numeric changes for approved_qty recalculation
		const numVal = Number(val) || 0;
		if (numVal >= 0 && numVal <= maxValue) {
			onCommit(numVal);
		}
	};

	return (
		<TextField
			type="number"
			size="small"
			variant="outlined"
			value={localValue}
			disabled={disabled}
			onChange={handleChange}
			inputProps={{ min: 0, max: maxValue }}
			sx={{ width: 90 }}
		/>
	);
};

/**
 * Types for inspection data
 */
type InspectionLineItem = {
	id: string;
	po_no_formatted: string;
	inward_dtl_id: number;
	full_item_code: string;
	item_desc: string;
	make_desc: string;
	uom_name: string;
	inward_qty: number;
	rejected_qty: number;
	approved_qty: number;
	rejection_reason: string;
	po_rate: number;
	// Make options for dropdown
	accepted_item_make_id: number | null;
	make_options?: Array<{ label: string; value: string }>;
};

type InspectionHeader = {
	inward_id: number;
	inward_no: string;
	inward_date: string;
	branch_name: string;
	supplier_name: string;
	inspection_check: boolean;
	co_id?: string | number | null;
	branch_id?: string | number | null;
};

/**
 * Format date to dd-MMM-yyyy
 */
const formatDate = (value?: string) => {
	if (!value) return "-";
	try {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		}).format(date);
	} catch {
		return value;
	}
};

/**
 * Loading fallback for Suspense
 */
function InspectionPageLoading() {
	return (
		<div className="flex items-center justify-center min-h-100">
			<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
		</div>
	);
}

export default function MaterialInspectionEditPage() {
	return (
		<Suspense fallback={<InspectionPageLoading />}>
			<MaterialInspectionEditPageContent />
		</Suspense>
	);
}

function MaterialInspectionEditPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const inwardId = searchParams?.get("id") || "";
	const { coId } = useSelectedCompanyCoId();

	const [header, setHeader] = React.useState<InspectionHeader | null>(null);
	const [lineItems, setLineItems] = React.useState<InspectionLineItem[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [saving, setSaving] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	/**
	 * Fetch inspection data
	 */
	const fetchInspectionData = React.useCallback(async () => {
		if (!inwardId) {
			setErrorMessage("No inward ID provided");
			setLoading(false);
			return;
		}

		setLoading(true);
		setErrorMessage(null);

		try {
			const query = new URLSearchParams();
			if (coId) query.set("co_id", String(coId));

			const url = `${apiRoutesPortalMasters.INSPECTION_GET_BY_INWARD_ID}/${inwardId}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const result = data as any;

			// Map header
			setHeader({
				inward_id: result.header?.inward_id ?? 0,
				inward_no: result.header?.inward_no ?? "",
				inward_date: result.header?.inward_date ?? "",
				branch_name: result.header?.branch_name ?? "",
				supplier_name: result.header?.supplier_name ?? "",
				inspection_check: result.header?.inspection_check ?? false,
				co_id: result.header?.co_id ?? coId ?? null,
				branch_id: result.header?.branch_id ?? null,
			});

			// Map line items
			const items: InspectionLineItem[] = (result.line_items || []).map((item: any, index: number) => ({
				id: item.inward_dtl_id ? String(item.inward_dtl_id) : `line-${index}`,
				po_no_formatted: item.po_no_formatted ?? "",
				inward_dtl_id: item.inward_dtl_id ?? 0,
				full_item_code: item.full_item_code ?? item.item_code ?? "",
				item_desc: item.item_name ?? item.item_desc ?? "",
				make_desc: item.item_make_name ?? item.make_desc ?? "",
				uom_name: item.uom_name ?? "",
				inward_qty: item.inward_qty ?? 0,
				rejected_qty: item.rejected_qty ?? 0,
				approved_qty: item.approved_qty ?? (item.inward_qty ?? 0) - (item.rejected_qty ?? 0),
				rejection_reason: item.reasons ?? item.rejection_reason ?? "",
				po_rate: item.rate ?? 0,
				accepted_item_make_id: item.accepted_item_make_id ?? item.item_make_id ?? null,
				make_options: item.make_options ?? [],
			}));

			setLineItems(items);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load inspection data";
			setErrorMessage(message);
		} finally {
			setLoading(false);
		}
	}, [inwardId, coId]);

	React.useEffect(() => {
		fetchInspectionData();
	}, [fetchInspectionData]);

	/**
	 * Handle line item field change
	 */
	const handleLineItemChange = React.useCallback((id: string, field: keyof InspectionLineItem, value: any) => {
		setLineItems((prev) =>
			prev.map((item) => {
				if (item.id !== id) return item;

				const updated = { ...item, [field]: value };

				// Recalculate approved_qty when rejected_qty changes
				if (field === "rejected_qty") {
					const rejectedQty = Number(value) || 0;
					updated.rejected_qty = rejectedQty;
					updated.approved_qty = (item.inward_qty || 0) - rejectedQty;
					if (updated.approved_qty < 0) updated.approved_qty = 0;
				}

				return updated;
			})
		);
	}, []);

	/**
	 * Handle complete inspection
	 */
	const handleCompleteInspection = React.useCallback(async () => {
		if (!inwardId) return;

		setSaving(true);
		try {
			// Prepare line items data
			const lineItemsPayload = lineItems.map((item) => ({
				inward_dtl_id: item.inward_dtl_id,
				rejected_qty: item.rejected_qty,
				approved_qty: item.approved_qty,
				reasons: item.rejection_reason,
				accepted_item_make_id: item.accepted_item_make_id,
			}));

			const url = apiRoutesPortalMasters.INSPECTION_COMPLETE;
			const { data, error } = await fetchWithCookie(url, "POST", {
				inward_id: Number(inwardId),
				line_items: lineItemsPayload,
			});

			if (error) {
				throw new Error(error);
			}

			toast({
				title: "Success",
				description: "Material inspection completed successfully",
				variant: "default",
			});

			// Navigate back to index
			router.push("/dashboardportal/procurement/materialInspection");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to complete inspection";
			toast({
				title: "Error",
				description: message,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}, [inwardId, lineItems, router]);

	/**
	 * Handle back navigation
	 */
	const handleBack = React.useCallback(() => {
		router.push("/dashboardportal/procurement/materialInspection");
	}, [router]);

	/**
	 * Column definitions - does NOT include lineItems in dependencies
	 * to avoid re-creating columns on every state change.
	 * Individual cells manage their own state via EditableTextCell/EditableNumberCell.
	 */
	const columns = React.useMemo<GridColDef<InspectionLineItem>[]>(() => [
		{
			field: "po_no_formatted",
			headerName: "PO No.",
			flex: 1,
			minWidth: 120,
		},
		{
			field: "full_item_code",
			headerName: "Item Code",
			flex: 1,
			minWidth: 120,
		},
		{
			field: "item_desc",
			headerName: "Item",
			flex: 1.5,
			minWidth: 180,
		},
		{
			field: "make_desc",
			headerName: "Make",
			flex: 1,
			minWidth: 100,
		},
		{
			field: "uom_name",
			headerName: "UOM",
			minWidth: 70,
		},
		{
			field: "inward_qty",
			headerName: "Received Qty",
			type: "number",
			minWidth: 90,
			renderHeader: () => (
				<Typography variant="body2" fontWeight={600} sx={{ whiteSpace: "normal", lineHeight: 1.2, textAlign: "right" }}>
					Received Qty
				</Typography>
			),
		},
		{
			field: "rejected_qty",
			headerName: "Rejected Qty",
			type: "number",
			minWidth: 110,
			renderHeader: () => (
				<Typography variant="body2" fontWeight={600} sx={{ whiteSpace: "normal", lineHeight: 1.2, textAlign: "right" }}>
					Rejected Qty
				</Typography>
			),
			renderCell: (params: GridRenderCellParams<InspectionLineItem, number>) => (
				<EditableNumberCell
					initialValue={params.value ?? 0}
					maxValue={params.row.inward_qty ?? 0}
					disabled={header?.inspection_check ?? false}
					onCommit={(val) => handleLineItemChange(params.row.id, "rejected_qty", val)}
				/>
			),
		},
		{
			field: "approved_qty",
			headerName: "Approved Qty",
			type: "number",
			minWidth: 90,
			renderHeader: () => (
				<Typography variant="body2" fontWeight={600} sx={{ whiteSpace: "normal", lineHeight: 1.2, textAlign: "right" }}>
					Approved Qty
				</Typography>
			),
			renderCell: (params: GridRenderCellParams<InspectionLineItem, number>) => (
				<Typography
					component="span"
					variant="body2"
					sx={{ fontWeight: 600, color: "success.main" }}
				>
					{params.value ?? 0}
				</Typography>
			),
		},
		{
			field: "rejection_reason",
			headerName: "Rejection Reason",
			flex: 1,
			minWidth: 160,
			renderHeader: () => (
				<Typography variant="body2" fontWeight={600} sx={{ whiteSpace: "normal", lineHeight: 1.2 }}>
					Rejection Reason
				</Typography>
			),
			renderCell: (params: GridRenderCellParams<InspectionLineItem, string>) => (
				<EditableTextCell
					initialValue={params.value ?? ""}
					disabled={(header?.inspection_check ?? false) || (params.row.rejected_qty ?? 0) <= 0}
					placeholder={(params.row.rejected_qty ?? 0) > 0 ? "Enter reason" : "-"}
					onCommit={(val) => handleLineItemChange(params.row.id, "rejection_reason", val)}
				/>
			),
		},
	], [header?.inspection_check, handleLineItemChange]);

	// Show loading state
	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
				<CircularProgress />
			</Box>
		);
	}

	// Show error state
	if (errorMessage) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error" sx={{ mb: 2 }}>
					{errorMessage}
				</Alert>
				<Button variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={handleBack}>
					Back to List
				</Button>
			</Box>
		);
	}

	const isCompleted = header?.inspection_check === true;

	return (
		<Box sx={{ p: 2 }}>
			{/* Header */}
			<Paper sx={{ p: 3, mb: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
					<Box>
						<Typography variant="h5" fontWeight={600}>
							Material Inspection
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Inspect received materials and record rejected quantities
						</Typography>
					</Box>
					{isCompleted && (
						<Chip
							icon={<CheckCircle size={16} />}
							label="Inspection Complete"
							color="success"
							variant="filled"
						/>
					)}
				</Stack>

				<Divider sx={{ my: 2 }} />

				{/* Inward Header Info */}
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
						gap: 2,
					}}
				>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Inward Number
						</Typography>
						<Typography variant="body1" fontWeight={600} color="primary">
							{header?.inward_no || "-"}
						</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Inward Date
						</Typography>
						<Typography variant="body1">{formatDate(header?.inward_date)}</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Branch
						</Typography>
						<Typography variant="body1">{header?.branch_name || "-"}</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Supplier
						</Typography>
						<Typography variant="body1">{header?.supplier_name || "-"}</Typography>
					</Box>
				</Box>
			</Paper>

			{/* Line Items */}
			<Paper sx={{ p: 3, mb: 3 }}>
				<Typography variant="h6" fontWeight={600} mb={2}>
					Line Items
				</Typography>
				<Box sx={{ height: 400 }}>
					<DataGrid
						rows={lineItems}
						columns={columns}
						density="compact"
						disableRowSelectionOnClick
						hideFooter={lineItems.length <= 10}
						sx={{
							"& .MuiDataGrid-cell": {
								display: "flex",
								alignItems: "center",
							},
						}}
					/>
				</Box>
			</Paper>

			{/* Actions */}
			<Paper sx={{ p: 2 }}>
				<Stack direction="row" justifyContent="space-between">
					<Button variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={handleBack}>
						Back
					</Button>
					{!isCompleted && (
						<Button
							variant="contained"
							color="primary"
							startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <CheckCircle size={18} />}
							onClick={handleCompleteInspection}
							disabled={saving}
						>
							Complete Inspection
						</Button>
					)}
				</Stack>
			</Paper>

			{/* Printable Preview */}
			{header && lineItems.length > 0 && (
				<Paper sx={{ p: 3, mt: 3 }}>
					<Typography variant="h6" fontWeight={600} mb={2}>
						Printable Preview
					</Typography>
					<MaterialInspectionPreview header={header} items={lineItems} />
				</Paper>
			)}
		</Box>
	);
}
