"use client";

import React from "react";

export type Option = { label: string; value: string };

export function getBranchOptionsFromLocalStorage(): Option[] {
  try {
    // Read selected branches (may be array of ids/primitives or objects)
    const rawSelected = typeof window !== "undefined" ? localStorage.getItem("sidebar_selectedBranches") : null;
    const parsedSelected = rawSelected ? JSON.parse(rawSelected) : null;

    // Read company payload to map ids -> names when available
    const rawCompany = typeof window !== "undefined" ? localStorage.getItem("sidebar_selectedCompany") : null;
    let companyBranchesMap: Record<string, string> = {};
    if (rawCompany) {
      try {
        const parsedCompany = JSON.parse(rawCompany);
        const cb = parsedCompany?.branches;
        if (Array.isArray(cb)) {
          cb.forEach((b: any) => {
            const id = String(b.branch_id ?? b.id ?? "");
            const name = b.branch_name ?? b.branch_desc ?? b.name ?? "";
            if (id) companyBranchesMap[id] = String(name || id);
          });
        }
      } catch (e) {
        // ignore
      }
    }

    const normalizeItem = (b: any): Option | null => {
      if (b === null || b === undefined) return null;
      if (typeof b === "object") {
        const id = String(b.branch_id ?? b.id ?? b.value ?? "");
        if (!id) return null;
        const labelFromObj = b.branch_name ?? b.branch_desc ?? b.name ?? b.label;
        const label = companyBranchesMap[id] ?? String(labelFromObj ?? id);
        return { label, value: id };
      }
      // primitive value (id)
      const id = String(b);
      const label = companyBranchesMap[id] ?? id;
      return { label, value: id };
    };

    if (!parsedSelected) return [];

    if (Array.isArray(parsedSelected)) {
      const opts: Option[] = parsedSelected.map(normalizeItem).filter(Boolean) as Option[];
      return opts;
    }

    // single value/object
    const single = normalizeItem(parsedSelected);
    return single ? [single] : [];
  } catch (e) {
    return [];
  }
}

export function useBranchOptions(): Option[] {
  const [opts, setOpts] = React.useState<Option[]>(() => getBranchOptionsFromLocalStorage());

  React.useEffect(() => {
    const handleStorage = (ev: StorageEvent) => {
      if (ev.key === "sidebar_selectedBranches" || ev.key === "sidebar_selectedCompany") {
        setOpts(getBranchOptionsFromLocalStorage());
      }
    };
    // sync once on mount (in case lazy initializer ran during SSR where window was undefined)
    setOpts(getBranchOptionsFromLocalStorage());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return opts;
}

export default getBranchOptionsFromLocalStorage;
