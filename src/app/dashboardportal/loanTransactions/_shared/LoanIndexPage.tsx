"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { GridColDef, GridPaginationModel, GridValidRowModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useLoanSetup, type LoanSetup, type Paged } from "./loanShared";

export interface LoanDialogProps<Row> {
  open: boolean;
  /** Row picked for edit; undefined = create. */
  row?: Row;
  onClose: () => void;
  onSaved: (message: string) => void;
  branchId: number | undefined;
  setup: LoanSetup;
}

interface Props<Row extends GridValidRowModel> {
  title: string;
  listUrl: string;
  columns: GridColDef<Row>[];
  rowId: (row: Row) => string | number;
  /** Omit to hide the search box (list endpoint without search). */
  searchPlaceholder?: string;
  createLabel: string;
  /** Rows can be opened for edit (omit for create-only screens). */
  editable?: boolean;
  Dialog: React.ComponentType<LoanDialogProps<Row>>;
}

/**
 * List page shared by the Loan Transactions screens: branch-scoped paged list
 * (branch from the sidebar), search, create/edit dialog and a snackbar.
 */
export default function LoanIndexPage<Row extends GridValidRowModel>({
  title,
  listUrl,
  columns,
  rowId,
  searchPlaceholder,
  createLabel,
  editable = true,
  Dialog,
}: Props<Row>) {
  const { branchId, setup, setupError } = useLoanSetup();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; row?: Row }>({ open: false });
  const [snack, setSnack] = useState<{ message: string; severity: "success" | "error" } | null>(null);

  const fetchRows = useCallback(async () => {
    if (branchId == null) return;
    setLoading(true);
    const params = new URLSearchParams({
      branch_id: String(branchId),
      page: String(paginationModel.page + 1),
      limit: String(paginationModel.pageSize),
    });
    if (search) params.append("search", search);
    const { data, error } = await fetchWithCookie<Paged<Row>>(`${listUrl}?${params}`, "GET");
    setLoading(false);
    if (error || !data) return setSnack({ message: error || `Failed to load ${title}`, severity: "error" });
    setRows(data.data.map((r) => ({ ...r, id: rowId(r) })));
    setTotal(data.total);
  }, [branchId, listUrl, paginationModel.page, paginationModel.pageSize, search, rowId, title]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    if (setupError) setSnack({ message: setupError, severity: "error" });
  }, [setupError]);

  return (
    <IndexWrapper
      title={title}
      rows={rows}
      columns={columns}
      rowCount={total}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      search={
        searchPlaceholder
          ? {
              value: search,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                setSearch(e.target.value);
                setPaginationModel((p) => ({ ...p, page: 0 }));
              },
              placeholder: searchPlaceholder,
              debounceDelayMs: 500,
            }
          : undefined
      }
      createAction={{ label: createLabel, onClick: () => setDialog({ open: true }) }}
      onEdit={editable ? (row) => setDialog({ open: true, row }) : undefined}
    >
      <Dialog
        open={dialog.open}
        row={dialog.row}
        onClose={() => setDialog({ open: false })}
        onSaved={(message) => {
          setSnack({ message, severity: "success" });
          void fetchRows();
        }}
        branchId={branchId}
        setup={setup}
      />
      <Snackbar open={snack != null} autoHideDuration={4000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity={snack?.severity ?? "success"} onClose={() => setSnack(null)} sx={{ width: "100%" }}>
          {snack?.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
