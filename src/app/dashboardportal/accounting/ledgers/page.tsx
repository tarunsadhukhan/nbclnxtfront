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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchLedgers,
  createLedger,
  updateLedger,
  fetchLedgerGroups,
  fetchPartiesDropdown,
} from "@/utils/accountingService";
import type {
  Party,
} from "@/utils/accountingService";
import type {
  Ledger,
  LedgerGroup,
  LedgerType,
} from "@/app/dashboardportal/accounting/types/accountingTypes";

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

type LedgerRow = Ledger & { id: number };

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const ledgerSchema = z.object({
  ledger_name: z.string().min(1, "Ledger name is required").max(150),
  ledger_code: z.string().max(30),
  acc_ledger_group_id: z.number().int(),
  ledger_type: z.enum(["G", "P", "B", "C"]),
  party_id: z.number().int().nullable().optional(),
  credit_days: z.number().int().min(0).nullable().optional(),
  credit_limit: z.number().min(0).nullable().optional(),
  opening_balance: z.number(),
  opening_balance_type: z.enum(["D", "C"]),
});

type LedgerFormData = z.infer<typeof ledgerSchema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEDGER_TYPE_OPTIONS: { value: LedgerType; label: string }[] = [
  { value: "G", label: "General" },
  { value: "P", label: "Party" },
  { value: "B", label: "Bank" },
  { value: "C", label: "Cash" },
];

