"use client";

/**
 * TicketManageDrawer — VOW-side detail & triage panel for a single support
 * ticket. Lets the team assign an owner, move the ticket through its lifecycle
 * (open → in progress → resolved/closed, reject, reopen, hold/resume) and hold a
 * conversation with the reporter (plus internal-only notes).
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";

import { AttachmentList, AttachmentUploadButton } from "@/components/support/AttachmentList";
import {
  addManageComment,
  assignTicket,
  deleteManageAttachment,
  getAssignees,
  getManageAttachmentUrl,
  getManageTicket,
  transitionTicket,
  uploadManageAttachment,
} from "@/utils/supportTicketService";
import {
  TICKET_PRIORITY_COLOR,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_COLOR,
  TICKET_STATUS_LABELS,
  type Assignee,
  type TicketAction,
  type TicketAttachment,
  type TicketComment,
  type TicketDetail,
} from "@/utils/supportTicketTypes";

interface TicketManageDrawerProps {
  ticketId: number | null;
  open: boolean;
  onClose: () => void;
  /** Called after any mutation so the list can refresh. */
  onChanged: () => void;
}

const CLOSE_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "workflow_not_followed", label: "Workflow not followed" },
  { value: "duplicate", label: "Duplicate" },
  { value: "cannot_reproduce", label: "Cannot reproduce" },
  { value: "invalid", label: "Invalid" },
  { value: "wont_fix", label: "Won't fix" },
  { value: "other", label: "Other" },
];

interface ActionDef {
  action: TicketAction;
  label: string;
}

const ACTIONS_BY_STATUS: Record<number, ActionDef[]> = {
  1: [
    { action: "open", label: "Open" },
    { action: "reject", label: "Reject" },
  ],
  2: [
    { action: "start", label: "Start work" },
    { action: "hold", label: "Put on hold" },
    { action: "resolve", label: "Resolve" },
    { action: "close", label: "Close" },
    { action: "reject", label: "Reject" },
  ],
  3: [
    { action: "hold", label: "Put on hold" },
    { action: "resolve", label: "Resolve" },
    { action: "close", label: "Close" },
  ],
  4: [
    { action: "resume", label: "Resume" },
    { action: "reject", label: "Reject" },
  ],
  5: [
    { action: "close", label: "Close" },
    { action: "reopen", label: "Reopen" },
  ],
  6: [{ action: "reopen", label: "Reopen" }],
  7: [{ action: "reopen", label: "Reopen" }],
};

const REASON_REQUIRED: TicketAction[] = ["close", "reject"];

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} sx={{ py: 0.25 }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 110 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ wordBreak: "break-word" }}>
        {value || "—"}
      </Typography>
    </Stack>
  );
}

