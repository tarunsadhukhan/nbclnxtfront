'use client';
import { useEffect, useRef, useState, useCallback } from "react";

type Filter = {
  key: string;
  value: string;
};

export function usePaginatedSearch<T>(
  fetchFn: (
    page: number,
    search?: string,
    sortKey?: string | null,
    sortOrder?: "asc" | "desc",
    filters?: Filter[]
  ) => Promise<{ data: T[]; total: number }>
) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Filter[]>([]);
  
  // Track if there's a pending request due to parameter changes
  const pendingRequestRef = useRef(false);

  const loadPage = async (
    page: number,
    search?: string,
    sortKey?: string | null,
    sortOrder?: "asc" | "desc",
    filters?: Filter[]
  ) => {
    // Prevent concurrent API calls for parameter changes
    if (isLoading) return;
    
    setIsLoading(true);
    pendingRequestRef.current = false;
    
    try {
      const result = await fetchFn(page, search, sortKey, sortOrder, filters);
      setTotal(result.total);
      setData((prev) => (page === 1 ? result.data : [...prev, ...result.data]));
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh data with current parameters
  const refreshData = useCallback(() => {
    setPage(1);
    loadPage(1, searchQuery, sortKey, sortOrder, filters);
  }, [searchQuery, sortKey, sortOrder, filters]);

  // Update filters without immediately triggering an API call
  const setFiltersAndRefresh = useCallback((newFilters: Filter[]) => {
    setFilters(newFilters);
    // We don't call loadPage directly - the useEffect will handle this
    setPage(1);
  }, []);

  // This effect handles all parameter changes (search, sort, filters) with debouncing
  useEffect(() => {
    pendingRequestRef.current = true;
    
    const timer = setTimeout(() => {
      if (pendingRequestRef.current) {
        loadPage(1, searchQuery, sortKey, sortOrder, filters);
      }
    }, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, sortKey, sortOrder, filters]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoading && data.length < total && !pendingRequestRef.current) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadPage(nextPage, searchQuery, sortKey, sortOrder, filters);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [data.length, total, isLoading, page]);

  return {
    data,
    total,
    isLoading,
    searchQuery,
    setSearchQuery,
    loadMoreRef,
    sortKey,
    setSortKey,
    sortOrder,
    setSortOrder,
    filters,
    setFilters: setFiltersAndRefresh,
    refreshData,
  };
}