const LEDGER_TYPE_LABELS: Record<string, string> = {
  G: "General",
  P: "Party",
  B: "Bank",
  C: "Cash",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LedgersPage() {
  const { selectedCompany } = useSidebarContext();

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 15,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | undefined>(undefined);
  const [groups, setGroups] = useState<LedgerGroup[]>([]);
  const [partyOptions, setPartyOptions] = useState<Party[]>([]);
  const [partySearch, setPartySearch] = useState("");
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
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LedgerFormData>({
    resolver: zodResolver(ledgerSchema),
    defaultValues: {
      ledger_name: "",
      ledger_code: "",
      acc_ledger_group_id: undefined,
      ledger_type: "G",
      party_id: null,
      credit_days: null,
      credit_limit: null,
      opening_balance: 0,
      opening_balance_type: "D",
    },
  });

  // -----------------------------------------------------------------------
  // Flatten helper for groups
  // -----------------------------------------------------------------------

  const flattenGroups = useCallback(
    (items: LedgerGroup[]): LedgerGroup[] => {
      const result: LedgerGroup[] = [];
      for (const g of items) {
        result.push(g);
        if (g.children && g.children.length > 0) {
          result.push(...flattenGroups(g.children));
        }
      }
      return result;
    },
    []
  );

  // -----------------------------------------------------------------------
  // Fetch groups
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!selectedCompany) return;
    fetchLedgerGroups(selectedCompany.co_id)
      .then((data) => {
        const tree = data as unknown as LedgerGroup[];
        setGroups(flattenGroups(tree));
      })
      .catch(() => {
        /* silently ignore - groups will be empty */
      });
  }, [selectedCompany, flattenGroups]);

  // -----------------------------------------------------------------------
  // Fetch parties for dropdown
  // -----------------------------------------------------------------------

  const watchLedgerType = watch("ledger_type");

  useEffect(() => {
    if (!selectedCompany || watchLedgerType !== "P") {
      setPartyOptions([]);
      return;
    }
    fetchPartiesDropdown(selectedCompany.co_id, partySearch || undefined)
      .then(setPartyOptions)
      .catch(() => {
        /* silently ignore - parties will be empty */
      });
  }, [selectedCompany, watchLedgerType, partySearch]);

  // -----------------------------------------------------------------------
  // Fetch ledgers
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const result = await fetchLedgers({
        coId: selectedCompany.co_id,
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchQuery || undefined,
        ledgerType: typeFilter || undefined,
      });

      const mapped: LedgerRow[] = (result.ledgers ?? []).map((l) => ({
        ...l,
        id: l.acc_ledger_id,
      })) as unknown as LedgerRow[];

      setRows(mapped);
      setTotalRows(result.total ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error fetching ledgers";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, paginationModel.page, paginationModel.pageSize, searchQuery, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    setEditId(undefined);
    reset({
      ledger_name: "",
      ledger_code: "",
      acc_ledger_group_id: undefined,
      ledger_type: "G",
      party_id: null,
      credit_days: null,
      credit_limit: null,
      opening_balance: 0,
      opening_balance_type: "D",
    });
    setDialogOpen(true);
  }, [reset]);

  const handleEdit = useCallback(
    (row: LedgerRow) => {
      setEditId(row.acc_ledger_id);
      reset({
        ledger_name: row.ledger_name,
        ledger_code: row.ledger_code ?? "",
        acc_ledger_group_id: row.acc_ledger_group_id,
        ledger_type: row.ledger_type,
        party_id: row.party_id,
        credit_days: row.credit_days,
        credit_limit: row.credit_limit,
        opening_balance: row.opening_balance,
        opening_balance_type: row.opening_balance_type ?? "D",
      });
      setDialogOpen(true);
    },
    [reset]
  );

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditId(undefined);
  }, []);

  const onSubmit = useCallback(
    async (data: LedgerFormData) => {
      if (!selectedCompany) return;
      try {
        if (editId) {
          await updateLedger(editId, {
            co_id: selectedCompany.co_id,
            ledger_name: data.ledger_name,
            ledger_code: data.ledger_code || undefined,
            acc_ledger_group_id: data.acc_ledger_group_id,
            ledger_type: data.ledger_type,
            party_id: data.party_id ?? undefined,
            credit_days: data.credit_days ?? undefined,
            credit_limit: data.credit_limit ?? undefined,
            opening_balance: data.opening_balance,
            opening_balance_type: data.opening_balance_type,
          });
          await Swal.fire({
            icon: "success",
            title: "Updated",
            text: "Ledger updated successfully.",
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          await createLedger({
            co_id: selectedCompany.co_id,
            ledger_name: data.ledger_name,
            ledger_code: data.ledger_code || undefined,
            acc_ledger_group_id: data.acc_ledger_group_id,
            ledger_type: data.ledger_type,
            party_id: data.party_id ?? undefined,
            credit_days: data.credit_days ?? undefined,
            credit_limit: data.credit_limit ?? undefined,
            opening_balance: data.opening_balance,
            opening_balance_type: data.opening_balance_type,
          });
          await Swal.fire({
            icon: "success",
            title: "Created",
            text: "Ledger created successfully.",
            timer: 1500,
            showConfirmButton: false,
          });
        }
        setDialogOpen(false);
        setEditId(undefined);
        fetchData();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error saving ledger";
        await Swal.fire({ icon: "error", title: "Error", text: message });
      }
    },
    [selectedCompany, editId, fetchData]
  );

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<LedgerRow>[]>(
    () => [
      {
        field: "ledger_name",
        headerName: "Ledger Name",
        flex: 2,
        minWidth: 200,
      },
      {
        field: "ledger_code",
        headerName: "Code",
        flex: 0.8,
        minWidth: 100,
      },
      {
        field: "group_name",
        headerName: "Group",
        flex: 1.5,
        minWidth: 150,
      },
      {
        field: "ledger_type",
        headerName: "Type",
        flex: 0.7,
        minWidth: 90,
        renderCell: (params) => LEDGER_TYPE_LABELS[params.value as string] ?? params.value,
      },
      {
        field: "party_name",
        headerName: "Party",
        flex: 1.2,
        minWidth: 140,
        renderCell: (params) => params.value ?? "-",
      },
      {
        field: "opening_balance",
        headerName: "Opening Balance",
        flex: 1,
        minWidth: 130,
        type: "number",
        renderCell: (params) => {
          const row = params.row;
          const val = row.opening_balance ?? 0;
          const suffix = row.opening_balance_type === "C" ? " Cr" : " Dr";
          return val !== 0 ? `${val.toLocaleString()}${suffix}` : "-";
        },
      },
    ],
    []
  );

  // -----------------------------------------------------------------------
  // Toolbar content (type filter)
  // -----------------------------------------------------------------------

  const toolbarContent = useMemo(
    () => (
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Type</InputLabel>
        <Select
          value={typeFilter}
          label="Type"
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
        >
          <MenuItem value="">All</MenuItem>
          {LEDGER_TYPE_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    ),
    [typeFilter]
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <IndexWrapper
      title="Ledgers"
      subtitle="Manage general, party, bank, and cash ledgers"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search by ledger name or code",
        debounceDelayMs: 400,
      }}
      createAction={{
        label: "Add Ledger",
        onClick: handleCreate,
      }}
      onEdit={handleEdit}
      isRowEditable={(row) => !row.is_system_ledger}
      toolbarContent={toolbarContent}
    >
      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        {/* Second handleSubmit arg: never let a validation failure look like a no-op. */}
        <form
          onSubmit={handleSubmit(onSubmit, () =>
            setSnackbar({
              open: true,
              message: "Please correct the highlighted fields.",
              severity: "error",
            })
          )}
        >
          <DialogTitle>{editId ? "Edit Ledger" : "Create Ledger"}</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <Controller
              name="ledger_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Ledger Name"
                  error={!!errors.ledger_name}
                  helperText={errors.ledger_name?.message}
                  fullWidth
                  margin="dense"
                />
              )}
            />

            <Controller
              name="ledger_code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Ledger Code"
                  error={!!errors.ledger_code}
                  helperText={errors.ledger_code?.message}
                  fullWidth
                  margin="dense"
                />
              )}
            />

            <Controller
              name="acc_ledger_group_id"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="dense" error={!!errors.acc_ledger_group_id}>
                  <InputLabel>Group</InputLabel>
                  <Select
                    {...field}
                    value={field.value ?? ""}
                    label="Group"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {groups.map((g) => (
                      <MenuItem key={g.acc_ledger_group_id} value={g.acc_ledger_group_id}>
                        {g.group_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="ledger_type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="dense" error={!!errors.ledger_type}>
                  <InputLabel>Ledger Type</InputLabel>
                  <Select {...field} value={field.value ?? ""} label="Ledger Type">
                    {LEDGER_TYPE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            {watchLedgerType === "P" && (
              <Controller
                name="party_id"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={partyOptions}
                    getOptionLabel={(option) =>
                      `${option.supp_name}${option.supp_code ? ` (${option.supp_code})` : ""}`
                    }
                    onInputChange={(_, value) => setPartySearch(value)}
                    onChange={(_, value) => setValue("party_id", value?.party_id ?? null)}
                    value={partyOptions.find((o) => o.party_id === field.value) ?? null}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Party"
                        error={!!errors.party_id}
                        helperText={errors.party_id?.message}
                        margin="dense"
                      />
                    )}
                    isOptionEqualToValue={(option, value) => option.party_id === value.party_id}
                    size="small"
                  />
                )}
              />
            )}

            <Controller
              name="credit_days"
              control={control}
              render={({ field }) => (
                <TextField
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value ? Number(e.target.value) : null)
                  }
                  label="Credit Days"
                  type="number"
                  fullWidth
                  margin="dense"
                />
              )}
            />

            <Controller
              name="credit_limit"
              control={control}
              render={({ field }) => (
                <TextField
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value ? Number(e.target.value) : null)
                  }
                  label="Credit Limit"
                  type="number"
                  fullWidth
                  margin="dense"
                />
              )}
            />

            <Controller
              name="opening_balance"
              control={control}
              render={({ field }) => (
                <TextField
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                  }
                  label="Opening Balance"
                  type="number"
                  error={!!errors.opening_balance}
                  helperText={errors.opening_balance?.message}
                  fullWidth
                  margin="dense"
                />
              )}
            />

            <Controller
              name="opening_balance_type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel>Balance Type</InputLabel>
                  <Select {...field} value={field.value ?? "D"} label="Balance Type">
                    <MenuItem value="D">Debit</MenuItem>
                    <MenuItem value="C">Credit</MenuItem>
                  </Select>
                </FormControl>
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
              {isSubmitting ? "Saving..." : editId ? "Update" : "Create"}
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
