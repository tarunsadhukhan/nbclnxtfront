import React from "react";

export type StatusChipColor = "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info";

export interface StatusChipConfig {
  label: string;
  color: StatusChipColor;
}

export type StatusColorMapper = (status: string) => StatusChipColor;

/**
 * Default status-to-color mapping.
 * Maps common status values to MUI chip colors.
 */
const defaultStatusColorMapper: StatusColorMapper = (status: string): StatusChipColor => {
  const normalized = status.toLowerCase();
  if (normalized === "approved" || normalized === "active" || normalized === "completed") {
    return "success";
  }
  if (normalized === "rejected" || normalized === "cancelled" || normalized === "failed") {
    return "error";
  }
  if (normalized === "pending" || normalized === "draft" || normalized === "in-progress") {
    return "warning";
  }
  return "info";
};

export interface UseStatusChipOptions {
  status?: string | null;
  customMapper?: StatusColorMapper;
}

/**
 * Hook to generate status chip configuration from a status string.
 * Provides a consistent way to map status values to chip colors across transaction pages.
 *
 * @example
 * ```tsx
 * const statusChip = useStatusChip({ status: indentDetails?.status });
 * // Returns: { label: "Approved", color: "success" } or undefined
 *
 * // With custom mapping:
 * const statusChip = useStatusChip({
 *   status: order.status,
 *   customMapper: (status) => {
 *     if (status === "shipped") return "success";
 *     return "info";
 *   }
 * });
 * ```
 */
export function useStatusChip(options: UseStatusChipOptions): StatusChipConfig | undefined {
  const { status, customMapper = defaultStatusColorMapper } = options;

  return React.useMemo(() => {
    if (!status) return undefined;
    return {
      label: status,
      color: customMapper(status),
    };
  }, [status, customMapper]);
}

export default useStatusChip;

