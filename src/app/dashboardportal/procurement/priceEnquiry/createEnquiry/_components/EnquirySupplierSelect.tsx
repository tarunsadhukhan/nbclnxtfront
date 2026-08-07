"use client";

import React from "react";
import {
	Autocomplete,
	Chip,
	Paper,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import type { EnquirySupplierEntry } from "../types/enquiryTypes";

/** Option shape for the supplier autocomplete. */
type SupplierOption = {
	label: string;
	value: string;
	code: string;
};

type EnquirySupplierSelectProps = {
	/** All available supplier options from setup data. */
	supplierOptions: ReadonlyArray<{ label: string; value: string }>;
	/** Raw suppliers array from setup for building EnquirySupplierEntry. */
	suppliers: ReadonlyArray<{ party_id: number; supp_name: string; supp_code: string }>;
	/** Currently selected suppliers. */
	selectedSuppliers: ReadonlyArray<EnquirySupplierEntry>;
	/** Callback when suppliers selection changes. */
	onSuppliersChange: (suppliers: EnquirySupplierEntry[]) => void;
	/** Whether the control is read-only (view mode). */
	readOnly?: boolean;
};

/**
 * Multi-supplier selection component for Price Enquiry.
 * In create/edit mode renders an MUI Autocomplete with `multiple`.
 * In view mode renders selected suppliers as read-only Chips.
 */
export function EnquirySupplierSelect({
	supplierOptions,
	suppliers,
	selectedSuppliers,
	onSuppliersChange,
	readOnly = false,
}: EnquirySupplierSelectProps) {
	// Build enriched options with supplier code, deduping by value (party_id).
	// Suppliers already selected on the enquiry but missing from the current
	// setup options (e.g. later deactivated) are merged in so they stay
	// visible and are not silently dropped on the next selection change.
	const options = React.useMemo<SupplierOption[]>(() => {
		const seen = new Set<string>();
		const out: SupplierOption[] = [];
		for (const opt of supplierOptions) {
			if (seen.has(opt.value)) continue;
			seen.add(opt.value);
			const raw = suppliers.find((s) => String(s.party_id) === opt.value);
			out.push({
				label: opt.label,
				value: opt.value,
				code: raw?.supp_code ?? "",
			});
		}
		for (const entry of selectedSuppliers) {
			const value = String(entry.supplierId);
			if (seen.has(value)) continue;
			seen.add(value);
			out.push({
				label: entry.supplierName,
				value,
				code: entry.supplierCode ?? "",
			});
		}
		return out;
	}, [supplierOptions, suppliers, selectedSuppliers]);

	// Map selected suppliers to option values for the autocomplete
	const selectedValues = React.useMemo<SupplierOption[]>(
		() =>
			selectedSuppliers
				.map((entry) => options.find((opt) => opt.value === String(entry.supplierId)))
				.filter((opt): opt is SupplierOption => opt !== undefined),
		[selectedSuppliers, options],
	);

	const handleChange = React.useCallback(
		(_event: React.SyntheticEvent, newValue: SupplierOption[]) => {
			const entries: EnquirySupplierEntry[] = newValue.map((opt) => {
				const raw = suppliers.find((s) => String(s.party_id) === opt.value);
				return {
					supplierId: Number(opt.value),
					supplierName: raw?.supp_name ?? opt.label,
					supplierCode: raw?.supp_code ?? opt.code ?? "",
				};
			});
			onSuppliersChange(entries);
		},
		[suppliers, onSuppliersChange],
	);

	if (readOnly) {
		return (
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
					Selected Suppliers
				</Typography>
				{selectedSuppliers.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No suppliers selected.
					</Typography>
				) : (
					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						{selectedSuppliers.map((entry) => (
							<Chip
								key={entry.supplierId}
								label={`${entry.supplierName}${entry.supplierCode ? ` (${entry.supplierCode})` : ""}`}
								size="small"
								variant="outlined"
							/>
						))}
					</Stack>
				)}
			</Paper>
		);
	}

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
				Suppliers
			</Typography>
			<Autocomplete<SupplierOption, true>
				multiple
				size="small"
				options={options}
				value={selectedValues}
				onChange={handleChange}
				getOptionLabel={(option) =>
					option.code ? `${option.label} (${option.code})` : option.label
				}
				isOptionEqualToValue={(option, value) => option.value === value.value}
				renderOption={(props, option) => {
					const { key: _ignoredKey, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key?: React.Key };
					return (
						<li key={option.value} {...rest}>
							{option.code ? `${option.label} (${option.code})` : option.label}
						</li>
					);
				}}
				renderInput={(params) => (
					<TextField
						{...params}
						label="Select Suppliers"
						placeholder="Search suppliers..."
					/>
				)}
				renderTags={(tagValue, getTagProps) =>
					tagValue.map((option, index) => {
						const { key, ...rest } = getTagProps({ index });
						return (
							<Chip
								key={key}
								label={option.code ? `${option.label} (${option.code})` : option.label}
								size="small"
								{...rest}
							/>
						);
					})
				}
				disableCloseOnSelect
				filterSelectedOptions
				noOptionsText="No suppliers available for this branch"
			/>
			{selectedSuppliers.length > 0 && (
				<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
					{selectedSuppliers.length} supplier{selectedSuppliers.length > 1 ? "s" : ""} selected
				</Typography>
			)}
		</Paper>
	);
}

export default EnquirySupplierSelect;
