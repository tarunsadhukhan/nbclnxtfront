"use client";

/**
 * Presentational helpers for support-ticket attachments:
 * - {@link AttachmentList} renders image thumbnails + document chips.
 * - {@link AttachmentUploadButton} is a validated file picker button.
 *
 * Both are dumb components — all network calls live in the parent via the
 * service layer.
 */

import React, { useRef } from "react";
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { FileText, Paperclip, X } from "lucide-react";

import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  formatFileSize,
  type TicketAttachment,
} from "@/utils/supportTicketTypes";

interface AttachmentListProps {
  attachments: TicketAttachment[];
  /** Open an attachment (parent decides: use embedded url or fetch a fresh one). */
  onOpen: (attachment: TicketAttachment) => void;
  /** Optional delete handler; shown only when canDelete returns true. */
  onDelete?: (attachment: TicketAttachment) => void;
  canDelete?: (attachment: TicketAttachment) => boolean;
}

export function AttachmentList({ attachments, onOpen, onDelete, canDelete }: AttachmentListProps) {
  if (!attachments || attachments.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No attachments.
      </Typography>
    );
  }

  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
      {attachments.map((a) => {
        const deletable = Boolean(onDelete) && (canDelete ? canDelete(a) : true);
        const title = a.original_filename ?? `#${a.attachment_id}`;
        if (a.kind === "image" && a.url) {
          return (
            <Box key={a.attachment_id} sx={{ position: "relative" }}>
              <Box
                component="img"
                src={a.url}
                alt={title}
                onClick={() => onOpen(a)}
                sx={{
                  width: 88,
                  height: 88,
                  objectFit: "cover",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                }}
              />
              {deletable ? (
                <IconButton
                  size="small"
                  onClick={() => onDelete?.(a)}
                  sx={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    p: 0.25,
                  }}
                  aria-label="Remove attachment"
                >
                  <X size={12} />
                </IconButton>
              ) : null}
            </Box>
          );
        }
        return (
          <Tooltip key={a.attachment_id} title={`${title}${a.size_bytes ? ` · ${formatFileSize(a.size_bytes)}` : ""}`}>
            <Chip
              icon={a.kind === "image" ? <Paperclip size={14} /> : <FileText size={14} />}
              label={title.length > 22 ? `${title.slice(0, 20)}…` : title}
              onClick={() => onOpen(a)}
              onDelete={deletable ? () => onDelete?.(a) : undefined}
              variant="outlined"
              size="small"
            />
          </Tooltip>
        );
      })}
    </Stack>
  );
}

interface AttachmentUploadButtonProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  /** Notify the parent when a picked file is rejected (too large). */
  onReject?: (message: string) => void;
}

export function AttachmentUploadButton({
  onFiles,
  disabled,
  label = "Attach files",
  onReject,
}: AttachmentUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    const accepted: File[] = [];
    for (const f of picked) {
      if (f.size > ATTACHMENT_MAX_BYTES) {
        onReject?.(`"${f.name}" exceeds the 10 MB limit and was skipped`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length) onFiles(accepted);
    // reset so picking the same file again re-triggers change
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        hidden
        onChange={handleChange}
      />
      <Chip
        icon={<Paperclip size={14} />}
        label={label}
        variant="outlined"
        size="small"
        onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled}
        sx={{ cursor: disabled ? "default" : "pointer" }}
      />
    </>
  );
}