export default function TicketManageDrawer({
  ticketId,
  open,
  onClose,
  onChanged,
}: TicketManageDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [commentText, setCommentText] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    if (ticketId == null) return;
    setLoading(true);
    const { data, error } = await getManageTicket(ticketId);
    setLoading(false);
    if (error || !data) {
      setSnack({ msg: error ?? "Could not load ticket", severity: "error" });
      return;
    }
    setTicket(data.data);
    setComments(data.comments ?? []);
    setAttachments(data.attachments ?? []);
    setAssigneeId(data.data.assigned_to_con_user_id ?? "");
  }, [ticketId]);

  const openAttachment = useCallback(async (attachment: TicketAttachment) => {
    if (attachment.url) {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
      return;
    }
    const { data, error } = await getManageAttachmentUrl(attachment.attachment_id);
    if (error || !data?.url) {
      setSnack({ msg: error ?? "Could not open attachment", severity: "error" });
      return;
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
  }, []);

  const uploadAttachments = useCallback(
    async (files: File[]) => {
      if (ticketId == null) return;
      setBusy(true);
      let failed = 0;
      for (const file of files) {
        const res = await uploadManageAttachment(ticketId, file);
        if (res.error) failed += 1;
      }
      setBusy(false);
      if (failed > 0) setSnack({ msg: `${failed} attachment(s) failed to upload`, severity: "error" });
      await load();
      onChanged();
    },
    [ticketId, load, onChanged],
  );

  const removeAttachment = useCallback(
    async (attachment: TicketAttachment) => {
      const { error } = await deleteManageAttachment(attachment.attachment_id);
      if (error) {
        setSnack({ msg: error, severity: "error" });
        return;
      }
      await load();
      onChanged();
    },
    [load, onChanged],
  );

  useEffect(() => {
    if (open && ticketId != null) {
      void load();
    }
    if (!open) {
      setTicket(null);
      setComments([]);
      setAttachments([]);
      setReason("");
      setNotes("");
      setCommentText("");
      setInternalNote(false);
    }
  }, [open, ticketId, load]);

  useEffect(() => {
    if (open && assignees.length === 0) {
      void (async () => {
        const { data } = await getAssignees();
        setAssignees(data ?? []);
      })();
    }
  }, [open, assignees.length]);

  const doAssign = useCallback(async () => {
    if (ticketId == null || assigneeId === "") return;
    setBusy(true);
    const { error } = await assignTicket(ticketId, Number(assigneeId));
    setBusy(false);
    if (error) {
      setSnack({ msg: error, severity: "error" });
      return;
    }
    setSnack({ msg: "Ticket assigned", severity: "success" });
    await load();
    onChanged();
  }, [ticketId, assigneeId, load, onChanged]);

  const doAction = useCallback(
    async (action: TicketAction) => {
      if (ticketId == null) return;
      if (REASON_REQUIRED.includes(action) && !reason) {
        setSnack({ msg: "Please pick a reason for this action", severity: "error" });
        return;
      }
      setBusy(true);
      const { error } = await transitionTicket(ticketId, action, {
        reason: reason || undefined,
        notes: notes || undefined,
      });
      setBusy(false);
      if (error) {
        setSnack({ msg: error, severity: "error" });
        return;
      }
      setReason("");
      setNotes("");
      setSnack({ msg: "Ticket updated", severity: "success" });
      await load();
      onChanged();
    },
    [ticketId, reason, notes, load, onChanged],
  );

  const doComment = useCallback(async () => {
    if (ticketId == null || !commentText.trim()) return;
    setBusy(true);
    const { error } = await addManageComment(ticketId, commentText.trim(), internalNote);
    setBusy(false);
    if (error) {
      setSnack({ msg: error, severity: "error" });
      return;
    }
    setCommentText("");
    setInternalNote(false);
    await load();
    onChanged();
  }, [ticketId, commentText, internalNote, load, onChanged]);

  const actions = ticket ? ACTIONS_BY_STATUS[ticket.status_id] ?? [] : [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 520 } } }}>
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {ticket?.ticket_no ?? "Ticket"}
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <X size={18} />
          </IconButton>
        </Stack>

        {loading || !ticket ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={26} />
          </Box>
        ) : (
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Chip
                size="small"
                label={TICKET_STATUS_LABELS[ticket.status_id] ?? ticket.status_id}
                color={TICKET_STATUS_COLOR[ticket.status_id] ?? "default"}
              />
              <Chip
                size="small"
                variant="outlined"
                label={TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                color={TICKET_PRIORITY_COLOR[ticket.priority] ?? "default"}
              />
              {ticket.category ? <Chip size="small" variant="outlined" label={ticket.category} /> : null}
            </Stack>

            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {ticket.subject}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, mb: 2, whiteSpace: "pre-wrap" }}>
              {ticket.description}
            </Typography>

            <Divider sx={{ mb: 1 }} />
            <InfoRow label="Reporter" value={`${ticket.reporter_name ?? "—"} (${ticket.reporter_email ?? "—"})`} />
            <InfoRow label="Source" value={ticket.source} />
            <InfoRow
              label="Organisation"
              value={ticket.con_org_name ? `${ticket.con_org_name} (${ticket.con_org_shortname ?? ""})` : ticket.subdomain}
            />
            <InfoRow label="Company / Branch" value={`${ticket.co_id ?? "—"} / ${ticket.branch_id ?? "—"}`} />
            <InfoRow label="Page" value={ticket.page_title ? `${ticket.page_title} — ${ticket.page_path}` : ticket.page_path} />
            <InfoRow label="Browser" value={ticket.user_agent} />
            <InfoRow label="Raised" value={formatDateTime(ticket.created_date_time)} />
            {ticket.close_reason ? <InfoRow label="Close reason" value={ticket.close_reason} /> : null}
            {ticket.resolution_notes ? <InfoRow label="Resolution" value={ticket.resolution_notes} /> : null}

            <Divider sx={{ my: 2 }} />

            {/* Attachments */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Attachments</Typography>
              <AttachmentUploadButton
                onFiles={uploadAttachments}
                disabled={busy}
                label="Add"
                onReject={(m) => setSnack({ msg: m, severity: "error" })}
              />
            </Stack>
            <AttachmentList
              attachments={attachments}
              onOpen={openAttachment}
              onDelete={removeAttachment}
            />

            <Divider sx={{ my: 2 }} />

            {/* Assignment */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Assignment
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                select
                size="small"
                label="Assign to"
                fullWidth
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {assignees.map((a) => (
                  <MenuItem key={a.con_user_id} value={a.con_user_id}>
                    {a.con_user_name}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" onClick={() => void doAssign()} disabled={busy || assigneeId === ""}>
                Assign
              </Button>
            </Stack>

            {/* Lifecycle actions */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Actions
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <TextField
                select
                size="small"
                label="Reason (for close / reject)"
                fullWidth
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {CLOSE_REASON_OPTIONS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              size="small"
              label="Resolution / notes (optional)"
              fullWidth
              multiline
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mb: 1.5 }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {actions.map((a) => (
                <Button
                  key={a.action}
                  size="small"
                  variant={a.action === "reject" ? "outlined" : "contained"}
                  color={a.action === "reject" ? "error" : "primary"}
                  disabled={busy}
                  onClick={() => void doAction(a.action)}
                >
                  {a.label}
                </Button>
              ))}
            </Stack>

            <Divider sx={{ mb: 1.5 }} />

            {/* Conversation */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Conversation
            </Typography>
            <Stack spacing={1.25} sx={{ mb: 2 }}>
              {comments.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No activity yet.
                </Typography>
              )}
              {comments.map((c) => (
                <Box
                  key={c.comment_id}
                  sx={{
                    borderLeft: "3px solid",
                    borderColor:
                      c.author_type === "system"
                        ? "divider"
                        : c.author_type === "vow"
                          ? "primary.main"
                          : "secondary.main",
                    pl: 1.25,
                    backgroundColor: c.is_internal ? "action.hover" : "transparent",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {c.author_type === "system" ? "System" : c.author_name ?? c.author_type}
                    {c.is_internal ? " · internal" : ""}
                    {" · "}
                    {formatDateTime(c.created_date_time)}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {c.comment_text}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <TextField
              size="small"
              label="Add a comment"
              fullWidth
              multiline
              minRows={2}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <FormControlLabel
                control={<Checkbox checked={internalNote} onChange={(e) => setInternalNote(e.target.checked)} size="small" />}
                label={<Typography variant="caption">Internal note (hidden from reporter)</Typography>}
              />
              <Button variant="contained" size="small" onClick={() => void doComment()} disabled={busy || !commentText.trim()}>
                Comment
              </Button>
            </Stack>
          </>
        )}
      </Box>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {snack ? (
          <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(null)}>
            {snack.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Drawer>
  );
}
