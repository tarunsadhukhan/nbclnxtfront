"use client";
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import BulkItemGrid, {
  BulkRow,
  GroupOption,
  UomOption,
  makeBlankRow,
  isRowEmpty,
} from "./BulkItemGrid";

type Props = {
  open: boolean;
  onClose: (didCreate: boolean) => void;
};

type SetupResponse = {
  itemgroups?: Array<{
    item_grp_id: number;
    item_grp_name_display?: string;
    item_grp_code_display?: string;
    item_grp_name?: string;
    item_grp_code?: string;
  }>;
  uomgroups?: Array<{ uom_id: number; uom_name: string }>;
};

type ServerError = { row_idx: number; field: string; code: string; message: string };

const INITIAL_ROW_COUNT = 5;

const buildInitialRows = (): BulkRow[] =>
  Array.from({ length: INITIAL_ROW_COUNT }, () => makeBlankRow());

const rowToPayload = (r: BulkRow) => ({
  itemGroupId: r.itemGroupId,
  itemCode: r.itemCode,
  itemName: r.itemName,
  uomId: r.uomId,
  hsnCode: r.hsnCode || null,
  taxPercent: r.taxPercent || 0,
  uomRounding: r.uomRounding || null,
  rateRounding: r.rateRounding || null,
  goodOrService: r.goodOrService || null,
  saleable: r.saleable,
  consumable: r.consumable,
  purchaseable: r.purchaseable,
  manufacturable: r.manufacturable,
  assembly: r.assembly,
});

