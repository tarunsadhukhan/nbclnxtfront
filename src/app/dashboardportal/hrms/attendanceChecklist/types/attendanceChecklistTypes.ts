/**
 * Types for the Attendance Checklist module (flat attendance register).
 * Single type file per module — do not split (avoids circular deps).
 */

/** One row as returned by GET /attendance-report (Flask mobileapp endpoint). */
export interface AttendanceReportRow {
  id: number;
  emp_code: string;
  eb_id: number;
  emp_name: string;
  department_name: string;
  designation_name: string;
  shift_name: string;
  /** YYYY-MM-DD */
  attendance_date: string;
  attendance_time: string;
  exit_time: string;
  /** attendance_source: "Face" | "Manual" */
  status: string;
  /** "R" (Regular) | "O" (OT) | "C" (Cash) */
  att_type: string;
  shift_hours: number;
  working_hours: number;
  idle_hours: number;
  has_photo: boolean;
  machine_nos: string;
  remarks: string;
}

/** Body of GET /attendance-report. */
export interface AttendanceReportResponse {
  status: string;
  data: AttendanceReportRow[];
  total: number;
}

/** Row shape consumed by the DataGrid and the Excel/print outputs. Field order
 * mirrors the legacy report 657 column list. */
export interface ChecklistGridRow {
  id: number;
  /** 1-based serial number — a real field so it exports with the sheet. */
  sno: number;
  date: string;
  spell: string;
  ebNo: string;
  name: string;
  department: string;
  designation: string;
  /** Readable label: Regular / OT / Cash */
  attType: string;
  /** attendance_source as stored: F / M / P */
  source: string;
  workingHours: number;
  machineNos: string;
  remarks: string;
}

/** Values held by the filter form (all strings — MuiForm field values). */
export interface ChecklistFilterValues {
  from_date: string;
  to_date: string;
  branch_id: string;
  dept_id: string;
  designation_id: string;
  shift_name: string;
  att_type: string;
  emp_code: string;
  emp_name: string;
}

export interface Option {
  label: string;
  value: string;
}

/** Spell entry from /hrms/attendance_create_setup. */
export interface SpellSetupEntry {
  spell_id: number;
  spell_name: string;
}

/** Sub-department entry from /hrms/attendance_create_setup. */
export interface SubDeptSetupEntry {
  sub_dept_id: number;
  sub_dept_desc: string;
}

/** Body of GET /hrms/attendance_create_setup. */
export interface AttendanceSetupResponse {
  data?: {
    spells?: SpellSetupEntry[];
    sub_departments?: SubDeptSetupEntry[];
  };
}
