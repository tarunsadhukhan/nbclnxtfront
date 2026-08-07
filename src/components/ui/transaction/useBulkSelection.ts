import * as React from "react";

export type UseBulkSelectionOptions<TItem> = {
  items: TItem[];
  getId: (item: TItem) => string;
  enabled?: boolean;
};

export type UseBulkSelectionResult = {
  selectedIds: string[];
  isSelected: (id: string) => boolean;
  toggleRow: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
  allSelected: boolean;
  indeterminate: boolean;
  hasSelection: boolean;
};

export function useBulkSelection<TItem>({
  items,
  getId,
  enabled = true,
}: UseBulkSelectionOptions<TItem>): UseBulkSelectionResult {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!enabled) {
      setSelectedIds([]);
      return;
    }

    const validIds = new Set(items.map((item) => getId(item)));
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [items, getId, enabled]);

  const toggleRow = React.useCallback(
    (id: string) => {
      if (!enabled) return;
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
      );
    },
    [enabled]
  );

  const toggleAll = React.useCallback(() => {
    if (!enabled) return;
    setSelectedIds((prev) =>
      prev.length === items.length ? [] : items.map((item) => getId(item))
    );
  }, [enabled, items, getId]);

  const clear = React.useCallback(() => {
    setSelectedIds([]);
  }, []);

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  const isSelected = React.useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  const hasSelection = enabled && selectedIds.length > 0;
  const allSelected = hasSelection && selectedIds.length === items.length && items.length > 0;
  const indeterminate = hasSelection && selectedIds.length < items.length;

  return {
    selectedIds,
    isSelected,
    toggleRow,
    toggleAll,
    clear,
    allSelected,
    indeterminate,
    hasSelection,
  };
}
