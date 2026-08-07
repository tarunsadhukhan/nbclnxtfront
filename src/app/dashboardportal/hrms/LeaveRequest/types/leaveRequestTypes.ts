/**
 * Type definitions for HRMS Leave Request transaction module.
 * Backed by tables `leave_transactions` (header) and `leave_tran_details` (lines).
 */

export type LeaveRequestStatusId = 21 | 1 | 20 | 3 | 4 | 5 | 6;

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
  { id: 1, label: "Open" },
  { id: 20, label: "Pending Approval" },
  { id: 3, label: "Approved" },
  { id: 4, label: "Rejected" },
  { id: 6, label: "Cancelled" },
];

export interface LeaveRequestListRow {
  id: number;
  leave_transaction_id: number;
  eb_id: number;
  eb_no: string;
  worker_name: string;
  leave_type_id: number;
  leave_type: string;
  leave_from_date: string;
  leave_to_date: string;
  non_working_days: number | null;
  leave_purpose: string | null;
  status: number;
  status_label?: string;
}

export interface LeaveRequestLine {
  leave_tran_detail_id: number;
  leave_transaction_id: number;
  leave_date: string;
  leave_type_id: number;
  remarks: string | null;
}

export interface LeaveRequestHeader {
  leave_transaction_id: number;
  eb_id: number;
  branch_id: number;
  eb_no: string;
  worker_name: string;
  leave_type_id: number;
  leave_type: string;
  leave_from_date: string;
  leave_to_date: string;
  non_working_days: number | null;
  leave_purpose: string | null;
  status: number;
  updated_by: number | null;
}

export interface LeaveRequestDetail {
  header: LeaveRequestHeader;
  lines: LeaveRequestLine[];
  approve_button?: boolean;
  reject_button?: boolean;
}

export interface LeaveTypeOption {
  leave_type_id: number;
  leave_type_code: string;
  leave_type_description: string;
}

export interface LeaveLedgerEntry {
  leave_type_id: number;
  leave_type: string;
  max_leaves_per_month: number;
  leaves_per_year: number;
  leaves_taken_this_month?: number;
  leaves_taken_this_year?: number;
}

export interface WorkerLookupResult {
  eb_id: number;
  eb_no: string;
  worker_name: string;
  emp_status: number;
}
