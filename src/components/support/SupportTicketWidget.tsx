"use client";

/**
 * SupportTicketWidget — a floating "raise a ticket" button (Zendesk-style) shown
 * on every page of the Portal and Tenant Admin dashboards.
 *
 * It lets a user file a support ticket (auto-capturing the current page, browser
 * and — on the portal — the selected company/branch) and track the status of
 * their own tickets in a "My tickets" tab.
 *
 * @example
 *   <SupportTicketWidget variant="portal" />   // dashboardportal
 *   <SupportTicketWidget variant="admin" />    // dashboardadmin
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ArrowLeft, LifeBuoy, Send, X } from "lucide-react";

import { useSidebarContextSafe } from "@/components/dashboard/sidebarContext";
import { AttachmentList, AttachmentUploadButton } from "@/components/support/AttachmentList";
import {
  addReporterComment,
  deleteReporterAttachment,
  getMyTickets,
  getReporterAttachmentUrl,
  getReporterTicket,
  raiseTicket,
  uploadReporterAttachment,
  type WidgetVariant,
} from "@/utils/supportTicketService";
import {
  raiseTicketSchema,
  TICKET_CATEGORIES,
  TICKET_PRIORITY,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_COLOR,
  TICKET_STATUS_LABELS,
  type RaiseTicketForm,
  type TicketAttachment,
  type TicketComment,
  type TicketDetail,
  type TicketSummary,
} from "@/utils/supportTicketTypes";

interface SupportTicketWidgetProps {
  variant: WidgetVariant;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusChip({ statusId }: { statusId: number }) {
  return (
    <Chip
      size="small"
      label={TICKET_STATUS_LABELS[statusId] ?? `#${statusId}`}
      color={TICKET_STATUS_COLOR[statusId] ?? "default"}
      variant="filled"
    />
  );
}

export default function SupportTicketWidget({ variant }: SupportTicketWidgetProps) {
  const pathname = usePathname();
  const sidebar = useSidebarContextSafe();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // "My tickets" state
  const [myTickets, setMyTickets] = useState<TicketSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [uploadingDetail, setUploadingDetail] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RaiseTicketForm>({
    resolver: zodResolver(raiseTicketSchema),
    defaultValues: {
      subject: "",
      category: "",
      priority: TICKET_PRIORITY.MEDIUM,
      description: "",
    },
  });

  const captureContext = useCallback(() => {
    const co_id =
      variant === "portal" && sidebar?.selectedCompany ? sidebar.selectedCompany.co_id : null;
    const branch_id =
      variant === "portal" && sidebar?.selectedBranches?.length
        ? sidebar.selectedBranches[0]
        : null;
    return {
      page_path: pathname ?? null,
      page_title: typeof document !== "undefined" ? document.title : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : null,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      co_id,
      branch_id,
    };
  }, [pathname, sidebar, variant]);

  const loadMyTickets = useCallback(async () => {
    setLoadingList(true);
    const { data, error } = await getMyTickets(variant);
    if (error) setSnack({ msg: error, severity: "error" });
    setMyTickets(data ?? []);
    setLoadingList(false);
  }, [variant]);

  useEffect(() => {
    if (open && tab === 1 && !selected) {
      void loadMyTickets();
    }
  }, [open, tab, selected, loadMyTickets]);

  const onSubmit = handleSubmit(async (form) => {
    setSubmitting(true);
    const { data, error } = await raiseTicket(variant, { ...form, ...captureContext() });
    if (error || !data) {
      setSubmitting(false);
      setSnack({ msg: error ?? "Could not submit your ticket", severity: "error" });
      return;
    }
    // Upload any attachments the user picked, against the new ticket.
    let failed = 0;
    for (const file of pendingFiles) {
      const res = await uploadReporterAttachment(variant, data.ticket_id, file);
      if (res.error) failed += 1;
    }
    setSubmitting(false);
    setSnack({
      msg:
        failed > 0
          ? `Ticket ${data.ticket_no} submitted, but ${failed} attachment(s) failed to upload`
          : `Ticket ${data.ticket_no} submitted — thank you!`,
      severity: failed > 0 ? "error" : "success",
    });
    reset();
    setPendingFiles([]);
    setTab(1);
    void loadMyTickets();
  });

  const openTicket = useCallback(
    async (ticketId: number) => {
      setLoadingDetail(true);
      const { data, error } = await getReporterTicket(variant, ticketId);
      setLoadingDetail(false);
      if (error || !data) {
        setSnack({ msg: error ?? "Could not load ticket", severity: "error" });
        return;
      }
      setSelected(data.data);
      setComments(data.comments ?? []);
      setAttachments(data.attachments ?? []);
    },
    [variant],
  );

  const openAttachment = useCallback(
    async (attachment: TicketAttachment) => {
      if (attachment.url) {
        window.open(attachment.url, "_blank", "noopener,noreferrer");
        return;
      }
      const { data, error } = await getReporterAttachmentUrl(variant, attachment.attachment_id);
      if (error || !data?.url) {
        setSnack({ msg: error ?? "Could not open attachment", severity: "error" });
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    },
    [variant],
  );

  const uploadToSelected = useCallback(
    async (files: File[]) => {
      if (!selected) return;
      setUploadingDetail(true);
      let failed = 0;
      for (const file of files) {
        const res = await uploadReporterAttachment(variant, selected.ticket_id, file);
        if (res.error) failed += 1;
      }
      setUploadingDetail(false);
      if (failed > 0) setSnack({ msg: `${failed} attachment(s) failed to upload`, severity: "error" });
      await openTicket(selected.ticket_id);
    },
    [selected, variant, openTicket],
  );

  const removeAttachment = useCallback(
    async (attachment: TicketAttachment) => {
      const { error } = await deleteReporterAttachment(variant, attachment.attachment_id);
      if (error) {
        setSnack({ msg: error, severity: "error" });
        return;
      }
      if (selected) await openTicket(selected.ticket_id);
    },
    [variant, selected, openTicket],
  );

  const sendReply = useCallback(async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    const { error } = await addReporterComment(variant, selected.ticket_id, replyText.trim());
    setReplying(false);
    if (error) {
      setSnack({ msg: error, severity: "error" });
      return;
    }
    setReplyText("");
    await openTicket(selected.ticket_id);
  }, [selected, replyText, variant, openTicket]);

  const handleClose = () => {
    setOpen(false);
    setSelected(null);
    setComments([]);
    setAttachments([]);
  };

  const categoryOptions = useMemo(() => TICKET_CATEGORIES, []);

  return (
    <>
      <Tooltip title="Need help? Raise a ticket" placement="left">
        <Fab
          color="primary"
          aria-label="Raise a support ticket"
          onClick={() => setOpen(true)}
          sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1200 }}
        >
          <LifeBuoy size={24} />
        </Fab>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 0 }}>
          <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
            Support
          </Typography>
          <IconButton onClick={handleClose} size="small" aria-label="Close">
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <Tabs
          value={tab}
          onChange={(_, v: number) => {
            setTab(v);
            setSelected(null);
            setComments([]);
            setAttachments([]);
          }}
          sx={{ px: 3 }}
        >
          <Tab label="Report an issue" />
          <Tab label="My tickets" />
        </Tabs>
        <Divider />

        <DialogContent>
          {tab === 0 && (
            <Box component="form" onSubmit={onSubmit} noValidate>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Tell us what went wrong. We automatically attach the page you&apos;re on and your
                  browser details so our team can reproduce it.
                </Typography>

                <TextField
                  label="Summary"
                  size="small"
                  fullWidth
                  required
                  error={Boolean(errors.subject)}
                  helperText={errors.subject?.message}
                  {...register("subject")}
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        select
                        label="Category"
                        size="small"
                        fullWidth
                        required
                        error={Boolean(errors.category)}
                        helperText={errors.category?.message}
                        {...field}
                      >
                        {categoryOptions.map((c) => (
                          <MenuItem key={c.value} value={c.value}>
                            {c.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />

                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        select
                        label="Priority"
                        size="small"
                        fullWidth
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        {Object.entries(TICKET_PRIORITY_LABELS).map(([id, label]) => (
                          <MenuItem key={id} value={Number(id)}>
                            {label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Stack>

                <TextField
                  label="Description"
                  size="small"
                  fullWidth
                  required
                  multiline
                  minRows={4}
                  error={Boolean(errors.description)}
                  helperText={errors.description?.message}
                  {...register("description")}
                />

                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: pendingFiles.length ? 1 : 0 }}>
                    <AttachmentUploadButton
                      onFiles={(files) => setPendingFiles((prev) => [...prev, ...files])}
                      label="Attach screenshots / files"
                      onReject={(m) => setSnack({ msg: m, severity: "error" })}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Images or documents, up to 10 MB each
                    </Typography>
                  </Stack>
                  {pendingFiles.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                      {pendingFiles.map((f, idx) => (
                        <Chip
                          key={`${f.name}-${idx}`}
                          size="small"
                          variant="outlined"
                          label={f.name.length > 24 ? `${f.name.slice(0, 22)}…` : f.name}
                          onDelete={() =>
                            setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                        />
                      ))}
                    </Stack>
                  )}
                </Box>

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
                  >
                    Submit ticket
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}

          {tab === 1 && !selected && (
            <Box sx={{ mt: 1 }}>
              {loadingList ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : myTickets.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                  You haven&apos;t raised any tickets yet.
                </Typography>
              ) : (
                <Stack divider={<Divider />} spacing={0}>
                  {myTickets.map((t) => (
                    <Box
                      key={t.ticket_id}
                      onClick={() => void openTicket(t.ticket_id)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        py: 1.25,
                        cursor: "pointer",
                        "&:hover": { backgroundColor: "action.hover" },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          {t.subject}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t.ticket_no} · {formatDateTime(t.updated_date_time)}
                        </Typography>
                      </Box>
                      <StatusChip statusId={t.status_id} />
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {tab === 1 && selected && (
            <Box sx={{ mt: 1 }}>
              <Button
                size="small"
                startIcon={<ArrowLeft size={16} />}
                onClick={() => {
                  setSelected(null);
                  setComments([]);
                  setAttachments([]);
                }}
                sx={{ mb: 1 }}
              >
                Back to my tickets
              </Button>

              {loadingDetail ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {selected.subject}
                    </Typography>
                    <StatusChip statusId={selected.status_id} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {selected.ticket_no} · raised {formatDateTime(selected.created_date_time)}
                    {selected.assigned_to_name ? ` · assigned to ${selected.assigned_to_name}` : ""}
                  </Typography>

                  <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: "pre-wrap" }}>
                    {selected.description}
                  </Typography>

                  <Divider sx={{ my: 2 }} />
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2">Attachments</Typography>
                    <AttachmentUploadButton
                      onFiles={uploadToSelected}
                      disabled={uploadingDetail}
                      label="Add"
                      onReject={(m) => setSnack({ msg: m, severity: "error" })}
                    />
                  </Stack>
                  <AttachmentList
                    attachments={attachments}
                    onOpen={openAttachment}
                    onDelete={removeAttachment}
                    canDelete={(a) => a.uploaded_by_type === "reporter"}
                  />

                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Conversation
                  </Typography>
                  <Stack spacing={1.25}>
                    {comments.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No replies yet.
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
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {c.author_type === "system"
                            ? "System"
                            : c.author_name ?? (c.author_type === "vow" ? "Support" : "You")}
                          {" · "}
                          {formatDateTime(c.created_date_time)}
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {c.comment_text}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Add a reply…"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <Button
                      variant="contained"
                      onClick={() => void sendReply()}
                      disabled={replying || !replyText.trim()}
                    >
                      {replying ? <CircularProgress size={16} color="inherit" /> : "Send"}
                    </Button>
                  </Stack>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={5000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {snack ? (
          <Alert severity={snack.severity} onClose={() => setSnack(null)} variant="filled">
            {snack.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
