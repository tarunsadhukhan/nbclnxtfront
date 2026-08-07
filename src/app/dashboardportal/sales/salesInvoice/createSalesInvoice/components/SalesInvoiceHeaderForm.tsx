import React, { useState, useEffect, useRef } from "react";
import {
	Box,
	Grid,
	TextField,
	MenuItem,
	Select,
	Typography,
	FormHelperText,
	Table,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
} from "@mui/material";
import MuiForm, { type Schema, type MuiFormMode } from "@/components/ui/muiform";
import { hasTypeSpecificHeader, isRawJuteInvoice, isGovtSkgInvoice } from "../utils/salesInvoiceConstants";

type FormRef = React.MutableRefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;
type TypeSpecificFormRef = React.MutableRefObject<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>;

function getTypeSpecificSectionTitle(invoiceTypeId?: string): string {
	if (isRawJuteInvoice(invoiceTypeId)) return "Raw Jute Details";
	if (isGovtSkgInvoice(invoiceTypeId)) return "Govt Sacking Details";
	return "Additional Details";
}

type SalesInvoiceHeaderFormProps = {
	schema: Schema;
	formKey: number;
	initialValues: Record<string, unknown>;
	mode: MuiFormMode;
	formRef: FormRef;
	onSubmit: (values: Record<string, unknown>) => Promise<void>;
	onValuesChange: (values: Record<string, unknown>) => void;
	typeSpecificSchema?: Schema | null;
	invoiceTypeId?: string;
	juteFormRef?: TypeSpecificFormRef;
	formValues?: Record<string, any>;
	errors?: Record<string, any>;
	isView?: boolean;
	transporterBranchOptions?: Array<{ id: number; address: string; gst_no: string }>;
	onTransporterBranchChange?: (branchId: number, selectedBranch?: { id: number; address: string; gst_no: string }) => void;
};

