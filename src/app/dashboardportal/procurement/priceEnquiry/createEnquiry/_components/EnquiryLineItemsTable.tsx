"use client";

import React from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Typography,
	Checkbox,
	IconButton,
	Tooltip,
	Stack,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import type { EnquiryLineItem } from "../types/enquiryTypes";

type EnquiryLineItemsTableProps = {
	/** Current line items to render. */
	items: ReadonlyArray<EnquiryLineItem>;
	/** Whether the table is in editable mode (create/edit). */
	canEdit: boolean;
	/** Callback to remove selected line items by their IDs. */
	onRemoveItems?: (ids: string[]) => void;
};

/**
 * Renders enquiry line items sourced from approved indents.
 * Columns: Indent No, Item Code, Item Name, Make, UOM, Qty, Remarks.
 * In create/edit mode a checkbox column allows selecting items for removal.
 */
export function EnquiryLineItemsTable({
	items,
	canEdit,
	onRemoveItems,
}: EnquiryLineItemsTableProps) {
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

	// Reset selection when items change
	React.useEffect(() => {
		setSelectedIds(new Set());
	}, [items]);

	const handleToggle = React.useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const handleToggleAll = React.useCallback(() => {
		setSelectedIds((prev) => {
			if (prev.size === items.length) {
				return new Set();
			}
			return new Set(items.map((item) => item.id));
		});
	}, [items]);

	const handleRemoveSelected = React.useCallback(() => {
		if (selectedIds.size === 0 || !onRemoveItems) return;
		onRemoveItems(Array.from(selectedIds));
		setSelectedIds(new Set());
	}, [selectedIds, onRemoveItems]);

	if (items.length === 0) {
		return (
			<Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
				<Typography variant="body2" color="text.secondary">
					{canEdit
						? "No line items added yet. Click \"Add Indent Items\" to select items from approved indents."
						: "No line items available."}
				</Typography>
			</Paper>
		);
	}

	return (
		<Stack spacing={1}>
			{canEdit && selectedIds.size > 0 && (
				<Stack direction="row" alignItems="center" spacing={1}>
					<Typography variant="body2" color="text.secondary">
						{selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
					</Typography>
					<Tooltip title="Remove selected items">
						<IconButton size="small" color="error" onClick={handleRemoveSelected}>
							<Trash2 size={16} />
						</IconButton>
					</Tooltip>
				</Stack>
			)}
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow sx={{ backgroundColor: "grey.50" }}>
							{canEdit && (
								<TableCell padding="checkbox" sx={{ width: 28 }}>
									<Checkbox
										size="small"
										checked={items.length > 0 && selectedIds.size === items.length}
										indeterminate={selectedIds.size > 0 && selectedIds.size < items.length}
										onChange={handleToggleAll}
									/>
								</TableCell>
							)}
							<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>#</TableCell>
							<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Indent No</TableCell>
							<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Item Code</TableCell>
							<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Item Name</TableCell>
							<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Make</TableCell>
							<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>UOM</TableCell>
							<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }} align="right">Qty</TableCell>
							<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Remarks</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{items.map((item, index) => (
							<TableRow key={item.id} hover>
								{canEdit && (
									<TableCell padding="checkbox">
										<Checkbox
											size="small"
											checked={selectedIds.has(item.id)}
											onChange={() => handleToggle(item.id)}
										/>
									</TableCell>
								)}
								<TableCell sx={{ fontSize: "0.75rem" }}>{index + 1}</TableCell>
								<TableCell sx={{ fontSize: "0.75rem" }}>{item.indentNo ?? "-"}</TableCell>
								<TableCell sx={{ fontSize: "0.75rem" }}>{item.itemCode ?? "-"}</TableCell>
								<TableCell sx={{ fontSize: "0.75rem" }}>{item.itemName ?? "-"}</TableCell>
								<TableCell sx={{ fontSize: "0.75rem" }}>{item.itemMakeName ?? "-"}</TableCell>
								<TableCell sx={{ fontSize: "0.75rem" }}>{item.uomName ?? "-"}</TableCell>
								<TableCell sx={{ fontSize: "0.75rem" }} align="right">
									{item.qty != null ? item.qty : "-"}
								</TableCell>
								<TableCell sx={{ fontSize: "0.75rem" }}>{item.remarks || "-"}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</Stack>
	);
}

export default EnquiryLineItemsTable;
