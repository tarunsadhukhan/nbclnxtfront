import React from "react";
import { Box, TextField } from "@mui/material";

export type MinMaxRow = {
  branch_id: number;
  branch_name: string;
  minqty: number | null;
  maxqty: number | null;
  min_order_qty: number | null;
  lead_time: number | null;
};

interface MinMaxMappingTableProps {
  value?: MinMaxRow[];
  onChange?: (rows: MinMaxRow[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const normalizeRows = (rows?: MinMaxRow[]) => Array.isArray(rows) ? rows.map((row) => ({
  branch_id: row.branch_id,
  branch_name: row.branch_name,
  minqty: row.minqty ?? null,
  maxqty: row.maxqty ?? null,
  min_order_qty: (row as any).min_order_qty ?? (row as any).minOrderQty ?? null,
  lead_time: (row as any).lead_time ?? (row as any).leadTime ?? null,
})) : [];

const MinMaxMappingTable: React.FC<MinMaxMappingTableProps> = ({ value = [], onChange, disabled = false, readOnly = false }) => {
  const disabledAll = disabled || readOnly;
  const syncingFromPropRef = React.useRef(false);
  const [rows, setRows] = React.useState<MinMaxRow[]>(() => normalizeRows(value));
  const [errors, setErrors] = React.useState<Record<number, { minqty?: string; maxqty?: string; min_order_qty?: string; lead_time?: string }>>({});
  const lastEmittedRef = React.useRef<string>("");

  React.useEffect(() => {
    syncingFromPropRef.current = true;
    setRows(normalizeRows(value));
    lastEmittedRef.current = JSON.stringify(normalizeRows(value));
    const t = setTimeout(() => {
      syncingFromPropRef.current = false;
    }, 0);
    return () => clearTimeout(t);
  }, [value]);

  const handleChange = (index: number, field: keyof MinMaxRow, value: string) => {
    setRows((prev) => prev.map((row, i) => {
      if (i !== index) return row;
      const next = value === "" ? null : Number(value);
      return { ...row, [field]: Number.isNaN(next) ? row[field] ?? null : next };
    }));
  };

  React.useEffect(() => {
    const newErrors: Record<number, { minqty?: string; maxqty?: string; min_order_qty?: string; lead_time?: string }> = {};
    rows.forEach((row, i) => {
      const min = row.minqty;
      const max = row.maxqty;
      const moq = row.min_order_qty;
      const lead = row.lead_time;

      const rowErr: { minqty?: string; maxqty?: string; min_order_qty?: string; lead_time?: string } = {};

      if (min != null && !Number.isFinite(min)) rowErr.minqty = "Must be a number";
      if (max != null && !Number.isFinite(max)) rowErr.maxqty = "Must be a number";
      if (moq != null && !Number.isFinite(moq)) rowErr.min_order_qty = "Must be a number";
      if (lead != null && !Number.isFinite(lead)) rowErr.lead_time = "Must be a number";

      if (min != null && max != null && max <= min) rowErr.maxqty = "Max must be greater than Min";
      if (moq != null && min != null && moq > min) rowErr.min_order_qty = "Min order qty must be <= Min qty";

      if (Object.keys(rowErr).length > 0) newErrors[i] = rowErr;
    });
    setErrors(newErrors);

    if (!syncingFromPropRef.current) {
      const signature = JSON.stringify(rows);
      if (signature !== lastEmittedRef.current) {
        lastEmittedRef.current = signature;
        onChange?.(rows);
      }
    }
  }, [rows, onChange]);

  return (
    <Box sx={{ mt: 2 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: 8, background: "#f8f9fa" }}>Branch</th>
            <th style={{ border: "1px solid #ccc", padding: 8, background: "#f8f9fa" }}>Min Qty</th>
            <th style={{ border: "1px solid #ccc", padding: 8, background: "#f8f9fa" }}>Max Qty</th>
            <th style={{ border: "1px solid #ccc", padding: 8, background: "#f8f9fa" }}>Min Order Qty</th>
            <th style={{ border: "1px solid #ccc", padding: 8, background: "#f8f9fa" }}>Lead Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row.branch_id ?? "row"}-${idx}`}>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{row.branch_name}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                <TextField
                  type="number"
                  value={row.minqty ?? ""}
                  onChange={(e) => handleChange(idx, "minqty", e.target.value)}
                  size="small"
                  variant="outlined"
                  inputProps={{ min: 0, step: "any", readOnly: readOnly, disabled: disabledAll }}
                  error={Boolean(errors[idx]?.minqty)}
                  helperText={errors[idx]?.minqty}
                  disabled={disabledAll}
                />
              </td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                <TextField
                  type="number"
                  value={row.maxqty ?? ""}
                  onChange={(e) => handleChange(idx, "maxqty", e.target.value)}
                  size="small"
                  variant="outlined"
                  inputProps={{ min: 0, step: "any", readOnly: readOnly, disabled: disabledAll }}
                  error={Boolean(errors[idx]?.maxqty)}
                  helperText={errors[idx]?.maxqty}
                  disabled={disabledAll}
                />
              </td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                <TextField
                  type="number"
                  value={row.min_order_qty ?? ""}
                  onChange={(e) => handleChange(idx, "min_order_qty", e.target.value)}
                  size="small"
                  variant="outlined"
                  inputProps={{ min: 0, step: "any", readOnly: readOnly, disabled: disabledAll }}
                  error={Boolean(errors[idx]?.min_order_qty)}
                  helperText={errors[idx]?.min_order_qty}
                  disabled={disabledAll}
                />
              </td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                <TextField
                  type="number"
                  value={row.lead_time ?? ""}
                  onChange={(e) => handleChange(idx, "lead_time", e.target.value)}
                  size="small"
                  variant="outlined"
                  inputProps={{ min: 0, step: "any", readOnly: readOnly, disabled: disabledAll }}
                  error={Boolean(errors[idx]?.lead_time)}
                  helperText={errors[idx]?.lead_time}
                  disabled={disabledAll}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
};

export default MinMaxMappingTable;
