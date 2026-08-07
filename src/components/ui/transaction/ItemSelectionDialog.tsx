/**
 * @component ItemSelectionDialog
 * @description Reusable dialog for selecting items from a searchable, paginated table.
 * Used across procurement and sales modules to replace inline item group/item code dropdowns.
 * Modeled after the InventorySearchTable in the inventory issue module.
 */
"use client";

import React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "@/components/ui/table";
import {
	TextField,
	InputAdornment,
	Checkbox,
	CircularProgress,
	Pagination,
} from "@mui/material";
import { Search, Plus, AlertCircle } from "lucide-react";
import {
	fetchItemSearch,
	type ItemSearchResult,
	type ItemSearchMake,
	type ItemSearchUom,
} from "@/utils/itemSearchService";
import { useDebounce } from "@/hooks/use-debounce";

/**
 * Represents a selected item with all related metadata needed to create a line item.
 */
export type SelectedItem = {
	item_id: number;
	item_grp_id: number;
	item_grp_code: string;
	item_grp_name: string;
	item_code: string;
	full_item_code: string;
	item_name: string;
	uom_id: number;
	uom_name: string;
	hsn_code: string | null;
	tax_percentage: number | null;
	makes: { item_make_id: number; item_make_name: string }[];
	uoms: {
		map_from_id: number;
		map_from_name: string;
		map_to_id: number;
		uom_name: string;
		relation_value: number | null;
		rounding: number | null;
	}[];
};

type ItemSelectionDialogProps = {
	/** Whether the dialog is open */
	open: boolean;
	/** Callback to close the dialog */
	onOpenChange: (open: boolean) => void;
	/** Company ID for API calls */
	coId: string;
	/** Callback when items are confirmed for insertion */
	onConfirm: (items: SelectedItem[]) => void;
	/** Optional filter: only show purchaseable or saleable items */
	filter?: "purchaseable" | "saleable";
	/** Item IDs already selected in the form (to show as disabled/already added) */
	excludeItemIds?: Set<number>;
	/** Dialog title override */
	title?: string;
};

const PAGE_SIZE = 15;