export function SalesInvoiceHeaderForm({
	schema,
	formKey,
	initialValues,
	mode,
	formRef,
	onSubmit,
	onValuesChange,
	typeSpecificSchema,
	invoiceTypeId,
	juteFormRef,
	formValues = {},
	errors = {},
	isView = false,
	transporterBranchOptions = [],
	onTransporterBranchChange,
}: SalesInvoiceHeaderFormProps) {
	const [localFormValues, setLocalFormValues] = useState(formValues);
	const prevFormValuesJsonRef = useRef<string | null>(null);

	// Sync external formValues into local state only when the content actually changes.
	// Using a ref-based JSON comparison prevents re-renders caused by new object
	// references when the parent renders with a default `{}` parameter.
	useEffect(() => {
		let incoming: string;
		try {
			incoming = JSON.stringify(formValues);
		} catch {
			return;
		}
		if (incoming === prevFormValuesJsonRef.current) return;
		prevFormValuesJsonRef.current = incoming;
		setLocalFormValues(formValues);
	}, [formValues]);

	const handleFieldChange = (fieldName: string, value: any) => {
		const updatedValues = { ...localFormValues, [fieldName]: value };
		setLocalFormValues(updatedValues);
		onValuesChange(updatedValues);
	};

	const handleTransporterBranchChange = (branchId: number, selectedBranch?: any) => {
		handleFieldChange("transporter_branch_id", branchId);
		if (selectedBranch?.gst_no) {
			handleFieldChange("transporter_gst_no", selectedBranch.gst_no);
		}
		onTransporterBranchChange?.(branchId, selectedBranch);
	};

	return (
		<div className="space-y-6">
			<MuiForm
				key={formKey}
				ref={formRef}
				schema={schema}
				initialValues={initialValues}
				mode={mode}
				hideModeToggle
				hideSubmit
				onSubmit={onSubmit}
				onValuesChange={onValuesChange}
			/>

			{/* Logistics Section */}
			<Box sx={{ mt: 3 }}>
				{/* Transporter Branch dropdown (conditional, only show when transporter selected and has branches) */}
				{localFormValues.transporter && transporterBranchOptions.length > 0 && (
					<Grid container spacing={2} sx={{ mb: 2 }}>
						<Grid size={{ xs: 12, sm: 6 }}>
							<Select
								value={localFormValues.transporter_branch_id || ""}
								onChange={(e) => {
									const branchId = Number(e.target.value);
									const selectedBranch = transporterBranchOptions.find((b) => b.id === branchId);
									handleTransporterBranchChange(branchId, selectedBranch);
								}}
								disabled={isView}
								fullWidth
								displayEmpty
							>
								<MenuItem value="">-- Select Branch --</MenuItem>
								{transporterBranchOptions.map((branch) => (
									<MenuItem key={branch.id} value={branch.id}>
										{branch.address} (GST: {branch.gst_no})
									</MenuItem>
								))}
							</Select>
							{errors.transporter_branch_id && (
								<FormHelperText error>{errors.transporter_branch_id}</FormHelperText>
							)}
						</Grid>
					</Grid>
				)}

				{/* Transporter GSTIN display (read-only, conditional) */}
				{localFormValues.transporter_gst_no && (
					<Grid container spacing={2} sx={{ mb: 2 }}>
						<Grid size={{ xs: 12, sm: 6 }}>
							<TextField
								label="Transporter GSTIN"
								value={localFormValues.transporter_gst_no}
								disabled
								fullWidth
							/>
						</Grid>
					</Grid>
				)}

				{/* Transporter Doc No. and Date (Grid with 2 columns) */}
				<Grid container spacing={2} sx={{ mb: 3 }}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<TextField
							label="Transporter Doc No."
							value={localFormValues.transporter_doc_no || ""}
							onChange={(e) => handleFieldChange("transporter_doc_no", e.target.value)}
							disabled={isView}
							placeholder="LR No. / Bill of Lading"
							fullWidth
							error={!!errors.transporter_doc_no}
							helperText={errors.transporter_doc_no}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<TextField
							label="Transporter Doc Date"
							type="date"
							value={localFormValues.transporter_doc_date || ""}
							onChange={(e) => handleFieldChange("transporter_doc_date", e.target.value)}
							disabled={isView}
							fullWidth
							InputLabelProps={{ shrink: true }}
							error={!!errors.transporter_doc_date}
							helperText={errors.transporter_doc_date}
						/>
					</Grid>
				</Grid>
			</Box>

			{/* Order References Section */}
			<Box sx={{ mt: 3, mb: 2 }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
					Order References
				</Typography>
			</Box>

			{/* Buyer Order fields (2-column Grid) */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="Buyer's Order No."
						value={localFormValues.buyer_order_no || ""}
						onChange={(e) => handleFieldChange("buyer_order_no", e.target.value)}
						disabled={isView}
						placeholder="Customer's PO reference"
						fullWidth
						error={!!errors.buyer_order_no}
						helperText={errors.buyer_order_no}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="Buyer's Order Date"
						type="date"
						value={localFormValues.buyer_order_date || ""}
						onChange={(e) => handleFieldChange("buyer_order_date", e.target.value)}
						disabled={isView}
						fullWidth
						InputLabelProps={{ shrink: true }}
						error={!!errors.buyer_order_date}
						helperText={errors.buyer_order_date}
					/>
				</Grid>
			</Grid>

			{/* e-Invoice Section */}
			<Box sx={{ mt: 4, mb: 2 }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
					e-Invoice Details
				</Typography>
			</Box>

			{/* e-Invoice fields (2-column Grid for IRN, Ack No) */}
			<Grid container spacing={2} sx={{ mb: 2 }}>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="IRN"
						value={localFormValues.irn || ""}
						onChange={(e) => handleFieldChange("irn", e.target.value)}
						disabled={isView}
						placeholder="Invoice Reference Number from GST portal"
						fullWidth
						error={!!errors.irn}
						helperText={errors.irn}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="Ack No."
						value={localFormValues.ack_no || ""}
						onChange={(e) => handleFieldChange("ack_no", e.target.value)}
						disabled={isView}
						placeholder="Acknowledgement number from portal"
						fullWidth
						error={!!errors.ack_no}
						helperText={errors.ack_no}
					/>
				</Grid>
			</Grid>

			{/* Ack Date and QR Code (2-column Grid) */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="Ack Date"
						type="date"
						value={localFormValues.ack_date || ""}
						onChange={(e) => handleFieldChange("ack_date", e.target.value)}
						disabled={isView}
						fullWidth
						InputLabelProps={{ shrink: true }}
						error={!!errors.ack_date}
						helperText={errors.ack_date}
					/>
				</Grid>
				<Grid size={{ xs: 12, sm: 6 }}>
					<TextField
						label="QR Code"
						value={localFormValues.qr_code || ""}
						onChange={(e) => handleFieldChange("qr_code", e.target.value)}
						disabled={isView}
						multiline
						minRows={2}
						placeholder="Base64 encoded QR code from portal"
						fullWidth
						error={!!errors.qr_code}
						helperText={errors.qr_code}
					/>
				</Grid>
			</Grid>

			{/* Submission History (only show if exists) */}
			{localFormValues.e_invoice_submission_history &&
				localFormValues.e_invoice_submission_history.length > 0 && (
					<Box sx={{ mt: 3, p: 2, bgcolor: "background.paper", border: "1px solid #e0e0e0", borderRadius: 1 }}>
						<Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
							Submission History
						</Typography>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Status</TableCell>
									<TableCell>Submitted</TableCell>
									<TableCell>IRN</TableCell>
									<TableCell>Error</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{localFormValues.e_invoice_submission_history.map((item: any, idx: number) => (
									<TableRow key={idx}>
										<TableCell>{item.submission_status}</TableCell>
										<TableCell>
											{new Date(item.submitted_date_time).toLocaleString()}
										</TableCell>
										<TableCell sx={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
											{item.irn_from_response || "-"}
										</TableCell>
										<TableCell sx={{ color: "error.main", fontSize: "0.75rem" }}>
											{item.error_message || "-"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</Box>
				)}

			{typeSpecificSchema && hasTypeSpecificHeader(invoiceTypeId) && (
				<div className="space-y-3 pt-4 border-t border-dashed">
					<h3 className="text-sm font-medium text-muted-foreground">{getTypeSpecificSectionTitle(invoiceTypeId)}</h3>
					<MuiForm
						key={`type-specific-${formKey}`}
						ref={juteFormRef}
						schema={typeSpecificSchema}
						initialValues={initialValues}
						mode={mode}
						hideModeToggle
						hideSubmit
						onValuesChange={onValuesChange}
					/>
				</div>
			)}
		</div>
	);
}

export default SalesInvoiceHeaderForm;
