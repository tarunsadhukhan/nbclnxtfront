"use client";

import * as React from "react";
import { Alert, Button, Chip, Stack, Typography } from "@mui/material";
import { Kanban } from "lucide-react";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter, useSearchParams } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchEnquiryTable, type EnquiryListRow } from "@/utils/enquiryService";

type EnquiryRow = EnquiryListRow & { id: number };

const stageChipColor = (stageCode?: string | null): "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info" => {
	switch (stageCode) {
		case "ENQ_NOTED":
			return "info";
		case "COSTING_REVIEW":
		case "PRICE_CHECK":
			return "warning";
		case "QUOTATION":
			return "primary";
		case "ORDER_CONFIRMED":
			return "success";
		case "LOST":
			return "error";
		case "CLOSED":
			return "default";
		default:
			return "secondary";
	}
};

export default function SalesEnquiryIndexPage() {
	return (
		<React.Suspense fallback={null}>
			<SalesEnquiryIndexContent />
		</React.Suspense>
	);
}

function SalesEnquiryIndexContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const menuId = searchParams?.get("menu_id") || "";
	const { selectedBranches } = useSidebarContext();
	const [rows, setRows] = React.useState<EnquiryRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "enquiry_no",
			headerName: "Enquiry No.",
			flex: 1,
			minWidth: 150,
			renderCell: (params: GridRenderCellParams<EnquiryRow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "Draft"}
				</Typography>
			),
		},
		{ field: "enquiry_date", headerName: "Date", minWidth: 110 },
		{ field: "party_name", headerName: "Customer", flex: 1, minWidth: 160 },
		{
			field: "stage_name",
			headerName: "Stage",
			minWidth: 180,
			renderCell: (params: GridRenderCellParams<EnquiryRow, string>) => (
				<Chip
					size="small"
					color={stageChipColor(params.row.stage_code)}
					variant={Number(params.row.hold_flag) === 1 ? "outlined" : "filled"}
					label={`${params.value || "-"}${Number(params.row.hold_flag) === 1 ? " (on hold)" : ""}`}
				/>
			),
		},
		{
			field: "days_in_stage",
			headerName: "Days in Stage",
			minWidth: 110,
			renderCell: (params: GridRenderCellParams<EnquiryRow, number>) => (
				<Typography component="span" variant="body2">
					{params.value ?? "-"}
				</Typography>
			),
		},
		{ field: "dept_hint", headerName: "Pending On", minWidth: 140 },
		{
			field: "status",
			headerName: "Status",
			minWidth: 130,
			renderCell: (params: GridRenderCellParams<EnquiryRow, string>) => (
				<Chip
					size="small"
					color={params.value === "Approved" ? "success" : params.value === "Rejected" ? "error" : "default"}
					label={params.value || "-"}
				/>
			),
		},
	], []);

	const fetchRows = React.useCallback(async () => {
		setLoading(true);
		setErrorMessage(null);
		try {
			let co_id = "";
			try {
				const storedCompany = localStorage.getItem("sidebar_selectedCompany");
				if (storedCompany) {
					const parsed: unknown = JSON.parse(storedCompany);
					if (parsed && typeof parsed === "object" && "co_id" in parsed) {
						co_id = String((parsed as { co_id?: string | number }).co_id ?? "");
					}
				}
			} catch {
				co_id = "";
			}
			if (!co_id) {
				setRows([]);
				setTotalRows(0);
				return;
			}

			const { data, error } = await fetchEnquiryTable({
				co_id,
				branch_id: selectedBranches.length === 1 ? selectedBranches[0] : null,
				page: paginationModel.page + 1,
				limit: paginationModel.pageSize,
				search: searchValue.trim() || undefined,
			});
			if (error) throw new Error(error);

			const rawRows = data?.data ?? [];
			setRows(rawRows.map((row) => ({ ...row, id: row.sales_enquiry_id })));
			setTotalRows(Number(data?.total ?? rawRows.length));
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to load enquiries");
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue, selectedBranches]);

	React.useEffect(() => {
		fetchRows();
	}, [fetchRows]);

	const withMenu = React.useCallback(
		(path: string) => (menuId ? `${path}${path.includes("?") ? "&" : "?"}menu_id=${encodeURIComponent(menuId)}` : path),
		[menuId]
	);

	const handleView = React.useCallback(
		(row: EnquiryRow) => {
			router.push(withMenu(`/dashboardportal/sales/enquiry/createEnquiry?mode=view&id=${row.sales_enquiry_id}`));
		},
		[router, withMenu]
	);

	const handleEdit = React.useCallback(
		(row: EnquiryRow) => {
			router.push(withMenu(`/dashboardportal/sales/enquiry/createEnquiry?mode=edit&id=${row.sales_enquiry_id}`));
		},
		[router, withMenu]
	);

	return (
		<IndexWrapper
			title="Customer Enquiries"
			subtitle="Note incoming enquiries and track them across departments."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={setPaginationModel}
			loading={loading}
			showLoadingUntilLoaded
			search={{
				value: searchValue,
				onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
					setPaginationModel((prev) => ({ ...prev, page: 0 }));
					setSearchValue(event.target.value);
				},
				placeholder: "Search by enquiry no., customer, or reference",
				debounceDelayMs: 1000,
			}}
			createAction={{
				onClick: () => router.push(withMenu("/dashboardportal/sales/enquiry/createEnquiry")),
				label: "Note Enquiry",
			}}
			onView={handleView}
			onEdit={handleEdit}
			isRowEditable={(row) => Number(row.status_id) === 21}
		>
			<Stack direction="row" spacing={1} sx={{ mt: 1 }}>
				<Button
					size="small"
					variant="outlined"
					startIcon={<Kanban size={16} />}
					onClick={() => router.push(withMenu("/dashboardportal/sales/enquiry/board"))}
				>
					Flow Board
				</Button>
			</Stack>
			{errorMessage ? (
				<Alert severity="error" sx={{ mt: 2 }}>
					{errorMessage}
				</Alert>
			) : null}
		</IndexWrapper>
	);
}
