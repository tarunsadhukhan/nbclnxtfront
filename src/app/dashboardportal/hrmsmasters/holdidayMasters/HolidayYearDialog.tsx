"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
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
import { Save as SaveIcon, Trash2 as DeleteIcon, X } from "lucide-react";
import { z } from "zod";
import { entryGridCellColorsSx, handleGridEnterKey } from "@/components/ui/entryGrid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

/** A line of GET /hrms/holiday_year (and the grid row). */
interface HolidayLine {
  holiday_id: number | null;
  holiday_date: string;
  holiday: string;
  /** Used by holiday transactions — can't be removed. */
  in_use: boolean;
}

const blankLine = (): HolidayLine => ({ holiday_id: null, holiday_date: "", holiday: "", in_use: false });
const isBlank = (l: HolidayLine) => l.holiday_id == null && l.holiday_date === "" && l.holiday.trim() === "";

/** Save payload — mirrors the backend (legacy FrmHoliday.btnSave_Click). */
function buildSchema(year: number) {
  return z.object({
    branch_id: z.number({ message: "Select a branch in the sidebar" }),
    year: z.number().int().min(1900, "Enter year in correct format").max(2100, "Enter year in correct format"),
    rows: z
      .array(
        z.object({
          holiday_id: z.number().nullable(),
          holiday_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date")
            .refine((d) => d.startsWith(`${year}-`), `Date is not in ${year}`),
          holiday: z.string().trim().min(1, "Please enter the event").max(255, "Event is too long"),
        }),
      )
      .min(1, "Kindly enter at least one date and event"),
  });
}

const cellSx = { border: "1px solid", borderColor: "divider", py: 0.5, px: 1 } as const;
const headCellSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover" } as const;

interface Props {
  open: boolean;
  /** Year being edited; undefined = add a new year. */
  year?: number;
  /** Years that already have holidays — a new year must not be one of them. */
  existingYears: number[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** One year of holidays as a date + event grid (legacy FrmHoliday). */
export default function HolidayYearDialog({ open, year, existingYears, onClose, onSaved }: Props) {
  const { selectedBranches } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;
  const isEdit = year !== undefined;

  const [yearText, setYearText] = useState("");
  const [lines, setLines] = useState<HolidayLine[]>(() => [blankLine()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadYear = useCallback(
    async (y: number) => {
      if (branchId == null) return;
      setLoading(true);
      const { data, error } = await fetchWithCookie<{ data: HolidayLine[] }>(
        `${apiRoutesPortalMasters.HOLIDAY_YEAR}?branch_id=${branchId}&year=${y}`,
        "GET",
      );
      if (error || !data) setError(error || "Failed to load holidays");
      else setLines([...data.data, blankLine()]);
      setLoading(false);
    },
    [branchId],
  );

  useEffect(() => {
    if (!open) return;
    setError("");
    if (year !== undefined) {
      setYearText(String(year));
      void loadYear(year);
    } else {
      setYearText(String(new Date().getFullYear() + 1));
      setLines([blankLine()]);
    }
  }, [open, year, loadYear]);

  const setField = (index: number, key: "holiday_date" | "holiday", value: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      if (index === next.length - 1 && !isBlank(next[index])) next.push(blankLine());
      return next;
    });
  };

  const handleSave = async () => {
    const y = Number(yearText);
    if (!isEdit && existingYears.includes(y)) {
      setError(`${y} already exists — edit it from the list`);
      return;
    }
    const rows = lines.filter((l) => !isBlank(l));
    const parsed = buildSchema(y).safeParse({
      branch_id: branchId,
      year: y,
      rows: rows.map(({ holiday_id, holiday_date, holiday }) => ({ holiday_id, holiday_date, holiday })),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const lineNo = issue.path[0] === "rows" && typeof issue.path[1] === "number" ? `Line ${issue.path[1] + 1}: ` : "";
      setError(lineNo + issue.message);
      return;
    }
    const dates = parsed.data.rows.map((r) => r.holiday_date);
    const dup = dates.findIndex((d, i) => dates.indexOf(d) !== i);
    if (dup >= 0) {
      setError(`Line ${dup + 1}: date is already entered on line ${dates.indexOf(dates[dup]) + 1}`);
      return;
    }
    setSaving(true);
    const { data, error } = await fetchWithCookie<{ message: string }>(
      apiRoutesPortalMasters.HOLIDAY_YEAR_SAVE,
      "POST",
      parsed.data,
    );
    setSaving(false);
    if (error || !data) {
      setError(error || "Save failed");
      return;
    }
    onSaved(data.message);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" component="span">
            {isEdit ? `Holidays ${year}` : "Add Holiday Year"}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", minHeight: 200, alignItems: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2, ...entryGridCellColorsSx }}
              onKeyDown={handleGridEnterKey}
            >
              <TextField
                label="Year"
                type="number"
                size="small"
                value={yearText}
                onChange={(e) => setYearText(e.target.value)}
                disabled={isEdit}
                required
                sx={{ width: 140 }}
              />
              <TableContainer>
                <Table
                  size="small"
                  sx={{ border: "1px solid", borderColor: "divider", borderCollapse: "collapse", "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...headCellSx, width: 50 }}>SlNo</TableCell>
                      <TableCell sx={{ ...headCellSx, width: 170 }}>Date</TableCell>
                      <TableCell sx={headCellSx}>Event</TableCell>
                      <TableCell sx={{ ...headCellSx, width: 50 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((l, i) => (
                      <TableRow key={`holiday-${i}`}>
                        <TableCell sx={cellSx}>{i + 1}</TableCell>
                        <TableCell sx={cellSx}>
                          <TextField
                            type="date"
                            size="small"
                            variant="standard"
                            value={l.holiday_date}
                            onChange={(e) => setField(i, "holiday_date", e.target.value)}
                            InputProps={{ disableUnderline: true }}
                            inputProps={{ "aria-label": `Line ${i + 1} date` }}
                          />
                        </TableCell>
                        <TableCell sx={cellSx}>
                          <TextField
                            size="small"
                            variant="standard"
                            fullWidth
                            value={l.holiday}
                            onChange={(e) => setField(i, "holiday", e.target.value)}
                            InputProps={{ disableUnderline: true }}
                            inputProps={{ maxLength: 255, "aria-label": `Line ${i + 1} event` }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={cellSx}>
                          <Tooltip title={l.in_use ? "Used in holiday transactions — can't remove" : "Remove line"}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={l.in_use || lines.length <= 1}
                                onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                                aria-label={`Remove line ${i + 1}`}
                              >
                                <DeleteIcon size={16} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button onClick={onClose}>Close</Button>
                <Button variant="contained" startIcon={<SaveIcon size={18} />} onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Snackbar
        open={error !== ""}
        autoHideDuration={5000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setError("")} sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
