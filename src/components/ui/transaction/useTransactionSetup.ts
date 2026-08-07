import React from "react";

export type TransactionSetupFetcher<TParams extends Record<string, unknown>, TRaw> = (
  input: { coId: string } & TParams
) => Promise<TRaw>;

export type UseTransactionSetupOptions<TParams extends Record<string, unknown>, TRaw, TMapped> = {
  coId?: string;
  params?: TParams;
  enabled?: boolean;
  fetcher: TransactionSetupFetcher<TParams, TRaw>;
  mapData: (raw: TRaw) => TMapped;
  missingCoIdMessage?: string;
  deps?: React.DependencyList;
};

export type UseTransactionSetupResult<TMapped> = {
  data: TMapped | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const DEFAULT_ERROR_MESSAGE = "Select a company to load transaction defaults.";

export function useTransactionSetup<TParams extends Record<string, unknown>, TRaw, TMapped>(
  options: UseTransactionSetupOptions<TParams, TRaw, TMapped>
): UseTransactionSetupResult<TMapped> {
  const {
    coId,
    params,
    enabled = true,
    fetcher,
    mapData,
    missingCoIdMessage = DEFAULT_ERROR_MESSAGE,
    deps = [],
  } = options;

  const [data, setData] = React.useState<TMapped | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  // Track the last successful fetch to prevent duplicate calls
  const lastFetchRef = React.useRef<string>("");
  // Track if a fetch is currently in progress
  const isFetchingRef = React.useRef<boolean>(false);
  // Track the current fetch key being fetched
  const currentFetchKeyRef = React.useRef<string>("");
  
  // Store fetcher and mapData in refs to avoid dependency issues
  const fetcherRef = React.useRef(fetcher);
  const mapDataRef = React.useRef(mapData);
  
  // Update refs when functions change
  React.useEffect(() => {
    fetcherRef.current = fetcher;
    mapDataRef.current = mapData;
  }, [fetcher, mapData]);

  const refresh = React.useCallback(() => {
    setRefreshIndex((prev) => prev + 1);
    lastFetchRef.current = ""; // Reset to allow refetch
  }, []);

  // Serialize params to prevent unnecessary re-runs when object reference changes but values are the same
  // Use a ref to track the previous serialized params to prevent recalculating on every render
  const prevParamsKeyRef = React.useRef<string>("");
  const paramsKey = React.useMemo(() => {
    if (!params) {
      if (prevParamsKeyRef.current === "") {
        return "";
      }
      prevParamsKeyRef.current = "";
      return "";
    }
    const serialized = JSON.stringify(params);
    // Only update if the serialized value actually changed
    if (prevParamsKeyRef.current === serialized) {
      return prevParamsKeyRef.current;
    }
    prevParamsKeyRef.current = serialized;
    return serialized;
  }, [params]);

  // Create a stable key for the fetch operation
  const fetchKey = React.useMemo(() => {
    return `${coId || ""}-${paramsKey}-${refreshIndex}`;
  }, [coId, paramsKey, refreshIndex]);

  React.useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      // Don't clear data when disabled - just stop loading
      // This prevents fields from being reset when hook is temporarily disabled
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!coId) {
      // Only clear data if coId is missing (not just when hook is disabled)
      setData(null);
      setLoading(false);
      setError(missingCoIdMessage);
      lastFetchRef.current = "";
      return () => {
        cancelled = true;
      };
    }

    // Skip if we already successfully fetched with the same key
    if (lastFetchRef.current === fetchKey) {
      console.log("[useTransactionSetup] Skipping - already fetched with key:", fetchKey);
      return () => {
        cancelled = true;
      };
    }

    // Skip if we're already fetching the same key
    if (isFetchingRef.current && currentFetchKeyRef.current === fetchKey) {
      console.log("[useTransactionSetup] Skipping - already fetching key:", fetchKey);
      return () => {
        cancelled = true;
      };
    }

    // Mark as fetching immediately to prevent concurrent calls
    isFetchingRef.current = true;
    currentFetchKeyRef.current = fetchKey;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        console.log("[useTransactionSetup] Starting fetch with params:", { coId, params, fetchKey, lastFetched: lastFetchRef.current, isFetching: isFetchingRef.current });
        const raw = await fetcherRef.current({ coId, ...(params ?? ({} as TParams)) });
        if (cancelled) return;
        console.log("[useTransactionSetup] Raw data received:", raw);
        const mapped = mapDataRef.current(raw);
        console.log("[useTransactionSetup] Mapped data:", mapped);
        if (cancelled) return;
        setData(mapped);
        setError(null);
        lastFetchRef.current = fetchKey; // Mark as successfully fetched only after data is set
        console.log("[useTransactionSetup] Fetch completed successfully for key:", fetchKey);
      } catch (err) {
        if (cancelled) return;
        console.error("[useTransactionSetup] Error loading data:", err);
        const message = err instanceof Error ? err.message : "Unable to load data.";
        setData(null);
        setError(message);
        lastFetchRef.current = ""; // Reset on error to allow retry
      } finally {
        if (!cancelled) {
          setLoading(false);
          isFetchingRef.current = false;
          currentFetchKeyRef.current = "";
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      // Reset fetching state if component unmounts or effect re-runs
      if (currentFetchKeyRef.current === fetchKey) {
        isFetchingRef.current = false;
        currentFetchKeyRef.current = "";
      }
    };
  }, [coId, enabled, fetchKey, ...deps]); // Removed fetcher, mapData, missingCoIdMessage, and data from deps

  return { data, loading, error, refresh };
}

export default useTransactionSetup;
