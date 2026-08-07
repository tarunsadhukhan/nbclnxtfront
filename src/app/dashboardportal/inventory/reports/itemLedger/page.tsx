"use client";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { usePathname } from "next/navigation";
import ReportGrid, { numCol } from "@/components/reports/ReportGrid";
import { exportRowsToExcel } from "@/components/reports/exportExcel";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { resolveReportMenuId } from "@/utils/reportMenuService";
import {
  fetchItemLedgerReport,
  searchItems,
  type ItemOption,
} from "@/utils/inventoryReportService";

type LedgerGridRow = {
  id: string | number;
  item_code: string;
  item_name: string;
  uom: string;
  txn_type: string;
  txn_date: string;
  ref_no: string | null;
  opening_qty: number;
  opening_val: number;
  in_qty: number;
  in_val: number;
  out_qty: number;
  out_val: number;
  balance: number;
  balance_val: number;
};

const columns: GridColDef<LedgerGridRow>[] = [
  { field: "item_code", headerName: "Item Code", width: 110 },
  { field: "item_name", headerName: "Item Description", flex: 1, minWidth: 160 },
  { field: "uom", headerName: "Unit", width: 70 },
  { field: "txn_type", headerName: "Transaction Type", width: 100 },
  { field: "txn_date", headerName: "Transaction Date", width: 120 },
  { field: "ref_no", headerName: "Doc No", minWidth: 160 },
  numCol("opening_qty", "Opening Qty"),
  numCol("opening_val", "Opening Value"),
  numCol("in_qty", "Received Qty"),
  numCol("in_val", "Received Value"),
  numCol("out_qty", "Issue Qty"),
  numCol("out_val", "Issue Value"),
  numCol("balance", "Closing Qty", 130),
  numCol("balance_val", "Closing Value", 130),
];

/** ISO (YYYY-MM-DD) → legacy Data-Portal DD-MM-YYYY. */
const dmy = (d: string | null | undefined): string =>
  d ? d.slice(0, 10).split("-").reverse().join("-") : "";

// ponytail: legacy Data-Portal single-letter transaction codes
const TYPE_CODE: Record<string, string> = { Receipt: "R", Issue: "I" };

