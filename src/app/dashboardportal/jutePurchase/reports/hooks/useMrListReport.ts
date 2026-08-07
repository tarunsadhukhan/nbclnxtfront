"use client";
import { useState, useCallback } from "react";
import {
  fetchMrListReport,
  type FetchMrListParams,
} from "@/utils/juteReportService";
import type { MrListReportRow } from "../types/reportTypes";

export function useMrListReport() {
  const [rows, setRows] = useState<MrListReportRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (params: FetchMrListParams) => {
    setLoading(true);
    setError(null);
    try {
      const { data, total: totalCount } = await fetchMrListReport(params);
      setRows(data);
      setTotal(totalCount);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  return { rows, total, loading, error, loadReport };
}
