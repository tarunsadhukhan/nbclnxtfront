"use client";

import React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Check, Square } from "lucide-react";
import {
	fetchGovtSackingSourceList,
	fetchGovtSackingSource,
} from "@/utils/salesInvoiceService";
import type {
	GovtSackingSourceRow,
	GovtSackingSourceDetail,
} from "../types/salesInvoiceTypes";
import { toast } from "@/hooks/use-toast";

type Props = {
	coId: string;
	branchId: string;
	value: GovtSackingSourceRow[];
	onSelect: (details: GovtSackingSourceDetail[], rows: GovtSackingSourceRow[]) => void;
	disabled?: boolean;
};

const formatOptionLabel = (row: GovtSackingSourceRow): string => {
	const parts: string[] = [];
	parts.push(`Invoice No ${row.invoice_no ?? "—"}`);
	if (row.party_name) parts.push(row.party_name);
	if (row.pcso_no) parts.push(`PCSO ${row.pcso_no}`);
	if (row.invoice_date) parts.push(row.invoice_date);
	return parts.join(" — ");
};

export function GovtSackingSourcePicker({ coId, branchId, value, onSelect, disabled }: Props) {
	const [inputValue, setInputValue] = React.useState("");
	const [debouncedSearch, setDebouncedSearch] = React.useState("");
	const [options, setOptions] = React.useState<GovtSackingSourceRow[]>([]);
	const [listLoading, setListLoading] = React.useState(false);
	const [detailLoading, setDetailLoading] = React.useState(false);
	const [open, setOpen] = React.useState(false);

	// Cache loaded details by invoice_id so adding a fourth row doesn't refetch
	// the previous three.
	const detailCacheRef = React.useRef<Map<number, GovtSackingSourceDetail>>(new Map());
	// Monotonic counter so an in-flight detail fetch from change N can no-op if
	// the user has since produced change N+1 (different selection).
	const changeSeqRef = React.useRef(0);
	// Latest selected rows for the current change — used by the async resolver to
	// rebuild `details` in the same order MUI sees.
	const latestSelectedRef = React.useRef<GovtSackingSourceRow[]>([]);

	React.useEffect(() => {
		const handle = setTimeout(() => setDebouncedSearch(inputValue.trim()), 300);
		return () => clearTimeout(handle);
	}, [inputValue]);

	React.useEffect(() => {
		if (!coId || !branchId) return;
		if (!open) return;
		let cancelled = false;
		setListLoading(true);
		fetchGovtSackingSourceList({
			coId,
			branchId,
			search: debouncedSearch || undefined,
			page: 1,
			limit: 25,
		})
			.then((response) => {
				if (cancelled) return;
				setOptions(response.data ?? []);
			})
			.catch((error) => {
				if (cancelled) return;
				toast({
					variant: "destructive",
					title: "Unable to load Govt Sacking invoices",
					description: error instanceof Error ? error.message : "Please try again.",
				});
				setOptions([]);
			})
			.finally(() => {
				if (!cancelled) setListLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, debouncedSearch, open]);

	const handleChange = React.useCallback(
		(_event: unknown, selected: GovtSackingSourceRow[]) => {
			// Bump change sequence so any in-flight fetch from a previous change
			// becomes a no-op when it resolves.
			const mySeq = ++changeSeqRef.current;
			latestSelectedRef.current = selected;

			if (selected.length === 0) {
				detailCacheRef.current.clear();
				onSelect([], []);
				return;
			}

			// Prune cache for rows no longer selected so it doesn't grow unbounded.
			const stillSelected = new Set(selected.map((r) => r.invoice_id));
			for (const id of Array.from(detailCacheRef.current.keys())) {
				if (!stillSelected.has(id)) detailCacheRef.current.delete(id);
			}

			// Build current details snapshot from cache. The picker is authoritative
			// for selection — sync the parent NOW with what MUI just told us so
			// `value` stays in lockstep with internal Autocomplete state and a
			// subsequent change can't see stale `[]` or `[A]`.
			const buildDetails = (): GovtSackingSourceDetail[] => {
				const out: GovtSackingSourceDetail[] = [];
				for (const row of selected) {
					const cached = detailCacheRef.current.get(row.invoice_id);
					if (cached) out.push(cached);
				}
				return out;
			};

			onSelect(buildDetails(), selected);

			// Fetch any missing rows in parallel; emit updated details as each
			// resolves. Stale fetches (older mySeq) bail out.
			const missing = selected.filter((row) => !detailCacheRef.current.has(row.invoice_id));
			if (missing.length === 0) return;

			setDetailLoading(true);
			let pending = missing.length;
			let hadError = false;

			missing.forEach((row) => {
				fetchGovtSackingSource(row.invoice_id, coId)
					.then((response) => {
						if (mySeq !== changeSeqRef.current) return;
						if (response?.data) {
							detailCacheRef.current.set(row.invoice_id, response.data);
							onSelect(buildDetails(), latestSelectedRef.current);
						}
					})
					.catch((error) => {
						if (mySeq !== changeSeqRef.current) return;
						if (!hadError) {
							hadError = true;
							toast({
								variant: "destructive",
								title: "Unable to load source invoice",
								description: error instanceof Error ? error.message : "Please try again.",
							});
						}
					})
					.finally(() => {
						pending -= 1;
						if (pending === 0 && mySeq === changeSeqRef.current) setDetailLoading(false);
					});
			});
		},
		[coId, onSelect],
	);

	const selectedCount = value.length;

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
				<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
					Source Govt Sacking Invoices
				</Typography>
				<Chip
					size="small"
					color={selectedCount > 0 ? "primary" : "default"}
					label={
						selectedCount === 0
							? "None selected"
							: selectedCount === 1
								? "1 invoice selected"
								: `${selectedCount} invoices selected`
					}
				/>
			</Box>
			<Autocomplete<GovtSackingSourceRow, true>
				multiple
				disableCloseOnSelect
				limitTags={3}
				open={open}
				onOpen={() => setOpen(true)}
				onClose={() => setOpen(false)}
				options={options}
				value={value}
				onChange={handleChange}
				onInputChange={(_event, value, reason) => {
					if (reason === "input") setInputValue(value);
				}}
				getOptionLabel={(option) => formatOptionLabel(option)}
				isOptionEqualToValue={(option, val) => option.invoice_id === val.invoice_id}
				loading={listLoading || detailLoading}
				disabled={disabled}
				filterOptions={(opts) => opts}
				noOptionsText={debouncedSearch ? "No matching Govt Sacking invoices" : "Type to search"}
				renderOption={(props, option, { selected }) => {
					const { key, ...optionProps } = props as React.HTMLAttributes<HTMLLIElement> & { key: React.Key };
					return (
						<li key={key} {...optionProps} style={{ ...optionProps.style, alignItems: "flex-start" }}>
							<Checkbox
								icon={<Square size={16} />}
								checkedIcon={<Check size={16} />}
								checked={selected}
								size="small"
								sx={{ mr: 1, p: 0.5 }}
							/>
							<span>{formatOptionLabel(option)}</span>
						</li>
					);
				}}
				renderTags={(rows, getTagProps) =>
					rows.map((row, index) => {
						const { key, ...chipProps } = getTagProps({ index });
						return (
							<Chip
								key={key}
								size="small"
								color="primary"
								variant="filled"
								label={`#${index + 1} • Invoice ${row.invoice_no ?? "—"}${row.party_name ? ` — ${row.party_name}` : ""}`}
								{...chipProps}
							/>
						);
					})
				}
				renderInput={(params) => (
					<TextField
						{...params}
						required={selectedCount === 0}
						placeholder={
							selectedCount === 0
								? "Search by invoice no or party name"
								: "Add another source invoice..."
						}
						helperText={
							selectedCount > 1
								? `${selectedCount} source invoices will be combined into one freight bill.`
								: selectedCount === 1
									? "Search above to add a 2nd source invoice to this freight bill."
									: undefined
						}
						InputProps={{
							...params.InputProps,
							endAdornment: (
								<>
									{(listLoading || detailLoading) ? (
										<CircularProgress color="inherit" size={16} />
									) : null}
									{params.InputProps.endAdornment}
								</>
							),
						}}
					/>
				)}
			/>
		</Box>
	);
}

export default GovtSackingSourcePicker;