export function ItemSelectionDialog({
	open,
	onOpenChange,
	coId,
	onConfirm,
	filter,
	excludeItemIds,
	title = "Select Items",
}: ItemSelectionDialogProps) {
	const [rows, setRows] = React.useState<ItemSearchResult[]>([]);
	const [makes, setMakes] = React.useState<ItemSearchMake[]>([]);
	const [uoms, setUoms] = React.useState<ItemSearchUom[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [totalRows, setTotalRows] = React.useState(0);
	const [page, setPage] = React.useState(1);
	const [searchValue, setSearchValue] = React.useState("");
	const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());

	const debouncedSearch = useDebounce(searchValue, 300);
	const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

	// Reset state when dialog opens
	React.useEffect(() => {
		if (open) {
			setSearchValue("");
			setSelectedIds(new Set());
			setPage(1);
		}
	}, [open]);

	// Fetch data
	const fetchData = React.useCallback(async () => {
		if (!coId || !open) return;

		setLoading(true);
		setError(null);

		try {
			const result = await fetchItemSearch(coId, {
				page,
				limit: PAGE_SIZE,
				search: debouncedSearch || undefined,
				filter,
			});
			setRows(result.data);
			setTotalRows(result.total);
			setMakes(result.makes);
			setUoms(result.uoms);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load items";
			setError(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [coId, open, page, debouncedSearch, filter]);

	React.useEffect(() => {
		void fetchData();
	}, [fetchData]);

	// Clear selection when data changes
	React.useEffect(() => {
		setSelectedIds(new Set());
	}, [rows]);

	const handleSelectAll = React.useCallback(
		(checked: boolean) => {
			if (checked) {
				const selectableIds = rows
					.filter((row) => !excludeItemIds?.has(row.item_id))
					.map((row) => row.item_id);
				setSelectedIds(new Set(selectableIds));
			} else {
				setSelectedIds(new Set());
			}
		},
		[rows, excludeItemIds]
	);

	const handleSelectRow = React.useCallback((id: number, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) {
				next.add(id);
			} else {
				next.delete(id);
			}
			return next;
		});
	}, []);

	const handleConfirm = React.useCallback(() => {
		if (selectedIds.size === 0) return;

		const selectedItems: SelectedItem[] = rows
			.filter((row) => selectedIds.has(row.item_id))
			.map((row) => ({
				item_id: row.item_id,
				item_grp_id: row.item_grp_id,
				item_grp_code: row.item_grp_code,
				item_grp_name: row.item_grp_name,
				item_code: row.item_code,
				full_item_code: row.full_item_code,
				item_name: row.item_name,
				uom_id: row.uom_id,
				uom_name: row.uom_name,
				hsn_code: row.hsn_code,
				tax_percentage: row.tax_percentage,
				makes: makes
					.filter((m) => m.item_grp_id === row.item_grp_id)
					.map((m) => ({ item_make_id: m.item_make_id, item_make_name: m.item_make_name })),
				uoms: uoms
					.filter((u) => u.item_id === row.item_id)
					.map((u) => ({
						map_from_id: u.map_from_id,
						map_from_name: u.map_from_name,
						map_to_id: u.map_to_id,
						uom_name: u.uom_name,
						relation_value: u.relation_value,
						rounding: u.rounding,
					})),
			}));

		if (selectedItems.length > 0) {
			onConfirm(selectedItems);
			onOpenChange(false);
		}
	}, [selectedIds, rows, makes, uoms, onConfirm, onOpenChange]);

	const handleSearchChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setSearchValue(event.target.value);
			setPage(1);
		},
		[]
	);

	const handlePageChange = React.useCallback(
		(_event: React.ChangeEvent<unknown>, newPage: number) => {
			setPage(newPage);
		},
		[]
	);

	const selectableRows = rows.filter((row) => !excludeItemIds?.has(row.item_id));
	const allSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedIds.has(row.item_id));
	const someSelected = selectableRows.some((row) => selectedIds.has(row.item_id));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 gap-0">
				{/* Header */}
				<DialogHeader className="p-4 pb-3 border-b border-gray-200">
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Search and select items to add to the transaction.
					</DialogDescription>
				</DialogHeader>

				{/* Search & Actions */}
				<div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
					<TextField
						size="small"
						placeholder="Search by item code, name, group, or HSN..."
						value={searchValue}
						onChange={handleSearchChange}
						slotProps={{
							input: {
								startAdornment: (
									<InputAdornment position="start">
										<Search className="h-4 w-4 text-gray-400" />
									</InputAdornment>
								),
							},
						}}
						sx={{ width: 340 }}
					/>
					<span className="text-sm text-gray-500">
						{selectedIds.size > 0
							? `${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""} selected`
							: `${totalRows} item${totalRows !== 1 ? "s" : ""} found`}
					</span>
				</div>

				{/* Error */}
				{error ? (
					<div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
						<AlertCircle className="h-4 w-4 text-red-600" />
						<span className="text-sm text-red-700">{error}</span>
					</div>
				) : null}

				{/* Table */}
				<div className="flex-1 overflow-auto relative min-h-[300px]">
					{loading && (
						<div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
							<CircularProgress size={24} />
						</div>
					)}

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-10">
									<Checkbox
										size="small"
										checked={allSelected}
										indeterminate={someSelected && !allSelected}
										onChange={(e) => handleSelectAll(e.target.checked)}
										disabled={selectableRows.length === 0}
									/>
								</TableHead>
								<TableHead>Item Group</TableHead>
								<TableHead>Item Code</TableHead>
								<TableHead>Item Name</TableHead>
								<TableHead className="w-16">UOM</TableHead>
								<TableHead className="w-24">HSN Code</TableHead>
								<TableHead className="w-16 text-right">Tax %</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="text-center py-8 text-gray-500"
									>
										{debouncedSearch
											? "No items match your search."
											: "No items found."}
									</TableCell>
								</TableRow>
							) : (
								rows.map((row) => {
									const isExcluded = excludeItemIds?.has(row.item_id) ?? false;
									return (
										<TableRow
											key={row.item_id}
											className={
												selectedIds.has(row.item_id)
													? "bg-blue-50"
													: isExcluded
														? "opacity-50"
														: undefined
											}
										>
											<TableCell className="w-10">
												<Checkbox
													size="small"
													checked={selectedIds.has(row.item_id)}
													onChange={(e) =>
														handleSelectRow(row.item_id, e.target.checked)
													}
													disabled={isExcluded}
												/>
											</TableCell>
											<TableCell className="text-sm">
												<span className="font-mono text-xs text-gray-500">
													{row.item_grp_code}
												</span>
												{row.item_grp_name !== row.item_grp_code && (
													<>
														{" "}
														<span className="text-gray-400">-</span>{" "}
														<span>{row.item_grp_name}</span>
													</>
												)}
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
											<TableCell className="font-mono text-xs">
												{row.hsn_code || "-"}
											</TableCell>
											<TableCell className="text-right font-mono text-sm">
												{row.tax_percentage != null
													? `${row.tax_percentage}%`
													: "-"}
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between">
						<span className="text-sm text-gray-500">
							Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
							{Math.min(page * PAGE_SIZE, totalRows)} of {totalRows} items
						</span>
						<Pagination
							count={totalPages}
							page={page}
							onChange={handlePageChange}
							size="small"
							color="primary"
						/>
					</div>
				)}

				{/* Footer */}
				<DialogFooter className="p-4 pt-3 border-t border-gray-200">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={selectedIds.size === 0}
					>
						<Plus className="h-4 w-4 mr-1" />
						Add {selectedIds.size > 0 ? `${selectedIds.size} Item${selectedIds.size > 1 ? "s" : ""}` : "Items"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default ItemSelectionDialog;
