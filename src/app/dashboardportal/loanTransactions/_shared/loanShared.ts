/**
 * Shared types + setup hook for the Loan Transactions menu (port of the legacy
 * Smart-Eye Loan / Advance Entry, Loan Stop/Change Bulk, Loan Stop For ALL and
 * Loan Repayment screens). Single type file for the module — do not split.
 *
 * Backend: src/hrms/loanTransactions.py. Rows live in the migrated legacy
 * tables (payoloan, payloanchange, payloanstopall, payloanadjust), keyed by the
 * legacy EB no (ECode = emp_code).
 */
"use client";

import { useEffect, useState } from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

export interface LoanTypeOption {
  loan_name: string;
  loan_type: string;
  interest_rate: number;
}

export interface PayPeriod {
  id: number;
  code: string;
  name: string;
  from_date: string;
  to_date: string;
}

export interface LoanSetup {
  loan_types: LoanTypeOption[];
  grades: string[];
  periods: PayPeriod[];
}

/** GET loan_employee — HRMS details + PF-loan balance (legacy GetLoanEMI). */
export interface LoanEmployee {
  ecode: string;
  ename: string;
  dept_code: string;
  dept_name: string;
  bank_name: string;
  ifsc_code: string;
  bank_acc_no: string;
  grade: string;
  bal_loan: number;
  bal_int: number;
}

export interface Paged<T> {
  data: T[];
  total: number;
}

export const periodLabel = (p: PayPeriod) => `${p.name} (${p.code}) ${p.from_date} to ${p.to_date}`;

const EMPTY_SETUP: LoanSetup = Object.freeze({
  loan_types: [],
  grades: [],
  periods: [],
}) as unknown as LoanSetup;

/** Selected branch from the sidebar + the loan setup lists for it. */
export function useLoanSetup() {
  const { selectedBranches } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;
  const [setup, setSetup] = useState<LoanSetup>(EMPTY_SETUP);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    if (branchId == null) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await fetchWithCookie<{ data: LoanSetup }>(
        `${apiRoutesPortalMasters.LOAN_SETUP}?branch_id=${branchId}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data) {
        setSetup(EMPTY_SETUP);
        setSetupError(error || "Failed to load loan setup");
        return;
      }
      setSetupError(null);
      setSetup(data.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  return { branchId, setup, setupError };
}

/** Fetch one employee by EB no; `asOf` (YYYY-MM-DD) adds the PF-loan balance. */
export async function fetchLoanEmployee(
  branchId: number,
  code: string,
  asOf?: string,
): Promise<{ emp: LoanEmployee | null; error: string | null }> {
  const params = new URLSearchParams({ branch_id: String(branchId), code });
  if (asOf) params.append("as_of", asOf);
  const { data, error } = await fetchWithCookie<{ data: LoanEmployee }>(
    `${apiRoutesPortalMasters.LOAN_EMPLOYEE}?${params}`,
    "GET",
  );
  return { emp: data?.data ?? null, error: error ?? (data ? null : "Employee not found") };
}
