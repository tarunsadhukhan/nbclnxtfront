"use client";

import React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Option } from "@/components/ui/muiform";
import { getApprovedPOsBySupplier, getPOLineItemsForInward, type ApprovedPO } from "@/utils/inwardService";
import type { POLineItem } from "../types/inwardTypes";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

type POLineItemsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (selectedItems: POLineItem[]) => void;
	supplierId?: number | string;
	branchId?: number | string;
};

export function POLineItemsDialog({
	open,
	onOpenChange,
	onConfirm,
	supplierId,
	branchId,
}: POLineItemsDialogProps) {
	const [selectedPO, setSelectedPO] = React.useState<ApprovedPO | null>(null);
	const [approvedPOs, setApprovedPOs] = React.useState<ApprovedPO[]>([]);
	const [poOptions, setPOOptions] = React.useState<Option[]>([]);
	const [lineItems, setLineItems] = React.useState<POLineItem[]>([]);
	const [selectedItems, setSelectedItems] = React.useState<Set<number>>(new Set());
	const [loadingPOs, setLoadingPOs] = React.useState(false);
	const [loadingLineItems, setLoadingLineItems] = React.useState(false);

	const loadApprovedPOs = React.useCallback(async () => {
		if (!supplierId) return;
		setLoadingPOs(true);
		try {
			const response = await getApprovedPOsBySupplier(supplierId, branchId);
			setApprovedPOs(response.data || []);
			const options: Option[] = (response.data || []).map((po) => ({
				label: `${po.po_no} - ${po.supplier_name} (${po.po_date})`,
				value: String(po.po_id),
			}));
			setPOOptions(options);
		} catch (error) {
			console.error("Error loading approved POs:", error);
			setApprovedPOs([]);
			setPOOptions([]);
		} finally {
			setLoadingPOs(false);
		}
	}, [supplierId, branchId]);

	// Load approved POs when dialog opens
	React.useEffect(() => {
		if (open && supplierId) {
			loadApprovedPOs();
		}
	}, [open, supplierId, branchId, loadApprovedPOs]);

	// Reset state when dialog opens
	React.useEffect(() => {
		if (open) {
			setSelectedPO(null);
			setLineItems([]);
			setSelectedItems(new Set());
		}
	}, [open]);

	const handlePOSelect = React.useCallback(
		async (poId: string | null) => {
			if (!poId) {
				setSelectedPO(null);
				setLineItems([]);
				setSelectedItems(new Set());
				return;
			}

			const po = approvedPOs.find((p) => String(p.po_id) === poId);
			if (!po) {
				console.error("[PODialog] PO not found for ID:", poId);
				return;
			}

			setSelectedPO(po);
			setLoadingLineItems(true);
			setSelectedItems(new Set());

			try {
				const response = await getPOLineItemsForInward(poId);
				const mappedItems: POLineItem[] = (response.line_items || []).map((item: Record<string, unknown>) => ({
					po_dtl_id: Number(item.po_dtl_id ?? item.id ?? 0),
					po_id: Number(item.po_id ?? po.po_id),
					po_no: String(item.po_no ?? po.po_no ?? ""),
					item_id: Number(item.item_id ?? 0),
					item_code: String(item.item_code ?? ""),
					item_name: String(item.item_name ?? ""),
					item_grp_id: Number(item.item_grp_id ?? 0),
					item_grp_code: String(item.item_grp_code ?? ""),
					item_grp_name: String(item.item_grp_name ?? ""),
					ordered_qty: Number(item.ordered_qty ?? item.qty ?? 0),
					received_qty: Number(item.received_qty ?? 0),
					pending_qty: Number(item.pending_qty ?? (Number(item.ordered_qty ?? 0) - Number(item.received_qty ?? 0))),
					rate: Number(item.rate ?? 0),
					uom_id: Number(item.uom_id ?? 0),
					uom_name: String(item.uom_name ?? ""),
					item_make_id: item.item_make_id ? Number(item.item_make_id) : undefined,
					item_make_name: item.item_make_name ? String(item.item_make_name) : undefined,
					tax_percentage: item.tax_percentage ? Number(item.tax_percentage) : undefined,
					amount: item.amount ? Number(item.amount) : undefined,
					remarks: item.remarks ? String(item.remarks) : undefined,
					hsn_code: item.hsn_code ? String(item.hsn_code) : undefined,
				}));
				// Only show items with pending quantity > 0
				const pendingItems = mappedItems.filter((item) => item.pending_qty > 0);
				setLineItems(pendingItems);
			} catch (error) {
				console.error("Error loading PO line items:", error);
				setLineItems([]);
			} finally {
				setLoadingLineItems(false);
			}
		},
		[approvedPOs]
	);

	const handleToggleItem = React.useCallback((poDtlId: number) => {
		setSelectedItems((prev) => {
			const next = new Set(prev);
			if (next.has(poDtlId)) {
				next.delete(poDtlId);
			} else {
				next.add(poDtlId);
			}
			return next;
		});
	}, []);

	const handleSelectAll = React.useCallback(() => {
		if (selectedItems.size === lineItems.length) {
			setSelectedItems(new Set());
		} else {
			setSelectedItems(new Set(lineItems.map((item) => item.po_dtl_id)));
		}
	}, [lineItems, selectedItems.size]);

	const handleConfirm = React.useCallback(() => {
		const selected = lineItems.filter((item) => selectedItems.has(item.po_dtl_id));
		onConfirm(selected);
		onOpenChange(false);
	}, [lineItems, selectedItems, onConfirm, onOpenChange]);

	const allSelected = lineItems.length > 0 && selectedItems.size === lineItems.length;
	const someSelected = selectedItems.size > 0 && selectedItems.size < lineItems.length;

	const selectedPOOption: Option | null = selectedPO
		? { label: `${selectedPO.po_no} - ${selectedPO.supplier_name} (${selectedPO.po_date})`, value: String(selectedPO.po_id) }
		: null;

	const [autocompleteOpen, setAutocompleteOpen] = React.useState(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
				onInteractOutside={(e) => {
					const target = e.target as HTMLElement;
					if (target.closest(".MuiAutocomplete-popper") || target.closest(".MuiAutocomplete-listbox")) {
						e.preventDefault();
					}
				}}
			>
				<DialogHeader>
					<DialogTitle>Select PO and Line Items</DialogTitle>
					<DialogDescription>
						Select an approved PO to view its pending line items. Select the items you want to receive in this inward.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
					<div>
						<label className="text-sm font-medium mb-2 block">Select Approved PO</label>
						<Autocomplete<Option, false, false, false>
							open={autocompleteOpen}
							onOpen={() => setAutocompleteOpen(true)}
							onClose={() => setAutocompleteOpen(false)}
							options={poOptions}
							value={selectedPOOption}
							onChange={(_, newOpt) => {
								setAutocompleteOpen(false);
								if (!newOpt) {
									handlePOSelect(null);
									return;
								}
								handlePOSelect(String(newOpt.value));
							}}
							getOptionLabel={(opt: Option) => opt.label}
							isOptionEqualToValue={(o: Option, v: Option) => String(o.value) === String(v.value)}
							disabled={loadingPOs || !supplierId}
							loading={loadingPOs}
							noOptionsText={!supplierId ? "Select a supplier first" : "No POs available"}
							disablePortal={true}
							openOnFocus
							blurOnSelect
							selectOnFocus
							handleHomeEndKeys
							renderOption={(props, option) => {
								const { key, ...otherProps } = props;
								return (
									<li key={key} {...otherProps}>
										{option.label}
									</li>
								);
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									placeholder={loadingPOs ? "Loading POs..." : !supplierId ? "Select a supplier first" : "Search and select a PO"}
									size="small"
									fullWidth
								/>
							)}
						/>
					</div>

					{loadingLineItems && (
						<div className="text-sm text-muted-foreground text-center py-4">
							Loading line items...
						</div>
					)}

					{!loadingLineItems && lineItems.length > 0 && (
						<div className="flex-1 overflow-auto border rounded-md min-h-0">
							<div className="sticky top-0 bg-background border-b z-10 p-2 flex items-center gap-2">
								<Checkbox
									checked={allSelected}
									onCheckedChange={handleSelectAll}
									ref={(el) => {
										if (el) {
											(el as unknown as { indeterminate: boolean }).indeterminate = someSelected;
										}
									}}
								/>
								<span className="text-sm font-medium">Select All</span>
								<span className="text-sm text-muted-foreground ml-auto">
									{selectedItems.size} of {lineItems.length} selected
								</span>
							</div>

							<div className="divide-y">
								{lineItems.map((item) => {
									const isSelected = selectedItems.has(item.po_dtl_id);
									return (
										<div
											key={item.po_dtl_id}
											className="p-3 hover:bg-muted/50 flex items-start gap-3"
										>
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => handleToggleItem(item.po_dtl_id)}
												className="mt-1"
											/>
											<div className="flex-1 grid grid-cols-12 gap-2 text-sm">
												<div className="col-span-2">
													<div className="font-medium">{item.full_item_code || item.item_code || "-"}</div>
													<div className="text-muted-foreground text-xs">{item.item_name || "-"}</div>
												</div>
												<div className="col-span-2">
													<div className="text-muted-foreground text-xs">Item Group</div>
													<div>{item.item_grp_code || "-"} {item.item_grp_name ? `- ${item.item_grp_name}` : ""}</div>
												</div>
												<div className="col-span-2">
													<div className="text-muted-foreground text-xs">Ordered / Received</div>
													<div>{item.ordered_qty} / {item.received_qty}</div>
												</div>
												<div className="col-span-2">
													<div className="text-muted-foreground text-xs">Pending Qty</div>
													<div className="font-medium text-primary">{item.pending_qty} {item.uom_name || ""}</div>
												</div>
												<div className="col-span-2">
													<div className="text-muted-foreground text-xs">Rate</div>
													<div>{item.rate ? Number(item.rate).toLocaleString("en-IN") : "-"}</div>
												</div>
												<div className="col-span-2">
													<div className="text-muted-foreground text-xs">Make</div>
													<div>{item.item_make_name || "-"}</div>
												</div>
												{item.remarks && (
													<div className="col-span-12 mt-1">
														<div className="text-muted-foreground text-xs">Remarks</div>
														<div className="text-xs">{item.remarks}</div>
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{!loadingLineItems && lineItems.length === 0 && selectedPO && (
						<div className="text-sm text-muted-foreground text-center py-8 border rounded-md">
							No pending line items available for this PO.
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={selectedItems.size === 0 || lineItems.length === 0}
					>
						Add Selected Items ({selectedItems.size})
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
