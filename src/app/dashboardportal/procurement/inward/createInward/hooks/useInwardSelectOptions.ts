import React from "react";
import { buildLabelMap, createLabelResolver } from "@/utils/labelUtils";
import type {
	Option,
	SupplierRecord,
	ItemGroupRecord,
	ItemGroupCacheMap,
	InwardLabelResolvers,
} from "../types/inwardTypes";

type UseInwardSelectOptionsParams = {
	suppliers: readonly SupplierRecord[];
	itemGroups: readonly ItemGroupRecord[];
	itemGroupCache: ItemGroupCacheMap;
};

/**
 * Hook to generate select options and label resolvers for the Inward page.
 */
export const useInwardSelectOptions = ({
	suppliers,
	itemGroups,
	itemGroupCache,
}: UseInwardSelectOptionsParams) => {
	// Supplier options
	const supplierOptions = React.useMemo<Option[]>(
		() =>
			[...suppliers].map((s) => ({
				label: s.code ? `${s.code} — ${s.name}` : s.name,
				value: s.id,
			})),
		[suppliers]
	);

	// Item group options
	const itemGroupOptions = React.useMemo<Option[]>(
		() => [...itemGroups].map((g) => ({ label: g.label, value: g.id })),
		[itemGroups]
	);

	// Label maps
	const supplierLabelMap = React.useMemo(
		() => buildLabelMap([...suppliers], (s) => s.id, (s) => s.code ? `${s.code} — ${s.name}` : s.name),
		[suppliers]
	);

	const itemGroupLabelMap = React.useMemo(
		() => buildLabelMap([...itemGroups], (g) => g.id, (g) => g.label),
		[itemGroups]
	);

	// Label resolvers
	const getSupplierLabel = React.useMemo(() => createLabelResolver(supplierLabelMap), [supplierLabelMap]);
	const getItemGroupLabel = React.useMemo(() => createLabelResolver(itemGroupLabelMap), [itemGroupLabelMap]);

	// Item options from cache
	const getItemOptions = React.useCallback(
		(groupId: string) => itemGroupCache[groupId]?.items ?? [],
		[itemGroupCache]
	);

	const getMakeOptions = React.useCallback(
		(groupId: string) => itemGroupCache[groupId]?.makes ?? [],
		[itemGroupCache]
	);

	const getUomOptions = React.useCallback(
		(groupId: string, itemId: string) => itemGroupCache[groupId]?.uomsByItemId?.[itemId] ?? [],
		[itemGroupCache]
	);

	// Item label resolver
	const getItemLabel = React.useCallback(
		(groupId: string, itemId: string) => {
			const cache = itemGroupCache[groupId];
			return cache?.itemLabelById?.[itemId] ?? "";
		},
		[itemGroupCache]
	);

	// Make label resolver
	const getMakeLabel = React.useCallback(
		(groupId: string, makeId: string) => {
			const cache = itemGroupCache[groupId];
			return cache?.makeLabelById?.[makeId] ?? "";
		},
		[itemGroupCache]
	);

	// UOM label resolver
	const getUomLabel = React.useCallback(
		(groupId: string, itemId: string, uomId: string) => {
			const cache = itemGroupCache[groupId];
			return cache?.uomLabelByItemId?.[itemId]?.[uomId] ?? "";
		},
		[itemGroupCache]
	);

	// Utility to get option label from options array
	const getOptionLabel = React.useCallback(
		(options: Option[], value?: unknown): string | undefined => {
			if (value == null) return undefined;
			const strValue = String(value);
			return options.find((opt) => opt.value === strValue)?.label;
		},
		[]
	);

	// Combined label resolvers
	const labelResolvers: InwardLabelResolvers = React.useMemo(
		() => ({
			supplier: getSupplierLabel,
			itemGroup: getItemGroupLabel,
			item: getItemLabel,
			itemMake: getMakeLabel,
			uom: getUomLabel,
		}),
		[getSupplierLabel, getItemGroupLabel, getItemLabel, getMakeLabel, getUomLabel]
	);

	return {
		supplierOptions,
		itemGroupOptions,
		getSupplierLabel,
		getItemGroupLabel,
		getItemOptions,
		getMakeOptions,
		getUomOptions,
		getItemLabel,
		getMakeLabel,
		getUomLabel,
		getOptionLabel,
		labelResolvers,
	};
};
