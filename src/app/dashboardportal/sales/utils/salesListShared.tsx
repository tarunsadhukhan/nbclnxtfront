"use client";

import * as React from "react";
import { Chip, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";

/**
 * Shared helpers for the sales module list (index) pages.
 *
 * Quotation, Sales Order, Delivery Order and Sales Invoice lists all share the
 * same status lifecycle, date/currency formatting and server response shape.
 * Keeping the logic here prevents the four pages from drifting apart.
 */

/** Canonical sales document status ids (fixed across modules — see instructions.md). */
export const SALES_STATUS_IDS = Object.freeze({
	DRAFT: 21,
	OPEN: 1,
	PENDING_APPROVAL: 20,
	APPROVED: 3,
	REJECTED: 4,
	CLOSED: 5,
	CANCELLED: 6,
});

export type SalesStatusId = (typeof SALES_STATUS_IDS)[keyof typeof SALES_STATUS_IDS];

export const SALES_STATUS_LABELS: Readonly<Record<number, string>> = Object.freeze({
	[SALES_STATUS_IDS.DRAFT]: "Draft",
	[SALES_STATUS_IDS.OPEN]: "Open",
	[SALES_STATUS_IDS.PENDING_APPROVAL]: "Pending Approval",
	[SALES_STATUS_IDS.APPROVED]: "Approved",
	[SALES_STATUS_IDS.REJECTED]: "Rejected",
	[SALES_STATUS_IDS.CLOSED]: "Closed",
	[SALES_STATUS_IDS.CANCELLED]: "Cancelled",
});

type ChipColor = "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info";

const STATUS_CHIP_COLORS: Readonly<Record<number, ChipColor>> = Object.freeze({
	[SALES_STATUS_IDS.DRAFT]: "default",
	[SALES_STATUS_IDS.OPEN]: "info",
	[SALES_STATUS_IDS.PENDING_APPROVAL]: "warning",
	[SALES_STATUS_IDS.APPROVED]: "success",
	[SALES_STATUS_IDS.REJECTED]: "error",
	[SALES_STATUS_IDS.CLOSED]: "secondary",
	[SALES_STATUS_IDS.CANCELLED]: "default",
});

export interface SalesStatusChipProps {
	statusId?: number | null;
	/** Fallback label when the status id is unknown (e.g. server-provided name). */
	label?: string | null;
}

/** Status chip with a consistent color per lifecycle state on every sales list. */
export function SalesStatusChip({ statusId, label }: SalesStatusChipProps) {
	const id = typeof statusId === "number" ? statusId : Number(statusId);
	const resolvedLabel = (Number.isFinite(id) ? SALES_STATUS_LABELS[id] : undefined) ?? label ?? "Unknown";
	const color = (Number.isFinite(id) ? STATUS_CHIP_COLORS[id] : undefined) ?? "default";
	const outlined = Number.isFinite(id) && id === SALES_STATUS_IDS.CANCELLED;
	return <Chip size="small" color={color} variant={outlined ? "outlined" : "filled"} label={resolvedLabel} />;
}

/** Ordered options for the list-page status filter. */
export const SALES_STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: number; label: string }> = Object.freeze([
	{ value: SALES_STATUS_IDS.DRAFT, label: SALES_STATUS_LABELS[SALES_STATUS_IDS.DRAFT] },
	{ value: SALES_STATUS_IDS.OPEN, label: SALES_STATUS_LABELS[SALES_STATUS_IDS.OPEN] },
	{ value: SALES_STATUS_IDS.PENDING_APPROVAL, label: SALES_STATUS_LABELS[SALES_STATUS_IDS.PENDING_APPROVAL] },
	{ value: SALES_STATUS_IDS.APPROVED, label: SALES_STATUS_LABELS[SALES_STATUS_IDS.APPROVED] },
	{ value: SALES_STATUS_IDS.REJECTED, label: SALES_STATUS_LABELS[SALES_STATUS_IDS.REJECTED] },
	{ value: SALES_STATUS_IDS.CLOSED, label: SALES_STATUS_LABELS[SALES_STATUS_IDS.CLOSED] },
	{ value: SALES_STATUS_IDS.CANCELLED, label: SALES_STATUS_LABELS[SALES_STATUS_IDS.CANCELLED] },
]);

