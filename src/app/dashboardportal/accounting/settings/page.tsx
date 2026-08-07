"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { RefreshCw } from "lucide-react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchCompanySettings,
  updateCompanySettings,
  fetchPostingQueue,
  retryPostingQueue,
} from "@/utils/accountingService";
import {
  POSTING_MODES,
  DUE_DATE_RULES,
  POSTING_QUEUE_STATUSES,
  type PostingMode,
  type DueDateRule,
  type PostingQueueRow,
  type PostingQueueStatus,
} from "@/app/dashboardportal/accounting/types/accountingTypes";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  posting_mode_purchase: z.enum(POSTING_MODES),
  posting_mode_jute_purchase: z.enum(POSTING_MODES),
  posting_mode_sales: z.enum(POSTING_MODES),
  posting_mode_drcr: z.enum(POSTING_MODES),
  due_date_rule: z.enum(DUE_DATE_RULES),
  default_credit_days: z
    .number()
    .int("Credit days must be a whole number")
    .min(0, "Credit days cannot be negative")
    .nullable(),
  enable_tds: z.boolean(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_FORM_VALUES: SettingsFormData = Object.freeze({
  posting_mode_purchase: "OFF",
  posting_mode_jute_purchase: "OFF",
  posting_mode_sales: "OFF",
  posting_mode_drcr: "OFF",
  due_date_rule: "PO_CREDIT_DAYS",
  default_credit_days: null,
  enable_tds: false,
});

const POSTING_MODE_OPTIONS: ReadonlyArray<{ value: PostingMode; label: string }> =
  Object.freeze([
    { value: "OFF", label: "Off" },
    { value: "AUTO_DRAFT", label: "Auto — Draft for review" },
    { value: "AUTO_APPROVED", label: "Auto — Post approved" },
  ]);

const DUE_DATE_RULE_OPTIONS: ReadonlyArray<{ value: DueDateRule; label: string }> =
  Object.freeze([
    { value: "PO_CREDIT_DAYS", label: "From PO credit days" },
    { value: "MANUAL", label: "Manual" },
  ]);

type PostingModeFieldName =
  | "posting_mode_purchase"
  | "posting_mode_jute_purchase"
  | "posting_mode_sales"
  | "posting_mode_drcr";

const POSTING_MODE_FIELDS: ReadonlyArray<{
  name: PostingModeFieldName;
  label: string;
}> = Object.freeze([
  { name: "posting_mode_purchase", label: "Purchase Posting" },
  { name: "posting_mode_jute_purchase", label: "Jute Purchase Posting" },
  { name: "posting_mode_sales", label: "Sales Posting" },
  { name: "posting_mode_drcr", label: "DR/CR Note Posting" },
]);

type ChipColor = "default" | "primary" | "warning" | "success" | "error" | "info";

const QUEUE_STATUS_COLORS: Record<PostingQueueStatus, ChipColor> = {
  PENDING: "warning",
  POSTED: "success",
  DRAFTED: "info",
  SKIPPED: "default",
  FAILED: "error",
};

const RETRYABLE_STATUSES: ReadonlyArray<PostingQueueStatus> = Object.freeze([
  "FAILED",
  "PENDING",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDateTime = (value: string | null): string => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountingSettingsPage() {
  const { selectedCompany } = useSidebarContext();

  // ── Settings state ──────────────────────────────────────────────────────
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // ── Posting queue state ─────────────────────────────────────────────────
  const [queueRows, setQueueRows] = useState<PostingQueueRow[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PostingQueueStatus | "">("");
  const [retryingId, setRetryingId] = useState<number | null>(null);

  // ── Form ────────────────────────────────────────────────────────────────

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const watchDueDateRule = watch("due_date_rule");

  // ── Load settings ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedCompany) return;
    let cancelled = false;
    setSettingsLoading(true);

    fetchCompanySettings(selectedCompany.co_id)
      .then((settings) => {
        if (cancelled) return;
        if (settings) {
          reset({
            posting_mode_purchase: settings.posting_mode_purchase,
            posting_mode_jute_purchase: settings.posting_mode_jute_purchase,
            posting_mode_sales: settings.posting_mode_sales,
            posting_mode_drcr: settings.posting_mode_drcr,
            due_date_rule: settings.due_date_rule,
            default_credit_days: settings.default_credit_days ?? null,
            enable_tds: settings.enable_tds === 1,
          });
        } else {
          reset(DEFAULT_FORM_VALUES);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        reset(DEFAULT_FORM_VALUES);
        const message =
          err instanceof Error ? err.message : "Error loading company settings";
        setSnackbar({ open: true, message, severity: "error" });
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCompany, reset]);

  // ── Load posting queue ──────────────────────────────────────────────────

  const loadQueue = useCallback(async () => {
    if (!selectedCompany) return;
    setQueueLoading(true);
    setQueueError(null);
    try {
      const rows = await fetchPostingQueue(
        selectedCompany.co_id,
        statusFilter || undefined
      );
      setQueueRows(rows);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error loading posting queue";
      setQueueError(message);
      setQueueRows([]);
    } finally {
      setQueueLoading(false);
    }
  }, [selectedCompany, statusFilter]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  // ── Save settings ───────────────────────────────────────────────────────

  const onSubmit = useCallback(
    async (data: SettingsFormData) => {
      if (!selectedCompany) return;
      try {
        await updateCompanySettings({
          co_id: selectedCompany.co_id,
          posting_mode_purchase: data.posting_mode_purchase,
          posting_mode_jute_purchase: data.posting_mode_jute_purchase,
          posting_mode_sales: data.posting_mode_sales,
          posting_mode_drcr: data.posting_mode_drcr,
          due_date_rule: data.due_date_rule,
          default_credit_days: data.default_credit_days,
          enable_tds: data.enable_tds ? 1 : 0,
        });
        setSnackbar({
          open: true,
          message: "Accounting settings saved successfully.",
          severity: "success",
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error saving settings";
        setSnackbar({ open: true, message, severity: "error" });
      }
    },
    [selectedCompany]
  );

  // ── Retry a queue entry ─────────────────────────────────────────────────

  const handleRetry = useCallback(
    async (row: PostingQueueRow) => {
      setRetryingId(row.acc_posting_queue_id);
      try {
        await retryPostingQueue(row.acc_posting_queue_id);
        setSnackbar({
          open: true,
          message: `Retry triggered for ${row.source_doc_type} #${row.source_doc_id}.`,
          severity: "success",
        });
        await loadQueue();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error retrying queue entry";
        setSnackbar({ open: true, message, severity: "error" });
      } finally {
        setRetryingId(null);
      }
    },
    [loadQueue]
  );

  // ── Status filter chips ─────────────────────────────────────────────────

  const filterChips = useMemo(
    () => (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          label="All"
          size="small"
          color={statusFilter === "" ? "primary" : "default"}
          variant={statusFilter === "" ? "filled" : "outlined"}
          onClick={() => setStatusFilter("")}
        />
        {POSTING_QUEUE_STATUSES.map((status) => (
          <Chip
            key={status}
            label={status}
            size="small"
            color={statusFilter === status ? QUEUE_STATUS_COLORS[status] : "default"}
            variant={statusFilter === status ? "filled" : "outlined"}
            onClick={() => setStatusFilter(status)}
          />
        ))}
      </Stack>
    ),
    [statusFilter]
  );

  // ── Render ──────────────────────────────────────────────────────────────

  if (!selectedCompany) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Select a company from the sidebar to manage accounting settings.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Accounting Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Auto-posting and due-date configuration for{" "}
        <strong>{selectedCompany.co_name ?? `Company #${selectedCompany.co_id}`}</strong>.
      </Typography>

      {/* ── Settings form ── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        {settingsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Auto-Posting Modes
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2.5,
                mb: 3,
              }}
            >
              {POSTING_MODE_FIELDS.map(({ name, label }) => (
                <Controller
                  key={name}
                  name={name}
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small" error={!!errors[name]}>
                      <InputLabel>{label}</InputLabel>
                      <Select {...field} label={label}>
                        {POSTING_MODE_OPTIONS.map((o) => (
                          <MenuItem key={o.value} value={o.value}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors[name] && (
                        <FormHelperText>{errors[name]?.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              ))}
            </Box>

            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Due Dates &amp; TDS
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2.5,
                alignItems: "center",
              }}
            >
              <Controller
                name="due_date_rule"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small" error={!!errors.due_date_rule}>
                    <InputLabel>Due Date Rule</InputLabel>
                    <Select {...field} label="Due Date Rule">
                      {DUE_DATE_RULE_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.due_date_rule && (
                      <FormHelperText>{errors.due_date_rule.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />

              <Controller
                name="default_credit_days"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Default Credit Days"
                    type="number"
                    size="small"
                    fullWidth
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    error={!!errors.default_credit_days}
                    helperText={
                      errors.default_credit_days?.message ??
                      (watchDueDateRule === "PO_CREDIT_DAYS"
                        ? "Used when the PO has no credit days."
                        : undefined)
                    }
                    slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  />
                )}
              />

              <Controller
                name="enable_tds"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Enable TDS"
                  />
                )}
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Settings"}
              </Button>
            </Box>
          </form>
        )}
      </Paper>

      {/* ── Posting queue ── */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.5,
            mb: 2,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Posting Queue
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshCw size={14} />}
            onClick={() => void loadQueue()}
            disabled={queueLoading}
          >
            Refresh
          </Button>
        </Box>

        <Box sx={{ mb: 2 }}>{filterChips}</Box>

        {queueError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {queueError}
          </Alert>
        )}

        {queueLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : queueRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No posting queue entries{statusFilter ? ` with status ${statusFilter}` : ""}.
          </Typography>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Doc Type</TableCell>
                  <TableCell>Doc ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Voucher</TableCell>
                  <TableCell align="center">Attempts</TableCell>
                  <TableCell>Last Error</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queueRows.map((row) => (
                  <TableRow key={row.acc_posting_queue_id} hover>
                    <TableCell>{row.source_doc_type}</TableCell>
                    <TableCell>{row.source_doc_id}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.status}
                        color={QUEUE_STATUS_COLORS[row.status] ?? "default"}
                      />
                    </TableCell>
                    <TableCell>{row.acc_voucher_id ?? "-"}</TableCell>
                    <TableCell align="center">{row.attempt_count}</TableCell>
                    <TableCell>
                      {row.last_error ? (
                        <Tooltip title={row.last_error}>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 240,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.last_error}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(row.updated_date_time)}</TableCell>
                    <TableCell align="center">
                      {RETRYABLE_STATUSES.includes(row.status) ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => void handleRetry(row)}
                          disabled={retryingId !== null}
                        >
                          {retryingId === row.acc_posting_queue_id
                            ? "Retrying..."
                            : "Retry"}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

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
    </Box>
  );
}
