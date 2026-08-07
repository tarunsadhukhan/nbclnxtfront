"use client";

import React from "react";
import { Box, Typography, Stack, Chip, LinearProgress, Divider, Paper } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { Button } from "./button";
import { TransactionLineItems, type TransactionLineItemsProps } from "./transaction";

export type TransactionAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  hidden?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  startIcon?: React.ReactNode;
  className?: string;
};

export type TransactionMetadataItem = {
  label: string;
  value?: React.ReactNode;
};

type TransactionWrapperProps<TLineItem = unknown> = {
  title: string;
  subtitle?: string;
  statusChip?: { label: string; color?: "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info" };
  metadata?: TransactionMetadataItem[];
  backAction?: { label?: string; onClick: () => void };
  primaryActions?: TransactionAction[];
  secondaryActions?: TransactionAction[];
  loading?: boolean;
  alerts?: React.ReactNode;
  children: React.ReactNode;
  preview?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  lineItems?: TransactionLineItemsProps<TLineItem>;
  /** When true, primary action buttons render after the footer instead of after line items */
  actionsAfterFooter?: boolean;
};

const renderActionButton = (action: TransactionAction, key: string, defaultVariant: TransactionAction["variant"]) => {
  if (action.hidden) return null;
  const variant = action.variant ?? defaultVariant;
  return (
    <Button
      key={key}
      variant={variant}
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      className={`min-w-30 ${action.className ?? ""}`.trim()}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center">
        {action.startIcon ? <span className="inline-flex items-center justify-center">{action.startIcon}</span> : null}
        <span>{action.loading ? "Processing..." : action.label}</span>
      </Stack>
    </Button>
  );
};

function TransactionWrapper<TLineItem = unknown>({
  title,
  subtitle,
  statusChip,
  metadata,
  backAction,
  primaryActions,
  secondaryActions,
  loading,
  alerts,
  children,
  preview,
  footer,
  className,
  contentClassName,
  lineItems,
  actionsAfterFooter,
}: TransactionWrapperProps<TLineItem>) {
  return (
    <Box className={`min-h-screen bg-gray-50 p-6 md:p-8 ${className ?? ""}`}>
      <Box className={`mx-auto ${contentClassName ?? "max-w-7xl"}`}>
        <Stack direction="column" spacing={2} sx={{ mb: 4 }}>
          <Stack direction="row" spacing={3} alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" rowGap={2}>
            <Stack spacing={1} minWidth={0} sx={{ flex: 1 }}>
              {backAction ? (
                <Button variant="ghost" size="sm" className="w-fit" onClick={backAction.onClick}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <ArrowLeft size={16} />
                    <span>{backAction.label ?? "Back"}</span>
                  </Stack>
                </Button>
              ) : null}
              <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
              {subtitle ? (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              ) : null}
              {statusChip ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 1 }}>
                  <Chip label={statusChip.label} color={statusChip.color ?? "default"} size="small" />
                </Stack>
              ) : null}
            </Stack>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="flex-end">
              {secondaryActions?.map((action, index) => renderActionButton(action, `secondary-${index}`, action.variant ?? "ghost"))}
            </Stack>
          </Stack>
          {metadata && metadata.length ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
                {metadata.map((item, idx) => (
                  <Stack key={`${item.label}-${idx}`} spacing={0.5} sx={{ minWidth: 160 }}>
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="body2">{item.value ?? "-"}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          ) : null}
        </Stack>

        {alerts}

        {loading ? <LinearProgress sx={{ mb: 3 }} /> : null}

        <Stack spacing={3}>
          <Box>
            {children}
          </Box>
          {lineItems ? <TransactionLineItems {...lineItems} /> : null}
          {!actionsAfterFooter && primaryActions && primaryActions.length > 0 ? (
            <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="flex-end" sx={{ pt: 2 }}>
              {primaryActions.map((action, index) => renderActionButton(action, `primary-${index}`, action.variant ?? "default"))}
            </Stack>
          ) : null}
        </Stack>

        {footer ? (
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 2 }} />
            {footer}
          </Box>
        ) : null}

        {actionsAfterFooter && primaryActions && primaryActions.length > 0 ? (
          <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="flex-end" sx={{ pt: 3 }}>
            {primaryActions.map((action, index) => renderActionButton(action, `primary-${index}`, action.variant ?? "default"))}
          </Stack>
        ) : null}

        {preview ? (
          <Box sx={{ mt: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, position: "relative" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Printable Preview
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {preview}
            </Paper>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export default TransactionWrapper;
