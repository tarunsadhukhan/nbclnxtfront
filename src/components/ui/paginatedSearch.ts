'use client';
import { useEffect, useRef, useState } from "react";

export function usePaginatedSearch<T>(
  fetchFn: (
    page: number,
    search?: string,
    sortKey?: string | null,
    sortOrder?: "asc" | "desc"
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

  const loadPage = async (
    page: number,
    search?: string,
    sortKey?: string | null,
    sortOrder?: "asc" | "desc"
  ) => {
    setIsLoading(true);
    try {
      const result = await fetchFn(page, search, sortKey, sortOrder);
      setTotal(result.total);
      setData((prev) => (page === 1 ? result.data : [...prev, ...result.data]));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadPage(1, searchQuery, sortKey, sortOrder);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, sortKey, sortOrder]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoading && data.length < total) {
          // Removed the "!searchQuery" condition to allow pagination during search
          const nextPage = page + 1;
          setPage(nextPage);
          loadPage(nextPage, searchQuery, sortKey, sortOrder);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [data.length, total, searchQuery, isLoading, page]);

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
  };
}
