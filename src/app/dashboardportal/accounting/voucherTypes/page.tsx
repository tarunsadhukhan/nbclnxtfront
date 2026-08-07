"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchVoucherTypes, createVoucherType } from "@/utils/accountingService";
import {
  VOUCHER_CATEGORIES,
  type VoucherType,
} from "@/app/dashboardportal/accounting/types/accountingTypes";

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

type VoucherTypeRow = VoucherType & { id: number };

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const createVoucherTypeSchema = z.object({
  type_name: z.string().min(1, "Type name is required").max(100),
  type_category: z.enum(VOUCHER_CATEGORIES, {
    message: "Category is required",
  }),
  prefix: z.string().max(10).optional(),
});

type CreateVoucherTypeFormData = z.infer<typeof createVoucherTypeSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoucherTypesPage() {
  const { selectedCompany } = useSidebarContext();

  const [rows, setRows] = useState<VoucherTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 15,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
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
  } = useForm<CreateVoucherTypeFormData>({
    resolver: zodResolver(createVoucherTypeSchema),
    defaultValues: {
      type_name: "",
      type_category: undefined,
      prefix: "",
    },
  });

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const data = await fetchVoucherTypes(selectedCompany.co_id);
      const voucherTypes = data as unknown as VoucherType[];
      const mapped: VoucherTypeRow[] = voucherTypes.map((vt) => ({
        ...vt,
        id: vt.acc_voucher_type_id,
      }));
      setRows(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error fetching voucher types";
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
        r.type_name.toLowerCase().includes(q) ||
        r.type_code.toLowerCase().includes(q) ||
        r.type_category.toLowerCase().includes(q)
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

  const handleCreate = useCallback(() => {
    reset({ type_name: "", type_category: undefined, prefix: "" });
    setDialogOpen(true);
  }, [reset]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const onSubmit = useCallback(
    async (data: CreateVoucherTypeFormData) => {
      if (!selectedCompany) return;
      try {
        await createVoucherType({
          co_id: selectedCompany.co_id,
          voucher_type_name: data.type_name,
          type_category: data.type_category,
          prefix: data.prefix || undefined,
        });
        await Swal.fire({
          icon: "success",
          title: "Created",
          text: "Voucher type created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        setDialogOpen(false);
        fetchData();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error creating voucher type";
        await Swal.fire({ icon: "error", title: "Error", text: message });
      }
    },
    [selectedCompany, fetchData]
  );

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<VoucherTypeRow>[]>(
    () => [
      {
        field: "type_name",
        headerName: "Type Name",
        flex: 2,
        minWidth: 200,
      },
      {
        field: "type_code",
        headerName: "Code",
        flex: 0.8,
        minWidth: 90,
      },
      {
        field: "type_category",
        headerName: "Category",
        flex: 1.2,
        minWidth: 130,
        renderCell: (params) => (
          <Chip label={params.value} size="small" variant="outlined" />
        ),
      },
      {
        field: "prefix",
        headerName: "Prefix",
        flex: 0.8,
        minWidth: 80,
        renderCell: (params) => params.value ?? "-",
      },
      {
        field: "requires_bank_cash",
        headerName: "Requires Bank/Cash",
        flex: 1,
        minWidth: 140,
        renderCell: (params) =>
          params.value ? (
            <Chip label="Yes" size="small" color="info" />
          ) : (
            <Chip label="No" size="small" variant="outlined" />
          ),
      },
      {
        field: "is_system_type",
        headerName: "System",
        flex: 0.7,
        minWidth: 90,
        renderCell: (params) =>
          params.value ? (
            <Chip label="System" size="small" color="primary" />
          ) : (
            <Chip label="Manual" size="small" variant="outlined" />
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
      title="Voucher Types"
      subtitle="Voucher types for this company"
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
        placeholder: "Search by name, code, or category",
        debounceDelayMs: 300,
      }}
      createAction={{
        label: "Add Voucher Type",
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
          <DialogTitle>Create Voucher Type</DialogTitle>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}
          >
            <Controller
              name="type_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Type Name"
                  error={!!errors.type_name}
                  helperText={errors.type_name?.message}
                  fullWidth
                  margin="dense"
                />
              )}
            />

            <Controller
              name="type_category"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!errors.type_category}
                >
                  <InputLabel>Category</InputLabel>
                  <Select
                    {...field}
                    value={field.value ?? ""}
                    label="Category"
                  >
                    {VOUCHER_CATEGORIES.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat.replace("_", " ")}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="prefix"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Prefix (optional — defaults per category)"
                  error={!!errors.prefix}
                  helperText={errors.prefix?.message}
                  fullWidth
                  margin="dense"
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
