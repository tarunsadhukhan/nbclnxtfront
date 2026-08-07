"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import RateCardForm from "./_components/RateCardForm";

type RateCardRow = {
  id: number;
  std_rate_card_id: number;
  rate_type: string;
  reference_name: string;
  reference_type: string | null;
  reference_id: number | null;
  rate: number;
  uom: string | null;
  valid_from: string;
  valid_to: string | null;
  active: number;
};

export default function StdRateCardPage() {
  const [rows, setRows] = useState<RateCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingCard, setEditingCard] = useState<RateCardRow | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  const getCoId = () => {
    const sel = localStorage.getItem("sidebar_selectedCompany");
    return sel ? JSON.parse(sel).co_id : "";
  };

  const fetchRateCards = async () => {
    setLoading(true);
    try {
      const co_id = getCoId();
      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.STD_RATE_CARD_LIST}?co_id=${co_id}`,
        "GET"
      );
      if (error || !data) throw new Error(error || "Failed to fetch rate cards");
      const mapped = (data.data || []).map((r: any) => ({
        ...r,
        id: r.std_rate_card_id,
      }));
      setRows(mapped);
      setTotalRows(mapped.length);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRateCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = (row: RateCardRow) => {
    setEditingCard(row);
    setFormMode("edit");
    setFormOpen(true);
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    try {
      const co_id = getCoId();
      if (formMode === "create") {
        const { error } = await fetchWithCookie(
          apiRoutesPortalMasters.STD_RATE_CARD_CREATE,
          "POST",
          { ...formData, co_id: Number(co_id) }
        );
        if (error) throw new Error(error);
        setSnackbar({ open: true, message: "Rate card created", severity: "success" });
      } else {
        const { error } = await fetchWithCookie(
          apiRoutesPortalMasters.STD_RATE_CARD_UPDATE,
          "POST",
          { ...formData, std_rate_card_id: editingCard?.std_rate_card_id, co_id: Number(co_id) }
        );
        if (error) throw new Error(error);
        setSnackbar({ open: true, message: "Rate card updated", severity: "success" });
      }
      setFormOpen(false);
      fetchRateCards();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    }
  };

  const columns = useMemo<GridColDef<RateCardRow>[]>(
    () => [
      { field: "rate_type", headerName: "Rate Type", flex: 1, minWidth: 130 },
      { field: "reference_name", headerName: "Reference", flex: 1, minWidth: 150 },
      {
        field: "rate",
        headerName: "Rate",
        flex: 0.7,
        minWidth: 100,
        type: "number",
        valueFormatter: (value: number) => `\u20B9 ${value?.toLocaleString("en-IN") || 0}`,
      },
      { field: "uom", headerName: "UOM", flex: 0.5, minWidth: 80 },
      { field: "valid_from", headerName: "Valid From", flex: 0.7, minWidth: 100 },
      {
        field: "valid_to",
        headerName: "Valid To",
        flex: 0.7,
        minWidth: 100,
        valueFormatter: (value: string | null) => value || "Current",
      },
    ],
    []
  );

  return (
    <IndexWrapper
      title="Standard Rate Cards"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: (e) => setSearchQuery(e.target.value),
        placeholder: "Search rate cards",
        debounceDelayMs: 500,
      }}
      createAction={{
        onClick: () => {
          setEditingCard(null);
          setFormMode("create");
          setFormOpen(true);
        },
      }}
      onEdit={handleEdit}
    >
      <RateCardForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        mode={formMode}
        initialData={editingCard}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
