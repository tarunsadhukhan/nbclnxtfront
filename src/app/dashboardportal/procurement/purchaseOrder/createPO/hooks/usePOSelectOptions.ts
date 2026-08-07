import React from "react";
import type {
  BranchAddressRecord,
  BrokerRecord,
  ExpenseRecord,
  ItemGroupCacheEntry,
  ItemGroupRecord,
  ItemLastPurchaseInfo,
  Option,
  ProjectRecord,
  SupplierBranchRecord,
  SupplierRecord,
} from "../types/poTypes";

type UsePOSelectOptionsParams = {
  suppliers: ReadonlyArray<SupplierRecord>;
  brokers: ReadonlyArray<BrokerRecord>;
  supplierBranches: ReadonlyArray<SupplierBranchRecord>;
  branchAddresses: ReadonlyArray<BranchAddressRecord>;
  projects: ReadonlyArray<ProjectRecord>;
  expenses: ReadonlyArray<ExpenseRecord>;
  itemGroupsFromLineItems: ReadonlyArray<ItemGroupRecord>;
  itemGroupCache?: Partial<Record<string, ItemGroupCacheEntry>>;
};

/**
 * Normalises frequently used select options so memoised arrays live outside page.tsx.
 * Also provides label resolvers for use in previews and tooltips.
 */
export const usePOSelectOptions = ({
  suppliers,
  brokers,
  supplierBranches,
  branchAddresses,
  projects,
  expenses,
  itemGroupsFromLineItems,
  itemGroupCache = {},
}: UsePOSelectOptionsParams) => {
  const supplierOptions = React.useMemo<Option[]>(() => {
    if (!suppliers?.length) return [];
    return suppliers
      .map((s) => ({
        label: s.name || s.code || s.id || "Unknown",
        value: s.id ?? "",
      }))
      .filter((opt) => opt.value);
  }, [suppliers]);

  const brokerOptions = React.useMemo<Option[]>(
    () => brokers.map((b) => ({ label: b.name || b.id, value: b.id })),
    [brokers],
  );

  const supplierBranchOptions = React.useMemo<Option[]>(
    () => supplierBranches.map((b) => ({ label: b.address || b.id, value: b.id })),
    [supplierBranches],
  );

  const branchAddressOptions = React.useMemo<Option[]>(
    () => branchAddresses.map((a) => ({ label: a.fullAddress || a.address1 || a.name || a.id, value: a.id })),
    [branchAddresses],
  );

  const projectOptions = React.useMemo<Option[]>(() => projects.map((p) => ({ label: p.name || p.id, value: p.id })), [projects]);

  const expenseOptions = React.useMemo<Option[]>(() => expenses.map((e) => ({ label: e.name || e.id, value: e.id })), [expenses]);

  const itemGroupOptions = React.useMemo<Option[]>(() => itemGroupsFromLineItems.map((grp) => ({ label: grp.label || grp.id, value: grp.id })), [itemGroupsFromLineItems]);

  // Item group label getter - checks cache first, then itemGroupsFromLineItems
  const getItemGroupLabel = React.useCallback(
    (groupId: string): string => {
      if (!groupId) return "-";
      // First check if the cache has a groupLabel
      const cached = itemGroupCache[groupId];
      if (cached?.groupLabel) return cached.groupLabel;
      // Fall back to the itemGroupsFromLineItems list
      const option = itemGroupsFromLineItems.find((grp) => grp.id === groupId);
      if (option?.label && option.label !== option.id) return option.label;
      return groupId;
    },
    [itemGroupCache, itemGroupsFromLineItems],
  );

  // Item group cache dependent getters
  const getItemOptions = React.useCallback(
    (itemGroupId: string) => itemGroupCache[itemGroupId]?.items ?? [],
    [itemGroupCache],
  );

  const getMakeOptions = React.useCallback(
    (itemGroupId: string) => itemGroupCache[itemGroupId]?.makes ?? [],
    [itemGroupCache],
  );

  const getUomOptions = React.useCallback(
    (itemGroupId: string, itemId: string) =>
      itemGroupCache[itemGroupId]?.uomsByItemId[itemId] ?? [],
    [itemGroupCache],
  );

  const getItemLabel = React.useCallback(
    (groupId: string, itemId: string, itemCode?: string): string => {
      if (!groupId || !itemId) return itemCode || "-";
      const cachedLabel = itemGroupCache[groupId]?.itemLabelById[itemId];
      if (cachedLabel) return cachedLabel;
      return itemCode || itemId;
    },
    [itemGroupCache],
  );

  const getMakeLabel = React.useCallback(
    (groupId: string, makeId: string): string => {
      if (!groupId || !makeId) return "-";
      return itemGroupCache[groupId]?.makeLabelById[makeId] ?? makeId;
    },
    [itemGroupCache],
  );

  const getUomLabel = React.useCallback(
    (groupId: string, itemId: string, uomId: string): string => {
      if (!groupId || !itemId || !uomId) return "-";
      return itemGroupCache[groupId]?.uomLabelByItemId[itemId]?.[uomId] ?? uomId;
    },
    [itemGroupCache],
  );

  const getLastPurchaseInfo = React.useCallback(
    (groupId: string, itemId: string): ItemLastPurchaseInfo | undefined => {
      if (!groupId || !itemId) return undefined;
      return itemGroupCache[groupId]?.itemLastPurchaseById[itemId];
    },
    [itemGroupCache],
  );

  // Generic option label getter
  const getOptionLabel = React.useCallback(
    (options: ReadonlyArray<{ label: string; value: string }>, value?: unknown): string | undefined => {
      if (value === null || typeof value === "undefined") return undefined;
      const target = String(value);
      return options.find((opt) => opt.value === target)?.label;
    },
    [],
  );

  return {
    supplierOptions,
    brokerOptions,
    supplierBranchOptions,
    branchAddressOptions,
    projectOptions,
    expenseOptions,
    itemGroupOptions,
    getItemGroupLabel,
    getItemOptions,
    getMakeOptions,
    getUomOptions,
    getItemLabel,
    getMakeLabel,
    getUomLabel,
    getLastPurchaseInfo,
    getOptionLabel,
  };
};

export default usePOSelectOptions;
