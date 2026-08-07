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
import { fetchBalanceSheet } from "@/utils/accountingService";
import type {
  BalanceSheetData,
  BalanceSheetSection,
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

function BSSection({
  title,
  sections,
  total,
}: {
  title: string;
  sections: BalanceSheetSection[];
  total: number;
}) {
  return (
    <Paper sx={{ flex: 1, minWidth: 360, p: 2 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {sections.map((section, sIdx) => (
        <Box key={`${section.section}-${sIdx}`} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
            {section.section}
          </Typography>
          <List dense disablePadding>
            {section.items.map((item, idx) => (
              <ListItem
                key={`${item.group_name}-${item.ledger_name ?? ""}-${idx}`}
                sx={{ py: 0.25 }}
              >
                <ListItemText
                  primary={item.ledger_name ?? item.group_name}
                  secondary={item.ledger_name ? item.group_name : undefined}
                  slotProps={{
                    primary: { variant: "body2" },
                    secondary: { variant: "caption" },
                  }}
                />
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(item.amount)}
                </Typography>
              </ListItem>
            ))}
          </List>
          <Divider />
          <Box sx={{ display: "flex", justifyContent: "space-between", px: 2, py: 0.5 }}>
            <Typography variant="caption" fontWeight={700}>
              Sub-total
            </Typography>
            <Typography variant="caption" fontWeight={700}>
              {formatCurrency(section.total)}
            </Typography>
          </Box>
        </Box>
      ))}
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", px: 2, py: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Total {title}
        </Typography>
        <Typography variant="subtitle1" fontWeight={700}>
          {formatCurrency(total)}
        </Typography>
      </Box>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BalanceSheetPage() {
  const { selectedCompany } = useSidebarContext();

  // Filters
  const [asOnDate, setAsOnDate] = useState("");
  const [branchId, setBranchId] = useState("");

  // Data
  const [bsData, setBsData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany || !asOnDate) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchBalanceSheet({
        coId: selectedCompany.co_id,
        asOnDate,
        branchId: branchId ? Number(branchId) : undefined,
      });

      // The service returns BalanceSheetSection[] but the page expects BalanceSheetData.
      // Adapt based on API response shape.
      if (Array.isArray(raw)) {
        const sections = raw as unknown as BalanceSheetSection[];
        const assetSections = sections.filter(
          (s) => s.section.toLowerCase().includes("asset")
        );
        const liabilitySections = sections.filter(
          (s) =>
            s.section.toLowerCase().includes("liabilit") ||
            s.section.toLowerCase().includes("equity") ||
            s.section.toLowerCase().includes("capital")
        );

        const totalAssets = assetSections.reduce((sum, s) => sum + s.total, 0);
        const totalLiabilities = liabilitySections.reduce((sum, s) => sum + s.total, 0);

        setBsData({
          assets: assetSections,
          liabilities: liabilitySections,
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
        });
      } else {
        setBsData(raw as unknown as BalanceSheetData);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load balance sheet";
      setError(message);
      setBsData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, asOnDate, branchId]);

  useEffect(() => {
    if (asOnDate) {
      fetchData();
    }
  }, [fetchData, asOnDate]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const balanceMatches =
    bsData !== null &&
    Math.abs(bsData.total_assets - bsData.total_liabilities) < 0.01;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Balance Sheet
      </Typography>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          label="As On Date"
          type="date"
          size="small"
          value={asOnDate}
          onChange={(e) => setAsOnDate(e.target.value)}
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
        <Button variant="contained" onClick={fetchData} disabled={!asOnDate || loading}>
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
      ) : bsData ? (
        <>
          {!balanceMatches && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Assets ({formatCurrency(bsData.total_assets)}) and Liabilities (
              {formatCurrency(bsData.total_liabilities)}) do not match. There may
              be a data discrepancy.
            </Alert>
          )}
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <BSSection
              title="Assets"
              sections={bsData.assets}
              total={bsData.total_assets}
            />
            <BSSection
              title="Liabilities"
              sections={bsData.liabilities}
              total={bsData.total_liabilities}
            />
          </Box>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Select a date and click Load to view the Balance Sheet.
        </Typography>
      )}
    </Box>
  );
}
