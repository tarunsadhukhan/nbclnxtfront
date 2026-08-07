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
import { fetchSalesOrderLines, type SalesOrderLine } from "@/utils/deliveryOrderService";

type SalesOrderLinesDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (selectedItems: SalesOrderLine[]) => void;
	salesOrderId?: string;
};

export function SalesOrderLinesDialog({
	open,
	onOpenChange,
	onConfirm,
	salesOrderId,
}: SalesOrderLinesDialogProps) {
	const [lineItems, setLineItems] = React.useState<SalesOrderLine[]>([]);
	const [selectedItems, setSelectedItems] = React.useState<Set<number>>(new Set());
	const [loadingLineItems, setLoadingLineItems] = React.useState(false);

	React.useEffect(() => {
		if (!open || !salesOrderId) {
			setLineItems([]);
			setSelectedItems(new Set());
			return;
		}

		let cancelled = false;
		setLoadingLineItems(true);
		setSelectedItems(new Set());

		fetchSalesOrderLines(salesOrderId)
			.then((response) => {
				if (cancelled) return;
				setLineItems(response.data || []);
			})
			.catch((error) => {
				if (cancelled) return;
				console.error("Error loading sales order line items:", error);
				setLineItems([]);
			})
			.finally(() => {
				if (!cancelled) setLoadingLineItems(false);
			});

		return () => { cancelled = true; };
	}, [open, salesOrderId]);

	const handleToggleItem = React.useCallback((dtlId: number) => {
		setSelectedItems((prev) => {
			const next = new Set(prev);
			if (next.has(dtlId)) {
				next.delete(dtlId);
			} else {
				next.add(dtlId);
			}
			return next;
		});
	}, []);

	const handleSelectAll = React.useCallback(() => {
		if (selectedItems.size === lineItems.length) {
			setSelectedItems(new Set());
		} else {
			setSelectedItems(new Set(lineItems.map((item) => item.sales_order_dtl_id)));
		}
	}, [lineItems, selectedItems.size]);

	const handleConfirm = React.useCallback(() => {
		const selected = lineItems.filter((item) => selectedItems.has(item.sales_order_dtl_id));
		onConfirm(selected);
		onOpenChange(false);
	}, [lineItems, selectedItems, onConfirm, onOpenChange]);

	const allSelected = lineItems.length > 0 && selectedItems.size === lineItems.length;
	const someSelected = selectedItems.size > 0 && selectedItems.size < lineItems.length;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>Sales Order Line Items</DialogTitle>
					<DialogDescription>
						Select line items from the sales order to add to the delivery order.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
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
											(el as any).indeterminate = someSelected;
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
									const isSelected = selectedItems.has(item.sales_order_dtl_id);
									return (
										<div key={item.sales_order_dtl_id} className="p-3 hover:bg-muted/50 flex items-start gap-3">
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => handleToggleItem(item.sales_order_dtl_id)}
												className="mt-1"
											/>
											<div className="flex-1 grid grid-cols-12 gap-2 text-sm">
												<div className="col-span-3">
													<div className="font-medium">{item.full_item_code || item.item_code || "-"}</div>
													<div className="text-muted-foreground text-xs">{item.item_name || "-"}</div>
												</div>
												<div className="col-span-2">
													<div className="text-muted-foreground text-xs">Item Group</div>
													<div>{item.item_grp_code || "-"} {item.item_grp_name ? `- ${item.item_grp_name}` : ""}</div>
												</div>
												<div className="col-span-2">
													<div className="text-muted-foreground text-xs">Quantity</div>
													<div>{item.quantity || 0} {item.uom_name || ""}</div>
												</div>
												<div className="col-span-2">
													<div className="text-muted-foreground text-xs">Rate</div>
													<div>{item.rate != null ? Number(item.rate).toFixed(2) : "-"}</div>
												</div>
												<div className="col-span-1">
													<div className="text-muted-foreground text-xs">HSN</div>
													<div>{item.hsn_code || "-"}</div>
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

					{!loadingLineItems && lineItems.length === 0 && salesOrderId && (
						<div className="text-sm text-muted-foreground text-center py-8 border rounded-md">
							No line items available for this sales order.
						</div>
					)}

					{!salesOrderId && (
						<div className="text-sm text-muted-foreground text-center py-8 border rounded-md">
							No sales order selected.
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
