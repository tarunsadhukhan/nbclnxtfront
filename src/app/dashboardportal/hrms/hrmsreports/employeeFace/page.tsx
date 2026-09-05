"use client";
import React, { Suspense, useState } from "react";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { useReportBranches } from "@/components/reports/useReportBranches";
import {
  employeeFacePhotoUrl,
  fetchEmployeeFace,
  type EmployeeFaceRow,
} from "@/utils/hrmsReportService";

const columns: GridColDef<EmployeeFaceRow>[] = [
  { field: "emp_code", headerName: "EB No", width: 110 },
  { field: "emp_name", headerName: "Name", flex: 1, minWidth: 200 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 150 },
  { field: "sub_department", headerName: "Sub Department", flex: 1, minWidth: 150 },
  { field: "active", headerName: "Active", width: 90 },
  { field: "has_face", headerName: "Face Embedding", width: 130 },
  { field: "has_mobile_face", headerName: "Mobile Embedding", width: 140 },
  { field: "has_photo", headerName: "Photo", width: 90 },
  { field: "mobile_model_ver", headerName: "Mobile Model", width: 150 },
  { field: "mobile_embed_updated", headerName: "Mobile Embed Updated", width: 170 },
  { field: "updated_date_time", headerName: "Updated On", width: 150 },
];

function Content() {
  const { coId, branches, initialBranchId } = useReportBranches();
  // Row whose captured photo is open in the dialog (double-click a row).
  const [photoRow, setPhotoRow] = useState<EmployeeFaceRow | null>(null);

  return (
    <>
      <ReportPanel
        title="Employee Face Register"
        branches={branches}
        initialBranchId={initialBranchId}
        dates="none"
        extra={{
          label: "Status",
          options: [
            { value: "", label: "All" },
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
          ],
        }}
        initialExtra="1"
        fetcher={(f) =>
          coId == null
            ? Promise.resolve([])
            : fetchEmployeeFace({ coId, branchId: f.branchId, active: f.extra })
        }
        columns={columns}
        getRowId={(r) => r.id}
        sortField="updated_date_time"
        sortDir="desc"
        exportName="employee_face_register"
        onRowDoubleClick={(r) => {
          if (r.has_photo === "Yes") setPhotoRow(r);
        }}
      />

      <Dialog open={photoRow != null} onClose={() => setPhotoRow(null)} maxWidth="sm">
        <DialogTitle>
          {photoRow?.emp_code} - {photoRow?.emp_name}
        </DialogTitle>
        <DialogContent>
          {photoRow && coId != null && (
            <Box
              component="img"
              src={employeeFacePhotoUrl(coId, photoRow.id)}
              alt={photoRow.emp_name ?? "Employee face"}
              sx={{ display: "block", maxWidth: "100%", maxHeight: "70vh" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function EmployeeFacePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <Content />
    </Suspense>
  );
}
