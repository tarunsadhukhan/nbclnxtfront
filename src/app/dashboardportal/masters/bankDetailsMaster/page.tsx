"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateBankDetailsPage from "./CreateBankDetailsPage";
import type { MuiFormMode } from "@/components/ui/muiform";

type BankDetailRow = {
	id: number | string;
	bank_detail_id: number;
	bank_name: string;
	bank_branch: string;
	acc_no_masked: string;
	ifsc_code: string;
	[key: string]: unknown;
};

export default function BankDetailsMasterPage() {
	const [rows, setRows] = useState<BankDetailRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalRows, setTotalRows] = useState(0);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		pageSize: 10,
		page: 0,
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	// Dialog state
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
	const [dialogMode, setDialogMode] = useState<MuiFormMode>("create");

	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	const fetchBankDetails = useCallback(async () => {
		setLoading(true);
		try {
			const co_id = getCoId();
			if (!co_id) {
				setRows([]);
				setTotalRows(0);
				return;
			}

			const queryParams = new URLSearchParams({
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
				co_id: String(co_id),
			});

			if (searchQuery) {
				queryParams.append("search", searchQuery);
			}

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.BANK_DETAILS_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch bank details");
			}

			const mapped: BankDetailRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.bank_detail_id as number,
					bank_detail_id: r.bank_detail_id as number,
					bank_name: (r.bank_name as string) ?? "",
					bank_branch: (r.bank_branch as string) ?? "",
					acc_no_masked: (r.acc_no_masked as string) ?? "",
					ifsc_code: (r.ifsc_code as string) ?? "",
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching bank details";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, getCoId]);

	useEffect(() => {
		fetchBankDetails();
	}, [fetchBankDetails]);

	const handlePaginationModelChange = (newModel: GridPaginationModel) => {
		setPaginationModel(newModel);
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	};

	const handleSnackbarClose = () => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	const handleCreate = useCallback(() => {
		setSelectedId(undefined);
		setDialogMode("create");
		setDialogOpen(true);
	}, []);

	const handleView = useCallback((row: BankDetailRow) => {
		setSelectedId(row.bank_detail_id);
		setDialogMode("view");
		setDialogOpen(true);
	}, []);

	const handleEdit = useCallback((row: BankDetailRow) => {
		setSelectedId(row.bank_detail_id);
		setDialogMode("edit");
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchBankDetails();
	}, [fetchBankDetails]);

	const columns = useMemo<GridColDef<BankDetailRow>[]>(
		() => [
			{
				field: "bank_name",
				headerName: "Bank Name",
				flex: 1.5,
				minWidth: 180,
			},
			{
				field: "bank_branch",
				headerName: "Bank Branch",
				flex: 1.5,
				minWidth: 180,
			},
			{
				field: "acc_no_masked",
				headerName: "A/C No. (Last 5)",
				flex: 1,
				minWidth: 140,
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Bank Details Master"
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{
				value: searchQuery,
				onChange: handleSearchChange,
				placeholder: "Search by bank name, branch or IFSC",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Add Bank Details",
				onClick: handleCreate,
			}}
			onView={handleView}
			onEdit={handleEdit}
		>
			<CreateBankDetailsPage
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={handleSaved}
				editId={selectedId}
				initialMode={dialogMode}
			/>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={handleSnackbarClose}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					onClose={handleSnackbarClose}
					severity={snackbar.severity}
					variant="filled"
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</IndexWrapper>
	);
}
