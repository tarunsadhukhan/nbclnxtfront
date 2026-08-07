import React from "react";

export type UseLineItemsOptions<TItem> = {
  initialItems?: TItem[];
  createBlankItem: () => TItem;
  hasData: (item: TItem) => boolean;
  getItemId: (item: TItem) => string;
  maintainTrailingBlank?: boolean;
};

export type UseLineItemsResult<TItem> = {
  items: TItem[];
  setItems: React.Dispatch<React.SetStateAction<TItem[]>>;
  replaceItems: (next: TItem[]) => void;
  removeItems: (ids: string[]) => void;
};

function normalizeItems<TItem>(
  items: TItem[],
  options: { createBlankItem: () => TItem; hasData: (item: TItem) => boolean; maintainTrailingBlank: boolean }
) {
  const { createBlankItem, hasData, maintainTrailingBlank } = options;
  if (!maintainTrailingBlank) return items.filter((item) => hasData(item));

  const normalized = [...items];

  if (!normalized.length) {
    normalized.push(createBlankItem());
    return normalized;
  }

  const last = normalized[normalized.length - 1];
  if (hasData(last)) {
    normalized.push(createBlankItem());
    return normalized;
  }

  let trailingBlanks = 0;
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    if (!hasData(normalized[index])) trailingBlanks += 1;
    else break;
  }

  if (trailingBlanks > 1) {
    return normalized.slice(0, normalized.length - (trailingBlanks - 1));
  }

  return normalized;
}

export function useLineItems<TItem>(options: UseLineItemsOptions<TItem>): UseLineItemsResult<TItem> {
  const { initialItems, createBlankItem, hasData, getItemId, maintainTrailingBlank = true } = options;

  const normalize = React.useCallback(
    (items: TItem[]) => normalizeItems(items, { createBlankItem, hasData, maintainTrailingBlank }),
    [createBlankItem, hasData, maintainTrailingBlank]
  );

  const [items, setRawItems] = React.useState<TItem[]>(() => normalize(initialItems ?? []));

  const setItems = React.useCallback(
    (updater: React.SetStateAction<TItem[]>) => {
      setRawItems((prev) => {
        const next = typeof updater === "function" ? (updater as (value: TItem[]) => TItem[])(prev) : updater;
        return normalize(next);
      });
    },
    [normalize]
  );

  const replaceItems = React.useCallback(
    (next: TItem[]) => {
      setRawItems(normalize(next));
    },
    [normalize]
  );

  const removeItems = React.useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      const idSet = new Set(ids);
      setItems((prev) => prev.filter((item) => !idSet.has(getItemId(item))));
    },
    [getItemId, setItems]
  );

  React.useEffect(() => {
    if (!initialItems) return;
    setRawItems(normalize(initialItems));
  }, [initialItems, normalize]);

  React.useEffect(() => {
    setRawItems((prev) => normalize(prev));
  }, [normalize]);

  return { items, setItems, replaceItems, removeItems };
}

export default useLineItems;