function ItemLedgerContent() {
  const { branches, coId, companyName, initialBranchId, dateParam } =
    useReportBranches();
  const pathname = usePathname();
  const { from, to } = currentMonthRange();

  const [branchId, setBranchId] = useState<number | null>(initialBranchId);
  const [dateFrom, setDateFrom] = useState<string>(from);
  const [dateTo, setDateTo] = useState<string>(dateParam || to);

  // Async item picker (server-side search via item_search).
  const [itemInput, setItemInput] = useState("");
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);

  const [openingQty, setOpeningQty] = useState(0);
  const [openingVal, setOpeningVal] = useState(0);
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof fetchItemLedgerReport>>["rows"]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced item search.
  useEffect(() => {
    if (coId == null) return;
    const q = itemInput.trim();
    const handle = setTimeout(() => {
      setItemLoading(true);
      searchItems(coId, q)
        .then(setItemOptions)
        .catch(() => setItemOptions([]))
        .finally(() => setItemLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [itemInput, coId]);

  const runReport = useCallback(async () => {
    if (coId == null || selectedItem == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchItemLedgerReport({
        coId,
        itemId: selectedItem.item_id,
        dateFrom,
        dateTo,
        branchId,
      });
      setOpeningQty(res.openingQty);
      setOpeningVal(res.openingVal);
      setRows(res.rows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load report");
      setRows([]);
      setOpeningQty(0);
      setOpeningVal(0);
    } finally {
      setLoading(false);
    }
  }, [coId, selectedItem, dateFrom, dateTo, branchId]);

  const gridRows: LedgerGridRow[] = useMemo(() => {
    const itemCode = selectedItem?.full_item_code ?? "";
    const itemName = selectedItem?.item_name ?? "";
    const uom = selectedItem?.uom_name ?? "";
    const txns: LedgerGridRow[] = rows.map((r, i) => ({
      id: i,
      item_code: itemCode,
      item_name: itemName,
      uom,
      txn_type: TYPE_CODE[r.txn_type] ?? r.txn_type,
      txn_date: dmy(r.txn_date),
      ref_no: r.ref_no,
      opening_qty: 0,
      opening_val: 0,
      in_qty: r.in_qty,
      in_val: r.in_val,
      out_qty: r.out_qty,
      out_val: r.out_val,
      balance: r.balance,
      balance_val: r.balance_val,
    }));
    const last = txns[txns.length - 1];
    return [
      {
        id: "opening",
        item_code: itemCode,
        item_name: itemName,
        uom,
        txn_type: "O",
        txn_date: dmy(dateFrom),
        ref_no: "(0)",
        opening_qty: openingQty,
        opening_val: openingVal,
        in_qty: 0,
        in_val: 0,
        out_qty: 0,
        out_val: 0,
        balance: openingQty,
        balance_val: openingVal,
      },
      ...txns,
      {
        id: "closing",
        item_code: "",
        item_name: "",
        uom: "",
        txn_type: "",
        txn_date: dmy(dateTo),
        ref_no: "Closing",
        opening_qty: 0,
        opening_val: 0,
        in_qty: txns.reduce((s, r) => s + r.in_qty, 0),
        in_val: txns.reduce((s, r) => s + r.in_val, 0),
        out_qty: txns.reduce((s, r) => s + r.out_qty, 0),
        out_val: txns.reduce((s, r) => s + r.out_val, 0),
        balance: last?.balance ?? openingQty,
        balance_val: last?.balance_val ?? openingVal,
      },
    ];
  }, [rows, openingQty, openingVal, dateFrom, dateTo, selectedItem]);

  const branch = branches.find((b) => b.branch_id === branchId) ?? null;

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}
      >
        Item Ledger
      </Typography>

      <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
        >
          <Autocomplete
            options={itemOptions}
            loading={itemLoading}
            filterOptions={(x) => x}
            getOptionLabel={(o) =>
              o.full_item_code ? `${o.full_item_code} — ${o.item_name}` : o.item_name
            }
            isOptionEqualToValue={(o, v) => o.item_id === v.item_id}
            value={selectedItem}
            onChange={(_, v) => setSelectedItem(v)}
            onInputChange={(_, v) => setItemInput(v)}
            renderOption={(props, option) => {
              // Key by item_id — item labels (code + name) can collide.
              const { key: _ignored, ...liProps } = props as typeof props & {
                key?: string;
              };
              return (
                <li {...liProps} key={option.item_id}>
                  {option.full_item_code
                    ? `${option.full_item_code} — ${option.item_name}`
                    : option.item_name}
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} label="Item" size="small" required />
            )}
            sx={{ minWidth: 320 }}
          />

          <Autocomplete
            options={branches}
            getOptionLabel={(o) => o.branch_name}
            isOptionEqualToValue={(o, v) => o.branch_id === v.branch_id}
            value={branch}
            onChange={(_, v) => setBranchId(v?.branch_id ?? null)}
            renderInput={(params) => (
              <TextField {...params} label="Branch" size="small" />
            )}
            sx={{ minWidth: 220 }}
          />

          <TextField
            type="date"
            label="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />
          <TextField
            type="date"
            label="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />

          <Button
            variant="contained"
            disabled={selectedItem == null || loading}
            onClick={() => {
              void runReport();
            }}
            sx={{
              backgroundColor: "#0C3C60",
              "&:hover": { backgroundColor: "#092d47" },
              textTransform: "none",
            }}
          >
            Submit
          </Button>
          <Button
            variant="outlined"
            disabled={rows.length === 0}
            onClick={() => {
              void (async () =>
                exportRowsToExcel(columns, gridRows, "item-ledger", {
                  companyName,
                  branchName: branch?.branch_name,
                  reportName: "Item Ledger",
                  reportNo: await resolveReportMenuId(pathname),
                  reportFor: [dateFrom, dateTo].filter(Boolean).join(" To "),
                }))();
            }}
            sx={{ textTransform: "none" }}
          >
            Export to Excel
          </Button>
        </Box>
      </Paper>

      {selectedItem == null ? (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            Select an item to view its ledger
          </Typography>
        </Box>
      ) : (
        <ReportGrid
          rows={gridRows}
          columns={columns}
          getRowId={(r) => r.id}
          loading={loading}
          error={error}
        />
      )}
    </Box>
  );
}

export default function ItemLedgerPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <ItemLedgerContent />
    </Suspense>
  );
}