const BulkCreateItem: React.FC<Props> = ({ open, onClose }) => {
  const [rows, setRows] = React.useState<BulkRow[]>(buildInitialRows);
  const [groups, setGroups] = React.useState<GroupOption[]>([]);
  const [uoms, setUoms] = React.useState<UomOption[]>([]);
  const [loadingSetup, setLoadingSetup] = React.useState(false);
  const [validating, setValidating] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [validateMsg, setValidateMsg] = React.useState<{
    severity: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const getCoId = (): string => {
    try {
      const sel = localStorage.getItem("sidebar_selectedCompany");
      return sel ? String(JSON.parse(sel)?.co_id ?? "") : "";
    } catch {
      return "";
    }
  };

  React.useEffect(() => {
    if (!open) return;
    setRows(buildInitialRows());
    setValidateMsg(null);

    const co_id = getCoId();
    if (!co_id) {
      setSnackbar({ open: true, message: "No company selected", severity: "error" });
      return;
    }

    let cancelled = false;
    setLoadingSetup(true);
    (async () => {
      try {
        const url = `${apiRoutesPortalMasters.ITEM_CREATE_SETUP}?${new URLSearchParams({ co_id })}`;
        const { data, error } = (await fetchWithCookie(url, "GET")) as {
          data: SetupResponse | null;
          error: string | null;
        };
        if (cancelled) return;
        if (error || !data) throw new Error(error || "Failed to load setup");

        const groupOpts: GroupOption[] = (data.itemgroups ?? []).map(g => ({
          item_grp_id: g.item_grp_id,
          label: g.item_grp_name_display || g.item_grp_name || `Group ${g.item_grp_id}`,
          code: g.item_grp_code_display || g.item_grp_code || "",
        }));
        const uomOpts: UomOption[] = (data.uomgroups ?? []).map(u => ({
          uom_id: u.uom_id,
          label: u.uom_name,
        }));
        setGroups(groupOpts);
        setUoms(uomOpts);
      } catch (e: any) {
        if (!cancelled) {
          setSnackbar({ open: true, message: e?.message || "Failed to load setup", severity: "error" });
        }
      } finally {
        if (!cancelled) setLoadingSetup(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const nonEmptyRows = React.useMemo(() => rows.filter(r => !isRowEmpty(r)), [rows]);

  const applyServerErrors = (errors: ServerError[], visibleRows: BulkRow[]) => {
    const idxMap = new Map<BulkRow, number>();
    rows.forEach((r, i) => idxMap.set(r, i));
    const next = rows.map(r => ({ ...r, errors: {} as Record<string, string> }));
    errors.forEach(err => {
      const target = visibleRows[err.row_idx];
      if (!target) return;
      const realIdx = idxMap.get(target);
      if (realIdx === undefined) return;
      next[realIdx] = {
        ...next[realIdx],
        errors: { ...next[realIdx].errors, [err.field]: err.message },
      };
    });
    setRows(next);
  };

  const clearAllErrors = () =>
    setRows(prev => prev.map(r => ({ ...r, errors: {} })));

  const handleValidate = async () => {
    const co_id = getCoId();
    if (!co_id) {
      setSnackbar({ open: true, message: "No company selected", severity: "error" });
      return;
    }
    if (nonEmptyRows.length === 0) {
      setValidateMsg({ severity: "error", text: "Add at least one row before validating" });
      return;
    }

    setValidating(true);
    setValidateMsg(null);
    try {
      const visibleRows = nonEmptyRows;
      const payload = {
        co_id: Number(co_id),
        rows: visibleRows.map(rowToPayload),
      };
      const { data, error } = (await fetchWithCookie(
        apiRoutesPortalMasters.ITEM_BULK_VALIDATE,
        "POST",
        payload
      )) as {
        data: { valid: boolean; row_count: number; error_count: number; errors: ServerError[] } | null;
        error: string | null;
      };

      if (error || !data) throw new Error(error || "Validation failed");

      applyServerErrors(data.errors || [], visibleRows);

      if (data.valid) {
        setValidateMsg({ severity: "success", text: `All ${data.row_count} rows valid. Ready to submit.` });
      } else {
        setValidateMsg({
          severity: "error",
          text: `${data.error_count} error(s) across ${data.row_count} row(s). Fix flagged cells then re-validate.`,
        });
      }
    } catch (e: any) {
      setValidateMsg({ severity: "error", text: e?.message || "Validation request failed" });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    const co_id = getCoId();
    if (!co_id) return;
    if (nonEmptyRows.length === 0) return;

    setSubmitting(true);
    try {
      const visibleRows = nonEmptyRows;
      const payload = {
        co_id: Number(co_id),
        rows: visibleRows.map(rowToPayload),
      };
      const res = await fetchWithCookie(
        apiRoutesPortalMasters.ITEM_BULK_CREATE,
        "POST",
        payload
      );
      const { data, error } = res as {
        data: { created_count: number; item_ids: number[] } | null;
        error: any;
      };

      if (error) {
        const detail = (error as any)?.detail ?? error;
        if (detail && typeof detail === "object" && Array.isArray(detail.errors)) {
          applyServerErrors(detail.errors as ServerError[], visibleRows);
          setValidateMsg({
            severity: "error",
            text: `${detail.error_count} error(s) blocked the batch. Fix flagged cells.`,
          });
        } else {
          setSnackbar({
            open: true,
            message: typeof error === "string" ? error : "Submit failed",
            severity: "error",
          });
        }
        return;
      }

      if (!data) throw new Error("Empty response from server");
      setSnackbar({
        open: true,
        message: `Created ${data.created_count} item(s).`,
        severity: "success",
      });
      onClose(true);
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.message || "Submit failed", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setRows(buildInitialRows());
    clearAllErrors();
    setValidateMsg(null);
  };

  const handleClose = () => {
    if (validating || submitting) return;
    onClose(false);
  };

  const totalErrors = rows.reduce((acc, r) => acc + Object.keys(r.errors).length, 0);
  const hasUnresolvedTextRefs = rows.some(
    r => (r.itemGroupText && !r.itemGroupId) || (r.uomText && !r.uomId)
  );
  const submitDisabled =
    submitting ||
    validating ||
    loadingSetup ||
    nonEmptyRows.length === 0 ||
    totalErrors > 0 ||
    hasUnresolvedTextRefs;

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth keepMounted>
        <DialogTitle>Bulk Create Items</DialogTitle>
        <DialogContent dividers>
          {loadingSetup ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {validateMsg && (
                <Alert severity={validateMsg.severity} sx={{ mb: 2 }}>
                  {validateMsg.text}
                </Alert>
              )}
              <BulkItemGrid
                rows={rows}
                onRowsChange={setRows}
                groups={groups}
                uoms={uoms}
                disabled={submitting}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Box sx={{ fontSize: 12, color: "text.secondary" }}>
            {nonEmptyRows.length} row(s) to submit
            {totalErrors > 0 ? ` · ${totalErrors} error(s)` : ""}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={handleClear} disabled={validating || submitting}>
              Clear
            </Button>
            <Button onClick={handleClose} disabled={validating || submitting}>
              Cancel
            </Button>
            <Button
              variant="outlined"
              onClick={handleValidate}
              disabled={validating || submitting || loadingSetup || nonEmptyRows.length === 0}
            >
              {validating ? "Validating..." : "Validate"}
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={submitDisabled}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default BulkCreateItem;
