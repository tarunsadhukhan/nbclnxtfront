"use client";

import { useEffect, useState } from "react";
import { Autocomplete, Box, Dialog, MenuItem, TextField } from "@mui/material";
import { Search, Eraser, X } from "lucide-react";
import { ClassicButton, classic } from "@/components/ui/classic/ClassicWindow";
import { EMPTY_EMPLOYEE_FILTERS, type EmployeeFilters, type Option } from "../types/employeeTypes";

interface EmployeeFilterDialogProps {
  open: boolean;
  /** Currently applied filters — seeds the form each time the dialog opens. */
  value: EmployeeFilters;
  subDeptOptions: readonly Option[];
  categoryOptions: readonly Option[];
  onApply: (filters: EmployeeFilters) => void;
  onClose: () => void;
}

/** Option pickers key on the id — sub-dept/category labels repeat across parents. */
const renderOption = (
  { key: _key, ...props }: React.HTMLAttributes<HTMLLIElement> & { key?: React.Key },
  o: Option,
) => <li key={o.value} {...props}>{o.label}</li>;

/**
 * Classic-styled "Filter Employees" popup — the advanced filter form behind the
 * toolbar's Filter button. Edits a local draft; nothing is applied until Search.
 */
export default function EmployeeFilterDialog({
  open, value, subDeptOptions, categoryOptions, onApply, onClose,
}: EmployeeFilterDialogProps) {
  const [draft, setDraft] = useState<EmployeeFilters>(value);

  useEffect(() => { if (open) setDraft(value); }, [open, value]);

  const set = <K extends keyof EmployeeFilters>(key: K, v: EmployeeFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: v }));

  const text = (key: keyof EmployeeFilters, label: string) => (
    <Field label={label}>
      <TextField
        size="small" fullWidth
        value={draft[key]}
        onChange={(e) => set(key, e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onApply(draft); }}
      />
    </Field>
  );

  const picker = (key: "cata_id" | "sub_dept_id", label: string, options: readonly Option[]) => (
    <Field label={label}>
      <Autocomplete
        size="small" fullWidth
        options={options}
        getOptionLabel={(o) => o.label}
        value={options.find((o) => o.value === draft[key]) ?? null}
        onChange={(_, o) => set(key, o?.value ?? "")}
        renderOption={renderOption}
        renderInput={(params) => <TextField {...params} placeholder="--All--" />}
      />
    </Field>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: 560, borderRadius: 0, background: classic.face, color: classic.text,
            border: `1px solid ${classic.border}`,
            fontFamily: "'Segoe UI', Tahoma, sans-serif",
            "& .MuiOutlinedInput-root": { borderRadius: 0, fontSize: 12.5, backgroundColor: classic.surface },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: classic.border },
          },
        },
      }}
    >
      {/* Classic title bar */}
      <Box
        sx={{
          display: "flex", alignItems: "center", gap: "6px", px: "6px", height: 26,
          background: `linear-gradient(${classic.titleFrom}, ${classic.titleTo})`,
          borderBottom: `1px solid ${classic.titleBorder}`, fontSize: 12, fontWeight: 600,
        }}
      >
        <span>Filter Employees</span>
        <Box
          component="button" type="button" onClick={onClose} title="Close"
          sx={{
            ml: "auto", width: 20, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${classic.titleBorder}`, background: classic.danger, color: "#fff", cursor: "pointer",
          }}
        >
          <X size={10} />
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px", p: "12px", fontSize: 12 }}>
        {text("emp_code", "Emp. Code")}
        {text("full_name", "Employee Name")}
        {picker("cata_id", "Category", categoryOptions)}
        {picker("sub_dept_id", "Department", subDeptOptions)}
        {text("designation", "Designation")}
        {text("esi_no", "ESI No.")}
        {text("uan_no", "UAN No.")}
        <Field label="Active">
          <TextField
            select size="small" fullWidth
            value={draft.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <MenuItem value="all">--All--</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Field>
      </Box>

      <Box
        sx={{
          display: "flex", justifyContent: "flex-end", gap: "6px", px: "12px", py: "8px",
          background: classic.face, borderTop: `1px solid ${classic.border}`,
        }}
      >
        <ClassicButton onClick={() => onApply(draft)}><Search size={13} /> Search</ClassicButton>
        <ClassicButton onClick={() => setDraft(EMPTY_EMPLOYEE_FILTERS)}><Eraser size={13} /> Clear</ClassicButton>
        <ClassicButton onClick={onClose}><X size={13} /> Close</ClassicButton>
      </Box>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Box component="label" sx={{ display: "block", mb: "3px", color: classic.textMuted }}>{label}</Box>
      {children}
    </Box>
  );
}
