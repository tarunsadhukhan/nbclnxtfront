import React from "react";

export interface BranchFilterableRecord {
  id: string;
  branchId?: string;
}

export interface Option {
  label: string;
  value: string;
}

/**
 * Hook to filter options by branch ID.
 * Useful for departments, projects, and other branch-scoped entities.
 *
 * @example
 * ```tsx
 * const departmentOptions = useBranchFilteredOptions({
 *   records: departments,
 *   branchId: branchIdForSetup,
 *   getLabel: (dept) => dept.name || dept.id,
 *   getValue: (dept) => dept.id,
 * });
 * ```
 */
export function useBranchFilteredOptions<T extends BranchFilterableRecord>(options: {
  records: T[];
  branchId?: string;
  getLabel: (record: T) => string;
  getValue: (record: T) => string;
}): Option[] {
  const { records, branchId, getLabel, getValue } = options;

  return React.useMemo(() => {
    if (!records.length) return [];
    return records
      .filter((record) => !branchId || !record.branchId || record.branchId === branchId)
      .map((record) => ({
        label: getLabel(record),
        value: getValue(record),
      }));
  }, [records, branchId, getLabel, getValue]);
}

export default useBranchFilteredOptions;

