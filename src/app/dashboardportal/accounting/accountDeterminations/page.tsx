"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Snackbar,
  Alert,
  Chip,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import Swal from "sweetalert2";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchAccountDeterminations,
  updateAccountDeterminations,
  fetchLedgers,
} from "@/utils/accountingService";
import type { AccountDetermination } from "@/app/dashboardportal/accounting/types/accountingTypes";
import type { Ledger } from "@/utils/accountingService";

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

type AccountDetRow = AccountDetermination & {
  id: number;
  item_grp_name: string;
};

// ---------------------------------------------------------------------------
// Ledger option type
// ---------------------------------------------------------------------------

type LedgerOption = {
  acc_ledger_id: number;
  ledger_name: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountDeterminationsPage() {
  const { selectedCompany } = useSidebarContext();

  const [rows, setRows] = useState<AccountDetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 20,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [ledgerOptions, setLedgerOptions] = useState<LedgerOption[]>([]);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // -----------------------------------------------------------------------
  // Fetch ledger options
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!selectedCompany) return;
    fetchLedgers({ coId: selectedCompany.co_id, limit: 500 })
      .then((result) => {
        const options: LedgerOption[] = (result.ledgers ?? []).map((l: Ledger) => ({
          acc_ledger_id: l.acc_ledger_id,
          ledger_name: l.ledger_name,
        }));
        setLedgerOptions(options);
      })
      .catch(() => {
        /* silently ignore */
      });
  }, [selectedCompany]);

  // -----------------------------------------------------------------------
  // Fetch determinations
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const data = await fetchAccountDeterminations(selectedCompany.co_id);
      const dets = data as unknown as AccountDetermination[];
      const mapped: AccountDetRow[] = dets.map((d) => ({
        ...d,
        id: d.acc_account_determination_id,
        item_grp_name: d.item_grp_id ? `Group #${d.item_grp_id}` : "-",
      }));
      setRows(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Error fetching account determinations";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Filtered rows
  // -----------------------------------------------------------------------

  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.doc_type.toLowerCase().includes(q) ||
        r.line_type.toLowerCase().includes(q) ||
        r.ledger_name.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
    },
    []
  );

  const handleLedgerChange = useCallback(
    async (rowId: number, newLedgerId: number) => {
      if (!selectedCompany) return;

      const row = rows.find((r) => r.id === rowId);
      if (!row) return;

      try {
        await updateAccountDeterminations({
          co_id: selectedCompany.co_id,
          rules: [
            {
              acc_account_determination_id: rowId,
              acc_ledger_id: newLedgerId,
            },
          ],
        });

        // Update local state
        setRows((prev) =>
          prev.map((r) => {
            if (r.id === rowId) {
              const ledger = ledgerOptions.find(
                (l) => l.acc_ledger_id === newLedgerId
              );
              return {
                ...r,
                acc_ledger_id: newLedgerId,
                ledger_name: ledger?.ledger_name ?? r.ledger_name,
              };
            }
            return r;
          })
        );

        setEditingRowId(null);

        await Swal.fire({
          icon: "success",
          title: "Updated",
          text: "Account determination updated.",
          timer: 1200,
          showConfirmButton: false,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error updating determination";
        await Swal.fire({ icon: "error", title: "Error", text: message });
      }
    },
    [selectedCompany, rows, ledgerOptions]
  );

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<AccountDetRow>[]>(
    () => [
      {
        field: "doc_type",
        headerName: "Document Type",
        flex: 1.2,
        minWidth: 140,
      },
      {
        field: "line_type",
        headerName: "Line Type",
        flex: 1.2,
        minWidth: 140,
      },
      {
        field: "ledger_name",
        headerName: "Ledger",
        flex: 2,
        minWidth: 220,
        renderCell: (params: GridRenderCellParams<AccountDetRow>) => {
          const row = params.row;
          if (editingRowId === row.id) {
            return (
              <FormControl size="small" fullWidth>
                <Select
                  value={row.acc_ledger_id ?? ""}
                  onChange={(e: SelectChangeEvent<number | string>) => {
                    handleLedgerChange(row.id, Number(e.target.value));
                  }}
                  onClose={() => setEditingRowId(null)}
                  autoFocus
                  open
                >
                  {ledgerOptions.map((l) => (
                    <MenuItem key={l.acc_ledger_id} value={l.acc_ledger_id}>
                      {l.ledger_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }
          return (
            <span
              onClick={() => setEditingRowId(row.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setEditingRowId(row.id);
              }}
              role="button"
              tabIndex={0}
              className="cursor-pointer text-blue-600 underline decoration-dotted underline-offset-4 hover:text-blue-800"
            >
              {row.ledger_name || "-- Select --"}
            </span>
          );
        },
      },
      {
        field: "item_grp_name",
        headerName: "Item Group",
        flex: 1,
        minWidth: 120,
      },
      {
        field: "is_default",
        headerName: "Default",
        flex: 0.7,
        minWidth: 90,
        renderCell: (params) =>
          params.value ? (
            <Chip label="Yes" size="small" color="primary" />
          ) : (
            <Chip label="No" size="small" variant="outlined" />
          ),
      },
    ],
    [editingRowId, ledgerOptions, handleLedgerChange]
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <IndexWrapper
      title="Account Determinations"
      subtitle="Map document line types to ledger accounts"
      rows={filteredRows}
      columns={columns}
      rowCount={filteredRows.length}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search by doc type, line type, or ledger",
        debounceDelayMs: 300,
      }}
    >
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
