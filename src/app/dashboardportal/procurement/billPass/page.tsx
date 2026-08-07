"use client";

/**
 * @component BillPassIndexPage
 * @description Bill Pass index page showing approved SRs with DRCR adjustments.
 * Bill Pass consolidates SR total, debit notes, credit notes to show net payable amount.
 * Editable until marked complete (billpass_status = 1).
 */

import * as React from "react";
import { Alert, Chip, Tooltip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { useRouter } from "next/navigation";

import IndexWrapper from "@/components/ui/IndexWrapper";
import { createNotEqualEditCheck } from "@/utils/editability";
import {
  fetchBillPassList,
  formatCurrency,
  formatBillPassDate,
  type BillPassListItem,
} from "@/utils/billPassService";

type BillPassRow = BillPassListItem;

const isRowEditable = createNotEqualEditCheck<BillPassRow>("billpass_status", 1);

export default function BillPassIndexPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<BillPassRow[]>([]);
  const [totalRows, setTotalRows] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [searchValue, setSearchValue] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Get coId from localStorage like other pages
  const getCoId = React.useCallback((): string => {
    try {
      const storedCompany = localStorage.getItem("sidebar_selectedCompany");
      if (storedCompany) {
        const parsed = JSON.parse(storedCompany);
        return parsed?.co_id ? String(parsed.co_id) : "";
      }
    } catch {
      // ignore
    }
    return "";
  }, []);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    const coId = getCoId();
    if (!coId) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await fetchBillPassList(coId, {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchValue || undefined,
      });

      if (error) {
        setErrorMessage(error);
        setRows([]);
        setTotalRows(0);
        return;
      }

      if (data) {
        setRows(data.data || []);
        setTotalRows(data.total || 0);
      }
    } catch (err) {
      setErrorMessage("Failed to fetch bill pass list");
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [getCoId, paginationModel.page, paginationModel.pageSize, searchValue]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Navigate to detail view (completed bill passes)
  const handleView = React.useCallback(
    (row: BillPassRow) => {
      const id = row.inward_id;
      if (!id) return;
      router.push(`/dashboardportal/procurement/billPass/${id}`);
    },
    [router]
  );

  // Navigate to edit page (non-complete bill passes)
  const handleEdit = React.useCallback(
    (row: BillPassRow) => {
      const id = row.inward_id;
      if (!id) return;
      router.push(`/dashboardportal/procurement/billPass/edit?id=${id}`);
    },
    [router]
  );

  // Column definitions
  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "bill_pass_no",
        headerName: "SR No.",
        flex: 1,
        minWidth: 140,
        renderCell: (params: GridRenderCellParams<BillPassRow, string>) => (
          <Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
            {params.value || "-"}
          </Typography>
        ),
      },
      {
        field: "bill_pass_date",
        headerName: "SR Date",
        minWidth: 120,
        renderCell: (params: GridRenderCellParams<BillPassRow, string>) => (
          <Typography component="span" variant="body2">
            {formatBillPassDate(params.value)}
          </Typography>
        ),
      },
      {
        field: "inward_no",
        headerName: "Inward No.",
        flex: 1,
        minWidth: 140,
        renderCell: (params: GridRenderCellParams<BillPassRow, string>) => (
          <Typography component="span" variant="body2">
            {params.value || "-"}
          </Typography>
        ),
      },
      {
        field: "supplier_name",
        headerName: "Supplier",
        flex: 1.2,
        minWidth: 160,
      },
      {
        field: "sr_total",
        headerName: "SR Total",
        minWidth: 120,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<BillPassRow, number>) => (
          <Typography component="span" variant="body2" sx={{ fontFamily: "monospace" }}>
            {formatCurrency(params.value)}
          </Typography>
        ),
      },
      {
        field: "dr_total",
        headerName: "Debit Notes",
        minWidth: 120,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<BillPassRow>) => {
          const drTotal = params.row.dr_total || 0;
          const drCount = params.row.dr_count || 0;
          if (drCount === 0) {
            return (
              <Typography component="span" variant="body2" color="text.secondary">
                -
              </Typography>
            );
          }
          return (
            <Tooltip title={`${drCount} debit note(s)`}>
              <Typography component="span" variant="body2" color="error" sx={{ fontFamily: "monospace" }}>
                -{formatCurrency(drTotal)}
              </Typography>
            </Tooltip>
          );
        },
      },
      {
        field: "cr_total",
        headerName: "Credit Notes",
        minWidth: 120,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<BillPassRow>) => {
          const crTotal = params.row.cr_total || 0;
          const crCount = params.row.cr_count || 0;
          if (crCount === 0) {
            return (
              <Typography component="span" variant="body2" color="text.secondary">
                -
              </Typography>
            );
          }
          return (
            <Tooltip title={`${crCount} credit note(s)`}>
              <Typography component="span" variant="body2" color="success.main" sx={{ fontFamily: "monospace" }}>
                +{formatCurrency(crTotal)}
              </Typography>
            </Tooltip>
          );
        },
      },
      {
        field: "net_payable",
        headerName: "Net Payable",
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<BillPassRow, number>) => (
          <Chip
            label={formatCurrency(params.value)}
            size="small"
            color="primary"
            sx={{ fontFamily: "monospace", fontWeight: 600 }}
          />
        ),
      },
      {
        field: "billpass_status",
        headerName: "Status",
        minWidth: 110,
        renderCell: (params: GridRenderCellParams<BillPassRow, number>) => (
          <Chip
            label={params.value === 1 ? "Complete" : "Pending"}
            size="small"
            color={params.value === 1 ? "success" : "warning"}
            variant="outlined"
          />
        ),
      },
    ],
    []
  );

  const handlePaginationModelChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
  };

  const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setSearchValue(value);
  }, []);

  return (
    <IndexWrapper
      title="Bill Pass"
      subtitle="Payment consolidation for approved Stores Receipts"
      rows={rows}
      columns={columns}
      loading={loading}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      rowCount={totalRows}
      search={{
        value: searchValue,
        onChange: handleSearchChange,
        placeholder: "Search by SR no., inward no., supplier, or invoice",
        debounceDelayMs: 1000,
      }}
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
