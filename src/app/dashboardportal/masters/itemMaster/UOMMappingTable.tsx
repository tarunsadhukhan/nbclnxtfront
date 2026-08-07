import React from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Checkbox,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Trash } from 'lucide-react';

type UOMOption = { label: string; value: string | number };

export type UOMRow = {
  mapFromUom?: string | number | null;
  mapFromName?: string | null;
  mapToUom?: string | number | null;
  mapToName?: string | null;
  isFixed?: boolean;
  relationValue?: number | null; // decimal
  rounding?: number | null; // integer
  id?: string; // client-side id for stable rendering
};

interface UOMMappingTableProps {
  value?: UOMRow[];
  uomOptions: UOMOption[];
  itemDefaultUom?: string | number | null; // the item's current UOM (map_from default)
  onChange?: (rows: UOMRow[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const makeId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2));

const blankRow = (itemDefaultUom?: string | number | null): UOMRow => ({
  id: makeId(),
  mapFromUom: itemDefaultUom != null ? String(itemDefaultUom) : null,
  mapFromName: null,
  mapToUom: null,
  mapToName: null,
  isFixed: false,
  relationValue: null,
  rounding: null,
});

const normalizeRow = (row: any, options: UOMOption[]): UOMRow => {
  const mapFromUomRaw = row?.mapFromUom ?? row?.map_from_id ?? row?.map_from ?? null;
  const mapFromUom = mapFromUomRaw != null ? String(mapFromUomRaw) : null;
  const mapToUomRaw = row?.mapToUom ?? row?.map_to_id ?? row?.map_to ?? null;
  const mapToUom = mapToUomRaw != null ? String(mapToUomRaw) : null;
  const mapFromName = row?.mapFromName ?? row?.map_from_name ?? options.find(o => String(o.value) === String(mapFromUom))?.label ?? null;
  const mapToName = row?.mapToName ?? row?.map_to_name ?? options.find(o => String(o.value) === String(mapToUom))?.label ?? null;
  
  // Parse relationValue - handle both number and string from API
  const rawRelation = row?.relationValue ?? row?.relation_value;
  let relationValue: number | null = null;
  if (rawRelation != null && rawRelation !== "") {
    const parsed = Number(rawRelation);
    if (!Number.isNaN(parsed)) relationValue = parsed;
  }
  
  // Parse rounding - handle both number and string from API
  const rawRounding = row?.rounding;
  let rounding: number | null = null;
  if (rawRounding != null && rawRounding !== "") {
    const parsed = parseInt(String(rawRounding), 10);
    if (!Number.isNaN(parsed)) rounding = parsed;
  }
  
  return {
    id: row?.id ?? makeId(),
    mapFromUom,
    mapFromName,
    mapToUom,
    mapToName,
    isFixed: Boolean(row?.isFixed ?? row?.is_fixed ?? false),
    relationValue,
    rounding,
  };
};

const ensureTrailingBlank = (rows: UOMRow[], itemDefaultUom?: string | number | null) => {
  if (!rows.length) return [blankRow(itemDefaultUom)];
  const last = rows[rows.length - 1];
  if (!last) return [blankRow(itemDefaultUom)];
  const isEmpty = !last.mapToUom && last.relationValue == null && last.rounding == null;
  return isEmpty ? rows : [...rows, blankRow(itemDefaultUom)];
};

const isRowEmpty = (r: UOMRow) => !r.mapToUom && (r.relationValue == null) && (r.rounding == null);

const toSerializable = (rows: UOMRow[]) =>
  rows
    .filter((r, idx) => !(idx === rows.length - 1 && isRowEmpty(r)))
    .map((r) => ({
      mapFromUom: r.mapFromUom ?? null,
      mapToUom: r.mapToUom ?? null,
      isFixed: Boolean(r.isFixed),
      relationValue: r.relationValue ?? null,
      rounding: r.rounding ?? null,
    }));

const serializeRows = (rows: UOMRow[]) => JSON.stringify(toSerializable(rows));

/** Controlled numeric input that allows intermediate decimal states like "1." or ".5".
 *  Uses a plain <input> to avoid MUI v7 TextField interference with character filtering. */
const DecimalInput: React.FC<{
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const [text, setText] = React.useState(value != null ? String(value) : "");
  const [focused, setFocused] = React.useState(false);

  // Only sync from parent when NOT focused — while editing, local text owns the state
  React.useEffect(() => {
    if (!focused) {
      setText(value != null ? String(value) : "");
    }
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      style={{
        width: "100%",
        padding: "8.5px 14px",
        fontSize: "0.875rem",
        border: "1px solid rgba(0,0,0,0.23)",
        borderRadius: 4,
        outline: "none",
        boxSizing: "border-box",
        fontFamily: "inherit",
        background: disabled ? "#f5f5f5" : "inherit",
      }}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const v = e.target.value;
        // Allow empty, digits, one decimal point, optional leading minus
        if (v === "" || /^-?\d*\.?\d*$/.test(v)) {
          setText(v);
        }
      }}
      onBlur={() => {
        setFocused(false);
        const trimmed = text.replace(/\.$/, ""); // clean trailing dot
        const num = trimmed === "" ? null : Number(trimmed);
        if (trimmed === "" || (num != null && !Number.isNaN(num))) {
          onChange(num);
          setText(num != null ? String(num) : "");
        } else {
          // invalid input — revert to parent value
          setText(value != null ? String(value) : "");
        }
      }}
      disabled={disabled}
    />
  );
};