export interface SalesStatusFilterProps {
	/** Currently selected status id, or null for "All statuses". */
	value: number | null;
	onChange: (statusId: number | null) => void;
}

/** Compact status dropdown for list-page toolbars. */
export function SalesStatusFilter({ value, onChange }: SalesStatusFilterProps) {
	const handleChange = React.useCallback(
		(event: SelectChangeEvent<string>) => {
			const raw = event.target.value;
			onChange(raw === "" ? null : Number(raw));
		},
		[onChange],
	);

	return (
		<FormControl size="small" sx={{ minWidth: 180 }}>
			<InputLabel id="sales-status-filter-label">Status</InputLabel>
			<Select<string>
				labelId="sales-status-filter-label"
				label="Status"
				value={value === null ? "" : String(value)}
				onChange={handleChange}
				displayEmpty={false}
			>
				<MenuItem value="">All statuses</MenuItem>
				{SALES_STATUS_FILTER_OPTIONS.map((option) => (
					<MenuItem key={option.value} value={String(option.value)}>
						{option.label}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);
}

/** Format a server date (YYYY-MM-DD or parseable string) as e.g. "05 Jul 2026". */
export const formatListDate = (value?: string | null): string => {
	if (!value) return "-";
	const trimmed = value.trim();
	if (!trimmed) return "-";
	let date: Date | null = null;
	const ymdMatch = trimmed.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
	if (ymdMatch) {
		const [, year, month, day] = ymdMatch;
		date = new Date(Number(year), Number(month) - 1, Number(day));
	} else {
		const parsed = new Date(trimmed);
		if (!Number.isNaN(parsed.getTime())) {
			date = parsed;
		}
	}
	if (!date || Number.isNaN(date.getTime())) {
		return trimmed;
	}
	return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

/** Format an amount as INR currency, or "-" when absent. */
export const formatListCurrency = (value: number | null | undefined): string => {
	if (value === null || value === undefined) return "-";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
};

export const asString = (value: unknown): string => {
	if (typeof value === "string") return value;
	if (value === null || value === undefined) return "";
	return String(value);
};

export const asNumberOrNull = (value: unknown): number | null => {
	if (value === null || value === undefined || value === "") return null;
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

export interface ParsedListResponse {
	rows: Record<string, unknown>[];
	total: number | null;
}

/** Safely unwrap the standard `{ data: [...], total: n }` list response. */
export const parseListResponse = (payload: unknown): ParsedListResponse => {
	if (Array.isArray(payload)) {
		return { rows: payload as Record<string, unknown>[], total: null };
	}
	if (payload && typeof payload === "object") {
		const container = payload as { data?: unknown; total?: unknown };
		const rows = Array.isArray(container.data) ? (container.data as Record<string, unknown>[]) : [];
		const total = asNumberOrNull(container.total);
		return { rows, total };
	}
	return { rows: [], total: null };
};

export interface SalesListQueryArgs {
	page: number;
	pageSize: number;
	coId: number | null;
	branchIds: ReadonlyArray<number>;
	search: string;
	statusId: number | null;
}

/** Build the query string shared by the four sales table endpoints. */
export const buildSalesListQuery = ({ page, pageSize, coId, branchIds, search, statusId }: SalesListQueryArgs): string => {
	const query = new URLSearchParams({
		page: String(page + 1),
		limit: String(pageSize),
	});
	if (coId !== null) query.set("co_id", String(coId));
	if (branchIds.length === 1) query.set("branch_id", String(branchIds[0]));
	if (statusId !== null) query.set("status_id", String(statusId));
	const trimmedSearch = search.trim();
	if (trimmedSearch) query.set("search", trimmedSearch);
	return query.toString();
};
