/** Modes for the batch assign detail page. */
export type BatchAssignMode = "create" | "edit" | "view";

/** Option type for Autocomplete dropdowns. */
export type Option = {
  label: string;
  value: string;
};

/** Yarn record from jute_yarn_mst API. */
export type YarnTypeRecord = {
  jute_yarn_id: number;
  jute_yarn_name: string;
};

/** Batch plan record from API. */
export type BatchPlanRecord = {
  batch_plan_id: number;
  plan_name: string;
};

/** Assignment row from detail API response. */
export type BatchDailyAssignRow = {
  batch_daily_assign_id: number;
  branch_id: number;
  assign_date: string;
  jute_yarn_id: number;
  yarn_type_name: string;
  batch_plan_id: number;
  plan_name: string;
  status_id: number;
  updated_by: number | null;
  updated_date_time: string | null;
};

/** Editable line item in the form (client-side state). */
export type EditableAssignLine = {
  id: string;
  batch_daily_assign_id?: number;
  yarn_type_id: string;
  batch_plan_id: string;
  status_id?: number;
  yarn_type_name?: string;
  plan_name?: string;
};

/** Summary for a date+branch group. */
export type BatchAssignSummary = {
  total_assignments: number;
  status: string;
  status_id: number;
};

/** Summary row for the list page. */
export type BatchAssignSummaryRow = {
  id: string;
  assign_date: string;
  assign_date_raw: string;
  branch_id: number;
  branch_name: string;
  total_assignments: number;
  status: string;
};

/** Setup data from create_setup endpoint. */
export type BatchAssignSetupData = {
  yarn_types: YarnTypeRecord[];
  batch_plans: BatchPlanRecord[];
};
