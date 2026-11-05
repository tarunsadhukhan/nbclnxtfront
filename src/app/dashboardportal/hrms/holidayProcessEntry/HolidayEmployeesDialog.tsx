"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Pencil, Trash2 as DeleteIcon, X } from "lucide-react";
import { z } from "zod";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { HolidayTran, Option, PeriodHoliday } from "./types";

const entrySchema = z.object({
  eb_id: z.number({ message: "Select an employee" }),
  holiday_hours: z.coerce
    .number({ message: "Hours must be a number" })
    .gt(0, "Hours must be above 0")
    .max(24, "Hours must be at most 24"),
});

interface Props {
  /** Holiday whose employees are shown; null = closed. */
  holiday: PeriodHoliday | null;
  branchId: number | undefined;
  employees: Option[];
  onClose: () => void;
}

/**
 * Employees of one holiday. Processed rows (manual = 0) are replaced by the
 * next Process; manual rows are kept. Adding an employee who has a processed
 * row turns it into a manual one.
 */
export default function HolidayEmployeesDialog({ holiday, branchId, employees, onClose }: Props) {
  const [rows, setRows] = useState<HolidayTran[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [ebId, setEbId] = useState("");
  const [hours, setHours] = useState("8");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<{ text: string; severity: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    if (!holiday || branchId == null) return;
    setLoading(true);
    const { data, error } = await fetchWithCookie<{ data: HolidayTran[] }>(
      `${apiRoutesPortalMasters.HOLIDAY_TRAN_BY_HOLIDAY}?branch_id=${branchId}&holiday_id=${holiday.holiday_id}`,
      "GET",
    );
    setLoading(false);
    if (error || !data) setMsg({ text: error || "Failed to load employees", severity: "error" });
    else setRows(data.data);
  }, [holiday, branchId]);

  useEffect(() => {
    setEditId(null);
    setEbId("");
    setHours("8");
    setSearch("");
    void load();
  }, [load]);

  const save = async () => {
    if (!holiday || branchId == null) return;
    const parsed = entrySchema.safeParse({ eb_id: ebId === "" ? undefined : Number(ebId), holiday_hours: hours });
    if (!parsed.success) {
      setMsg({ text: parsed.error.issues[0].message, severity: "error" });
      return;
    }
    setSaving(true);
    const { error } = await fetchWithCookie(apiRoutesPortalMasters.HOLIDAY_TRAN_SAVE, "POST", {
      ...parsed.data,
      branch_id: branchId,
      holiday_id: holiday.holiday_id,
      holiday_tran_id: editId,
    });
    setSaving(false);
    if (error) {
      setMsg({ text: error, severity: "error" });
      return;
    }
    setMsg({ text: "Saved", severity: "success" });
    setEditId(null);
    setEbId("");
    setHours("8");
    void load();
  };

  const remove = useCallback(
    async (r: HolidayTran) => {
      if (!window.confirm(`Remove ${r.emp_label}?`)) return;
      const { error } = await fetchWithCookie(`${apiRoutesPortalMasters.HOLIDAY_TRAN_DELETE}/${r.holiday_tran_id}`, "DELETE");
      if (error) setMsg({ text: error, severity: "error" });
      else void load();
    },
    [load],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.emp_label.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const columns = useMemo<GridColDef<HolidayTran>[]>(
    () => [
      { field: "emp_label", headerName: "EMPLOYEE", flex: 1, minWidth: 240 },
      { field: "holiday_hours", headerName: "HOURS", type: "number", width: 90 },
      {
        field: "manual",
        headerName: "SOURCE",
        width: 110,
        renderCell: ({ value }) =>
          value === 1 ? <Chip size="small" color="primary" label="Manual" /> : <Chip size="small" label="Processed" />,
      },
      {
        field: "__actions",
        headerName: "",
        width: 90,
        sortable: false,
        renderCell: ({ row }) => (
          <>
            <IconButton
              size="small"
              aria-label={`Edit ${row.emp_label}`}
              onClick={() => {
                setEditId(row.holiday_tran_id);
                setEbId(String(row.eb_id));
                setHours(String(row.holiday_hours));
              }}
            >
              <Pencil size={15} />
            </IconButton>
            <IconButton size="small" color="error" aria-label={`Remove ${row.emp_label}`} onClick={() => void remove(row)}>
              <DeleteIcon size={15} />
            </IconButton>
          </>
        ),
      },
    ],
    [remove],
  );

  return (
    <>
      <Dialog open={holiday != null} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" component="span">
            {holiday ? `${holiday.holiday} — ${holiday.holiday_date.split("-").reverse().join("-")}` : ""}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box className="flex flex-wrap gap-2 items-center mb-3">
            <Autocomplete
              autoHighlight
              options={employees}
              value={employees.find((o) => o.value === ebId) ?? null}
              onChange={(_, v) => setEbId(v?.value ?? "")}
              isOptionEqualToValue={(o, v) => o.value === v.value}
              size="small"
              sx={{ minWidth: 300, flex: 1 }}
              renderInput={(params) => <TextField {...params} label={editId ? "Edit employee" : "Add employee"} />}
            />
            <TextField
              label="Hours"
              type="number"
              size="small"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              inputProps={{ step: 0.5, min: 0, max: 24 }}
              sx={{ width: 100 }}
            />
            <Button variant="contained" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : editId ? "Update" : "Add"}
            </Button>
            {editId && (
              <Button
                onClick={() => {
                  setEditId(null);
                  setEbId("");
                  setHours("8");
                }}
              >
                Cancel
              </Button>
            )}
          </Box>
          <TextField
            size="small"
            placeholder="Search EB no / name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 1, width: 280 }}
          />
          {loading ? (
            <Box className="flex justify-center p-8">
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ height: 420 }}>
              <DataGrid
                rows={shown}
                columns={columns}
                getRowId={(r) => r.holiday_tran_id}
                density="compact"
                pageSizeOptions={[25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                disableRowSelectionOnClick
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Snackbar
        open={msg != null}
        autoHideDuration={4000}
        onClose={() => setMsg(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={msg?.severity ?? "success"} onClose={() => setMsg(null)} sx={{ width: "100%" }}>
          {msg?.text}
        </Alert>
      </Snackbar>
    </>
  );
}
