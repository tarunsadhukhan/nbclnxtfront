/**
 * Type definitions for HRMS Daily Attendance transaction module.
 * Backed by tables `daily_attendance` (header) and `daily_ebmc_attendance` (machines).
 */

export type AttendanceStatusId = 21 | 1 | 20 | 3 | 4 | 5 | 6;

export const STATUS_LABELS: Record<number, string> = {
  21: "Draft",
  1: "Open",
  20: "Pending Approval",
  3: "Approved",
  4: "Rejected",
  5: "Closed",
  6: "Cancelled",
};

export const STATUS_COLOR: Record<
  number,
  "default" | "primary" | "warning" | "success" | "error" | "info"
> = {
  21: "default",
  1: "primary",
  20: "warning",
  3: "success",
  4: "error",
  5: "default",
  6: "default",
};

export const STATUS_FILTER_OPTIONS: Array<{ id: number; label: string }> = [
  { id: 20, label: "Pending Approval" },
  { id: 3, label: "Approved" },
  { id: 4, label: "Rejected" },
];

// Attendance mark / source / type controlled vocabularies (match backend values).
export const ATTENDANCE_MARK_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "P", label: "Present" },
  { value: "L", label: "Late" },
];

export const ATTENDANCE_SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "M", label: "Manual" },
  { value: "F", label: "Face" },
];

export const ATTENDANCE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "R", label: "Regular" },
  { value: "O", label: "Over Time" },
  { value: "C", label: "Cash" },
];

export interface AttendanceListRow {
  id: number;
  daily_atten_id: number;
  eb_id: number;
  eb_no: string;
  worker_name: string;
  attendance_date: string;
  attendance_mark: string | null;
  attendance_source: string | null;
  attendance_type: string | null;
  spell: string | null;
  worked_department: string | null;
  worked_department_id: number | null;
  worked_designation: string | null;
  worked_designation_id: number | null;
  spell_hours: number | null;
  working_hours: number | null;
  idle_hours: number | null;
  entry_time: string | null;
  exit_time: string | null;
  status_id: number;
}

export interface AttendanceHeader {
  daily_atten_id: number;
  eb_id: number;
  branch_id: number;
  eb_no: string;
  worker_name: string;
  attendance_date: string;
  attendance_mark: string | null;
  attendance_source: string | null;
  attendance_type: string | null;
  spell: string | null;
  spell_id: number | null;
  spell_hours: number | null;
  worked_department_id: number | null;
  worked_department: string | null;
  worked_designation_id: number | null;
  worked_designation: string | null;
  working_hours: number | null;
  idle_hours: number | null;
  remarks: string | null;
  entry_time: string | null;
  exit_time: string | null;
  geo_location: string | null;
  status_id: number;
}

export interface AttendanceMachine {
  mc_id: number;
  machine_name: string;
}

export interface AttendanceDetail {
  header: AttendanceHeader;
  machines: AttendanceMachine[];
  approve_button?: boolean;
  reject_button?: boolean;
}

export interface SpellOption {
  spell_id: number;
  spell_name: string;
  starting_time: string | null;
  end_time: string | null;
  working_hours: number;
}

export interface SubDepartmentOption {
  sub_dept_id: number;
  sub_dept_desc: string;
}

export interface DesignationOption {
  designation_id: number;
  desig: string;
}

export interface MachineOption {
  mc_id: number;
  machine_name: string;
}

export interface WorkerLookupResult {
  eb_id: number;
  eb_no: string;
  worker_name: string;
  emp_status: number;
}
