"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Autocomplete,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  type GridColDef,
  type GridRowId,
  type GridRenderEditCellParams,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import { Save, Trash2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/transaction/SearchableSelect";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchPayslipPrintComponentSetup,
  fetchPaySchemeComponents,
  fetchPayslipPrintComponentList,
  createPayslipPrintComponent,
  updatePayslipPrintComponent,
  deletePayslipPrintComponent,
} from "@/utils/hrmsService";
import {
  type Option,
  META_COMPONENT_OPTIONS,
} from "./types/payRegisterDispSetTypes";

/** One editable grid row. `pay_id === null` means an unsaved (new) row. */
type GridRow = {
  id: number; // DataGrid row id (pay_id for saved rows; negative temp id for new rows)
  pay_id: number | null;
  component_id: string;
  desc_print: string;
  payslip_order: number;
  fixed_var_cols: string;
  total_print: boolean;
  payslip_print: boolean;
  is_active: boolean;
  saving: boolean;
};

const FIXED_VAR_VALUE_OPTIONS = [
  { value: "F", label: "Fixed" },
  { value: "V", label: "Variable" },
];

export default function PayRegisterDispSetPage() {
  const { coId } = useSelectedCompanyCoId();
  const { selectedCompany, selectedBranches } = useSidebarContext();

  const [schemeOptions, setSchemeOptions] = useState<Option[]>([]);
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [componentOptions, setComponentOptions] = useState<Option[]>([]);
  const [payschemeId, setPayschemeId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Latest committed rows, so the inline Save icon reads fresh cell edits.
  const rowsRef = useRef<GridRow[]>([]);
  rowsRef.current = rows;
  // Temp ids for unsaved rows (negative, so they never collide with pay_id).
  const tempIdRef = useRef(-1);

  const notify = useCallback(
    (message: string, severity: "success" | "error") =>
      setSnackbar({ open: true, message, severity }),
    [],
  );

  const blankRow = useCallback((): GridRow => {
    const id = tempIdRef.current;
    tempIdRef.current -= 1;
    return {
      id,
      pay_id: null,
      component_id: "",
      desc_print: "",
      payslip_order: 1,
      fixed_var_cols: "F",
      total_print: false,
      payslip_print: false,
      is_active: true,
      saving: false,
    };
  }, []);

  // ── Pay schemes ──────────────────────────────────────────────────
  useEffect(() => {
    if (!coId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPayslipPrintComponentSetup(coId);
        const schemes = (res?.data?.data?.pay_schemes ??
          res?.data?.pay_schemes ??
          []) as Array<Record<string, unknown>>;
        if (!cancelled) {
          setSchemeOptions(
            schemes.map((s) => ({
              label: String(s.payscheme_name ?? ""),
              value: String(s.payscheme_id),
            })),
          );
        }
      } catch {
        if (!cancelled) notify("Failed to load pay schemes", "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coId, notify]);

  // ── Branches (from sidebar, narrowed to selected) ────────────────
  useEffect(() => {
    const all = selectedCompany?.branches ?? [];
    const selected = new Set(selectedBranches.map(String));
    const opts: Option[] = all
      .filter((b) => selected.size === 0 || selected.has(String(b.branch_id)))
      .map((b) => ({ label: b.branch_name, value: String(b.branch_id) }));
    setBranchOptions(opts);
    setBranchId((prev) => prev || (opts[0]?.value ?? ""));
  }, [selectedCompany, selectedBranches]);

  // ── Component options for the chosen scheme (+ meta fields) ───────
  useEffect(() => {
    if (!coId || !payschemeId) {
      setComponentOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPaySchemeComponents(coId, payschemeId);
        const list = (res?.data?.data ?? res?.data ?? []) as Array<
          Record<string, unknown>
        >;
        const schemeOpts: Option[] = list
          .filter((c) => c.component_id != null)
          .map((c) => ({
            label: `${String(c.component_code ?? "")} — ${String(c.component_name ?? "")}`,
            value: String(c.component_id),
          }));
        if (!cancelled)
          setComponentOptions([...META_COMPONENT_OPTIONS, ...schemeOpts]);
      } catch {
        if (!cancelled) setComponentOptions([...META_COMPONENT_OPTIONS]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coId, payschemeId]);

  const componentLabel = useCallback(
    (value: unknown) =>
      componentOptions.find((o) => o.value === String(value))?.label ?? "",
    [componentOptions],
  );

  // ── Existing rows for the chosen scheme + branch ─────────────────
  const loadRows = useCallback(async () => {
    if (!coId || !payschemeId || !branchId) {
      setRows([blankRow()]);
      return;
    }
    setLoadingRows(true);
    try {
      const { data, error } = await fetchPayslipPrintComponentList(coId, {
        payscheme_id: payschemeId,
        branch_id: branchId,
        limit: 500,
      });
      if (error) throw new Error(error);
      const list = (data?.data ?? []) as Array<Record<string, unknown>>;
      const loaded: GridRow[] = list.map((r) => ({
        id: Number(r.pay_id),
        pay_id: Number(r.pay_id),
        component_id: r.component_id != null ? String(r.component_id) : "",
        desc_print: String(r.desc_print ?? ""),
        payslip_order: r.payslip_order != null ? Number(r.payslip_order) : 1,
        fixed_var_cols: String(r.fixed_var_cols ?? "F"),
        total_print: Number(r.total_print) === 1,
        payslip_print: Number(r.payslip_print) === 1,
        is_active: Number(r.is_active) === 1,
        saving: false,
      }));
      setRows([...loaded, blankRow()]);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to load rows", "error");
      setRows([blankRow()]);
    } finally {
      setLoadingRows(false);
    }
  }, [coId, payschemeId, branchId, notify, blankRow]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const updateRow = useCallback(
    (id: GridRowId, patch: Partial<GridRow>) =>
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    [],
  );

  // Commit an inline cell edit into row state. When a component is chosen and
  // the Print Label is still blank, default it to the component's name.
  const handleProcessRowUpdate = useCallback(
    (newRow: GridRow, oldRow: GridRow): GridRow => {
      let updated = newRow;
      const componentChanged =
        newRow.component_id && newRow.component_id !== oldRow.component_id;
      const labelBlank = !newRow.desc_print || !newRow.desc_print.trim();
      if (componentChanged && labelBlank) {
        const opt = componentOptions.find((o) => o.value === newRow.component_id);
        if (opt) {
          // Option label is "CODE — Name" for real components, or a plain label
          // for meta fields — use just the name part as the default print label.
          const name = opt.label.includes(" — ")
            ? opt.label.split(" — ").slice(1).join(" — ").trim()
            : opt.label;
          if (name) updated = { ...newRow, desc_print: name };
        }
      }
      setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
      return updated;
    },
    [componentOptions],
  );

  const buildPayload = useCallback(
    (row: GridRow, isActive: boolean) => ({
      payscheme_id: Number(payschemeId),
      branch_id: Number(branchId),
      component_id: Number(row.component_id),
      desc_print: row.desc_print || null,
      payslip_order: row.payslip_order ? Number(row.payslip_order) : 1,
      fixed_var_cols: row.fixed_var_cols,
      total_print: row.total_print ? 1 : 0,
      payslip_print: row.payslip_print ? 1 : 0,
      is_active: isActive ? 1 : 0,
    }),
    [payschemeId, branchId],
  );

  // ── Save one row (create or update) ──────────────────────────────
  const saveRow = useCallback(
    async (id: GridRowId) => {
      const row = rowsRef.current.find((r) => r.id === id);
      if (!row) return;
      if (!coId) return notify("No company selected", "error");
      if (!payschemeId || !branchId)
        return notify("Select Pay Scheme and Branch first", "error");
      if (!row.component_id) return notify("Select a component", "error");
      if (!row.fixed_var_cols) return notify("Select Fixed/Variable", "error");

      updateRow(id, { saving: true });
      const payload = buildPayload(row, row.is_active);
      try {
        if (row.pay_id) {
          const res = await updatePayslipPrintComponent(coId, row.pay_id, payload);
          if (res?.error) throw new Error(res.error);
          notify("Row updated", "success");
          updateRow(id, { saving: false });
        } else {
          const res = await createPayslipPrintComponent(coId, payload);
          if (res?.error) throw new Error(res.error);
          const newId = Number(res?.data?.data?.pay_id ?? res?.data?.pay_id);
          notify("Row saved", "success");
          setRows((rs) => {
            const next = rs.map((r) =>
              r.id === id
                ? {
                    ...r,
                    pay_id: Number.isFinite(newId) ? newId : r.pay_id,
                    saving: false,
                  }
                : r,
            );
            const hasBlank = next.some((r) => r.pay_id === null);
            return hasBlank ? next : [...next, blankRow()];
          });
        }
      } catch (err: unknown) {
        notify(err instanceof Error ? err.message : "Save failed", "error");
        updateRow(id, { saving: false });
      }
    },
    [coId, payschemeId, branchId, notify, updateRow, buildPayload, blankRow],
  );

  // ── Remove a row (local for unsaved, hard-delete for saved) ──────
  const deleteRow = useCallback(
    async (id: GridRowId) => {
      const row = rowsRef.current.find((r) => r.id === id);
      if (!row) return;
      if (!row.pay_id) {
        setRows((rs) => {
          const next = rs.filter((r) => r.id !== id);
          return next.some((r) => r.pay_id === null) ? next : [...next, blankRow()];
        });
        return;
      }
      if (!coId) return;
      updateRow(id, { saving: true });
      try {
        const res = await deletePayslipPrintComponent(coId, row.pay_id);
        if (res?.error) throw new Error(res.error);
        notify("Row deleted", "success");
        setRows((rs) => rs.filter((r) => r.id !== id));
      } catch (err: unknown) {
        notify(err instanceof Error ? err.message : "Delete failed", "error");
        updateRow(id, { saving: false });
      }
    },
    [coId, notify, updateRow, blankRow],
  );

  // ── Columns ──────────────────────────────────────────────────────
  const columns = useMemo<GridColDef<GridRow>[]>(
    () => [
      {
        field: "component_id",
        headerName: "Component",
        flex: 1.4,
        minWidth: 230,
        editable: true,
        renderCell: (p) => componentLabel(p.value),
        renderEditCell: (params: GridRenderEditCellParams) => {
          const selected =
            componentOptions.find((o) => o.value === params.value) ?? null;
          return (
            <Autocomplete<Option>
              openOnFocus
              fullWidth
              options={componentOptions}
              value={selected}
              getOptionLabel={(o) => o.label}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              onChange={async (_, next) => {
                await params.api.setEditCellValue({
                  id: params.id,
                  field: params.field,
                  value: next ? next.value : "",
                });
                params.api.stopCellEditMode({ id: params.id, field: params.field });
              }}
              renderInput={(p) => (
                <TextField
                  {...p}
                  autoFocus
                  variant="standard"
                  placeholder="Search component..."
                />
              )}
              sx={{ width: "100%", px: 1 }}
            />
          );
        },
      },
      {
        field: "desc_print",
        headerName: "Print Label",
        flex: 1,
        minWidth: 160,
        editable: true,
      },
      {
        field: "payslip_order",
        headerName: "Order",
        width: 90,
        type: "number",
        editable: true,
      },
      {
        field: "fixed_var_cols",
        headerName: "Fixed/Var",
        width: 130,
        type: "singleSelect",
        valueOptions: FIXED_VAR_VALUE_OPTIONS,
        editable: true,
      },
      { field: "total_print", headerName: "Total", width: 90, type: "boolean", editable: true },
      { field: "payslip_print", headerName: "Payslip", width: 100, type: "boolean", editable: true },
      { field: "is_active", headerName: "Active", width: 90, type: "boolean", editable: true },
      {
        field: "actions",
        type: "actions",
        headerName: "Actions",
        width: 110,
        getActions: (params) => [
          <GridActionsCellItem
            key="save"
            icon={<Save size={18} />}
            label="Save"
            color="primary"
            disabled={(params.row as GridRow).saving}
            onClick={() => saveRow(params.id)}
          />,
          <GridActionsCellItem
            key="delete"
            icon={<Trash2 size={18} color="#d32f2f" />}
            label={(params.row as GridRow).pay_id ? "Delete" : "Remove row"}
            disabled={(params.row as GridRow).saving}
            onClick={() => deleteRow(params.id)}
          />,
        ],
      },
    ],
    [componentOptions, componentLabel, saveRow, deleteRow],
  );

  const ready = Boolean(payschemeId && branchId);

  return (
    <Box className="flex flex-col gap-4 p-4">
      <Typography variant="h5">Pay Register Display Setup</Typography>

      <Paper className="flex flex-wrap items-end gap-4 p-4">
        <Box sx={{ minWidth: 280 }}>
          <Typography variant="caption" color="textSecondary">
            Pay Scheme
          </Typography>
          <SearchableSelect<Option>
            options={schemeOptions}
            value={schemeOptions.find((o) => o.value === payschemeId) ?? null}
            onChange={(opt) => setPayschemeId(opt?.value ?? "")}
            getOptionLabel={(o) => o.label}
            getOptionKey={(o) => o.value}
            isOptionEqualToValue={(a, b) => a.value === b.value}
            placeholder="Search pay scheme..."
            noOptionsText="No pay schemes"
          />
        </Box>
        <Box sx={{ minWidth: 220 }}>
          <Typography variant="caption" color="textSecondary">
            Branch
          </Typography>
          <SearchableSelect<Option>
            options={branchOptions}
            value={branchOptions.find((o) => o.value === branchId) ?? null}
            onChange={(opt) => setBranchId(opt?.value ?? "")}
            getOptionLabel={(o) => o.label}
            getOptionKey={(o) => o.value}
            isOptionEqualToValue={(a, b) => a.value === b.value}
            placeholder="Search branch..."
            noOptionsText="No branches"
          />
        </Box>
      </Paper>

      <Paper className="p-4">
        {!ready ? (
          <Typography variant="body2" color="textSecondary">
            Select a Pay Scheme and Branch to configure its display columns.
          </Typography>
        ) : loadingRows ? (
          <Box className="flex justify-center p-8">
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="textSecondary" className="mb-2">
              Edit cells inline, then click the Save icon on each row. A new blank row
              is added after a row is saved.
            </Typography>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              autoHeight
              editMode="cell"
              processRowUpdate={handleProcessRowUpdate}
              onProcessRowUpdateError={() => notify("Could not update cell", "error")}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              getRowClassName={(params) =>
                (params.row as GridRow).pay_id == null ? "row-unsaved" : ""
              }
              sx={{
                // Match the Pay Register index page header (IndexWrapper / muiDataGrid).
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: "#3ea6da",
                  color: "white",
                  fontWeight: "bold",
                  borderRight: "1px solid rgba(224, 224, 224, 1)",
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: "bold",
                },
                "& .MuiDataGrid-cell": {
                  borderRight: "1px solid rgba(224, 224, 224, 1)",
                },
                // Unsaved (not yet persisted) rows stand out.
                "& .row-unsaved": {
                  backgroundColor: "#fff8e1",
                },
                "& .row-unsaved:hover": {
                  backgroundColor: "#fff3c4",
                },
              }}
            />
          </>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
