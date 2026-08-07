/**
 * Service layer for the support-ticket feature. All API access goes through
 * `fetchWithCookie`; components never call the API directly.
 *
 * `variant` ("portal" | "admin") selects the reporter endpoints for the two
 * dashboards that host the widget.
 */

import { apiRoutesSupport } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";
import type {
  Assignee,
  ManageTicketRow,
  RaiseTicketPayload,
  TicketAction,
  TicketComment,
  TicketDetailResponse,
  TicketStat,
  TicketSummary,
} from "@/utils/supportTicketTypes";

export type WidgetVariant = "portal" | "admin";

type ServiceResult<T> = { data: T | null; error: string | null; status: number };

const reporterRoutes = (variant: WidgetVariant) =>
  variant === "portal"
    ? {
        raise: apiRoutesSupport.PORTAL_RAISE,
        myTickets: apiRoutesSupport.PORTAL_MY_TICKETS,
        ticket: apiRoutesSupport.PORTAL_TICKET,
        comment: apiRoutesSupport.PORTAL_COMMENT,
        attachment: apiRoutesSupport.PORTAL_ATTACHMENT,
      }
    : {
        raise: apiRoutesSupport.ADMIN_RAISE,
        myTickets: apiRoutesSupport.ADMIN_MY_TICKETS,
        ticket: apiRoutesSupport.ADMIN_TICKET,
        comment: apiRoutesSupport.ADMIN_COMMENT,
        attachment: apiRoutesSupport.ADMIN_ATTACHMENT,
      };

// ── Reporter side ────────────────────────────────────────────────────────────────
export async function raiseTicket(
  variant: WidgetVariant,
  payload: RaiseTicketPayload,
): Promise<ServiceResult<{ ticket_id: number; ticket_no: string; status_id: number }>> {
  const { data, error, status } = await fetchWithCookie(
    reporterRoutes(variant).raise,
    "POST",
    payload,
  );
  return { data: data?.data ?? null, error, status };
}

export async function getMyTickets(
  variant: WidgetVariant,
): Promise<ServiceResult<TicketSummary[]>> {
  const { data, error, status } = await fetchWithCookie(reporterRoutes(variant).myTickets, "GET");
  return { data: data?.data ?? null, error, status };
}

export async function getReporterTicket(
  variant: WidgetVariant,
  ticketId: number,
): Promise<ServiceResult<TicketDetailResponse>> {
  const { data, error, status } = await fetchWithCookie(
    `${reporterRoutes(variant).ticket}/${ticketId}`,
    "GET",
  );
  return { data: data ?? null, error, status };
}

export async function addReporterComment(
  variant: WidgetVariant,
  ticketId: number,
  commentText: string,
): Promise<ServiceResult<{ ticket_id: number }>> {
  const { data, error, status } = await fetchWithCookie(reporterRoutes(variant).comment, "POST", {
    ticket_id: ticketId,
    comment_text: commentText,
  });
  return { data: data?.data ?? null, error, status };
}

export async function uploadReporterAttachment(
  variant: WidgetVariant,
  ticketId: number,
  file: File,
): Promise<ServiceResult<{ attachment_id: number }>> {
  const form = new FormData();
  form.append("file", file);
  const { data, error, status } = await fetchWithCookie(
    `${reporterRoutes(variant).ticket}/${ticketId}/attachment`,
    "POST",
    form,
  );
  return { data: data?.data ?? null, error, status };
}

export async function getReporterAttachmentUrl(
  variant: WidgetVariant,
  attachmentId: number,
): Promise<ServiceResult<{ url: string }>> {
  const { data, error, status } = await fetchWithCookie(
    `${reporterRoutes(variant).attachment}/${attachmentId}`,
    "GET",
  );
  return { data: data?.data ?? null, error, status };
}

export async function deleteReporterAttachment(
  variant: WidgetVariant,
  attachmentId: number,
): Promise<ServiceResult<unknown>> {
  const { data, error, status } = await fetchWithCookie(
    `${reporterRoutes(variant).attachment}/${attachmentId}`,
    "DELETE",
  );
  return { data: data?.data ?? null, error, status };
}

