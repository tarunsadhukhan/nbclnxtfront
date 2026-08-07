"use client";

import * as React from "react";
import {
	TextField,
	Grid,
	Typography,
} from "@mui/material";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResponseHeaderValues {
	supplierName: string;
	responseDate: string;
	deliveryDays: number | null;
	creditDays: number | null;
	paymentTerms: string;
	termsConditions: string;
	remarks: string;
}

type HeaderField = keyof Omit<ResponseHeaderValues, "supplierName">;

interface ResponseHeaderFormProps {
	values: ResponseHeaderValues;
	onChange: (field: HeaderField, value: string | number | null) => void;
	mode: "create" | "edit" | "view";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Header form for recording a supplier response / quote.
 * Shows supplier name (read-only) and editable fields for date, delivery days,
 * credit days, payment terms, T&C, and remarks.
 */
const ResponseHeaderForm: React.FC<ResponseHeaderFormProps> = ({
	values,
	onChange,
	mode,
}) => {
	const isReadOnly = mode === "view";

	const handleTextChange = React.useCallback(
		(field: HeaderField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			onChange(field, e.target.value);
		},
		[onChange],
	);

	const handleNumberChange = React.useCallback(
		(field: HeaderField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const raw = e.target.value.trim();
			if (raw === "") {
				onChange(field, null);
				return;
			}
			const parsed = Number(raw);
			if (!Number.isNaN(parsed)) {
				onChange(field, parsed);
			}
		},
		[onChange],
	);

	return (
		<Grid container spacing={2}>
			{/* Supplier Name - always read-only */}
			<Grid size={{ xs: 12, sm: 6, md: 4 }}>
				<Typography variant="caption" color="text.secondary" gutterBottom>
					Supplier
				</Typography>
				<Typography variant="body1" fontWeight={600}>
					{values.supplierName || "-"}
				</Typography>
			</Grid>

			{/* Response Date */}
			<Grid size={{ xs: 12, sm: 6, md: 4 }}>
				<TextField
					label="Response Date"
					type="date"
					size="small"
					fullWidth
					value={values.responseDate}
					onChange={handleTextChange("responseDate")}
					disabled={isReadOnly}
					slotProps={{ inputLabel: { shrink: true } }}
				/>
			</Grid>

			{/* Delivery Days */}
			<Grid size={{ xs: 12, sm: 6, md: 4 }}>
				<TextField
					label="Delivery Days"
					type="number"
					size="small"
					fullWidth
					value={values.deliveryDays ?? ""}
					onChange={handleNumberChange("deliveryDays")}
					disabled={isReadOnly}
					slotProps={{ htmlInput: { min: 0 } }}
				/>
			</Grid>

			{/* Credit Days */}
			<Grid size={{ xs: 12, sm: 6, md: 4 }}>
				<TextField
					label="Credit Days"
					type="number"
					size="small"
					fullWidth
					value={values.creditDays ?? ""}
					onChange={handleNumberChange("creditDays")}
					disabled={isReadOnly}
					slotProps={{ htmlInput: { min: 0 } }}
				/>
			</Grid>

			{/* Payment Terms */}
			<Grid size={{ xs: 12, sm: 6, md: 4 }}>
				<TextField
					label="Payment Terms"
					size="small"
					fullWidth
					value={values.paymentTerms}
					onChange={handleTextChange("paymentTerms")}
					disabled={isReadOnly}
				/>
			</Grid>

			{/* Terms & Conditions */}
			<Grid size={{ xs: 12, md: 6 }}>
				<TextField
					label="Terms & Conditions"
					size="small"
					fullWidth
					multiline
					minRows={2}
					maxRows={4}
					value={values.termsConditions}
					onChange={handleTextChange("termsConditions")}
					disabled={isReadOnly}
				/>
			</Grid>

			{/* Remarks */}
			<Grid size={{ xs: 12, md: 6 }}>
				<TextField
					label="Remarks"
					size="small"
					fullWidth
					multiline
					minRows={2}
					maxRows={4}
					value={values.remarks}
					onChange={handleTextChange("remarks")}
					disabled={isReadOnly}
				/>
			</Grid>
		</Grid>
	);
};

export default ResponseHeaderForm;
export type { ResponseHeaderValues, HeaderField, ResponseHeaderFormProps };
