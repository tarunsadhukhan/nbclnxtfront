"use client";

import * as React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { useSidebarContextSafe } from "@/components/dashboard/sidebarContext";

type BranchOption = { branch_id: number; branch_name: string };

type ReportFiltersProps = {
  endpoint: string;
  downloadEndpoint: string;
  extraFilters?: Record<string, string | number | undefined>;
  columns: GridColDef[];
  reportKey: string;
  showBranchFilter?: boolean;
  showSearch?: boolean;
};

const formatYmd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const todayCompact = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const ALL_BRANCHES: BranchOption = { branch_id: 0, branch_name: "All Branches" };

const ReportFilters: React.FC<ReportFiltersProps> = ({
  endpoint,
  downloadEndpoint,
  extraFilters,
  columns,
  reportKey,
  showBranchFilter = true,
  showSearch = true,
}) => {
  const sidebar = useSidebarContextSafe();
  const [mounted, setMounted] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [selectedBranch, setSelectedBranch] = React.useState<BranchOption>(ALL_BRANCHES);
  const [search, setSearch] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [rows, setRows] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState<"xlsx" | "pdf" | null>(null);

  React.useEffect(() => {
    setMounted(true);
    const now = new Date();
    const thirtyAgo = new Date();
    thirtyAgo.setDate(now.getDate() - 30);
    setDateFrom(formatYmd(thirtyAgo));
    setDateTo(formatYmd(now));
  }, []);

  // Debounce search 400ms
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  React.useEffect(() => {
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, [dateFrom, dateTo, selectedBranch.branch_id, debouncedSearch]);

  const branchOptions = React.useMemo<BranchOption[]>(() => {
    const list = sidebar?.selectedCompany?.branches ?? [];
    return [
      ALL_BRANCHES,
      ...list.map(b => ({ branch_id: b.branch_id, branch_name: b.branch_name })),
    ];
  }, [sidebar?.selectedCompany]);

  const getCoId = React.useCallback((): string => {
    try {
      const stored = localStorage.getItem("sidebar_selectedCompany");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.co_id != null) return String(parsed.co_id);
      }
    } catch {
      // ignore
    }
    return "";
  }, []);

  const buildQuery = React.useCallback(
    (forDownload: boolean): URLSearchParams => {
      const query = new URLSearchParams();
      const coId = getCoId();
      if (coId) query.set("co_id", coId);
      if (dateFrom) query.set("date_from", dateFrom);
      if (dateTo) query.set("date_to", dateTo);
      if (selectedBranch.branch_id && selectedBranch.branch_id !== 0) {
        query.set("branch_id", String(selectedBranch.branch_id));
      }
      const trimmed = debouncedSearch.trim();
      if (trimmed) query.set("search", trimmed);
      if (extraFilters) {
        Object.entries(extraFilters).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") {
            query.set(k, String(v));
          }
        });
      }
      if (!forDownload) {
        query.set("page", String(paginationModel.page + 1));
        query.set("limit", String(paginationModel.pageSize));
      }
      return query;
    },
    [
      getCoId,
      dateFrom,
      dateTo,
      selectedBranch.branch_id,
      debouncedSearch,
      extraFilters,
      paginationModel.page,
      paginationModel.pageSize,
    ]
  );

  const fetchData = React.useCallback(async () => {
    if (!mounted) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const url = `${endpoint}?${buildQuery(false).toString()}`;
      const { data, error } = await fetchWithCookie(url, "GET");
      if (error) {
        throw new Error(error);
      }
      const rawRows = Array.isArray((data as any)?.data)
        ? (data as any).data
        : Array.isArray(data)
        ? data
        : [];
      setRows(rawRows);
      const t = Number((data as any)?.total ?? rawRows.length ?? 0);
      setTotal(Number.isNaN(t) ? rawRows.length : t);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load report";
      setErrorMessage(msg);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [mounted, endpoint, buildQuery]);

  React.useEffect(() => {
    if (!mounted) return;
    fetchData();
  }, [mounted, fetchData]);

  const handleDownload = React.useCallback(
    async (format: "xlsx" | "pdf") => {
      setDownloading(format);
      try {
        const query = buildQuery(true);
        query.set("format", format);
        const url = `${downloadEndpoint}?${query.toString()}`;
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) {
          throw new Error(`Download failed: ${res.status}`);
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        const ext = format === "xlsx" ? "xlsx" : "pdf";
        a.download = `${reportKey}-${todayCompact()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Download failed";
        setErrorMessage(msg);
      } finally {
        setDownloading(null);
      }
    },
    [buildQuery, downloadEndpoint, reportKey]
  );

  if (!mounted) return null;

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ mb: 2 }}
      >
        <TextField
          label="Date From"
          type="date"
          size="small"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="Date To"
          type="date"
          size="small"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        {showBranchFilter ? (
          <Autocomplete
            size="small"
            options={branchOptions}
            value={selectedBranch}
            onChange={(_e, v) => setSelectedBranch(v ?? ALL_BRANCHES)}
            getOptionLabel={opt => opt.branch_name}
            isOptionEqualToValue={(a, b) => a.branch_id === b.branch_id}
            renderInput={params => <TextField {...params} label="Branch" />}
            sx={{ minWidth: 220 }}
            disableClearable
          />
        ) : null}
        {showSearch ? (
          <TextField
            label="Search"
            size="small"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 200, flexGrow: 1 }}
          />
        ) : (
          <Box sx={{ flexGrow: 1 }} />
        )}
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleDownload("xlsx")}
            disabled={downloading !== null}
            startIcon={downloading === "xlsx" ? <CircularProgress size={14} /> : undefined}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleDownload("pdf")}
            disabled={downloading !== null}
            startIcon={downloading === "pdf" ? <CircularProgress size={14} /> : undefined}
          >
            PDF
          </Button>
        </Stack>
      </Stack>

      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}

      <Box sx={{ width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          pageSizeOptions={[10, 20, 50]}
          loading={loading}
          disableRowSelectionOnClick
          autoHeight
          getRowId={(r: any) =>
            r.indent_dtl_id ??
            r.po_dtl_id ??
            r.inward_dtl_id ??
            r.indent_id ??
            r.po_id ??
            r.inward_id ??
            r.bill_pass_id ??
            r.id ??
            `row-${Math.random().toString(36).slice(2, 10)}`
          }
        />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Showing {rows.length} of {total} rows
      </Typography>
    </Box>
  );
};

export default ReportFilters;
