"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Autocomplete,
  Box,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";

import TransactionWrapper from "@/components/ui/TransactionWrapper";
import {
  ApprovalActionsBar,
  type ApprovalInfo,
  type ApprovalActionPermissions,
  type ApprovalStatusId,
} from "@/components/ui/transaction/ApprovalActionsBar";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useBranchOptions } from "@/utils/branchUtils";
import {
  fetchVoucherDetail,
  fetchLedgers,
  fetchVoucherTypes,
  createVoucher,
  updateVoucher,
  openVoucher,
  cancelVoucher,
  sendForApproval,
  approveVoucher,
  rejectVoucher,
  reopenVoucher,
  reverseVoucher,
  type Voucher,
  type VoucherLine as ServiceVoucherLine,
  type Ledger as ServiceLedger,
  type VoucherType as ServiceVoucherType,
  type CreateVoucherRequest,
} from "@/utils/accountingService";
import {
  ACC_STATUS_IDS,
  VOUCHER_CATEGORIES,
  isVoucherStatusEditable,
} from "@/app/dashboardportal/accounting/types/accountingTypes";
import type { MuiFormMode } from "@/components/ui/muiform";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LedgerOption {
  label: string;
  value: number;
  /** party_mst id carried by the ledger (set on P-type ledgers only). */
  party_id: number | null;
}

interface LineItemRow {
  uid: string;
  acc_ledger_id: number | null;
  ledger_name: string;
  dr_cr: "D" | "C";
  amount: string;
  branch_id: number | null;
  party_id: number | null;
  narration: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL_MAP: Record<number, string> = {
  [ACC_STATUS_IDS.DRAFT]: "Draft",
  [ACC_STATUS_IDS.OPEN]: "Open",
  [ACC_STATUS_IDS.PENDING_APPROVAL]: "Pending Approval",
  [ACC_STATUS_IDS.APPROVED]: "Approved",
  [ACC_STATUS_IDS.REJECTED]: "Rejected",
  [ACC_STATUS_IDS.CANCELLED]: "Cancelled",
};

const VOUCHER_CATEGORY_VALUES = [
  "PAYMENT", "RECEIPT", "JOURNAL", "CONTRA",
  "SALES", "PURCHASE", "DEBIT_NOTE", "CREDIT_NOTE",
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function createBlankLine(): LineItemRow {
  return {
    uid: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    acc_ledger_id: null,
    ledger_name: "",
    dr_cr: "D",
    amount: "",
    branch_id: null,
    party_id: null,
    narration: "",
  };
}

function lineHasData(line: LineItemRow): boolean {
  return line.acc_ledger_id !== null || parseFloat(line.amount) > 0;
}

function getStatusChipColor(
  statusId: number
): "default" | "primary" | "warning" | "success" | "error" | "info" {
  switch (statusId) {
    case ACC_STATUS_IDS.DRAFT:
      return "default";
    case ACC_STATUS_IDS.OPEN:
      return "primary";
    case ACC_STATUS_IDS.PENDING_APPROVAL:
      return "warning";
    case ACC_STATUS_IDS.APPROVED:
      return "success";
    case ACC_STATUS_IDS.REJECTED:
      return "error";
    case ACC_STATUS_IDS.CANCELLED:
      return "default";
    default:
      return "default";
  }
}

const formatINR = (n: number): string =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/** Map a service VoucherLine (debit/credit amounts) to our UI row (dr_cr + amount). */
function mapServiceLineToRow(line: ServiceVoucherLine): LineItemRow {
  const debit =
    line.debit_amount ?? (line.dr_cr === "D" ? line.amount ?? 0 : 0);
  const credit =
    line.credit_amount ?? (line.dr_cr === "C" ? line.amount ?? 0 : 0);
  const isDr = debit > 0;
  return {
    uid: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    acc_ledger_id: line.acc_ledger_id,
    ledger_name: line.ledger_name ?? "",
    dr_cr: isDr ? "D" : "C",
    amount: String(isDr ? debit : credit),
    branch_id: line.branch_id ?? null,
    party_id: line.party_id ?? null,
    narration: line.narration ?? "",
  };
}

// ── Zod Schema ────────────────────────────────────────────────────────────────

const voucherHeaderSchema = z.object({
  voucher_date: z.string().min(1, "Date is required"),
  type_category: z.enum(VOUCHER_CATEGORY_VALUES, { error: "Voucher type is required" }),
  branch_id: z.string().optional(),
  party_id: z.string().optional(),
  narration: z.string().optional(),
  ref_no: z.string().optional(),
});

type VoucherHeaderFormValues = z.infer<typeof voucherHeaderSchema>;

// ── Loading Fallback ──────────────────────────────────────────────────────────

function VoucherPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-100">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function VoucherTransactionPage() {
  return (
    <Suspense fallback={<VoucherPageLoading />}>
      <VoucherTransactionPageContent />
    </Suspense>
  );
}

// ── Page Content ──────────────────────────────────────────────────────────────

function VoucherTransactionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = (searchParams?.get("mode") || "create").toLowerCase();
  const voucherIdParam = searchParams?.get("voucher_id") || "";

