"use client";
import { GridColDef } from "@mui/x-data-grid";
import { apiRoutesPortalMasters } from "@/utils/api";
import LoanIndexPage from "../_shared/LoanIndexPage";
import LoanChangeDialog, { type LoanChangeDocRow } from "./LoanChangeDialog";

const columns: GridColDef<LoanChangeDocRow>[] = [
  { field: "doc_entry", headerName: "DOC NO", width: 90 },
  { field: "pcode", headerName: "PERIOD", width: 120 },
  { field: "from_date", headerName: "FROM", width: 110 },
  { field: "to_date", headerName: "TO", width: 110 },
  { field: "grade", headerName: "GRADE", width: 140 },
  { field: "loan_type", headerName: "LOAN TYPE", width: 120 },
  { field: "line_count", headerName: "ROWS", type: "number", width: 80 },
  { field: "cap_stops", headerName: "CAP. STOPS", type: "number", width: 110 },
  { field: "int_stops", headerName: "INT. STOPS", type: "number", width: 110 },
  { field: "created_date", headerName: "CREATED", flex: 1, minWidth: 160 },
];

/** Loan Stop / Change Bulk — EMI change / stop documents (payloanchange). */
export default function LoanStopChangeBulkPage() {
  return (
    <LoanIndexPage
      title="Loan Stop / Change Bulk"
      listUrl={apiRoutesPortalMasters.LOAN_CHANGE_LIST}
      columns={columns}
      rowId={(r) => r.doc_entry}
      searchPlaceholder="Search doc no, period, grade or loan type"
      createLabel="New Stop / Change"
      Dialog={LoanChangeDialog}
    />
  );
}
