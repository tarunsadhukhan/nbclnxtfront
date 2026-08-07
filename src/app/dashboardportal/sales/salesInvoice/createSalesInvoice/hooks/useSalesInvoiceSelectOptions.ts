import React from "react";
import { getTransporterBranches } from "@/utils/salesInvoiceService";
import type {
	CustomerRecord,
	TransporterRecord,
	BrokerRecord,
	ApprovedDeliveryOrderRecord,
	ApprovedSalesOrderRecord,
	InvoiceTypeRecord,
	ItemGroupCacheEntry,
	ItemGroupRecord,
	Option,
	UomConversionEntry,
	TransporterBranchRecord,
} from "../types/salesInvoiceTypes";

type Params = {
	customers: ReadonlyArray<CustomerRecord>;
	transporters: ReadonlyArray<TransporterRecord>;
	brokers: ReadonlyArray<BrokerRecord>;
	approvedDeliveryOrders: ReadonlyArray<ApprovedDeliveryOrderRecord>;
	approvedSalesOrders: ReadonlyArray<ApprovedSalesOrderRecord>;
	invoiceTypes: ReadonlyArray<InvoiceTypeRecord>;
	itemGroupsFromLineItems: ReadonlyArray<ItemGroupRecord>;
	itemGroupCache?: Partial<Record<string, ItemGroupCacheEntry>>;
	selectedPartyId?: string;
	coId?: number;
};

export const useSalesInvoiceSelectOptions = ({
	customers, transporters, brokers, approvedDeliveryOrders, approvedSalesOrders, invoiceTypes,
	itemGroupsFromLineItems, itemGroupCache = {}, selectedPartyId, coId,
}: Params) => {
	const [transporterBranchOptions, setTransporterBranchOptions] = React.useState<TransporterBranchRecord[]>([]);
	const [loading, setLoading] = React.useState(false);
	const customerOptions = React.useMemo<Option[]>(() => {
		if (!customers?.length) return [];
		return customers
			.map((c) => ({ label: c.name || c.code || c.id, value: c.id ?? "" }))
			.filter((opt) => opt.value);
	}, [customers]);

	const customerBranchOptions = React.useMemo<Option[]>(() => {
		if (!selectedPartyId || !customers?.length) return [];
		const customer = customers.find((c) => c.id === selectedPartyId);
		if (!customer?.branches?.length) return [];
		return customer.branches.map((b) => ({
			label: b.fullAddress || b.address || b.id,
			value: b.id,
		}));
	}, [customers, selectedPartyId]);

	const transporterOptions = React.useMemo<Option[]>(() => {
		if (!transporters?.length) return [];
		return transporters.map((t) => ({ label: t.name || t.code || t.id, value: t.id }));
	}, [transporters]);

	const brokerOptions = React.useMemo<Option[]>(
		() => brokers.map((b) => ({ label: b.name || b.id, value: b.id })),
		[brokers],
	);

	const deliveryOrderOptions = React.useMemo<Option[]>(() => {
		if (!approvedDeliveryOrders?.length) return [];
		return approvedDeliveryOrders.map((doRec) => ({
			label: doRec.deliveryOrderNo + (doRec.partyName ? ` — ${doRec.partyName}` : ""),
			value: doRec.id,
		}));
	}, [approvedDeliveryOrders]);

	const salesOrderOptions = React.useMemo<Option[]>(() => {
		if (!approvedSalesOrders?.length) return [];
		return approvedSalesOrders
			.filter((so) => !selectedPartyId || String(so.partyId) === selectedPartyId)
			.map((so) => ({
				label: so.salesOrderNo + (so.partyName ? ` — ${so.partyName}` : ""),
				value: so.id,
			}));
	}, [approvedSalesOrders, selectedPartyId]);

	const invoiceTypeOptions = React.useMemo<Option[]>(
		() => invoiceTypes.map((t) => ({ label: t.name || t.id, value: t.id })),
		[invoiceTypes],
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
		(groupId: string, itemId: string, fallbackName?: string): string => {
			if (!groupId || !itemId) return fallbackName || "-";
			return itemGroupCache[groupId]?.itemLabelById[itemId] ?? fallbackName ?? itemId;
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

	const getOptionLabel = React.useCallback(
		(options: ReadonlyArray<{ label: string; value: string }>, value?: unknown): string | undefined => {
			if (value === null || typeof value === "undefined") return undefined;
			const target = String(value);
			return options.find((opt) => opt.value === target)?.label;
		},
		[],
	);

	const fetchTransporterBranches = React.useCallback(
		async (transporterId: number): Promise<TransporterBranchRecord[]> => {
			if (!transporterId || !coId) {
				setTransporterBranchOptions([]);
				return [];
			}

			try {
				setLoading(true);
				const response = await getTransporterBranches(transporterId, coId);
				const branches = (response.data || []) as TransporterBranchRecord[];
				setTransporterBranchOptions(branches);
				return branches;
			} catch (error) {
				console.error("Failed to fetch transporter branches:", error);
				setTransporterBranchOptions([]);
				return [];
			} finally {
				setLoading(false);
			}
		},
		[coId],
	);

	return {
		customerOptions, customerBranchOptions, transporterOptions, brokerOptions, deliveryOrderOptions, salesOrderOptions,
		invoiceTypeOptions, itemGroupOptions, getItemGroupLabel,
		getItemOptions, getMakeOptions, getUomOptions,
		getItemLabel, getMakeLabel, getUomLabel, getUomConversions, getOptionLabel,
		transporterBranchOptions, fetchTransporterBranches, loading,
	};
};
