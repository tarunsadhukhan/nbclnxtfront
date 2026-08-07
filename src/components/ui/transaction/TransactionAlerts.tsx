import React from "react";

export interface TransactionAlert {
  message: string;
  variant?: "error" | "warning" | "info";
}

export interface TransactionAlertsProps {
  pageError?: string | null;
  setupError?: string | null;
  customAlerts?: TransactionAlert[];
  className?: string;
}

/**
 * Displays transaction page alerts (errors, warnings, info).
 * Handles page errors, setup errors, and custom alerts.
 *
 * @example
 * ```tsx
 * <TransactionAlerts
 *   pageError={pageError}
 *   setupError={setupError}
 * />
 * ```
 */
export const TransactionAlerts: React.FC<TransactionAlertsProps> = ({
  pageError,
  setupError,
  customAlerts = [],
  className = "",
}) => {
  const hasAlerts = Boolean(pageError || setupError || customAlerts.length);

  if (!hasAlerts) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {pageError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      ) : null}
      {setupError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}
      {customAlerts.map((alert, index) => {
        const variant = alert.variant || "error";
        const styles =
          variant === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : variant === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-blue-200 bg-blue-50 text-blue-700";
        return (
          <div key={index} className={`rounded-md border px-4 py-3 text-sm ${styles}`}>
            {alert.message}
          </div>
        );
      })}
    </div>
  );
};

export default TransactionAlerts;

