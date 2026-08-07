"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import { ItemOption, UomOption } from "./types";

export type BulkComponentPayload = {
  child_item_id: number;
  qty: number;
  uom_id: number;
  sequence_no: number;
  additional_description?: string | null;
  _meta: {
    child_item_code: string;
    child_full_item_code?: string;
    child_item_name: string;
    uom_name: string;
  };
};

type BatchRow = {
  rowKey: string;
  item: ItemOption;
  qty: string;
  uom: UomOption | null;
  additionalDescription: string;
  qtyError: boolean;
  uomError: boolean;
};

export type BulkAddComponentsDialogProps = {
  open: boolean;
  onClose: () => void;
  parentItemId: number | undefined;
  nextSeqStart: number;
  itemOptions: ItemOption[];
  uomOptions: UomOption[];
  onItemSearchChange: (query: string) => void;
  onBulkSave: (rows: BulkComponentPayload[]) => Promise<void>;
};

function newRowKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function BulkAddComponentsDialog({
  open,
  onClose,
  parentItemId,
  nextSeqStart,
  itemOptions,
  uomOptions,
  onItemSearchChange,
  onBulkSave,
}: BulkAddComponentsDialogProps) {
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [itemInputValue, setItemInputValue] = useState("");
  const [applyQty, setApplyQty] = useState<string>("");
  const [applyUom, setApplyUom] = useState<UomOption | null>(null);
  const [saving, setSaving] = useState(false);

  const lastSearchRef = useRef<string>("");

  useEffect(() => {
    if (!open) {
      setBatchRows([]);
      setItemInputValue("");
      setApplyQty("");
      setApplyUom(null);
      setSaving(false);
      lastSearchRef.current = "";
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (itemInputValue === lastSearchRef.current) return;
    const t = setTimeout(() => {
      lastSearchRef.current = itemInputValue;
      onItemSearchChange(itemInputValue);
    }, 300);
    return () => clearTimeout(t);
  }, [itemInputValue, onItemSearchChange, open]);

  const appendRow = (item: ItemOption) => {
    const defaultUom: UomOption | null =
      item.uom_id && item.uom_name
        ? { uom_id: item.uom_id, uom_name: item.uom_name }
        : null;
    setBatchRows((prev) => [
      ...prev,
      {
        rowKey: newRowKey(),
        item,
        qty: "1",
        uom: defaultUom,
        additionalDescription: "",
        qtyError: false,
        uomError: false,
      },
    ]);
  };

  const updateRow = (rowKey: string, patch: Partial<BatchRow>) => {
    setBatchRows((prev) =>
      prev.map((r) => (r.rowKey === rowKey ? { ...r, ...patch } : r))
    );
  };

  const removeRow = (rowKey: string) => {
    setBatchRows((prev) => prev.filter((r) => r.rowKey !== rowKey));
  };

  const handleApplyQtyToAll = () => {
    const v = parseFloat(applyQty);
    if (!applyQty || isNaN(v) || v <= 0) return;
    setBatchRows((prev) =>
      prev.map((r) => ({ ...r, qty: applyQty, qtyError: false }))
    );
  };

  const handleApplyUomToAll = () => {
    if (!applyUom) return;
    setBatchRows((prev) =>
      prev.map((r) => ({ ...r, uom: applyUom, uomError: false }))
    );
  };

  const validate = (): BulkComponentPayload[] | null => {
    let allValid = true;
    const errorPatch: Record<string, Partial<BatchRow>> = {};
    const payload: BulkComponentPayload[] = [];

    batchRows.forEach((row, idx) => {
      const parsedQty = parseFloat(row.qty);
      const qtyBad = !row.qty || isNaN(parsedQty) || parsedQty <= 0;
      const uomBad = !row.uom;
      if (qtyBad || uomBad) {
        allValid = false;
        errorPatch[row.rowKey] = { qtyError: qtyBad, uomError: uomBad };
        return;
      }
      payload.push({
        child_item_id: row.item.item_id,
        qty: parsedQty,
        uom_id: row.uom!.uom_id,
        sequence_no: nextSeqStart + idx,
        additional_description: row.additionalDescription.trim() || null,
        _meta: {
          child_item_code: row.item.item_code,
          child_full_item_code: row.item.full_item_code,
          child_item_name: row.item.item_name,
          uom_name: row.uom!.uom_name,
        },
      });
    });

    if (!allValid) {
      setBatchRows((prev) =>
        prev.map((r) =>
          errorPatch[r.rowKey] ? { ...r, ...errorPatch[r.rowKey] } : r
        )
      );
      return null;
    }
    return payload;
  };

  const handleSubmit = async () => {
    if (!parentItemId) return;
    const payload = validate();
    if (!payload) return;
    setSaving(true);
    try {
      await onBulkSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const submitDisabled = saving || batchRows.length === 0 || !parentItemId;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Bulk Add Components</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Tip: type to search, Enter to pick. Each pick adds a new row below — pick
            the same item twice to add it twice. Reorder rows in the BOM tree after
            saving.
          </Typography>

          <Autocomplete
            value={null}
            options={itemOptions}
            filterOptions={(x) => x}
            disableCloseOnSelect
            blurOnSelect={false}
            clearOnBlur={false}
            autoHighlight
            inputValue={itemInputValue}
            onInputChange={(_, value, reason) => {
              if (reason !== "reset") setItemInputValue(value);
            }}
            getOptionLabel={(opt) => `${opt.full_item_code || opt.item_code} — ${opt.item_name}`}
            isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
            onChange={(_, picked) => {
              if (!picked) return;
              appendRow(picked);
            }}
            renderOption={(props, opt) => {
              const { key, ...rest } = props as { key?: React.Key } & React.HTMLAttributes<HTMLLIElement>;
              const count = batchRows.filter((r) => r.item.item_id === opt.item_id).length;
              return (
                <Box component="li" key={key ?? opt.item_id} {...rest}>
                  <Box sx={{ flex: 1 }}>
                    {`${opt.full_item_code || opt.item_code} — ${opt.item_name}`}
                  </Box>
                  {count > 0 && (
                    <Chip size="small" label={`×${count}`} sx={{ ml: 1 }} />
                  )}
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search items"
                placeholder="Type to search…"
                size="small"
                autoFocus
              />
            )}
          />

          {batchRows.length > 0 && (
            <>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                <TextField
                  size="small"
                  type="number"
                  label="Apply qty"
                  value={applyQty}
                  onChange={(e) => setApplyQty(e.target.value)}
                  inputProps={{ min: 0, step: "any" }}
                  sx={{ width: 130 }}
                />
                <Button size="small" variant="outlined" onClick={handleApplyQtyToAll}>
                  Apply qty to all
                </Button>
                <Autocomplete
                  size="small"
                  options={uomOptions}
                  getOptionLabel={(opt) => opt.uom_name}
                  value={applyUom}
                  onChange={(_, v) => setApplyUom(v)}
                  isOptionEqualToValue={(opt, val) => opt.uom_id === val.uom_id}
                  sx={{ width: 180 }}
                  renderInput={(params) => (
                    <TextField {...params} label="Apply UOM" size="small" />
                  )}
                />
                <Button size="small" variant="outlined" onClick={handleApplyUomToAll}>
                  Apply UOM to all
                </Button>
              </Stack>

              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "60px 2fr 1.5fr 110px 180px 60px",
                    bgcolor: "grey.50",
                    borderBottom: "2px solid",
                    borderColor: "divider",
                  }}
                >
                  {["Seq", "Item", "Addl. Desc", "Qty", "UOM", ""].map((label, i) => (
                    <Typography
                      key={i}
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        py: 1,
                        px: 1,
                        borderRight: i < 5 ? "1px solid" : undefined,
                        borderColor: "divider",
                        textAlign: i === 0 || i === 3 ? "right" : "left",
                      }}
                    >
                      {label}
                    </Typography>
                  ))}
                </Box>

                {batchRows.map((row, idx) => (
                  <Box
                    key={row.rowKey}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "60px 2fr 1.5fr 110px 180px 60px",
                      alignItems: "center",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box sx={{ px: 1, py: 0.5, textAlign: "right", borderRight: "1px solid", borderColor: "divider" }}>
                      <Typography variant="body2" color="text.secondary">
                        {nextSeqStart + idx}
                      </Typography>
                    </Box>
                    <Box sx={{ px: 1, py: 0.5, borderRight: "1px solid", borderColor: "divider" }}>
                      <Typography variant="body2">
                        {`${row.item.full_item_code || row.item.item_code} — ${row.item.item_name}`}
                      </Typography>
                    </Box>
                    <Box sx={{ px: 1, py: 0.5, borderRight: "1px solid", borderColor: "divider" }}>
                      <TextField
                        size="small"
                        value={row.additionalDescription}
                        onChange={(e) =>
                          updateRow(row.rowKey, { additionalDescription: e.target.value })
                        }
                        placeholder="Notes…"
                        sx={{ width: "100%" }}
                      />
                    </Box>
                    <Box sx={{ px: 1, py: 0.5, borderRight: "1px solid", borderColor: "divider" }}>
                      <TextField
                        size="small"
                        type="number"
                        value={row.qty}
                        onChange={(e) =>
                          updateRow(row.rowKey, { qty: e.target.value, qtyError: false })
                        }
                        error={row.qtyError}
                        helperText={row.qtyError ? "> 0" : undefined}
                        inputProps={{ min: 0, step: "any", style: { textAlign: "right" } }}
                        sx={{ width: "100%" }}
                      />
                    </Box>
                    <Box sx={{ px: 1, py: 0.5, borderRight: "1px solid", borderColor: "divider" }}>
                      <Autocomplete
                        size="small"
                        autoHighlight
                        options={uomOptions}
                        getOptionLabel={(opt) => opt.uom_name}
                        value={row.uom}
                        onChange={(_, v) => updateRow(row.rowKey, { uom: v, uomError: false })}
                        isOptionEqualToValue={(opt, val) => opt.uom_id === val.uom_id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="UOM…"
                            size="small"
                            error={row.uomError}
                            helperText={row.uomError ? "Required" : undefined}
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "center", py: 0.5 }}>
                      <Tooltip title="Remove from batch">
                        <IconButton size="small" onClick={() => removeRow(row.rowKey)} disabled={saving}>
                          <Trash2 size={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitDisabled}>
          {batchRows.length > 0 ? `Add ${batchRows.length} component${batchRows.length === 1 ? "" : "s"}` : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