  const mode: MuiFormMode =
    modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";

  const { coId } = useSelectedCompanyCoId();
  const branchOptions = useBranchOptions();

  // ── State ─────────────────────────────────────────────────────────────────

  const [voucherDetail, setVoucherDetail] = React.useState<Voucher | null>(null);
  const [lineItems, setLineItems] = React.useState<LineItemRow[]>([createBlankLine()]);
  const [ledgerOptions, setLedgerOptions] = React.useState<LedgerOption[]>([]);
  const [voucherTypes, setVoucherTypes] = React.useState<ServiceVoucherType[]>([]);
  const [loading, setLoading] = React.useState<boolean>(mode !== "create");
  const [saving, setSaving] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);

  const isViewMode = mode === "view";
  const isAutoPosted =
    voucherDetail?.is_auto_posted != null
      ? voucherDetail.is_auto_posted === 1
      : Boolean(voucherDetail?.source_doc_type);
  const isEditable =
    mode !== "view" &&
    !isAutoPosted &&
    (voucherDetail == null || isVoucherStatusEditable(voucherDetail.status_id));

  // ── React Hook Form ───────────────────────────────────────────────────────

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VoucherHeaderFormValues>({
    resolver: zodResolver(voucherHeaderSchema),
    defaultValues: {
      voucher_date: new Date().toISOString().slice(0, 10),
      type_category: undefined,
      branch_id: "",
      party_id: "",
      narration: "",
      ref_no: "",
    },
  });

  // ── Derived totals ────────────────────────────────────────────────────────

  // party_id columns are party_mst ids (the backend joins party_mst), so the
  // Party pickers may only offer ledgers that actually carry a party_id.
  const partyOptions = React.useMemo(
    () => ledgerOptions.filter((o) => o.party_id != null),
    [ledgerOptions]
  );

  const filledLines = React.useMemo(() => lineItems.filter(lineHasData), [lineItems]);

  const totalDebit = React.useMemo(
    () =>
      filledLines.reduce(
        (sum, line) => (line.dr_cr === "D" ? sum + (parseFloat(line.amount) || 0) : sum),
        0
      ),
    [filledLines]
  );

  const totalCredit = React.useMemo(
    () =>
      filledLines.reduce(
        (sum, line) => (line.dr_cr === "C" ? sum + (parseFloat(line.amount) || 0) : sum),
        0
      ),
    [filledLines]
  );

  const difference = React.useMemo(
    () => Math.round((totalDebit - totalCredit) * 100) / 100,
    [totalDebit, totalCredit]
  );

  // ── Approval state ────────────────────────────────────────────────────────

  const approvalInfo = React.useMemo<ApprovalInfo>(() => {
    const statusId = (voucherDetail?.status_id ?? ACC_STATUS_IDS.DRAFT) as ApprovalStatusId;
    return {
      statusId,
      statusLabel: STATUS_LABEL_MAP[statusId] ?? "Unknown",
    };
  }, [voucherDetail]);

  const approvalPermissions = React.useMemo<ApprovalActionPermissions>(() => {
    if (mode === "create") return { canSave: true };
    if (!voucherDetail) return {};
    const sid = voucherDetail.status_id;
    return {
      canSave: !isAutoPosted && isVoucherStatusEditable(sid),
      canOpen: sid === ACC_STATUS_IDS.DRAFT && !isAutoPosted,
      canCancelDraft: sid === ACC_STATUS_IDS.DRAFT && !isAutoPosted,
      canReopen:
        (sid === ACC_STATUS_IDS.CANCELLED || sid === ACC_STATUS_IDS.REJECTED) &&
        !isAutoPosted,
      canSendForApproval: sid === ACC_STATUS_IDS.OPEN && !isAutoPosted,
      canApprove:
        sid === ACC_STATUS_IDS.OPEN || sid === ACC_STATUS_IDS.PENDING_APPROVAL,
      canReject: sid === ACC_STATUS_IDS.PENDING_APPROVAL,
      canViewApprovalLog:
        sid === ACC_STATUS_IDS.PENDING_APPROVAL ||
        sid === ACC_STATUS_IDS.APPROVED ||
        sid === ACC_STATUS_IDS.REJECTED,
    };
  }, [mode, voucherDetail, isAutoPosted]);

  // ── Fetch ledgers & voucher types ─────────────────────────────────────────

  React.useEffect(() => {
    if (!coId) return;
    const numCoId = Number(coId);
    if (Number.isNaN(numCoId)) return;

    void fetchLedgers({ coId: numCoId, limit: 500 }).then((res) => {
      const opts: LedgerOption[] = (res.ledgers ?? []).map(
        (l: ServiceLedger) => ({
          label: l.ledger_name,
          value: l.acc_ledger_id,
          party_id: l.party_id ?? null,
        })
      );
      setLedgerOptions(opts);
    });

    void fetchVoucherTypes(numCoId).then((types) => {
      setVoucherTypes(types);
    });
  }, [coId]);

  // ── Load voucher detail for edit/view ─────────────────────────────────────

  React.useEffect(() => {
    if (mode === "create") {
      setVoucherDetail(null);
      setPageError(null);
      setLoading(false);
      return;
    }
    if (!voucherIdParam) {
      setPageError("Missing voucher_id in the URL.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchVoucherDetail(Number(voucherIdParam))
      .then((detail: Voucher) => {
        if (cancelled) return;
        setVoucherDetail(detail);
        const partyId = detail.party_id ?? detail.party_ledger_id;
        reset({
          voucher_date: detail.voucher_date?.slice(0, 10) ?? "",
          type_category: (detail.type_category ??
            detail.voucher_type_name) as VoucherHeaderFormValues["type_category"],
          branch_id: "",
          party_id: partyId ? String(partyId) : "",
          narration: detail.narration ?? "",
          ref_no: detail.ref_no ?? "",
        });

        const mappedLines: LineItemRow[] = (detail.lines ?? []).map(mapServiceLineToRow);
        setLineItems(
          mappedLines.length > 0 ? [...mappedLines, createBlankLine()] : [createBlankLine()]
        );
        setPageError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setVoucherDetail(null);
        setLineItems([createBlankLine()]);
        setPageError(
          err instanceof Error ? err.message : "Unable to load voucher details."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, voucherIdParam, reset]);

  // ── Line item handlers ────────────────────────────────────────────────────

  const handleLineChange = React.useCallback(
    (uid: string, field: keyof LineItemRow, value: string | number | null) => {
      setLineItems((prev) => {
        const updated = prev.map((line) =>
          line.uid === uid ? { ...line, [field]: value } : line
        );
        const last = updated[updated.length - 1];
        if (last && lineHasData(last)) {
          updated.push(createBlankLine());
        }
        return updated;
      });
    },
    []
  );

  const handleLedgerSelect = React.useCallback(
    (uid: string, option: LedgerOption | null) => {
      setLineItems((prev) => {
        const updated = prev.map((line) =>
          line.uid === uid
            ? { ...line, acc_ledger_id: option?.value ?? null, ledger_name: option?.label ?? "" }
            : line
        );
        const last = updated[updated.length - 1];
        if (last && lineHasData(last)) {
          updated.push(createBlankLine());
        }
        return updated;
      });
    },
    []
  );

  const handleRemoveLine = React.useCallback((uid: string) => {
    setLineItems((prev) => {
      const filtered = prev.filter((l) => l.uid !== uid);
      return filtered.length > 0 ? filtered : [createBlankLine()];
    });
  }, []);

  // ── Save handler ──────────────────────────────────────────────────────────

  const onSave = React.useCallback(
    async (values: VoucherHeaderFormValues) => {
      if (!coId) return;

      if (filledLines.length === 0) {
        void Swal.fire({ icon: "warning", title: "No line items", text: "Add at least one line item before saving." });
        return;
      }
      if (difference !== 0) {
        void Swal.fire({
          icon: "error",
          title: "Debit / Credit mismatch",
          text: `Total Debit and Credit must be equal. Current difference: ${difference.toFixed(2)}`,
        });
        return;
      }

      const invalidLines = filledLines.filter((l) => l.acc_ledger_id === null);
      if (invalidLines.length > 0) {
        void Swal.fire({ icon: "warning", title: "Incomplete lines", text: "Every line item must have a ledger selected." });
        return;
      }

      const matchedType = voucherTypes.find(
        (vt) => vt.type_category === values.type_category
      );

      const payload: CreateVoucherRequest = {
        co_id: Number(coId),
        branch_id: values.branch_id ? Number(values.branch_id) : undefined,
        voucher_date: values.voucher_date,
        acc_voucher_type_id: matchedType?.acc_voucher_type_id,
        // Fallback so the backend can resolve the voucher type when no id matched.
        type_category: values.type_category,
        party_id: values.party_id ? Number(values.party_id) : null,
        ref_no: values.ref_no || undefined,
        narration: values.narration || undefined,
        lines: filledLines.map((line) => ({
          acc_ledger_id: line.acc_ledger_id as number,
          debit_amount: line.dr_cr === "D" ? parseFloat(line.amount) || 0 : 0,
          credit_amount: line.dr_cr === "C" ? parseFloat(line.amount) || 0 : 0,
          narration: line.narration || undefined,
          party_id: line.party_id,
        })),
      };

      setSaving(true);
      try {
        if (mode === "edit" && voucherIdParam) {
          await updateVoucher(Number(voucherIdParam), payload);
          void Swal.fire({ icon: "success", title: "Voucher updated", timer: 1500, showConfirmButton: false });
          const updated = await fetchVoucherDetail(Number(voucherIdParam));
          setVoucherDetail(updated);
        } else {
          const result = await createVoucher(payload);
          void Swal.fire({
            icon: "success",
            title: "Voucher created",
            text: result.voucher_no
              ? `Voucher ${result.voucher_no} created successfully.`
              : "Voucher created successfully.",
            timer: 1500,
            showConfirmButton: false,
          });
          if (result.acc_voucher_id) {
            router.push(
              `/dashboardportal/accounting/vouchers/createVoucher?mode=view&voucher_id=${result.acc_voucher_id}`
            );
          } else {
            router.push("/dashboardportal/accounting/vouchers");
          }
        }
      } catch (err: unknown) {
        void Swal.fire({
          icon: "error",
          title: "Save failed",
          text: err instanceof Error ? err.message : "An error occurred while saving.",
        });
      } finally {
        setSaving(false);
      }
    },
    [coId, filledLines, difference, mode, voucherIdParam, voucherTypes, router]
  );

  // ── Approval action handlers ──────────────────────────────────────────────

  const refreshDetail = React.useCallback(async () => {
    if (!voucherIdParam) return;
    try {
      const detail = await fetchVoucherDetail(Number(voucherIdParam));
      setVoucherDetail(detail);
    } catch {
      // keep current state
    }
  }, [voucherIdParam]);

  const handleOpen = React.useCallback(async () => {
    if (!voucherIdParam) return;
    try {
      await openVoucher(Number(voucherIdParam));
      void Swal.fire({ icon: "success", title: "Voucher opened", timer: 1500, showConfirmButton: false });
      await refreshDetail();
    } catch (err: unknown) {
      void Swal.fire({ icon: "error", title: "Failed", text: err instanceof Error ? err.message : "Could not open voucher." });
    }
  }, [voucherIdParam, refreshDetail]);

  const handleCancelDraft = React.useCallback(async () => {
    if (!voucherIdParam) return;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Cancel Draft?",
      text: "This will cancel the draft voucher.",
      showCancelButton: true,
      confirmButtonText: "Yes, cancel it",
    });
    if (!confirm.isConfirmed) return;
    try {
      await cancelVoucher(Number(voucherIdParam));
      void Swal.fire({ icon: "success", title: "Cancelled", timer: 1500, showConfirmButton: false });
      await refreshDetail();
    } catch (err: unknown) {
      void Swal.fire({ icon: "error", title: "Failed", text: err instanceof Error ? err.message : "Could not cancel voucher." });
    }
  }, [voucherIdParam, refreshDetail]);

  const handleSendForApproval = React.useCallback(async () => {
    if (!voucherIdParam) return;
    try {
      await sendForApproval(Number(voucherIdParam));
      void Swal.fire({ icon: "success", title: "Sent for approval", timer: 1500, showConfirmButton: false });
      await refreshDetail();
    } catch (err: unknown) {
      void Swal.fire({ icon: "error", title: "Failed", text: err instanceof Error ? err.message : "Could not send for approval." });
    }
  }, [voucherIdParam, refreshDetail]);

  const handleApprove = React.useCallback(async () => {
    if (!voucherIdParam) return;
    try {
      await approveVoucher(Number(voucherIdParam));
      void Swal.fire({ icon: "success", title: "Approved", timer: 1500, showConfirmButton: false });
      await refreshDetail();
    } catch (err: unknown) {
      void Swal.fire({ icon: "error", title: "Failed", text: err instanceof Error ? err.message : "Could not approve voucher." });
    }
  }, [voucherIdParam, refreshDetail]);

  const handleReject = React.useCallback(
    async (reason: string) => {
      if (!voucherIdParam) return;
      try {
        await rejectVoucher(Number(voucherIdParam), reason);
        void Swal.fire({ icon: "success", title: "Rejected", timer: 1500, showConfirmButton: false });
        await refreshDetail();
      } catch (err: unknown) {
        void Swal.fire({ icon: "error", title: "Failed", text: err instanceof Error ? err.message : "Could not reject voucher." });
      }
    },
    [voucherIdParam, refreshDetail]
  );

  const handleReopen = React.useCallback(async () => {
    if (!voucherIdParam) return;
    try {
      await reopenVoucher(Number(voucherIdParam));
      void Swal.fire({ icon: "success", title: "Reopened", timer: 1500, showConfirmButton: false });
      await refreshDetail();
    } catch (err: unknown) {
      void Swal.fire({ icon: "error", title: "Failed", text: err instanceof Error ? err.message : "Could not reopen voucher." });
    }
  }, [voucherIdParam, refreshDetail]);

  const handleReverse = React.useCallback(async () => {
    if (!voucherIdParam) return;
    const { value: narration } = await Swal.fire({
      icon: "question",
      title: "Reverse Voucher",
      input: "text",
      inputLabel: "Reversal narration",
      inputPlaceholder: "Enter reason for reversal...",
      showCancelButton: true,
      confirmButtonText: "Reverse",
    });
    if (!narration) return;
    try {
      await reverseVoucher(Number(voucherIdParam), narration as string);
      void Swal.fire({ icon: "success", title: "Reversed", timer: 1500, showConfirmButton: false });
      await refreshDetail();
    } catch (err: unknown) {
      void Swal.fire({ icon: "error", title: "Failed", text: err instanceof Error ? err.message : "Could not reverse voucher." });
    }
  }, [voucherIdParam, refreshDetail]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleBack = React.useCallback(() => {
    router.push("/dashboardportal/accounting/vouchers");
  }, [router]);

  // ── Page title ────────────────────────────────────────────────────────────

  const pageTitle = React.useMemo(() => {
    if (mode === "create") return "Create Voucher";
    if (mode === "edit")
      return `Edit Voucher${voucherDetail?.voucher_no ? ` - ${voucherDetail.voucher_no}` : ""}`;
    return `Voucher${voucherDetail?.voucher_no ? ` - ${voucherDetail.voucher_no}` : ""}`;
  }, [mode, voucherDetail]);

  const statusChipProps = React.useMemo(() => {
    if (!voucherDetail) return undefined;
    return {
      label: STATUS_LABEL_MAP[voucherDetail.status_id] ?? "Unknown",
      color: getStatusChipColor(voucherDetail.status_id) as
        | "default"
        | "primary"
        | "secondary"
        | "success"
        | "error"
        | "warning"
        | "info",
    };
  }, [voucherDetail]);

  const metadata = React.useMemo(() => {
    if (!voucherDetail) return undefined;
    const items = [
      { label: "Voucher No.", value: voucherDetail.voucher_no },
      { label: "Type", value: voucherDetail.voucher_type_name ?? "-" },
    ];
    if (voucherDetail.party_name) {
      items.push({ label: "Party", value: voucherDetail.party_name });
    }
    if (voucherDetail.source_doc_type) {
      items.push({ label: "Source", value: voucherDetail.source_doc_type });
    }
    return items;
  }, [voucherDetail]);

  // ── Primary actions ───────────────────────────────────────────────────────

  const primaryActions = React.useMemo(() => {
    const actions: Array<{
      label: string;
      onClick: () => void;
      disabled?: boolean;
      loading?: boolean;
      hidden?: boolean;
      variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
      className?: string;
    }> = [];

    if (mode === "create") {
      actions.push({
        label: "Save Draft",
        onClick: handleSubmit(onSave),
        disabled: saving,
        loading: saving,
      });
      return actions;
    }

    if (isEditable && approvalPermissions.canSave) {
      actions.push({
        label: "Save Changes",
        onClick: handleSubmit(onSave),
        disabled: saving,
        loading: saving,
      });
    }

    return actions;
  }, [mode, isEditable, approvalPermissions.canSave, saving, handleSubmit, onSave]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <TransactionWrapper
      title={pageTitle}
      subtitle={mode === "create" ? "Fill in details and add line items." : undefined}
      statusChip={statusChipProps}
      metadata={metadata}
      backAction={{ label: "Back to Vouchers", onClick: handleBack }}
      primaryActions={primaryActions}
      loading={loading}
      alerts={
        pageError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {pageError}
          </Alert>
        ) : undefined
      }
      footer={
        voucherDetail && mode !== "create" ? (
          <ApprovalActionsBar
            approvalInfo={approvalInfo}
            permissions={approvalPermissions}
            onOpen={handleOpen}
            onCancelDraft={handleCancelDraft}
            onSendForApproval={handleSendForApproval}
            onApprove={handleApprove}
            onReject={handleReject}
            onReopen={handleReopen}
            loading={saving}
          />
        ) : undefined
      }
    >
      {/* Auto-posted info banner */}
      {isAutoPosted && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This voucher was auto-posted from{" "}
          <strong>{voucherDetail?.source_doc_type ?? "an external document"}</strong>.
          It cannot be edited directly.
        </Alert>
      )}

      {/* ── Header Form ────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Voucher Details
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
            gap: 2.5,
          }}
        >
          {/* Voucher Date */}
          <Controller
            name="voucher_date"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Voucher Date"
                type="date"
                size="small"
                fullWidth
                required
                disabled={isViewMode || !isEditable}
                error={Boolean(errors.voucher_date)}
                helperText={errors.voucher_date?.message}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
          />

          {/* Type Category */}
          <Controller
            name="type_category"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Voucher Type"
                size="small"
                fullWidth
                required
                disabled={isViewMode || !isEditable}
                value={field.value ?? ""}
                onChange={field.onChange}
                error={Boolean(errors.type_category)}
                helperText={errors.type_category?.message}
              >
                {VOUCHER_CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat.replace(/_/g, " ")}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          {/* Branch */}
          <Controller
            name="branch_id"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Branch"
                size="small"
                fullWidth
                disabled={isViewMode || !isEditable}
                value={field.value ?? ""}
                onChange={field.onChange}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {branchOptions.map((b) => (
                  <MenuItem key={b.value} value={b.value}>
                    {b.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          {/* Party (Ledger Autocomplete) */}
          <Controller
            name="party_id"
            control={control}
            render={({ field }) => (
              <Autocomplete
                size="small"
                disabled={isViewMode || !isEditable}
                options={partyOptions}
                getOptionLabel={(opt) => opt.label}
                isOptionEqualToValue={(opt, val) => opt.value === val.value}
                value={
                  partyOptions.find((o) => String(o.party_id) === field.value) ?? null
                }
                onChange={(_e, newVal) => {
                  field.onChange(newVal?.party_id != null ? String(newVal.party_id) : "");
                }}
                renderInput={(params) => <TextField {...params} label="Party" />}
              />
            )}
          />

          {/* Ref No */}
          <Controller
            name="ref_no"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Reference No."
                size="small"
                fullWidth
                disabled={isViewMode || !isEditable}
              />
            )}
          />

          {/* Narration */}
          <Controller
            name="narration"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Narration"
                size="small"
                fullWidth
                multiline
                minRows={1}
                maxRows={3}
                disabled={isViewMode || !isEditable}
                sx={{ gridColumn: { md: "1 / -1" } }}
              />
            )}
          />
        </Box>
      </Paper>

      {/* ── Line Items Table ───────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Line Items
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 50 }}>S.No</TableCell>
                <TableCell sx={{ minWidth: 250 }}>Ledger</TableCell>
                <TableCell sx={{ width: 100 }}>Dr/Cr</TableCell>
                <TableCell sx={{ width: 160 }} align="right">
                  Amount
                </TableCell>
                <TableCell sx={{ minWidth: 150 }}>Branch</TableCell>
                <TableCell sx={{ minWidth: 150 }}>Party</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Narration</TableCell>
                {isEditable && <TableCell sx={{ width: 50 }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {lineItems.map((line, index) => (
                <TableRow key={line.uid} hover>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {index + 1}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Autocomplete
                      size="small"
                      disabled={!isEditable}
                      options={ledgerOptions}
                      getOptionLabel={(opt) => opt.label}
                      isOptionEqualToValue={(opt, val) => opt.value === val.value}
                      value={
                        line.acc_ledger_id != null
                          ? ledgerOptions.find((o) => o.value === line.acc_ledger_id) ?? {
                              label: line.ledger_name,
                              value: line.acc_ledger_id,
                              party_id: null,
                            }
                          : null
                      }
                      onChange={(_e, newVal) => handleLedgerSelect(line.uid, newVal)}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Select ledger" variant="outlined" />
                      )}
                      sx={{ minWidth: 220 }}
                    />
                  </TableCell>

                  <TableCell>
                    <Select
                      size="small"
                      value={line.dr_cr}
                      disabled={!isEditable}
                      onChange={(e) =>
                        handleLineChange(line.uid, "dr_cr", e.target.value)
                      }
                      sx={{ minWidth: 80 }}
                    >
                      <MenuItem value="D">Dr</MenuItem>
                      <MenuItem value="C">Cr</MenuItem>
                    </Select>
                  </TableCell>

                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={line.amount}
                      disabled={!isEditable}
                      onChange={(e) =>
                        handleLineChange(line.uid, "amount", e.target.value)
                      }
                      slotProps={{
                        htmlInput: {
                          min: 0,
                          step: "0.01",
                          style: { textAlign: "right" },
                        },
                      }}
                      sx={{ width: 140 }}
                    />
                  </TableCell>

                  <TableCell>
                    <Select
                      size="small"
                      value={line.branch_id != null ? String(line.branch_id) : ""}
                      disabled={!isEditable}
                      displayEmpty
                      onChange={(e) => {
                        const val = e.target.value as string;
                        handleLineChange(
                          line.uid,
                          "branch_id",
                          val === "" ? null : Number(val)
                        );
                      }}
                      sx={{ minWidth: 130 }}
                    >
                      <MenuItem value="">
                        <em>-</em>
                      </MenuItem>
                      {branchOptions.map((b) => (
                        <MenuItem key={b.value} value={b.value}>
                          {b.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Autocomplete
                      size="small"
                      disabled={!isEditable}
                      options={partyOptions}
                      getOptionLabel={(opt) => opt.label}
                      isOptionEqualToValue={(opt, val) => opt.value === val.value}
                      value={
                        line.party_id != null
                          ? partyOptions.find((o) => o.party_id === line.party_id) ?? null
                          : null
                      }
                      onChange={(_e, newVal) =>
                        handleLineChange(line.uid, "party_id", newVal?.party_id ?? null)
                      }
                      renderInput={(params) => (
                        <TextField {...params} placeholder="-" variant="outlined" />
                      )}
                      sx={{ minWidth: 130 }}
                    />
                  </TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      value={line.narration}
                      disabled={!isEditable}
                      onChange={(e) =>
                        handleLineChange(line.uid, "narration", e.target.value)
                      }
                      placeholder="-"
                      sx={{ minWidth: 160 }}
                    />
                  </TableCell>

                  {isEditable && (
                    <TableCell>
                      {lineItems.length > 1 && lineHasData(line) ? (
                        <Tooltip title="Remove line">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveLine(line.uid)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>

            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} />
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Total Debit
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatINR(totalDebit)}
                  </Typography>
                </TableCell>
                <TableCell colSpan={isEditable ? 4 : 3} />
              </TableRow>
              <TableRow>
                <TableCell colSpan={2} />
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Total Credit
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatINR(totalCredit)}
                  </Typography>
                </TableCell>
                <TableCell colSpan={isEditable ? 4 : 3} />
              </TableRow>
              <TableRow>
                <TableCell colSpan={2} />
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: difference !== 0 ? "error.main" : "success.main",
                    }}
                  >
                    Difference
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: difference !== 0 ? "error.main" : "success.main",
                    }}
                  >
                    {formatINR(Math.abs(difference))}
                    {difference !== 0 && (
                      <> ({difference > 0 ? "Dr excess" : "Cr excess"})</>
                    )}
                  </Typography>
                </TableCell>
                <TableCell colSpan={isEditable ? 4 : 3} />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </Paper>
    </TransactionWrapper>
  );
}
