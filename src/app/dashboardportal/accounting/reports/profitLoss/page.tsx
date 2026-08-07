"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchProfitLoss } from "@/utils/accountingService";
import type {
  ProfitLossData,
  ProfitLossSection,
} from "@/app/dashboardportal/accounting/types/accountingTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// ---------------------------------------------------------------------------
// Sub-component: Section renderer
// ---------------------------------------------------------------------------

function SectionList({
  title,
  section,
}: {
  title: string;
  section: ProfitLossSection;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        {title}
      </Typography>
      <List dense disablePadding>
        {section.items.map((item, idx) => (
          <ListItem key={`${item.group_name}-${item.ledger_name ?? ""}-${idx}`} sx={{ py: 0.25 }}>
            <ListItemText
              primary={item.ledger_name ?? item.group_name}
              secondary={item.ledger_name ? item.group_name : undefined}
              slotProps={{ primary: { variant: "body2" }, secondary: { variant: "caption" } }}
            />
            <Typography variant="body2" fontWeight={600}>
              {formatCurrency(item.amount)}
            </Typography>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ display: "flex", justifyContent: "space-between", px: 2, py: 0.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Total {title}
        </Typography>
        <Typography variant="subtitle2" fontWeight={700}>
          {formatCurrency(section.total)}
        </Typography>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfitLossPage() {
  const { selectedCompany } = useSidebarContext();

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [branchId, setBranchId] = useState("");

  // Data
  const [plData, setPlData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany || !fromDate || !toDate) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchProfitLoss({
        coId: selectedCompany.co_id,
        fromDate,
        toDate,
        branchId: branchId ? Number(branchId) : undefined,
      });

      // The service returns ProfitLossSection[] but the page expects ProfitLossData.
      // Adapt: if the API already returns the structured object, cast it.
      // Otherwise build from sections array.
      if (Array.isArray(raw)) {
        const sections = raw as unknown as ProfitLossSection[];
        const findSection = (name: string): ProfitLossSection =>
          sections.find((s) => s.section.toLowerCase() === name.toLowerCase()) ?? {
            section: name,
            items: [],
            total: 0,
          };

        const tradingIncome = findSection("Trading Income");
        const tradingExpense = findSection("Trading Expense");
        const plIncome = findSection("P&L Income");
        const plExpense = findSection("P&L Expense");

        const grossProfit = tradingIncome.total - tradingExpense.total;
        const netProfit = grossProfit + plIncome.total - plExpense.total;

        setPlData({
          trading: {
            income: tradingIncome,
            expense: tradingExpense,
            gross_profit: grossProfit,
          },
          pl: {
            income: plIncome,
            expense: plExpense,
            net_profit: netProfit,
          },
        });
      } else {
        setPlData(raw as unknown as ProfitLossData);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load Profit & Loss";
      setError(message);
      setPlData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, fromDate, toDate, branchId]);

  useEffect(() => {
    if (fromDate && toDate) {
      fetchData();
    }
  }, [fetchData, fromDate, toDate]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Profit &amp; Loss
      </Typography>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          label="From Date"
          type="date"
          size="small"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To Date"
          type="date"
          size="small"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Branch ID"
          type="number"
          size="small"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          sx={{ width: 120 }}
        />
        <Button variant="contained" onClick={fetchData} disabled={!fromDate || !toDate || loading}>
          Load
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : plData ? (
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {/* Trading Account */}
          <Paper sx={{ flex: 1, minWidth: 360, p: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Trading Account
            </Typography>
            <SectionList title="Income" section={plData.trading.income} />
            <SectionList title="Expense" section={plData.trading.expense} />
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", px: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Gross Profit
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                color={plData.trading.gross_profit >= 0 ? "success.main" : "error.main"}
              >
                {formatCurrency(plData.trading.gross_profit)}
              </Typography>
            </Box>
          </Paper>

          {/* P&L Account */}
          <Paper sx={{ flex: 1, minWidth: 360, p: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Profit &amp; Loss Account
            </Typography>
            <SectionList title="Income" section={plData.pl.income} />
            <SectionList title="Expense" section={plData.pl.expense} />
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", px: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Net Profit
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                color={plData.pl.net_profit >= 0 ? "success.main" : "error.main"}
              >
                {formatCurrency(plData.pl.net_profit)}
              </Typography>
            </Box>
          </Paper>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Select date range and click Load to view Profit &amp; Loss report.
        </Typography>
      )}
    </Box>
  );
}
