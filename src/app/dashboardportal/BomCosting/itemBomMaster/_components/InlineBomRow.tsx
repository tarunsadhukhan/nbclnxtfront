"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Check, X } from "lucide-react";
import { ItemOption, UomOption, getCoId } from "./types";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type InlineSavePayload = {
  child_item_id: number;
  qty: number;
  uom_id: number;
  sequence_no: number;
  co_id: number;
  additional_description?: string | null;
  _meta: {
    child_item_code: string;
    child_full_item_code?: string;
    child_item_name: string;
    uom_name: string;
  };
};

export type InlineBomRowProps = {
  /** 0-based grid level for indentation */
  level: number;
  gridColumns: string;
  nextSeq: number;
  parentItemId: number;
  parentMultiplier: number;
  itemOptions: ItemOption[];
  uomOptions: UomOption[];
  onItemSearchChange: (query: string) => void;
  onSave: (parentItemId: number, payload: InlineSavePayload) => Promise<void>;
  onCancel: () => void;
};

export default function InlineBomRow({
  level,
  gridColumns,
  nextSeq,
  parentItemId,
  parentMultiplier,
  itemOptions,
  uomOptions,
  onItemSearchChange,
  onSave,
  onCancel,
}: InlineBomRowProps) {
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [itemInputValue, setItemInputValue] = useState("");
  const [additionalDescription, setAdditionalDescription] = useState<string>("");
  const [qty, setQty] = useState<string>("1");
  const [selectedUom, setSelectedUom] = useState<UomOption | null>(null);
  const [saving, setSaving] = useState(false);

  // Field-level validation errors
  const [itemError, setItemError] = useState(false);
  const [qtyError, setQtyError] = useState(false);
  const [uomError, setUomError] = useState(false);

  const itemRef = useRef<HTMLInputElement>(null);
  const lastSearchRef = useRef<string>("");

  // Auto-focus the item field when this row mounts
  useEffect(() => {
    const timeout = setTimeout(() => itemRef.current?.focus(), 50);
    return () => clearTimeout(timeout);
  }, []);

  // Debounced server search: fire 300ms after the user stops typing
  useEffect(() => {
    if (itemInputValue === lastSearchRef.current) return;
    const t = setTimeout(() => {
      lastSearchRef.current = itemInputValue;
      onItemSearchChange(itemInputValue);
    }, 300);
    return () => clearTimeout(t);
  }, [itemInputValue, onItemSearchChange]);

  const resetRow = () => {
    setSelectedItem(null);
    setItemInputValue("");
    setAdditionalDescription("");
    setQty("1");
    setSelectedUom(null);
    setItemError(false);
    setQtyError(false);
    setUomError(false);
  };

  const handleSave = async () => {
    let valid = true;
    if (!selectedItem) { setItemError(true); valid = false; }
    const parsedQty = parseFloat(qty);
    if (!qty || isNaN(parsedQty) || parsedQty <= 0) { setQtyError(true); valid = false; }
    if (!selectedUom) { setUomError(true); valid = false; }
    if (!valid) return;

    setSaving(true);
    try {
      const co_id = parseInt(getCoId());
      await onSave(parentItemId, {
        child_item_id: selectedItem!.item_id,
        qty: parsedQty,
        uom_id: selectedUom!.uom_id,
        sequence_no: nextSeq,
        co_id,
        additional_description: additionalDescription.trim() || null,
        _meta: {
          child_item_code: selectedItem!.item_code,
          child_full_item_code: selectedItem!.full_item_code,
          child_item_name: selectedItem!.item_name,
          uom_name: selectedUom!.uom_name,
        },
      });
      // Auto-spawn: reset fields but keep the row open (parent controls whether row stays)
      resetRow();
      setTimeout(() => itemRef.current?.focus(), 50);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Autocomplete calls preventDefault() when committing a highlighted option.
      // Skip handleSave in that case so the same Enter that picked an option
      // does not also try to submit a half-filled row.
      if (e.defaultPrevented) return;
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  };

  const bomQtyPreview = !qty || isNaN(parseFloat(qty)) ? 0 : parseFloat(qty) * parentMultiplier;

  return (
    <Box
      onKeyDown={handleKeyDown}
      sx={{
        display: "grid",
        gridTemplateColumns: gridColumns,
        alignItems: "center",
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "action.selected",
      }}
    >
      {/* Seq — auto-computed, read-only */}
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 0.5, borderRight: "1px solid", borderColor: "divider" }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {nextSeq}
        </Typography>
      </Box>

      {/* Item autocomplete — spans Item Code + Item Name columns */}
      <Box sx={{ gridColumn: "span 2", pl: level * 3 + 1, pr: 1, py: 0.5, borderRight: "1px solid", borderColor: "divider" }}>
        <Autocomplete
          size="small"
          autoHighlight
          options={itemOptions}
          filterOptions={(x) => x}
          getOptionLabel={(opt) => `${opt.full_item_code || opt.item_code} — ${opt.item_name}`}
          renderOption={(props, opt) => {
            const { key: _ignore, ...rest } = props as { key?: React.Key } & React.HTMLAttributes<HTMLLIElement>;
            return (
              <li {...rest} key={opt.item_id}>
                {`${opt.full_item_code || opt.item_code} — ${opt.item_name}`}
              </li>
            );
          }}
          value={selectedItem}
          inputValue={itemInputValue}
          onChange={(_, newValue) => {
            setSelectedItem(newValue);
            setItemError(false);
            if (newValue?.uom_id && newValue?.uom_name) {
              setSelectedUom({ uom_id: newValue.uom_id, uom_name: newValue.uom_name });
              setUomError(false);
            }
          }}
          onInputChange={(_, value, reason) => {
            if (reason !== "reset") {
              setItemInputValue(value);
            }
          }}
          isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
          renderInput={(params) => (
            <TextField
              {...params}
              inputRef={itemRef}
              placeholder="Search item…"
              size="small"
              error={itemError}
              helperText={itemError ? "Required" : undefined}
            />
          )}
        />
      </Box>

      {/* Additional description */}
      <Box sx={{ px: 1, py: 0.5, borderRight: "1px solid", borderColor: "divider" }}>
        <TextField
          size="small"
          value={additionalDescription}
          onChange={(e) => setAdditionalDescription(e.target.value)}
          placeholder="Notes…"
          sx={{ width: "100%" }}
        />
      </Box>

      {/* Qty */}
      <Box sx={{ px: 1, py: 0.5, borderRight: "1px solid", borderColor: "divider" }}>
        <TextField
          size="small"
          type="number"
          value={qty}
          onChange={(e) => { setQty(e.target.value); setQtyError(false); }}
          error={qtyError}
          helperText={qtyError ? "> 0" : undefined}
          inputProps={{ min: 0, step: "any", style: { textAlign: "right" } }}
          sx={{ width: "100%" }}
        />
      </Box>

      {/* BOM Qty preview */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", px: 1, py: 0.5, borderRight: "1px solid", borderColor: "divider" }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {bomQtyPreview > 0 ? Math.round(bomQtyPreview * 1000) / 1000 : ""}
        </Typography>
      </Box>

      {/* UOM autocomplete */}
      <Box sx={{ px: 1, py: 0.5, borderRight: "1px solid", borderColor: "divider" }}>
        <Autocomplete
          size="small"
          autoHighlight
          options={uomOptions}
          getOptionLabel={(opt) => opt.uom_name}
          value={selectedUom}
          onChange={(_, newValue) => { setSelectedUom(newValue); setUomError(false); }}
          isOptionEqualToValue={(opt, val) => opt.uom_id === val.uom_id}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="UOM…"
              size="small"
              error={uomError}
              helperText={uomError ? "Required" : undefined}
            />
          )}
        />
      </Box>

      {/* Actions */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.25, py: 0.5 }}>
        <Tooltip title="Save (Enter)">
          <span>
            <IconButton size="small" color="primary" onClick={handleSave} disabled={saving}>
              <Check size={14} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Cancel (Esc)">
          <IconButton size="small" onClick={onCancel} disabled={saving}>
            <X size={14} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