const UOMMappingTable: React.FC<UOMMappingTableProps> = ({ value = [], uomOptions, itemDefaultUom = null, onChange, disabled = false, readOnly = false }) => {
  const disabledAll = disabled || readOnly;
  const syncingFromPropRef = React.useRef(false);
  const lastEmittedRef = React.useRef<string>("");

  const prepareState = React.useCallback((source: UOMRow[]) => {
    const base = Array.isArray(source) && source.length > 0
      ? source.map((row) => {
        const normalized = normalizeRow(row, uomOptions);
        if (!normalized.mapFromName && normalized.mapFromUom) {
          normalized.mapFromName = uomOptions.find(o => String(o.value) === String(normalized.mapFromUom))?.label ?? null;
        }
        return normalized;
      })
      : [blankRow(itemDefaultUom)];
    // ensure default mapFrom is populated on blanks
    return ensureTrailingBlank(base.map((row) => ({
      ...row,
      id: row.id ?? makeId(),
      mapFromUom: row.mapFromUom ?? (itemDefaultUom != null ? String(itemDefaultUom) : null),
      mapFromName: row.mapFromName ?? (row.mapFromUom ? uomOptions.find(o => String(o.value) === String(row.mapFromUom))?.label ?? null : (itemDefaultUom != null ? uomOptions.find(o => String(o.value) === String(itemDefaultUom))?.label ?? null : null)),
    })), itemDefaultUom);
  }, [uomOptions, itemDefaultUom]);

  const [rows, setRows] = React.useState<UOMRow[]>(() => prepareState(value));

  React.useEffect(() => {
    const prepared = prepareState(value);
  const signature = serializeRows(prepared);
  syncingFromPropRef.current = true;
    lastEmittedRef.current = signature;
    setRows(prepared);
    const t = setTimeout(() => {
      syncingFromPropRef.current = false;
    }, 0);
    return () => clearTimeout(t);
  }, [value, prepareState]);

  const [errors, setErrors] = React.useState<Record<number, string>>({});

  const emitRows = React.useCallback((nextRows: UOMRow[]) => {
    if (syncingFromPropRef.current) return;
    const trimmed = nextRows.filter((r, idx) => !(idx === nextRows.length - 1 && isRowEmpty(r)));
    const signature = JSON.stringify(trimmed.map((r) => ({
      mapFromUom: r.mapFromUom ?? null,
      mapToUom: r.mapToUom ?? null,
      isFixed: Boolean(r.isFixed),
      relationValue: r.relationValue ?? null,
      rounding: r.rounding ?? null,
    })));
    if (signature === lastEmittedRef.current) return;
    lastEmittedRef.current = signature;
    onChange?.(trimmed);
  }, [onChange]);

  React.useEffect(() => {
    const seen = new Map<string, number>();
    const newErrors: Record<number, string> = {};
    rows.forEach((r, idx) => {
      if (idx === rows.length - 1 && isRowEmpty(r)) return;
      if (r.mapToUom) {
        const key = String(r.mapToUom);
        if (seen.has(key)) {
          newErrors[idx] = "Duplicate mapping";
          const firstIdx = seen.get(key)!;
          newErrors[firstIdx] = "Duplicate mapping";
        } else {
          seen.set(key, idx);
        }
      }
    });
    setErrors(newErrors);
    emitRows(rows);
  }, [rows, emitRows]);

  const updateRows = React.useCallback((updater: (prev: UOMRow[]) => UOMRow[]) => {
    setRows((prev) => {
      const next = ensureTrailingBlank(updater(prev), itemDefaultUom).map((row) => ({
        ...row,
        id: row.id ?? makeId(),
        mapFromUom: row.mapFromUom ?? (itemDefaultUom != null ? String(itemDefaultUom) : null),
        mapFromName: row.mapFromName ?? (row.mapFromUom ? uomOptions.find(o => String(o.value) === String(row.mapFromUom))?.label ?? null : (itemDefaultUom != null ? uomOptions.find(o => String(o.value) === String(itemDefaultUom))?.label ?? null : null)),
      }));
      return next;
    });
  }, [itemDefaultUom, uomOptions]);

  const updateRow = (idx: number, patch: Partial<UOMRow>) => {
    updateRows((current) => current.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeRow = (idx: number) => {
    updateRows((current) => {
      const filtered = current.filter((_, i) => i !== idx);
      return filtered.length ? filtered : [blankRow(itemDefaultUom)];
    });
  };

  return (
    <Box>
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>UOM Mapping</div>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Map From</TableCell>
              <TableCell>Map To UOM</TableCell>
              <TableCell>Fixed </TableCell>
              <TableCell>Relation Value</TableCell>
              <TableCell>Rounding</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={r.id}>
                <TableCell>
                  {/* show map from name read-only; fallback to itemDefaultUom label */}
                  <div>{r.mapFromName ?? (uomOptions.find(o => String(o.value) === String(r.mapFromUom))?.label ?? '')}</div>
                </TableCell>
                <TableCell>
                  <Select
                    fullWidth
                    size="small"
                    value={r.mapToUom ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const label = uomOptions.find(o => String(o.value) === String(val))?.label ?? null;
                      updateRow(idx, { mapToUom: val, mapToName: label });
                    }}
                    disabled={disabledAll}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {uomOptions
                      .filter(o => String(o.value) !== String(r.mapFromUom))
                      .filter(o => {
                        // exclude values already used in other rows' mapToUom
                        const usedByOther = rows.some((rr, ri) => ri !== idx && String(rr.mapToUom) === String(o.value));
                        return !usedByOther;
                      })
                      .map((o) => (
                        <MenuItem key={String(o.value)} value={o.value}>{o.label}</MenuItem>
                      ))}
                  </Select>
                  {errors[idx] && (
                    <div style={{ color: 'red', fontSize: 12 }}>{errors[idx]}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={Boolean(r.isFixed)}
                    onChange={(e) => updateRow(idx, { isFixed: e.target.checked })}
                    disabled={disabledAll}
                  />
                </TableCell>
                <TableCell>
                  <DecimalInput
                    value={r.relationValue ?? null}
                    onChange={(num) => updateRow(idx, { relationValue: num })}
                    disabled={disabledAll}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={r.rounding ?? ""}
                    onChange={(e) => {
                      // accept only integer
                      const v = e.target.value.replace(/[^0-9-]/g, "");
                      const num = v === "" ? null : parseInt(v, 10);
                      if (v === "" || !Number.isNaN(num)) updateRow(idx, { rounding: num });
                    }}
                    disabled={disabledAll}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Remove row">
                    <span style={{ display: 'inline-block' }}>
                      <IconButton size="small" onClick={() => removeRow(idx)} disabled={disabledAll}>
                        <Trash size={14} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UOMMappingTable;
