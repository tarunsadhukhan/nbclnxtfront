import type { ComponentType } from "react";
import AllIndentItemwise from "./AllIndentItemwise";
import BillPassReport from "./BillPassReport";
import AllPurchaseOrders from "./AllPurchaseOrders";
import AllIndents from "./AllIndents";
import SrRegister from "./SrRegister";
import IndentsWaitingForPo from "./IndentsWaitingForPo";
import OutstandingPoList from "./OutstandingPoList";
import OutstandingIndentList from "./OutstandingIndentList";

export type ReportKey =
  | "all-indent-itemwise"
  | "bill-pass"
  | "all-po"
  | "all-indent"
  | "sr-register"
  | "indents-waiting-for-po"
  | "outstanding-po"
  | "outstanding-indent";

export const reportConfig: Record<ReportKey, { label: string; component: ComponentType }> = {
  "all-indent-itemwise":    { label: "1. All Indents (Item-wise) with Statuses", component: AllIndentItemwise },
  "bill-pass":              { label: "2. Bill Pass Report",                       component: BillPassReport },
  "all-po":                 { label: "3. All Purchase Orders",                    component: AllPurchaseOrders },
  "all-indent":             { label: "4. All Indents",                            component: AllIndents },
  "sr-register":            { label: "5. SR Register",                            component: SrRegister },
  "indents-waiting-for-po": { label: "6. Indents Waiting for PO",                 component: IndentsWaitingForPo },
  "outstanding-po":         { label: "7. Outstanding PO List",                    component: OutstandingPoList },
  "outstanding-indent":     { label: "8. Outstanding Indent List",                component: OutstandingIndentList },
};

export const reportOrder: ReportKey[] = [
  "all-indent-itemwise",
  "bill-pass",
  "all-po",
  "all-indent",
  "sr-register",
  "indents-waiting-for-po",
  "outstanding-po",
  "outstanding-indent",
];
