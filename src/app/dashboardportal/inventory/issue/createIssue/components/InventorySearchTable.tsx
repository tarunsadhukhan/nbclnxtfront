/**
 * @component InventorySearchTable
 * @description Dialog-based search for available inventory items from approved SRs.
 * Fetches only on explicit search (Search button / Enter) and inserts items one at a time
 * via an Add button.
 */
"use client";

import React from "react";
import {
	Box,
	Typography,
	TextField,
	InputAdornment,
	Button,
	CircularProgress,
	Pagination,
	Dialog,
	DialogTitle,
	DialogContent,
} from "@mui/material";
import { Search, Plus, AlertCircle } from "lucide-react";
import { fetchInventoryList, type InventoryListItem } from "@/utils/issueService";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "@/components/ui/table";

type InventorySearchTableProps = {
	/** Company ID for API calls */
	coId: string;
	/** Branch ID to filter inventory */
	branchId: string;
	/** Whether the control is disabled (e.g., in view mode) */
	disabled?: boolean;
	/** Callback when an item is selected for insertion */
	onInsertItems: (items: InventoryListItem[]) => void;
	/** inward_dtl_id values already present in the issue (rendered as "Added", disabled) */
	addedInwardDtlIds?: Set<string>;
};

const EMPTY_ADDED: Set<string> = new Set();

const PAGE_SIZE = 10;

/**
 * Format date for display
 */
