"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, CircularProgress, IconButton, TextField, Typography } from "@mui/material";
import { Plus, Save as SaveIcon, Trash2 } from "lucide-react";
import { z } from "zod";
import { fetchWithCookie } from "@/utils/apiClient2";
import { val } from "../_components/calc";
import { entryTableSx, GRAT_API, useNotify, type Row } from "../_components/shared";

const COLS: [string, string, "num" | "text" | "date"][] = [
  ["TYear", "Year", "num"],
  ["TMonth", "Month", "text"],
  ["FortNight", "Fortnight", "text"],
  ["FromDate", "From", "date"],
  ["ToDate", "To", "date"],
  ["TSW", "TSW", "num"],
  ["LockOut", "Lock Out", "num"],
  ["LockDown", "Lock Down", "num"],
  ["Others", "Others", "num"],
  ["Remarks", "Remarks", "text"],
];
const rowsSchema = z
  .array(z.object({ TYear: z.union([z.string(), z.number()]) }))
  .min(1, "Enter at least one year")
  .refine((rs) => rs.every((r) => val(r.TYear) >= 1950), "Every row needs a valid year");

const blank = (year: number): Row => ({
  TYear: year,
  TMonth: "",
  FortNight: "",
  FromDate: "",
  ToDate: "",
  TSW: 0,
  LockOut: 0,
  LockDown: 0,
  Others: 0,
  Remarks: "",
  Approved: "N",
});
const total = (r: Row) => val(r.TSW) + val(r.LockOut) + val(r.LockDown) + val(r.Others);

/**
 * Temporary Suspension of Work (legacy FrmTSW, PayOTSW): strike / lock-out / lock-down days per
 * year. The gratuity screens pre-fill each year's TSW days from here. Approved rows are read-only.
 */
export default function WinsomeTswPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [from, setFrom] = useState("");
  const [saving, setSaving] = useState(false);
  const { notify, snackbar } = useNotify();

  const load = useCallback(async () => {
    const { data, error } = await fetchWithCookie<{ data: Row[] }>(`${GRAT_API}/tsw`, "GET");
    if (error || !data) notify(error || "Failed to load", "error");
    else setRows(data.data);
  }, [notify]);

  useEffect(() => {
    void load();
  }, [load]);

  // Legacy "Fill": one row per year from the given date to today — only missing years are added.
  const addYears = () => {
    if (!rows || !from) return notify("Pick the From date", "error");
    const have = new Set(rows.map((r) => Number(r.TYear)));
    const add: Row[] = [];
    for (let y = Number(from.slice(0, 4)); y <= new Date().getFullYear(); y++)
      if (!have.has(y)) add.push(blank(y));
    if (!add.length) return notify("All those years are already listed", "error");
    setRows([...rows, ...add].sort((a, b) => Number(a.TYear) - Number(b.TYear)));
  };

  const save = async () => {
    if (!rows) return;
    const check = rowsSchema.safeParse(rows);
    if (!check.success) return notify(check.error.issues[0].message, "error");
    setSaving(true);
    const { data, error } = await fetchWithCookie<{ message: string }>(`${GRAT_API}/tsw`, "POST", { rows });
    setSaving(false);
    if (error || !data) return notify(error || "Save failed", "error");
    notify(data.message);
    void load();
  };

  const set = (i: number, k: string, v: string) =>
    setRows((rs) => rs && rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">Temporary Suspension of Work (TSW)</Typography>
      {!rows ? (
        <CircularProgress />
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
            <TextField
              size="small"
              type="date"
              label="From"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button variant="outlined" onClick={addYears}>
              Fill years &gt;&gt;
            </Button>
            <Button
              startIcon={<Plus size={16} />}
              onClick={() =>
                setRows([...rows, blank(Math.max(0, ...rows.map((r) => Number(r.TYear))) + 1 || new Date().getFullYear())])
              }
            >
              Add row
            </Button>
            <Box sx={{ ml: "auto" }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon size={18} />}
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </Box>
          </Box>
          <Box sx={{ overflow: "auto", maxHeight: "calc(100vh - 230px)" }}>
            <Box component="table" sx={{ ...entryTableSx, width: "100%" }}>
              <thead>
                <tr>
                  {COLS.map(([k, l]) => (
                    <th key={k}>{l}</th>
                  ))}
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const locked = String(r.Approved).toUpperCase() === "Y";
                  return (
                    <tr key={i}>
                      {COLS.map(([k, l, t]) => (
                        <td key={k}>
                          <input
                            className={t === "num" ? "cell num" : "cell"}
                            type={t === "num" ? "number" : t}
                            aria-label={`Row ${i + 1} ${l}`}
                            value={String(r[k] ?? "")}
                            disabled={locked}
                            onChange={(e) => set(i, k, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="out">{total(r)}</td>
                      <td>
                        {!locked && (
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Remove row ${i + 1}`}
                            onClick={() => setRows(rows.filter((_, j) => j !== i))}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Box>
          </Box>
        </>
      )}
      {snackbar}
    </Box>
  );
}
