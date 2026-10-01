"use client";
import { GridColDef } from "@mui/x-data-grid";
import { apiRoutesPortalMasters } from "@/utils/api";
import LoanIndexPage from "../_shared/LoanIndexPage";
import LoanEntryDialog, { type LoanDocRow } from "./LoanEntryDialog";

const columns: GridColDef<LoanDocRow>[] = [
  { field: "doc_entry", headerName: "DOC NO", width: 90 },
  { field: "loan_date", headerName: "LOAN DATE", width: 120 },
  { field: "emi_date", headerName: "EMI DATE", width: 120 },
  { field: "doc_type", headerName: "DOC TYPE", width: 120 },
  { field: "grade", headerName: "GRADE", width: 140 },
  { field: "first_employee", headerName: "FIRST EMPLOYEE", flex: 1, minWidth: 200 },
  { field: "line_count", headerName: "LINES", type: "number", width: 80 },
  { field: "total_sanction", headerName: "SANCTION", type: "number", width: 120 },
];

/** Loan / Advance Entry — loan documents (payoloan grouped by DocEntry). */
export default function LoanAdvanceEntryPage() {
  return (
    <LoanIndexPage
      title="Loan / Advance Entry"
      listUrl={apiRoutesPortalMasters.LOAN_ENTRY_LIST}
      columns={columns}
      rowId={(r) => r.doc_entry}
      searchPlaceholder="Search doc no, EB no, name or type"
      createLabel="New Loan"
      Dialog={LoanEntryDialog}
    />
  );
}
