import React from "react";
import type {
	BranchAddressRecord,
	BrokerRecord,
	CustomerBranchRecord,
	CustomerRecord,
	ApprovedQuotationRecord,
	InvoiceTypeRecord,
	ItemGroupCacheEntry,
	ItemGroupRecord,
	Option,
	TransporterRecord,
	UomConversionEntry,
} from "../types/salesOrderTypes";

type UseSalesOrderSelectOptionsParams = {
	customers: ReadonlyArray<CustomerRecord>;
	customerBranches: ReadonlyArray<CustomerBranchRecord>;
	brokers: ReadonlyArray<BrokerRecord>;
	transporters: ReadonlyArray<TransporterRecord>;
	approvedQuotations: ReadonlyArray<ApprovedQuotationRecord>;
	branchAddresses: ReadonlyArray<BranchAddressRecord>;
	invoiceTypes: ReadonlyArray<InvoiceTypeRecord>;
	itemGroupsFromLineItems: ReadonlyArray<ItemGroupRecord>;
	itemGroupCache?: Partial<Record<string, ItemGroupCacheEntry>>;
};

export const useSalesOrderSelectOptions = ({
	customers,
	customerBranches,
	brokers,
	transporters,
	approvedQuotations,
	branchAddresses,
	invoiceTypes,
	itemGroupsFromLineItems,
	itemGroupCache = {},
}: UseSalesOrderSelectOptionsParams) => {
	const customerOptions = React.useMemo<Option[]>(
		() => customers.map((c) => ({ label: c.name || c.id, value: c.id })).filter((o) => o.value),
		[customers],
	);

	const customerBranchOptions = React.useMemo<Option[]>(
		() => customerBranches.map((b) => ({ label: b.fullAddress || b.address || b.id, value: b.id })),
		[customerBranches],
	);

	const brokerOptions = React.useMemo<Option[]>(
		() => brokers.map((b) => ({ label: b.name || b.id, value: b.id })),
		[brokers],
	);

	const transporterOptions = React.useMemo<Option[]>(
		() => transporters.map((t) => ({ label: t.name || t.id, value: t.id })),
		[transporters],
	);

	const quotationOptions = React.useMemo<Option[]>(
		() => approvedQuotations.map((q) => ({
			label: `${q.quotationNo}${q.partyName ? ` — ${q.partyName}` : ""}`,
			value: q.id,
		})),
		[approvedQuotations],
	);

	const invoiceTypeOptions = React.useMemo<Option[]>(
		() => invoiceTypes.map((t) => ({ label: t.name || t.id, value: t.id })),
		[invoiceTypes],
	);

	const branchAddressOptions = React.useMemo<Option[]>(
		() => branchAddresses.map((a) => ({ label: a.fullAddress || a.name || a.id, value: a.id })),
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
		(itemGroupId: string, itemId: string) => itemGroupCache[itemGroupId]?.uomsByItemId[itemId] ?? [],
		[itemGroupCache],
	);

	const getItemLabel = React.useCallback(
		(groupId: string, itemId: string): string => {
			if (!groupId || !itemId) return "-";
			return itemGroupCache[groupId]?.itemLabelById[itemId] ?? itemId;
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

	const getUomConversions = React.useCallback(
		(groupId: string, itemId: string): UomConversionEntry[] | undefined =>
			itemGroupCache[groupId]?.uomConversionsByItemId?.[itemId],
		[itemGroupCache],
	);

	const getItemFullCode = React.useCallback(
		(groupId: string, itemId: string): string | undefined => {
			if (!groupId || !itemId) return undefined;
			return itemGroupCache[groupId]?.itemFullCodeById?.[itemId];
		},
		[itemGroupCache],
	);

	return {
		customerOptions, customerBranchOptions,
		brokerOptions, transporterOptions, quotationOptions,
		invoiceTypeOptions, branchAddressOptions, itemGroupOptions,
		getItemGroupLabel, getItemOptions, getMakeOptions, getUomOptions,
		getItemLabel, getMakeLabel, getUomLabel, getUomConversions, getItemFullCode,
	};
};
