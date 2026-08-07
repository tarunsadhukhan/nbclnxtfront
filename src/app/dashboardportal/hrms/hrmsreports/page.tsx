"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Box,
  TextField,
  Autocomplete,
  Paper,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchReportMenuTree,
  type ReportMenuNode,
} from "@/utils/reportMenuService";

/** Branch option for the selector (kept local — no coupling to other modules). */
interface BranchOption {
  branch_id: number;
  branch_name: string;
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

// Module-level cache of the report list. Persists across client-side
// navigations so the dropdown is populated instantly on every mount.
let cachedReportNodes: ReportMenuNode[] | null = null;

export default function HrmsReportsPage() {
  const router = useRouter();
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const [selectedReport, setSelectedReport] = useState<ReportMenuNode | null>(
    null,
  );
  const [selectedBranch, setSelectedBranch] = useState<BranchOption | null>(
    null,
  );
  const [reportDate, setReportDate] = useState<string>(getYesterdayDate());
  const [dbReports, setDbReports] = useState<ReportMenuNode[]>(
    cachedReportNodes ?? [],
  );

  useEffect(() => {
    let mounted = true;
    fetchReportMenuTree("hrms/hrmsreports")
      .then((res) => {
        if (!mounted) return;
        // Flat list — direct report children of this page's menu.
        const list = res.data.filter(
          (n) => n.menu_parent_id === res.root_menu_id,
        );
        cachedReportNodes = list;
        setDbReports(list);
      })
      .catch(() => {
        // Keep the cached list on a transient failure rather than blanking it.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const branchOptions: BranchOption[] = useMemo(
    () =>
      (selectedCompany?.branches ?? []).map((b) => ({
        branch_id: b.branch_id,
        branch_name: b.branch_name,
      })),
    [selectedCompany?.branches],
  );

  // Default the Branch filter to the branch picked in the left sidebar.
  useEffect(() => {
    if (selectedBranch) return;
    const sidebarId = selectedBranches[0];
    if (sidebarId == null) return;
    const match = branchOptions.find((b) => b.branch_id === sidebarId);
    if (match) setSelectedBranch(match);
  }, [selectedBranch, selectedBranches, branchOptions]);

  const handleReportChange = useCallback(
    (_event: React.SyntheticEvent, node: ReportMenuNode | null) => {
      setSelectedReport(node);
      if (!node?.menu_path) return;
      // Carry the selected branch/date so the report page can populate its data.
      const params = new URLSearchParams();
      if (selectedBranch) {
        params.set("branch_id", String(selectedBranch.branch_id));
      }
      if (reportDate) params.set("date", reportDate);
      router.push(`/dashboardportal/${node.menu_path}?${params.toString()}`);
    },
    [router, selectedBranch, reportDate],
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setReportDate(e.target.value);
    },
    [],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}
      >
        HRMS Reports
      </Typography>

      <Paper elevation={1} sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 2,
            flexWrap: "wrap",
          }}
        >
          {/* Searchable report picker — DB-driven (menu_mst report=1, children of the HRMS reports menu). */}
          <Autocomplete
            options={dbReports}
            getOptionLabel={(option) => option.menu_name}
            isOptionEqualToValue={(option, value) =>
              option.menu_id === value.menu_id
            }
            value={selectedReport}
            onChange={handleReportChange}
            renderInput={(params) => (
              <TextField {...params} label="Report" size="small" />
            )}
            sx={{ minWidth: 280 }}
          />

          <Autocomplete
            options={branchOptions}
            getOptionLabel={(option) => option.branch_name}
            isOptionEqualToValue={(option, value) =>
              option.branch_id === value.branch_id
            }
            value={selectedBranch}
            onChange={(_, newValue) => setSelectedBranch(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Branch" size="small" required />
            )}
            sx={{ minWidth: 240 }}
          />
          <TextField
            type="date"
            label="Report Date"
            value={reportDate}
            onChange={handleDateChange}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 180 }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
