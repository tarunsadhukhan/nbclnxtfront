/**
 * Hook for fetching stock outstanding data.
 */

import * as React from "react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { StockOutstandingItem } from "../types/juteIssueTypes";

type UseStockOutstandingParams = {
  coId: string | null;
  branchId: string;
  itemId?: string;
  issueDate?: string;
};

type UseStockOutstandingReturn = {
  stockItems: StockOutstandingItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export const useStockOutstanding = ({
  coId,
  branchId,
  itemId,
  issueDate,
}: UseStockOutstandingParams): UseStockOutstandingReturn => {
  const [stockItems, setStockItems] = React.useState<StockOutstandingItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStock = React.useCallback(async () => {
    if (!coId || !branchId) {
      setStockItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        co_id: coId,
        branch_id: branchId,
      });
      if (itemId) {
        params.set("item_id", itemId);
      }
      if (issueDate) {
        params.set("issue_date", issueDate);
      }

      const url = `${apiRoutesPortalMasters.JUTE_ISSUE_STOCK_OUTSTANDING}?${params.toString()}`;
      const { data, error: fetchError } = await fetchWithCookie(url, "GET");

      if (fetchError) {
        throw new Error(fetchError);
      }

      const response = data as { data: StockOutstandingItem[] };
      setStockItems(response.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load stock data";
      setError(message);
      setStockItems([]);
    } finally {
      setLoading(false);
    }
  }, [coId, branchId, itemId, issueDate]);

  React.useEffect(() => {
    if (coId && branchId) {
      fetchStock();
    }
  }, [fetchStock, coId, branchId]);

  return { stockItems, loading, error, refetch: fetchStock };
};
