"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { fetchVouchers } from "@/utils/accountingService";
import {
  ACC_STATUS_IDS,
  isVoucherStatusEditable,
  type VoucherListRow,
} from "@/app/dashboardportal/accounting/types/accountingTypes";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  const trimmed = value.trim();
  const ymdMatch = trimmed.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    }
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed);
  }
  return trimmed;
};

const formatAmount = (value: number | null | undefined): string => {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

type StatusChipColor = "default" | "primary" | "warning" | "success" | "error" | "info";

const getStatusChipColor = (statusId: number): StatusChipColor => {
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
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoucherListPage() {
  const router = useRouter();
  const { coId } = useSelectedCompanyCoId();

  const [rows, setRows] = React.useState<VoucherListRow[]>([]);
  const [totalRows, setTotalRows] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const [searchValue, setSearchValue] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // ── Navigate to view ────────────────────────────────────────────────────────

  const handleView = React.useCallback(
    (row: VoucherListRow) => {
      const id = row.acc_voucher_id ?? row.id;
      if (!id) return;
      router.push(
        `/dashboardportal/accounting/vouchers/createVoucher?mode=view&voucher_id=${encodeURIComponent(String(id))}`
      );
    },
    [router]
  );

  const handleEdit = React.useCallback(
    (row: VoucherListRow) => {
      const id = row.acc_voucher_id ?? row.id;
      if (!id) return;
      router.push(
        `/dashboardportal/accounting/vouchers/createVoucher?mode=edit&voucher_id=${encodeURIComponent(String(id))}`
      );
    },
    [router]
  );

  // Mirrors the backend's update_draft_voucher gate (Draft/Open only), so the
  // pencil never routes to an edit screen that would be read-only anyway.
  // Rejected vouchers must be reopened (4 -> 1) before they can be edited.
  const isRowEditable = React.useCallback(
    (row: VoucherListRow): boolean =>
      isVoucherStatusEditable(row.status_id) && row.is_auto_posted !== 1,
    []
  );

  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns = React.useMemo<GridColDef<VoucherListRow>[]>(
    () => [
      {
        field: "voucher_no",
        headerName: "Voucher No.",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
          <Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
            {params.value || "-"}
          </Typography>
        ),
      },
      {
        field: "voucher_date",
        headerName: "Date",
        minWidth: 120,
        renderCell: (params) => (
          <Typography component="span" variant="body2">
            {formatDate(params.value as string | null)}
          </Typography>
        ),
      },
      {
        field: "voucher_type",
        headerName: "Type",
        minWidth: 130,
      },
      {
        field: "party_name",
        headerName: "Party",
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <Typography component="span" variant="body2">
            {(params.value as string | null) || "-"}
          </Typography>
        ),
      },
      {
        field: "total_amount",
        headerName: "Amount",
        minWidth: 140,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
            {formatAmount(params.value as number | null)}
          </Typography>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 130,
        renderCell: (params) => {
          const statusId = params.row.status_id;
          const label = (params.value as string) || "Unknown";
          return (
            <Chip
              size="small"
              label={label}
              color={getStatusChipColor(statusId)}
            />
          );
        },
      },
      {
        field: "is_auto_posted",
        headerName: "Auto",
        minWidth: 80,
        align: "center",
        headerAlign: "center",
        renderCell: (params) =>
          params.value === 1 ? (
            <Chip size="small" label="Auto" color="info" variant="outlined" />
          ) : null,
      },
      {
        field: "source_doc_type",
        headerName: "Source",
        minWidth: 120,
        renderCell: (params) => {
          const val = params.value as string | null;
          return val ? (
            <Chip size="small" label={val} variant="outlined" />
          ) : (
            <Typography component="span" variant="body2" color="text.secondary">
              -
            </Typography>
          );
        },
      },
    ],
    []
  );

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const fetchData = React.useCallback(async () => {
    if (!coId) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const trimmedSearch = searchValue.trim();
      const result = await fetchVouchers({
        coId: Number(coId),
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: trimmedSearch || undefined,
      });

      const mapped: VoucherListRow[] = (result.vouchers ?? []).map((v) => ({
        id: v.acc_voucher_id,
        acc_voucher_id: v.acc_voucher_id,
        voucher_no: v.voucher_no,
        voucher_date: v.voucher_date,
        voucher_type: v.voucher_type_name ?? "",
        type_category: v.type_category ?? ("JOURNAL" as const),
        party_name: v.party_name ?? null,
        branch_name: null,
        total_amount: v.total_amount ?? v.total_debit ?? 0,
        status: v.status_name ?? "Draft",
        status_id: v.status_id,
        // Prefer the backend's is_auto_posted flag; fall back to the presence
        // of a source document for older responses that lack the field.
        is_auto_posted:
          v.is_auto_posted != null
            ? v.is_auto_posted
            : v.source_doc_type
              ? 1
              : 0,
        source_doc_type: v.source_doc_type ?? null,
        narration: v.narration ?? null,
      }));

      setRows(mapped);
      // Server-reported total drives the grid's row count for pagination.
      setTotalRows(result.total ?? mapped.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load vouchers";
      setErrorMessage(message);
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [coId, paginationModel.page, paginationModel.pageSize, searchValue]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handlePaginationModelChange = React.useCallback((model: GridPaginationModel) => {
    setPaginationModel(model);
  }, []);

  const handleSearchChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
      setSearchValue(event.target.value);
    },
    []
  );

  const handleCreateVoucher = React.useCallback(() => {
    router.push("/dashboardportal/accounting/vouchers/createVoucher");
  }, [router]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <IndexWrapper<VoucherListRow>
      title="Vouchers"
      subtitle="Manage accounting vouchers across all types."
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchValue,
        onChange: handleSearchChange,
        placeholder: "Search by voucher no., party, or type",
        debounceDelayMs: 800,
      }}
      createAction={{ onClick: handleCreateVoucher, label: "Create Voucher" }}
      onView={handleView}
      onEdit={handleEdit}
      isRowEditable={isRowEditable}
    >
      {errorMessage ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}
    </IndexWrapper>
  );
}