// ── VOW management side (Control Desk) ───────────────────────────────────────────
export interface ManageListParams {
  page: number;
  limit: number;
  status_id?: number | null;
  priority?: number | null;
  org_id?: number | null;
  assignee?: number | null;
  only_open?: boolean;
  search?: string | null;
}

export async function listManageTickets(
  params: ManageListParams,
): Promise<ServiceResult<{ data: ManageTicketRow[]; total: number }>> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  qs.set("limit", String(params.limit));
  if (params.status_id != null) qs.set("status_id", String(params.status_id));
  if (params.priority != null) qs.set("priority", String(params.priority));
  if (params.org_id != null) qs.set("org_id", String(params.org_id));
  if (params.assignee != null) qs.set("assignee", String(params.assignee));
  if (params.only_open) qs.set("only_open", "1");
  if (params.search && params.search.trim()) qs.set("search", params.search.trim());

  const { data, error, status } = await fetchWithCookie(
    `${apiRoutesSupport.MANAGE_LIST}?${qs.toString()}`,
    "GET",
  );
  return { data: data ?? null, error, status };
}

export async function getManageStats(): Promise<ServiceResult<TicketStat[]>> {
  const { data, error, status } = await fetchWithCookie(apiRoutesSupport.MANAGE_STATS, "GET");
  return { data: data?.data ?? null, error, status };
}

export async function getAssignees(): Promise<ServiceResult<Assignee[]>> {
  const { data, error, status } = await fetchWithCookie(apiRoutesSupport.MANAGE_ASSIGNEES, "GET");
  return { data: data?.data ?? null, error, status };
}

export async function getManageTicket(
  ticketId: number,
): Promise<ServiceResult<TicketDetailResponse>> {
  const { data, error, status } = await fetchWithCookie(
    `${apiRoutesSupport.MANAGE_TICKET}/${ticketId}`,
    "GET",
  );
  return { data: data ?? null, error, status };
}

export async function assignTicket(
  ticketId: number,
  assigneeConUserId: number,
): Promise<ServiceResult<unknown>> {
  const { data, error, status } = await fetchWithCookie(apiRoutesSupport.MANAGE_ASSIGN, "POST", {
    ticket_id: ticketId,
    assignee_con_user_id: assigneeConUserId,
  });
  return { data: data?.data ?? null, error, status };
}

export async function transitionTicket(
  ticketId: number,
  action: TicketAction,
  opts?: { reason?: string; notes?: string },
): Promise<ServiceResult<unknown>> {
  const { data, error, status } = await fetchWithCookie(
    apiRoutesSupport.MANAGE_TRANSITION,
    "POST",
    {
      ticket_id: ticketId,
      action,
      reason: opts?.reason ?? null,
      notes: opts?.notes ?? null,
    },
  );
  return { data: data?.data ?? null, error, status };
}

export async function addManageComment(
  ticketId: number,
  commentText: string,
  isInternal: boolean,
): Promise<ServiceResult<{ ticket_id: number }>> {
  const { data, error, status } = await fetchWithCookie(apiRoutesSupport.MANAGE_COMMENT, "POST", {
    ticket_id: ticketId,
    comment_text: commentText,
    is_internal: isInternal,
  });
  return { data: data?.data ?? null, error, status };
}

export async function uploadManageAttachment(
  ticketId: number,
  file: File,
): Promise<ServiceResult<{ attachment_id: number }>> {
  const form = new FormData();
  form.append("file", file);
  const { data, error, status } = await fetchWithCookie(
    `${apiRoutesSupport.MANAGE_TICKET}/${ticketId}/attachment`,
    "POST",
    form,
  );
  return { data: data?.data ?? null, error, status };
}

export async function getManageAttachmentUrl(
  attachmentId: number,
): Promise<ServiceResult<{ url: string }>> {
  const { data, error, status } = await fetchWithCookie(
    `${apiRoutesSupport.MANAGE_ATTACHMENT}/${attachmentId}`,
    "GET",
  );
  return { data: data?.data ?? null, error, status };
}

export async function deleteManageAttachment(
  attachmentId: number,
): Promise<ServiceResult<unknown>> {
  const { data, error, status } = await fetchWithCookie(
    `${apiRoutesSupport.MANAGE_ATTACHMENT}/${attachmentId}`,
    "DELETE",
  );
  return { data: data?.data ?? null, error, status };
}

export type { TicketComment };
