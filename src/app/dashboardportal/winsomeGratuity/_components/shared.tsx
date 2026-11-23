"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Alert, Autocomplete, Snackbar, TextField } from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/** Base of the Winsome gratuity backend (pyhback src/hrms/winsomeGratuity.py). */
export const GRAT_API = apiRoutesPortalMasters.WINSOME_GRAT;

export type Row = Record<string, string | number | null>;

type Snack = { open: boolean; message: string; severity: "success" | "error" };

/** Top-centre success / error toast used by every gratuity screen. */
export function useNotify() {
  const [snack, setSnack] = useState<Snack>({
    open: false,
    message: "",
    severity: "success",
  });
  const notify = useCallback(
    (message: string, severity: Snack["severity"] = "success") =>
      setSnack({ open: true, message, severity }),
    [],
  );
  const close = () => setSnack((s) => ({ ...s, open: false }));
  const snackbar = (
    <Snackbar
      open={snack.open}
      autoHideDuration={4000}
      onClose={close}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert severity={snack.severity} onClose={close} sx={{ width: "100%" }}>
        {snack.message}
      </Alert>
    </Snackbar>
  );
  return { notify, snackbar };
}

interface EmpPickerProps {
  /** emp_search endpoint, e.g. `${GRAT_API}/stl/emp_search`. */
  url: string;
  label?: string;
  onPick: (row: Row) => void;
}

/** Server-side employee search (ECode / name prefix, 50 matches) — legacy F5 "Find". */
export function EmpPicker({ url, label = "Employee", onPick }: EmpPickerProps) {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      setLoading(true);
      void fetchWithCookie<{ data: Row[] }>(
        `${url}?q=${encodeURIComponent(input)}`,
        "GET",
      ).then(({ data }) => {
        if (!live) return;
        setOptions(data?.data ?? []);
        setLoading(false);
      });
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [url, input]);

  return (
    <Autocomplete
      size="small"
      sx={{ minWidth: 320 }}
      options={options}
      loading={loading}
      filterOptions={(o) => o}
      getOptionLabel={(o) => `${o.ECode} - ${o.EName}`}
      isOptionEqualToValue={(a, b) => a.ECode === b.ECode}
      onInputChange={(_, v, reason) => reason === "input" && setInput(v)}
      onChange={(_, o) => o && onPick(o)}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder="EB no or name" />
      )}
    />
  );
}

/** Shared look of the editable entry tables (native inputs, row lines only). */
export const entryTableSx = {
  borderCollapse: "collapse",
  "& th": {
    fontWeight: 600,
    whiteSpace: "nowrap",
    p: "4px",
    borderBottom: "1px solid",
    borderColor: "divider",
  },
  "& td": {
    p: "2px 4px",
    borderBottom: "1px solid",
    borderColor: "divider",
    fontSize: "0.875rem",
  },
  "& td.out": { textAlign: "right", color: "text.secondary" },
  "& input.cell": {
    width: "100%",
    minWidth: 56,
    border: 0,
    outline: 0,
    background: "transparent",
    font: "inherit",
    color: "inherit",
    p: "4px 2px",
  },
  "& input.cell.num": { textAlign: "right" },
  "& input.cell:focus": { backgroundColor: "action.hover" },
} as const;
