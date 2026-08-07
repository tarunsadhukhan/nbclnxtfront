/**
 * Shared types, constants and Zod schema for the support-ticket feature.
 *
 * Status / priority ids MUST stay in sync with the backend
 * (`src/common/supportTicket/constants.py`).
 */

import { z } from "zod";

// ── Status lifecycle ────────────────────────────────────────────────────────────
export const TICKET_STATUS = {
  RAISED: 1,
  OPEN: 2,
  IN_PROGRESS: 3,
  ON_HOLD: 4,
  RESOLVED: 5,
  CLOSED: 6,
  REJECTED: 7,
} as const;

export type TicketStatusId = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_STATUS_LABELS: Record<number, string> = {
  [TICKET_STATUS.RAISED]: "Raised",
  [TICKET_STATUS.OPEN]: "Open",
  [TICKET_STATUS.IN_PROGRESS]: "In Progress",
  [TICKET_STATUS.ON_HOLD]: "On Hold",
  [TICKET_STATUS.RESOLVED]: "Resolved",
  [TICKET_STATUS.CLOSED]: "Closed",
  [TICKET_STATUS.REJECTED]: "Rejected",
};

/** MUI Chip color per status. */
export type ChipColor =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "info"
  | "warning";

export const TICKET_STATUS_COLOR: Record<number, ChipColor> = {
  [TICKET_STATUS.RAISED]: "warning",
  [TICKET_STATUS.OPEN]: "info",
  [TICKET_STATUS.IN_PROGRESS]: "primary",
  [TICKET_STATUS.ON_HOLD]: "secondary",
  [TICKET_STATUS.RESOLVED]: "success",
  [TICKET_STATUS.CLOSED]: "default",
  [TICKET_STATUS.REJECTED]: "error",
};

// ── Priority ────────────────────────────────────────────────────────────────────
export const TICKET_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
} as const;

export const TICKET_PRIORITY_LABELS: Record<number, string> = {
  [TICKET_PRIORITY.LOW]: "Low",
  [TICKET_PRIORITY.MEDIUM]: "Medium",
  [TICKET_PRIORITY.HIGH]: "High",
  [TICKET_PRIORITY.URGENT]: "Urgent",
};

export const TICKET_PRIORITY_COLOR: Record<number, ChipColor> = {
  [TICKET_PRIORITY.LOW]: "default",
  [TICKET_PRIORITY.MEDIUM]: "info",
  [TICKET_PRIORITY.HIGH]: "warning",
  [TICKET_PRIORITY.URGENT]: "error",
};

// ── Categories ──────────────────────────────────────────────────────────────────
export const TICKET_CATEGORIES: { value: string; label: string }[] = [
  { value: "bug", label: "Bug / Something broken" },
  { value: "data_issue", label: "Data issue" },
  { value: "question", label: "Question / How do I…" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
];

// ── Management actions ──────────────────────────────────────────────────────────
export type TicketAction =
  | "open"
  | "start"
  | "hold"
  | "resume"
  | "resolve"
  | "close"
  | "reject"
  | "reopen";

// ── Wire types ──────────────────────────────────────────────────────────────────
export interface TicketSummary {
  ticket_id: number;
  ticket_no: string | null;
  subject: string;
  category: string | null;
  priority: number;
  status_id: number;
  assigned_to_name: string | null;
  close_reason: string | null;
  created_date_time: string | null;
  updated_date_time: string | null;
}

export interface ManageTicketRow extends TicketSummary {
  source: string;
  con_org_id: number | null;
  con_org_shortname: string | null;
  con_org_name: string | null;
  co_id: number | null;
  branch_id: number | null;
  reporter_name: string | null;
  reporter_email: string | null;
  page_path: string | null;
  page_title: string | null;
  assigned_to_con_user_id: number | null;
}

export interface TicketDetail extends ManageTicketRow {
  subdomain: string | null;
  user_agent: string | null;
  app_version: string | null;
  description: string;
  resolution_notes: string | null;
  resolved_date_time: string | null;
  closed_date_time: string | null;
}

export interface TicketComment {
  comment_id: number;
  ticket_id: number;
  author_type: "vow" | "reporter" | "system";
  author_user_id: number | null;
  author_name: string | null;
  comment_text: string;
  is_internal: number;
  created_date_time: string | null;
}

export interface TicketAttachment {
  attachment_id: number;
  ticket_id: number;
  kind: "image" | "document";
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by_type: "reporter" | "vow";
  uploaded_by_name: string | null;
  uploaded_at: string | null;
  /** Short-lived presigned URL, present on detail responses. */
  url?: string | null;
}

export interface TicketDetailResponse {
  data: TicketDetail;
  comments: TicketComment[];
  attachments: TicketAttachment[];
}

/** Accept filter for the file picker — images (screenshots) + documents. */
export const ATTACHMENT_ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp," +
  "application/pdf,application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/vnd.ms-powerpoint," +
  "application/vnd.openxmlformats-officedocument.presentationml.presentation," +
  "text/csv,text/plain";

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface Assignee {
  con_user_id: number;
  con_user_name: string;
  con_user_login_email_id: string;
}

export interface TicketStat {
  status_id: number;
  label: string;
  count: number;
}

// ── Raise form (Zod is the single source of truth) ──────────────────────────────
export const raiseTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Please enter a short summary (min 3 characters)")
    .max(200, "Keep the summary under 200 characters"),
  category: z.string().min(1, "Please choose a category"),
  priority: z.number().int().min(1).max(4),
  description: z
    .string()
    .trim()
    .min(10, "Please describe the issue (min 10 characters)"),
});

export type RaiseTicketForm = z.infer<typeof raiseTicketSchema>;

/** Context auto-captured by the widget and merged into the raise payload. */
export interface RaiseTicketContext {
  page_path?: string | null;
  page_title?: string | null;
  user_agent?: string | null;
  app_version?: string | null;
  co_id?: number | null;
  branch_id?: number | null;
}

export type RaiseTicketPayload = RaiseTicketForm & RaiseTicketContext;