const formatDate = (dateStr: string | null | undefined): string => {
	if (!dateStr) return "-";
	try {
		return new Date(dateStr).toLocaleDateString("en-IN", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	} catch {
		return dateStr;
	}
};

/**
 * Format number for display
 */
const formatNumber = (value: number | null | undefined, decimals = 2): string => {
	if (value == null) return "-";
	return value.toLocaleString("en-IN", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
};

export function InventorySearchTable({
	coId,
	branchId,
	disabled = false,
	onInsertItems,
	addedInwardDtlIds = EMPTY_ADDED,
}: InventorySearchTableProps) {
	// State
	const [open, setOpen] = React.useState(false);
	const [rows, setRows] = React.useState<InventoryListItem[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [totalRows, setTotalRows] = React.useState(0);
	const [page, setPage] = React.useState(1);
	const [searchValue, setSearchValue] = React.useState("");
	// Search only runs when the user presses the Search button (or Enter) —
	// typing alone never fetches, so slow typists aren't hit with premature results.
	const [submittedSearch, setSubmittedSearch] = React.useState("");

	// Monotonic request id — guards against out-of-order fetch responses
	// (a slower earlier request resolving after a newer one would clobber rows).
	const reqIdRef = React.useRef(0);

	// Calculate total pages
	const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

	// Fetch data — only when dialog is open AND a search was submitted
	// (no upfront full-list load, to keep the dialog fast)
	const fetchData = React.useCallback(async () => {
		if (!coId || !branchId || !open || !submittedSearch) {
			setRows([]);
			setTotalRows(0);
			setError(null);
			return;
		}

		const reqId = ++reqIdRef.current;
		setLoading(true);
		setError(null);

		try {
			const result = await fetchInventoryList(coId, {
				branchId,
				page,
				limit: PAGE_SIZE,
				search: submittedSearch,
			});

			if (reqId !== reqIdRef.current) return; // a newer request superseded this one
			setRows(result.data);
			setTotalRows(result.total);
		} catch (err) {
			if (reqId !== reqIdRef.current) return;
			const message = err instanceof Error ? err.message : "Failed to load inventory";
			setError(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			if (reqId === reqIdRef.current) setLoading(false);
		}
	}, [coId, branchId, open, page, submittedSearch]);

	// Fetch when deps change
	React.useEffect(() => {
		void fetchData();
	}, [fetchData]);

	// Reset transient state when the dialog closes
	const handleClose = React.useCallback(() => {
		setOpen(false);
		setSearchValue("");
		setSubmittedSearch("");
		setPage(1);
		setRows([]);
		setTotalRows(0);
		setError(null);
	}, []);

	// Handle add (single row, direct insert)
	const handleAdd = React.useCallback(
		(row: InventoryListItem) => {
			onInsertItems([row]);
		},
		[onInsertItems]
	);

	// Handle search change (typing only updates the field — no fetch)
	const handleSearchChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setSearchValue(event.target.value);
		},
		[]
	);

	// Submit search (button click or Enter)
	const handleSearchSubmit = React.useCallback(() => {
		setPage(1); // Reset to first page on new search
		setSubmittedSearch(searchValue.trim());
	}, [searchValue]);

	const handleSearchKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			if (event.key === "Enter") {
				event.preventDefault();
				handleSearchSubmit();
			}
		},
		[handleSearchSubmit]
	);

	// Handle page change
	const handlePageChange = React.useCallback(
		(_event: React.ChangeEvent<unknown>, newPage: number) => {
			setPage(newPage);
		},
		[]
	);

	return (
		<Box>
			<Button
				variant="outlined"
				size="small"
				startIcon={<Search className="h-4 w-4" />}
				onClick={() => setOpen(true)}
				disabled={disabled || !branchId}
			>
				Add from Inventory
			</Button>

			<Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
				<DialogTitle>
					<Box className="flex items-center justify-between gap-4">
						<Box>
							<Typography variant="subtitle1" fontWeight={600}>
								Available Inventory
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Search items and add them to the issue.
							</Typography>
						</Box>
						<Box className="flex items-center gap-2">
							<TextField
								size="small"
								autoFocus
								placeholder="Search by item, group, or SR no..."
								value={searchValue}
								onChange={handleSearchChange}
								onKeyDown={handleSearchKeyDown}
								disabled={disabled}
								slotProps={{
									input: {
										startAdornment: (
											<InputAdornment position="start">
												<Search className="h-4 w-4 text-gray-400" />
											</InputAdornment>
										),
									},
								}}
								sx={{ width: 320 }}
							/>
							<Button
								variant="contained"
								size="small"
								onClick={handleSearchSubmit}
								disabled={disabled || !searchValue.trim() || loading}
							>
								Search
							</Button>
						</Box>
					</Box>
				</DialogTitle>

				<DialogContent dividers>
					{/* Error display */}
					{error ? (
						<Box className="p-3 mb-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
							<AlertCircle className="h-4 w-4 text-red-600" />
							<Typography variant="body2" className="text-red-700">
								{error}
							</Typography>
						</Box>
					) : null}

					<Box className="relative">
						{loading && (
							<Box className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
								<CircularProgress size={24} />
							</Box>
						)}

						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>SR No</TableHead>
									<TableHead className="w-24">Date</TableHead>
									<TableHead>Item Group</TableHead>
									<TableHead>Item Code</TableHead>
									<TableHead>Item Name</TableHead>
									<TableHead className="w-16">UOM</TableHead>
									<TableHead className="w-20 text-right">Avl Qty</TableHead>
									<TableHead className="w-24 text-right">Rate</TableHead>
									<TableHead>Warehouse</TableHead>
									<TableHead className="w-16" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={10}
											className="text-center py-8 text-gray-500"
										>
											{submittedSearch
												? "No items match your search."
												: "Type a search term and press Search."}
										</TableCell>
									</TableRow>
								) : (
									rows.map((row) => {
										const alreadyAdded = addedInwardDtlIds.has(
											String(row.inward_dtl_id)
										);
										const itemLabel =
											row.item_name || row.item_code || "item";
										return (
										<TableRow key={row.inward_dtl_id}>
											<TableCell className="font-mono text-xs">
												{row.sr_no || "-"}
											</TableCell>
											<TableCell className="text-xs">
												{formatDate(row.inward_date)}
											</TableCell>
											<TableCell className="text-sm">
												{row.item_grp_name || "-"}
											</TableCell>
											<TableCell className="font-mono text-xs">
												{row.full_item_code || row.item_code || "-"}
											</TableCell>
											<TableCell className="text-sm">
												{row.item_name || "-"}
											</TableCell>
											<TableCell className="text-xs">
												{row.uom_name || "-"}
											</TableCell>
											<TableCell className="text-right font-mono text-sm">
												{formatNumber(row.available_qty, 2)}
											</TableCell>
											<TableCell className="text-right font-mono text-sm">
												{formatNumber(row.rate, 2)}
											</TableCell>
											<TableCell className="text-xs">
												{row.warehouse_name || "-"}
											</TableCell>
											<TableCell>
												<Button
													variant="contained"
													size="small"
													startIcon={<Plus className="h-4 w-4" />}
													onClick={() => handleAdd(row)}
													disabled={disabled || alreadyAdded}
													aria-label={
														alreadyAdded
															? `${itemLabel} already added`
															: `Add ${itemLabel} to issue`
													}
												>
													{alreadyAdded ? "Added" : "Add"}
												</Button>
											</TableCell>
										</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</Box>

					{/* Pagination */}
					{totalPages > 1 && (
						<Box className="pt-3 flex items-center justify-between">
							<Typography variant="body2" color="text.secondary">
								Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
								{Math.min(page * PAGE_SIZE, totalRows)} of {totalRows} items
							</Typography>
							<Pagination
								count={totalPages}
								page={page}
								onChange={handlePageChange}
								size="small"
								color="primary"
							/>
						</Box>
					)}
				</DialogContent>
			</Dialog>
		</Box>
	);
}

export default InventorySearchTable;
