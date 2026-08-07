import React from "react";

type LoadingState<TKey extends string> = Partial<Record<TKey, boolean>>;

type CacheState<TKey extends string, TValue> = Partial<Record<TKey, TValue>>;

export type UseDeferredOptionCacheOptions<TKey extends string, TValue> = {
  fetcher: (key: TKey) => Promise<TValue>;
  onError?: (error: unknown, key: TKey) => void;
  initialCache?: CacheState<TKey, TValue>;
};

export type UseDeferredOptionCacheResult<TKey extends string, TValue> = {
  cache: CacheState<TKey, TValue>;
  loading: LoadingState<TKey>;
  ensure: (key: TKey) => Promise<void>;
  get: (key: TKey) => TValue | undefined;
  reset: () => void;
  setCache: React.Dispatch<React.SetStateAction<CacheState<TKey, TValue>>>;
};

export function useDeferredOptionCache<TKey extends string, TValue>(
  options: UseDeferredOptionCacheOptions<TKey, TValue>
): UseDeferredOptionCacheResult<TKey, TValue> {
  const { fetcher, onError, initialCache } = options;

  const [cache, setCache] = React.useState<CacheState<TKey, TValue>>(initialCache ?? {});
  const [loading, setLoading] = React.useState<LoadingState<TKey>>({});

  const cacheRef = React.useRef(cache);
  const loadingRef = React.useRef(loading);
  const pendingKeysRef = React.useRef<Set<TKey>>(new Set());

  React.useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  React.useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const ensure = React.useCallback(
    async (key: TKey) => {
      if (!key) return;
      if (cacheRef.current[key] || loadingRef.current[key] || pendingKeysRef.current.has(key)) return;

      pendingKeysRef.current.add(key);
      setLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const value = await fetcher(key);
        setCache((prev) => ({ ...prev, [key]: value }));
      } catch (error) {
        if (onError) onError(error, key);
      } finally {
        pendingKeysRef.current.delete(key);
        setLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [fetcher, onError]
  );

  const get = React.useCallback((key: TKey) => cache[key], [cache]);

  const reset = React.useCallback(() => {
    setCache(initialCache ?? {});
    setLoading({});
  }, [initialCache]);

  return { cache, loading, ensure, get, reset, setCache };
}

export default useDeferredOptionCache;
