"use client";

import * as React from "react";
import { Button, CircularProgress, TextField } from "@mui/material";

/**
 * Reusable toolbar slot for IndexWrapper that renders:
 *  - From / To date inputs
 *  - Optional "Clear dates" button (auto-shown when either date is set)
 *  - Optional "Download Excel" button (rendered only when onDownload is provided)
 *
 * Mirrors the inline pattern in jutePurchase/mr/page.tsx so all jute index
 * pages can share the same UI.
 */
export type DateRangeToolbarProps = {
	fromDate: string;
	toDate: string;
	onFromDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onToDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onClearDates: () => void;
	onDownload?: () => void;
	downloading?: boolean;
	downloadDisabled?: boolean;
	mounted?: boolean;
};

export default function DateRangeToolbar({
	fromDate,
	toDate,
	onFromDateChange,
	onToDateChange,
	onClearDates,
	onDownload,
	downloading = false,
	downloadDisabled = false,
	mounted = true,
}: DateRangeToolbarProps) {
	const showClear = Boolean(fromDate || toDate);
	return (
		<>
			<TextField
				size="small"
				type="date"
				label="From"
				value={fromDate}
				onChange={onFromDateChange}
				InputLabelProps={{ shrink: true }}
			/>
			<TextField
				size="small"
				type="date"
				label="To"
				value={toDate}
				onChange={onToDateChange}
				InputLabelProps={{ shrink: true }}
			/>
			{showClear ? (
				<Button size="small" variant="outlined" onClick={onClearDates}>
					Clear dates
				</Button>
			) : null}
			{onDownload && mounted ? (
				<Button
					size="small"
					variant="outlined"
					onClick={onDownload}
					disabled={downloadDisabled || downloading}
					startIcon={downloading ? <CircularProgress size={16} /> : undefined}
				>
					{downloading ? "Downloading..." : "Download Excel"}
				</Button>
			) : null}
		</>
	);
}
