"use client";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import type { BranchOption } from "./types";

/**
 * Shared branch options + the selected company id + the initial branch/date
 * seeded from the reports-hub query params (falling back to the sidebar branch).
 * Pages using this must wrap their content in a <Suspense> boundary (it reads
 * useSearchParams).
 */
export function useReportBranches(): {
  branches: BranchOption[];
  coId: number | null;
  companyName: string | null;
  initialBranchId: number | null;
  dateParam: string | null;
} {
  const searchParams = useSearchParams();
  const { selectedCompany, selectedBranches } = useSidebarContext();

  const branches: BranchOption[] = useMemo(
    () =>
      (selectedCompany?.branches ?? []).map((b) => ({
        branch_id: b.branch_id,
        branch_name: b.branch_name,
      })),
    [selectedCompany?.branches],
  );

  const urlBranch = searchParams.get("branch_id");
  const initialBranchId = urlBranch
    ? Number(urlBranch)
    : (selectedBranches[0] ?? null);

  return {
    branches,
    coId: selectedCompany?.co_id ?? null,
    companyName: selectedCompany?.co_name ?? null,
    initialBranchId,
    dateParam: searchParams.get("date"),
  };
}
