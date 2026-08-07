/** Dropdown option shape used across the Pay Register Display Setup page. */
export type Option = { label: string; value: string };

/** A row in the list grid (joined to scheme/component/branch names). */
export type PayslipPrintComponentRow = {
  id: number; // = pay_id, for DataGrid
  pay_id: number;
  payscheme_id: number;
  branch_id: number;
  component_id: number | null;
  desc_print: string | null;
  payslip_order: number | null;
  fixed_var_cols: string;
  total_print: number;
  payslip_print: number;
  is_active: number;
  payscheme_name: string | null;
  payscheme_code: string | null;
  component_name: string | null;
  component_code: string | null;
  branch_name: string | null;
  [key: string]: unknown;
};

export type PayRegisterDispSetDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  editId?: number;
};

/** fixed_var_cols dropdown — codes stored in the char(2) column. */
export const FIXED_VAR_OPTIONS: Option[] = [
  { label: "Fixed", value: "F" },
  { label: "Variable", value: "V" },
];

/**
 * Employee-info "meta" fields that are NOT real pay_components but can be placed
 * on the register/payslip for ANY pay scheme. They are stored in
 * `tbl_payslip_print_component.component_id` via reserved negative sentinel IDs.
 * Keep these IDs in sync with the backend export/payslip renderer.
 *
 * Emp Code (-1) and Name (-2) are intentionally NOT offered here: the register
 * always renders them as the leading anchor columns, so configuring them as
 * separate display columns would be redundant.
 */
export const META_COMPONENT_OPTIONS: Option[] = [
  { label: "Department", value: "-3" },
  { label: "PF No", value: "-4" },
  { label: "UAN No", value: "-5" },
  { label: "ESI No", value: "-6" },
];

/** component_id (as string) → meta label, for displaying configured meta rows. */
export const META_COMPONENT_LABELS: Record<string, string> = META_COMPONENT_OPTIONS.reduce(
  (acc, o) => {
    acc[o.value] = o.label;
    return acc;
  },
  {} as Record<string, string>,
);
