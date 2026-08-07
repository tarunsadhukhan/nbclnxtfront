"use client";

import * as React from "react";
import { Box, Typography, Stack, Chip, Divider, TextField, MenuItem } from "@mui/material";
import type { SRHeader } from "../types/srTypes";
import type { EditableSRHeader } from "../hooks/useSRFormState";
import { getStatusColor } from "../utils/srConstants";

/**
 * Format date for display.
 */
const formatDate = (value?: string): string => {
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

type SRHeaderFormProps = {
	header: SRHeader | null;
	srDate: string;
	onSRDateChange: (value: string) => void;
	srRemarks: string;
	onSRRemarksChange: (value: string) => void;
	editableHeader: EditableSRHeader;
	onEditableHeaderFieldChange: <K extends keyof EditableSRHeader>(
		field: K,
		value: EditableSRHeader[K],
	) => void;
	onSupplierBranchChange: (branchId: number | null) => void;
	canEdit: boolean;
};

/**
 * Header form displaying inward info and editable SR fields.
 */
export const SRHeaderForm: React.FC<SRHeaderFormProps> = ({
	header,
	srDate,
	onSRDateChange,
	srRemarks,
	onSRRemarksChange,
	editableHeader,
	onEditableHeaderFieldChange,
	onSupplierBranchChange,
	canEdit,
}) => {
	const handleTextChange = <K extends keyof EditableSRHeader>(field: K) =>
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			onEditableHeaderFieldChange(field, e.target.value as EditableSRHeader[K]);

	return (
		<Box>
			{/* Status Row */}
			<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
				<Box>
					<Typography variant="h6" fontWeight={600}>
						Stores Receipt
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Enter accepted rates and approve stores receipt
					</Typography>
				</Box>
				<Stack direction="row" spacing={1}>
					{header?.sr_no && (
						<Chip
							label={`SR: ${header.sr_no}`}
							color="secondary"
							variant="outlined"
							size="small"
						/>
					)}
					<Chip
						label={header?.sr_status_name || "Pending"}
						color={getStatusColor(header?.sr_status || 0)}
						variant="filled"
						size="small"
					/>
				</Stack>
			</Stack>

			<Divider sx={{ my: 2 }} />

			{/* Read-only Inward Info - Row 1 (non-editable identifiers) */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
					gap: 2,
					mb: 2,
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

			{/* Editable Inward Info - Row 2: Challan & Invoice */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
					gap: 2,
					mb: 2,
				}}
			>
				<TextField
					label="Challan No"
					size="small"
					value={editableHeader.challan_no}
					onChange={handleTextChange("challan_no")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="Challan Date"
					type="date"
					size="small"
					value={editableHeader.challan_date}
					onChange={handleTextChange("challan_date")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="Invoice No"
					size="small"
					value={editableHeader.invoice_no}
					onChange={handleTextChange("invoice_no")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="Invoice Date"
					type="date"
					size="small"
					value={editableHeader.invoice_date}
					onChange={handleTextChange("invoice_date")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
			</Box>

			{/* Editable Inward Info - Row 3: Invoice amount/received, Vehicle */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
					gap: 2,
					mb: 2,
				}}
			>
				<TextField
					label="Invoice Amount"
					type="number"
					size="small"
					value={editableHeader.invoice_amount}
					onChange={handleTextChange("invoice_amount")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
					inputProps={{ step: "0.01", min: 0 }}
				/>
				<TextField
					label="Invoice Received Date"
					type="date"
					size="small"
					value={editableHeader.invoice_recvd_date}
					onChange={handleTextChange("invoice_recvd_date")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="Vehicle Number"
					size="small"
					value={editableHeader.vehicle_number}
					onChange={handleTextChange("vehicle_number")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="Inspection Date"
					type="date"
					size="small"
					value={editableHeader.inspection_date}
					onChange={handleTextChange("inspection_date")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
			</Box>

			{/* Editable Inward Info - Row 4: Driver details */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
					gap: 2,
					mb: 2,
				}}
			>
				<TextField
					label="Driver Name"
					size="small"
					value={editableHeader.driver_name}
					onChange={handleTextChange("driver_name")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="Driver Contact"
					size="small"
					value={editableHeader.driver_contact_no}
					onChange={handleTextChange("driver_contact_no")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="Consignment No"
					size="small"
					value={editableHeader.consignment_no}
					onChange={handleTextChange("consignment_no")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="Consignment Date"
					type="date"
					size="small"
					value={editableHeader.consignment_date}
					onChange={handleTextChange("consignment_date")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
			</Box>

			{/* Editable Inward Info - Row 5: E-way bill */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
					gap: 2,
					mb: 2,
				}}
			>
				<TextField
					label="E-Way Bill No"
					size="small"
					value={editableHeader.ewaybillno}
					onChange={handleTextChange("ewaybillno")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="E-Way Bill Date"
					type="date"
					size="small"
					value={editableHeader.ewaybill_date}
					onChange={handleTextChange("ewaybill_date")}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				{canEdit && (header?.supplier_branch_options?.length ?? 0) > 1 ? (
					<TextField
						select
						label="Supplier State (GST)"
						size="small"
						value={header?.supplier_branch_id ?? ""}
						onChange={(e) => onSupplierBranchChange(e.target.value === "" ? null : Number(e.target.value))}
						error={!header?.supplier_branch_id}
						helperText={!header?.supplier_branch_id ? "Select supplier state for GST" : undefined}
						InputLabelProps={{ shrink: true }}
					>
						<MenuItem value="">— Select —</MenuItem>
						{header?.supplier_branch_options.map((opt) => (
							<MenuItem key={opt.party_mst_branch_id} value={opt.party_mst_branch_id}>
								{opt.state_name}{opt.gst_no ? ` (${opt.gst_no})` : ""}
							</MenuItem>
						))}
					</TextField>
				) : (
					<Box>
						<Typography variant="caption" color="text.secondary">
							Supplier State
						</Typography>
						<Typography variant="body1">{header?.supplier_state_name || "-"}</Typography>
					</Box>
				)}
			</Box>

			{/* Editable Inward Info - Row 6: Despatch/Receipt remarks */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
					gap: 2,
					mb: 3,
				}}
			>
				<TextField
					label="Despatch Remarks"
					size="small"
					value={editableHeader.despatch_remarks}
					onChange={handleTextChange("despatch_remarks")}
					disabled={!canEdit}
					multiline
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="Receipt Remarks"
					size="small"
					value={editableHeader.receipts_remarks}
					onChange={handleTextChange("receipts_remarks")}
					disabled={!canEdit}
					multiline
					InputLabelProps={{ shrink: true }}
				/>
			</Box>

			{/* Editable SR Fields */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
					gap: 2,
				}}
			>
				<TextField
					id="sr-date-field"
					label="SR Date"
					type="date"
					size="small"
					value={srDate}
					onChange={(e) => onSRDateChange(e.target.value)}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					id="sr-remarks-field"
					label="SR Remarks"
					size="small"
					value={srRemarks}
					onChange={(e) => onSRRemarksChange(e.target.value)}
					disabled={!canEdit}
					multiline
					sx={{ gridColumn: { md: "span 2" } }}
				/>
			</Box>
		</Box>
	);
};
