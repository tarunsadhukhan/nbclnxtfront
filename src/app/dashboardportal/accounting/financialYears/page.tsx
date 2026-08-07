"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchFinancialYears,
  createFinancialYear,
} from "@/utils/accountingService";
import type { FinancialYear } from "@/app/dashboardportal/accounting/types/accountingTypes";

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

type FinancialYearRow = FinancialYear & { id: number };

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const createFYSchema = z
  .object({
    fy_label: z.string().min(1, "Label is required").max(50),
    fy_start: z.string().min(1, "Start date is required"),
    fy_end: z.string().min(1, "End date is required"),
  })
  .refine((data) => new Date(data.fy_end) > new Date(data.fy_start), {
    message: "End date must be after start date",
    path: ["fy_end"],
  });

type CreateFYFormData = z.infer<typeof createFYSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FinancialYearsPage() {
  const { selectedCompany } = useSidebarContext();

  const [rows, setRows] = useState<FinancialYearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // -----------------------------------------------------------------------
  // Form
  // -----------------------------------------------------------------------

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFYFormData>({
    resolver: zodResolver(createFYSchema),
    defaultValues: {
      fy_label: "",
      fy_start: "",
      fy_end: "",
    },
  });

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const data = await fetchFinancialYears(selectedCompany.co_id);
      const years = data as unknown as FinancialYear[];
      const mapped: FinancialYearRow[] = years.map((fy) => ({
        ...fy,
        id: fy.acc_financial_year_id,
      }));
      setRows(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error fetching financial years";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleCreate = useCallback(() => {
    reset({ fy_label: "", fy_start: "", fy_end: "" });
    setDialogOpen(true);
  }, [reset]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const onSubmit = useCallback(
    async (data: CreateFYFormData) => {
      if (!selectedCompany) return;
      try {
        await createFinancialYear({
          co_id: selectedCompany.co_id,
          fy_label: data.fy_label,
          fy_start: data.fy_start,
          fy_end: data.fy_end,
        });
        await Swal.fire({
          icon: "success",
          title: "Created",
          text: "Financial year created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        setDialogOpen(false);
        fetchData();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error creating financial year";
        await Swal.fire({ icon: "error", title: "Error", text: message });
      }
    },
    [selectedCompany, fetchData]
  );

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<FinancialYearRow>[]>(
    () => [
      {
        field: "fy_label",
        headerName: "Financial Year",
        flex: 2,
        minWidth: 180,
      },
      {
        field: "fy_start",
        headerName: "Start Date",
        flex: 1,
        minWidth: 120,
        renderCell: (params) =>
          params.value
            ? new Date(params.value as string).toLocaleDateString("en-IN")
            : "-",
      },
      {
        field: "fy_end",
        headerName: "End Date",
        flex: 1,
        minWidth: 120,
        renderCell: (params) =>
          params.value
            ? new Date(params.value as string).toLocaleDateString("en-IN")
            : "-",
      },
      {
        field: "is_active",
        headerName: "Active",
        flex: 0.7,
        minWidth: 90,
        renderCell: (params) =>
          params.value ? (
            <Chip label="Active" size="small" color="success" />
          ) : (
            <Chip label="Inactive" size="small" variant="outlined" />
          ),
      },
      {
        field: "is_locked",
        headerName: "Locked",
        flex: 0.7,
        minWidth: 90,
        renderCell: (params) =>
          params.value ? (
            <Chip label="Locked" size="small" color="warning" />
          ) : (
            <Chip label="Open" size="small" variant="outlined" />
          ),
      },
    ],
    []
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <IndexWrapper
      title="Financial Years"
      subtitle="Manage accounting financial year periods"
      rows={rows}
      columns={columns}
      rowCount={rows.length}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      createAction={{
        label: "Add Financial Year",
        onClick: handleCreate,
      }}
    >
      {/* ── Create Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Create Financial Year</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <Controller
              name="fy_label"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Label (e.g., 2025-26)"
                  error={!!errors.fy_label}
                  helperText={errors.fy_label?.message}
                  fullWidth
                  margin="dense"
                />
              )}
            />

            <Controller
              name="fy_start"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Start Date"
                  type="date"
                  error={!!errors.fy_start}
                  helperText={errors.fy_start?.message}
                  fullWidth
                  margin="dense"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              )}
            />

            <Controller
              name="fy_end"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="End Date"
                  type="date"
                  error={!!errors.fy_end}
                  helperText={errors.fy_end?.message}
                  fullWidth
                  margin="dense"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <button
              type="button"
              onClick={handleDialogClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </DialogActions>
        </form>
      </Dialog>

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
