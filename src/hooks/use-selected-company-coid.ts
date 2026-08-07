import React from "react";

const DEFAULT_STORAGE_KEY = "sidebar_selectedCompany";

type StoredCompanyRecord = {
  co_id?: string | number;
  [key: string]: unknown;
};

const readCoIdFromStorage = (storageKey: string): string => {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as StoredCompanyRecord | null;
    const value = parsed?.co_id;
    if (value == null) return "";
    return typeof value === "string" ? value : String(value);
  } catch {
    return "";
  }
};

export function useSelectedCompanyCoId(storageKey: string = DEFAULT_STORAGE_KEY) {
  const reader = React.useCallback(() => readCoIdFromStorage(storageKey), [storageKey]);

  // Init empty so SSR and first client render match (hydration); mount effect below fills from storage.
  const [coId, setCoId] = React.useState<string>("");

  const refresh = React.useCallback(() => {
    setCoId(reader());
  }, [reader]);

  React.useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;

    const handler = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) return;
      refresh();
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refresh, storageKey]);

  return { coId, refresh };
}

export default useSelectedCompanyCoId;
