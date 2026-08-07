import React from "react";
import type {
	BranchAddressRecord,
	BrokerRecord,
	CustomerRecord,
	CustomerBranchRecord,
	ItemGroupCacheEntry,
	ItemGroupRecord,
	Option,
} from "../types/quotationTypes";

type UseQuotationSelectOptionsParams = {
	customers: ReadonlyArray<CustomerRecord>;
	brokers: ReadonlyArray<BrokerRecord>;
	/** All customer branch addresses across all customers. */
	customerBranches: ReadonlyArray<CustomerBranchRecord>;
	/** The currently selected customer ID; limits billing/shipping address options. */
	selectedCustomerId?: string;
	/** Company branch addresses – used for "shipping from" info display only. */
	branchAddresses: ReadonlyArray<BranchAddressRecord>;
	itemGroupsFromLineItems: ReadonlyArray<ItemGroupRecord>;
	itemGroupCache?: Partial<Record<string, ItemGroupCacheEntry>>;
};

/**
 * Normalises frequently used select options so memoised arrays live outside page.tsx.
 */
export const useQuotationSelectOptions = ({
	customers,
	brokers,
	customerBranches,
	selectedCustomerId,
	branchAddresses,
	itemGroupsFromLineItems,
	itemGroupCache = {},
}: UseQuotationSelectOptionsParams) => {
	const customerOptions = React.useMemo<Option[]>(() => {
		if (!customers?.length) return [];
		return customers
			.map((c) => ({
				label: c.name || c.code || c.id || "Unknown",
				value: c.id ?? "",
			}))
			.filter((opt) => opt.value);
	}, [customers]);

	const brokerOptions = React.useMemo<Option[]>(() => {
		if (!brokers?.length) return [];
		return brokers
			.map((b) => ({
				label: b.name || b.code || b.id || "Unknown",
				value: b.id ?? "",
			}))
			.filter((opt) => opt.value);
	}, [brokers]);

	/**
	 * Customer branch options for billing and shipping address dropdowns.
	 * Filtered to only show branches belonging to the selected customer.
	 */
	const customerBranchOptions = React.useMemo<Option[]>(() => {
		if (!customerBranches?.length) return [];
		const filtered = selectedCustomerId
			? customerBranches.filter((b) => b.partyId === selectedCustomerId)
			: customerBranches;
		return filtered
			.map((b) => ({
				label: b.address || b.branchName || b.id,
				value: b.id,
			}))
			.filter((opt) => opt.value);
	}, [customerBranches, selectedCustomerId]);

	/** Company branch address options – intended for "shipping from" display only. */
	const branchAddressOptions = React.useMemo<Option[]>(
		() => branchAddresses.map((a) => ({ label: a.fullAddress || a.address1 || a.name || a.id, value: a.id })),
		[branchAddresses],
	);

	const itemGroupOptions = React.useMemo<Option[]>(
		() => itemGroupsFromLineItems.map((grp) => ({ label: grp.label || grp.id, value: grp.id })),
		[itemGroupsFromLineItems],
	);

	const getItemGroupLabel = React.useCallback(
		(groupId: string): string => {
			if (!groupId) return "-";
			const cached = itemGroupCache[groupId];
			if (cached?.groupLabel) return cached.groupLabel;
			const option = itemGroupsFromLineItems.find((grp) => grp.id === groupId);
			if (option?.label && option.label !== option.id) return option.label;
			return groupId;
		},
		[itemGroupCache, itemGroupsFromLineItems],
	);

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

	const getOptionLabel = React.useCallback(
		(options: ReadonlyArray<{ label: string; value: string }>, value?: unknown): string | undefined => {
			if (value === null || typeof value === "undefined") return undefined;
			const target = String(value);
			return options.find((opt) => opt.value === target)?.label;
		},
		[],
	);

	return {
		customerOptions,
		brokerOptions,
		/** Billing and shipping address options (customer branches filtered by selected customer). */
		customerBranchOptions,
		/** Company branch address options (shipping from – display only). */
		branchAddressOptions,
		itemGroupOptions,
		getItemGroupLabel,
		getItemOptions,
		getMakeOptions,
		getUomOptions,
		getItemLabel,
		getMakeLabel,
		getUomLabel,
		getOptionLabel,
	};
};

export default useQuotationSelectOptions;
