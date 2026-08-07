"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Snackbar, Alert, Chip, IconButton, Tooltip } from "@mui/material";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useRouter } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import BomTreeEditor from "@/app/dashboardportal/BomCosting/itemBomMaster/_components/BomTreeEditor";

type BomStatus = "New" | "Certified" | "Under Development" | "Closed";

type BomItem = {
  id: number;
  item_id: number;
  item_code: string;
  full_item_code?: string;
  item_name: string;
  bom_hdr_id: number | null;
  bom_status: BomStatus | null;
  [key: string]: any;
};

const STATUS_COLOR: Record<BomStatus, "info" | "warning" | "success" | "default"> = {
  "New": "info",
  "Under Development": "warning",
  "Certified": "success",
  "Closed": "default",
};

export default function ItemBomMasterPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BomItem | null>(null);

  const fetchBomList = async () => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const queryParams = new URLSearchParams({
        co_id: co_id,
      });
      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }
      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.BOM_LIST}?${queryParams}`,
        "GET"
      );
      if (error || !data) {
        throw new Error(error || "Failed to fetch BOM list");
      }
      const mappedRows = (data.data || []).map((row: any) => ({
        ...row,
        id: row.item_id ?? row.id,
      }));
      setRows(mappedRows);
      setTotalRows(mappedRows.length);
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || "Error fetching BOM list", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBomList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const handlePaginationModelChange = (newPaginationModel: GridPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleView = (row: BomItem) => {
    setSelectedItem(row);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setSelectedItem(null);
    fetchBomList();
  };

  const columns = useMemo<GridColDef<BomItem>[]>(() => ([
    { field: "full_item_code", headerName: "Item Code", flex: 1, minWidth: 180,
      valueGetter: (_value: string, row: BomItem) => row.full_item_code || row.item_code || "-",
    },
    { field: "item_name", headerName: "Item Name", flex: 1.5, minWidth: 180 },
    {
      field: "bom_status",
      headerName: "Status",
      flex: 0.7,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams<BomItem>) => {
        const status = (params.row.bom_status ?? "New") as BomStatus;
        return (
          <Chip
            label={status}
            size="small"
            color={STATUS_COLOR[status]}
            sx={{ height: 20, fontSize: "0.7rem" }}
          />
        );
      },
    },
    {
      field: "__cost_sheet",
      headerName: "",
      width: 40,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<BomItem>) =>
        params.row.bom_hdr_id ? (
          <Tooltip title="Open Cost Sheet">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/dashboardportal/BomCosting/bomCosting/costSheet?mode=edit&bom_hdr_id=${params.row.bom_hdr_id}`
                );
              }}
            >
              <FileSpreadsheet size={15} />
            </IconButton>
          </Tooltip>
        ) : null,
    },
  ]), [router]);

  return (
    <IndexWrapper
      title="Item BOM Master"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{ value: searchQuery, onChange: handleSearchChange, placeholder: "Search items with BOM", debounceDelayMs: 1000 }}
      createAction={{ onClick: () => {
        setSelectedItem(null);
        setEditorOpen(true);
      }}}
      onView={handleView}
    >
      <BomTreeEditor
        open={editorOpen}
        onClose={handleCloseEditor}
        item={selectedItem}
        onSnackbar={(message, severity) => setSnackbar({ open: true, message, severity })}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}