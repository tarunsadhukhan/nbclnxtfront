"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TransactionWrapper, { type TransactionAction } from "@/components/ui/TransactionWrapper";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { MuiFormMode } from "@/components/ui/muiform";
import {
	useDeferredOptionCache,
	useTransactionSetup,
	useTransactionPreview,
	ItemSelectionDialog,
	buildApprovalTransactionActions,
	useRejectDialog,
	useUnsavedChanges,
	AutoResizeTextarea,
	type SelectedItem,
} from "@/components/ui/transaction";
import { useBranchOptions } from "@/utils/branchUtils";
import {
	fetchDOSetup1,
	fetchDOSetup2,
	fetchSalesOrderLines,
	getDOById,
	type DODetails,
} from "@/utils/deliveryOrderService";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { toast } from "@/hooks/use-toast";
import { useMenuId } from "@/hooks/useMenuId";
import { useCompanyName } from "@/hooks/useCompanyName";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

import { DeliveryOrderHeaderForm } from "./components/DeliveryOrderHeaderForm";
import { DeliveryOrderFooterForm, DeliveryOrderTotalsDisplay } from "./components/DeliveryOrderFooter";
import DeliveryOrderPreview from "./components/DeliveryOrderPreview";
import { useDOLineItemColumns } from "./components/DeliveryOrderLineItemsTable";
import { DOSalesOrderExtensionDisplay } from "./components/DOSalesOrderExtensionDisplay";

import { useDeliveryOrderFormState } from "./hooks/useDeliveryOrderFormState";
import { useDeliveryOrderLineItems } from "./hooks/useDeliveryOrderLineItems";
import { useDeliveryOrderSelectOptions } from "./hooks/useDeliveryOrderSelectOptions";
import { useDeliveryOrderHeaderSchema, useDeliveryOrderFooterSchema } from "./hooks/useDeliveryOrderFormSchemas";
import { useDeliveryOrderFormSubmission } from "./hooks/useDeliveryOrderFormSubmission";
import { useDeliveryOrderApproval } from "./hooks/useDeliveryOrderApproval";

import type { EditableLineItem, ItemGroupCacheEntry, DOSetupData } from "./types/deliveryOrderTypes";
import { mapItemGroupDetailResponse, mapDOSetupResponse, mapDODetailsToFormValues } from "./utils/deliveryOrderMappers";
import { calculateDOTotals } from "./utils/deliveryOrderCalculations";
import { buildDefaultFormValues, createBlankLine } from "./utils/deliveryOrderFactories";
import {
	EMPTY_CUSTOMERS,
	EMPTY_TRANSPORTERS,
	EMPTY_BROKERS,
	EMPTY_APPROVED_SALES_ORDERS,
	EMPTY_ITEM_GROUPS,
	EMPTY_INVOICE_TYPES,
	EMPTY_COMPANY_BRANCHES,
	EMPTY_SETUP_PARAMS,
	isGovtInvoice,
	isBalesUomName,
} from "./utils/deliveryOrderConstants";
import { computeConvertedQtyBales } from "@/utils/uomConversion";

function DOPageLoading() {
	return (
		<div className="flex items-center justify-center min-h-100">
			<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
		</div>
	);
}

export default function DOTransactionPage() {
	return (
		<Suspense fallback={<DOPageLoading />}>
			<DOTransactionPageContent />
		</Suspense>
	);
}

function DOTransactionPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const modeParam = (searchParams?.get("mode") || "create").toLowerCase();
	const requestedId = searchParams?.get("id") || "";
	const branchIdFromUrl = searchParams?.get("branch_id") || "";
	const menuIdFromUrl = searchParams?.get("menu_id") || "";

	const mode: MuiFormMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";

	const branchOptions = useBranchOptions();
	const { coId } = useSelectedCompanyCoId();
	const [lockedBranchId, setLockedBranchId] = React.useState<string | null>(() => (mode !== "create" && branchIdFromUrl ? String(branchIdFromUrl) : null));
	const branchPrefillAppliedRef = React.useRef(false);

	const { getMenuId } = useMenuId({ transactionType: "delivery-order", menuIdFromUrl });
	const getMenuIdRef = React.useRef(getMenuId);
	React.useEffect(() => { getMenuIdRef.current = getMenuId; }, [getMenuId]);
	const companyName = useCompanyName();
	const companyLogo = useCompanyLogo(coId);

	const {
		initialValues, setInitialValues, formValues, setFormValues,
		formKey, bumpFormKey, formRef,
		handleMainFormValuesChange, handleFooterFormValuesChange,
	} = useDeliveryOrderFormState({ mode, buildDefaultFormValues, branchIdFromUrl });

	const [doDetails, setDODetails] = React.useState<DODetails | null>(null);
	const [loading, setLoading] = React.useState<boolean>(mode !== "create");
	const [pageError, setPageError] = React.useState<string | null>(null);

	const branchValue = React.useMemo(() => {
		if (lockedBranchId) return lockedBranchId;
		const fromForm = formValues.branch != null ? String(formValues.branch) : "";
		if (fromForm) return fromForm;
		return branchIdFromUrl ? String(branchIdFromUrl) : "";
	}, [formValues.branch, branchIdFromUrl, lockedBranchId]);

	const resolvedBranchOptions = React.useMemo(() => {
		if (!branchValue) return branchOptions;
		const exists = branchOptions.some((opt) => String(opt.value) === String(branchValue));
		if (exists) return branchOptions;
		const fallbackLabel = (doDetails?.branch && typeof doDetails.branch === "string" ? doDetails.branch : undefined) || branchValue;
		return [...branchOptions, { label: fallbackLabel, value: branchValue }];
	}, [branchOptions, branchValue, doDetails?.branch]);

	const branchIdForSetup = React.useMemo(() => {
		if (!branchValue || !/^\d+$/.test(branchValue)) return undefined;
		return branchValue;
	}, [branchValue]);

	const setupParamsRef = React.useRef<typeof EMPTY_SETUP_PARAMS>(EMPTY_SETUP_PARAMS);
	const setupParams = React.useMemo(() => {
		const currentBranchId = branchIdForSetup;
		const prevBranchId = setupParamsRef.current.branchId;
		if (currentBranchId === prevBranchId) return setupParamsRef.current;
		if (!currentBranchId) {
			setupParamsRef.current = EMPTY_SETUP_PARAMS;
			return EMPTY_SETUP_PARAMS;
		}
		setupParamsRef.current = { branchId: currentBranchId };
		return setupParamsRef.current;
	}, [branchIdForSetup]);

	const memoizedMapDOSetupResponse = React.useCallback(mapDOSetupResponse, []);
	const memoizedFetchDOSetup1 = React.useCallback(fetchDOSetup1, []);

	const setupEnabled = React.useMemo(() => Boolean(coId && branchIdForSetup), [coId, branchIdForSetup]);

	const { data: setupData, loading: setupLoading, error: setupError } = useTransactionSetup<{ branchId?: string }, Record<string, unknown>, DOSetupData>({
		coId: coId || undefined,
		params: setupParams,
		fetcher: memoizedFetchDOSetup1,
		mapData: memoizedMapDOSetupResponse,
		enabled: setupEnabled,
	});

	const headerFieldsDisabled = React.useMemo(() => {
		if (mode === "view") return true;
		if (mode === "edit") return false;
		return !branchIdForSetup;
	}, [mode, branchIdForSetup]);

	const customers = setupData?.customers ?? EMPTY_CUSTOMERS;
	const transporters = setupData?.transporters ?? EMPTY_TRANSPORTERS;
	const brokers = setupData?.brokers ?? EMPTY_BROKERS;
	const approvedSalesOrders = setupData?.approvedSalesOrders ?? EMPTY_APPROVED_SALES_ORDERS;
	const itemGroups = setupData?.itemGroups ?? EMPTY_ITEM_GROUPS;
	const invoiceTypes = setupData?.invoiceTypes ?? EMPTY_INVOICE_TYPES;
	const companyBranches = setupData?.branches ?? EMPTY_COMPANY_BRANCHES;

	const fetchItemGroupDetail = React.useCallback(async (itemGroupId: string) => {
		if (!itemGroupId || !/^\d+$/.test(itemGroupId)) {
			throw new Error(`Invalid item group identifier: ${itemGroupId}`);
		}
		const response = await fetchDOSetup2(itemGroupId);
		return mapItemGroupDetailResponse(response);
	}, []);

	React.useEffect(() => {
		if (mode === "create") return;
		if (branchPrefillAppliedRef.current) return;
		if (!branchIdFromUrl) return;
		branchPrefillAppliedRef.current = true;
		setLockedBranchId(String(branchIdFromUrl));
	}, [branchIdFromUrl, mode]);

	const handleItemGroupError = React.useCallback((error: unknown) => {
		const description = error instanceof Error ? error.message : "Please try again.";
		toast({ variant: "destructive", title: "Unable to load item options", description });
	}, []);

	const { cache: itemGroupCache, loading: itemGroupLoading, ensure: ensureItemGroupData } =
		useDeferredOptionCache<string, ItemGroupCacheEntry>({
			fetcher: fetchItemGroupDetail,
			onError: handleItemGroupError,
		});

	// Determine customer/shipping branch state for GST split
	const selectedPartyId = formValues.party ? String(formValues.party) : undefined;
	const selectedCustomer = React.useMemo(
		() => customers.find((c) => c.id === selectedPartyId),
		[customers, selectedPartyId],
	);
	const partyBranchId = formValues.party_branch ? String(formValues.party_branch) : undefined;
	const shippingBranchId = formValues.shipping_to ? String(formValues.shipping_to) : undefined;
	const partyState = React.useMemo(() => {
		if (!partyBranchId || !selectedCustomer?.branches) return undefined;
		return selectedCustomer.branches.find((b) => b.id === partyBranchId)?.stateName;
	}, [partyBranchId, selectedCustomer]);
	const shippingState = React.useMemo(() => {
		if (!shippingBranchId || !selectedCustomer?.branches) return partyState;
		return selectedCustomer.branches.find((b) => b.id === shippingBranchId)?.stateName ?? partyState;
	}, [shippingBranchId, selectedCustomer, partyState]);

	const {
		lineItems, setLineItems, replaceItems, removeLineItems,
		handleLineFieldChange, handleSalesOrderLinesConfirm,
		mapLineToEditable, filledLineItems, lineItemsValid, itemGroupsFromLineItems,
		lineHasAnyData,
	} = useDeliveryOrderLineItems({
		mode,
		partyState,
		shippingState,
		itemGroupCache,
		itemGroupLoading,
		ensureItemGroupData,
		itemGroups,
		invoiceTypeId: String(formValues.invoice_type ?? ""),
	});

	const initialLineSeededRef = React.useRef(false);
	React.useEffect(() => {
		if (mode !== "create") {
			initialLineSeededRef.current = false;
			return;
		}
		if (initialLineSeededRef.current) return;
		setLineItems((prev) => {
			if (prev.length) return prev;
			initialLineSeededRef.current = true;
			return [createBlankLine()];
		});
	}, [mode, setLineItems]);

	// Unsaved changes tracking for unified action bar
	const getComparableLineData = React.useCallback(
		(item: EditableLineItem) => ({
			itemGroup: item.itemGroup,
			item: item.item,
			itemMake: item.itemMake,
			hsnCode: item.hsnCode,
			quantity: item.quantity,
			rate: item.rate,
			uom: item.uom,
			discountType: item.discountType,
			remarks: item.remarks,
			taxPercentage: item.taxPercentage,
		}),
		[],
	);

	const comparableLineItems = React.useMemo(
		() => lineItems.filter(lineHasAnyData),
		[lineItems, lineHasAnyData],
	);

	const { hasUnsavedChanges, resetBaseline, setBaseline } = useUnsavedChanges({
		formValues,
		lineItems: comparableLineItems,
		getComparableLineData,
		enabled: mode !== "create",
	});

	// Item selection dialog
	const [itemDialogOpen, setItemDialogOpen] = React.useState(false);

	const excludeItemIds = React.useMemo(() => {
		const ids = new Set<number>();
		for (const li of lineItems) {
			if (li.item) {
				const num = Number(li.item);
				if (Number.isFinite(num)) ids.add(num);
			}
		}
		return ids;
	}, [lineItems]);

	const handleItemDialogConfirm = React.useCallback(
		(items: SelectedItem[]) => {
			if (mode === "view" || !items.length) return;

			const newLines: EditableLineItem[] = items.map((item) => ({
				id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
				itemGroup: String(item.item_grp_id),
				item: String(item.item_id),
				itemCode: item.full_item_code || item.item_code || "",
				itemName: item.item_name || "",
				itemMake: "",
				hsnCode: item.hsn_code ?? "",
				quantity: "",
				rate: "",
				uom: String(item.uom_id),
				uomName: item.uom_name || undefined,
				discountValue: "",
				remarks: "",
				taxPercentage: item.tax_percentage ?? undefined,
			}));

			const groupIds = [...new Set(items.map((i) => String(i.item_grp_id)))];
			for (const gid of groupIds) {
				if (!itemGroupCache[gid] && !itemGroupLoading[gid]) {
					void ensureItemGroupData(gid);
				}
			}

			setLineItems((prev) => {
				const filledLines = prev.filter((line) => lineHasAnyData(line));
				return [...filledLines, ...newLines, createBlankLine()];
			});

			toast({
				title: `Added ${newLines.length} item${newLines.length > 1 ? "s" : ""}`,
				description: "Fill in quantity, rate and other details.",
			});
		},
		[mode, setLineItems, lineHasAnyData, itemGroupCache, itemGroupLoading, ensureItemGroupData]
	);

	const freightCharges = Number(formValues.freight_charges) || 0;
	const roundOffValue = Number(formValues.round_off_value) || 0;
	const totals = React.useMemo(
		() => calculateDOTotals(filledLineItems, freightCharges, roundOffValue),
		[filledLineItems, freightCharges, roundOffValue],
	);

	// Refs for callbacks used inside the fetch effect — avoids including them in deps
	const fetchCallbacksRef = React.useRef({ setInitialValues, setFormValues, bumpFormKey, replaceItems, mapLineToEditable, setBaseline, lineHasAnyData });
	React.useEffect(() => {
		fetchCallbacksRef.current = { setInitialValues, setFormValues, bumpFormKey, replaceItems, mapLineToEditable, setBaseline, lineHasAnyData };
	});
	const branchValueRef = React.useRef(branchValue);
	React.useEffect(() => { branchValueRef.current = branchValue; }, [branchValue]);

	const lastDetailsFetchKeyRef = React.useRef("");

	React.useEffect(() => {
		if (mode === "create") {
			setDODetails(null);
			setPageError(null);
			setLoading(false);
			return;
		}

		if (!requestedId) {
			setDODetails(null);
			setPageError("Delivery order id is required to load details.");
			setLoading(false);
			return;
		}

		if (!coId) return;

		const fetchKey = `${requestedId}|${coId}`;
		if (lastDetailsFetchKeyRef.current === fetchKey) return;

		let cancelled = false;
		lastDetailsFetchKeyRef.current = fetchKey;

		const fetchDetails = async () => {
			setLoading(true);
			try {
				const details = await getDOById(requestedId, coId || undefined, getMenuIdRef.current() || undefined);
				if (cancelled) return;

				setDODetails(details);
				const defaultFormValues = buildDefaultFormValues();
				const nextValues = mapDODetailsToFormValues(details, defaultFormValues);

				const detailsWithBranchId = details as unknown as { branch_id?: unknown; branchId?: unknown };
				const branchIdFromDetails = detailsWithBranchId?.branch_id ?? detailsWithBranchId?.branchId;
				const currentBranchValue = branchValueRef.current;
				const resolvedBranchValue = (() => {
					if (branchIdFromDetails != null && branchIdFromDetails !== "") return String(branchIdFromDetails);
					if (branchIdFromUrl) return String(branchIdFromUrl);
					if (currentBranchValue && /^\d+$/.test(currentBranchValue)) return currentBranchValue;
					const mappedValue = nextValues.branch != null ? String(nextValues.branch) : "";
					return /^\d+$/.test(mappedValue) ? mappedValue : "";
				})();

				if (resolvedBranchValue) {
					nextValues.branch = resolvedBranchValue;
					setLockedBranchId(resolvedBranchValue);
				}

				const { setInitialValues: setInit, setFormValues: setForm, bumpFormKey: bump, replaceItems: replace, mapLineToEditable: mapLine, setBaseline: setBase, lineHasAnyData: hasData } = fetchCallbacksRef.current;
				setInit(nextValues);
				setForm(nextValues);
				bump();

				const normalizedLines = (details.lines ?? []).map((line) => mapLine(line));
				replace(normalizedLines);

				const baselineLines = normalizedLines.filter(hasData);
				setBase(nextValues, baselineLines);

				setPageError(null);
			} catch (error) {
				if (cancelled) return;
				const description = error instanceof Error ? error.message : "Unable to load delivery order.";
				setDODetails(null);
				setPageError(description);
				toast({ variant: "destructive", title: "Unable to load delivery order", description });
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		void fetchDetails();

		return () => {
			cancelled = true;
			lastDetailsFetchKeyRef.current = "";
		};
	}, [mode, requestedId, coId, branchIdFromUrl]);

	React.useEffect(() => {
		if (!doDetails?.lines?.length) return;
		const uniqueGroups = new Set(
			doDetails.lines
				.map((line) => (line.itemGroup ? String(line.itemGroup) : ""))
				.filter((groupId) => groupId && /^\d+$/.test(groupId)),
		);
		uniqueGroups.forEach((groupId) => { ensureItemGroupData(groupId); });
	}, [doDetails, ensureItemGroupData]);

	// Disable the SO dropdown if lines were manually entered without an SO selected
	const hasManualLines = React.useMemo(() => {
		if (mode !== "create") return false;
		if (formValues.sales_order) return false;
		return filledLineItems.length > 0;
	}, [mode, formValues.sales_order, filledLineItems.length]);

	// When sales_order is selected in create mode, auto-populate header fields + line items from the SO
	const prevSORef = React.useRef<string | undefined>(undefined);
	React.useEffect(() => {
		const soValue = formValues.sales_order ? String(formValues.sales_order) : undefined;
		if (!soValue || mode !== "create") return;
		// Only autofill when the SO selection actually changes
		if (prevSORef.current === soValue) return;
		prevSORef.current = soValue;

		const selectedSO = setupData?.approvedSalesOrders?.find(
			(so) => String(so.id) === soValue,
		);
		if (!selectedSO) return;

		// Autofill header fields — update both React state and the live form via formRef
		const headerUpdates: Record<string, unknown> = {};
		if (selectedSO.partyId) headerUpdates.party = selectedSO.partyId;
		if (selectedSO.billingToId) {
			headerUpdates.billing_to = selectedSO.billingToId;
			headerUpdates.party_branch = selectedSO.billingToId;
		}
		if (selectedSO.shippingToId) headerUpdates.shipping_to = selectedSO.shippingToId;
		if (selectedSO.transporterId) headerUpdates.transporter = selectedSO.transporterId;
		if (selectedSO.brokerId) headerUpdates.broker = selectedSO.brokerId;
		if (selectedSO.invoiceType) headerUpdates.invoice_type = selectedSO.invoiceType;

		setFormValues((prev: Record<string, unknown>) => ({ ...prev, ...headerUpdates }));
		Object.entries(headerUpdates).forEach(([key, value]) => {
			formRef.current?.setValue(key, value);
		});

		// Auto-import ALL line items from the sales order
		fetchSalesOrderLines(soValue)
			.then((response) => {
				const lines = response.data || [];
				if (lines.length > 0) {
					handleSalesOrderLinesConfirm(lines);
				}
			})
			.catch((error) => {
				const description = error instanceof Error ? error.message : "Unable to load sales order lines.";
				toast({ variant: "destructive", title: "Failed to import SO lines", description });
			});
	}, [formValues.sales_order, mode, setupData?.approvedSalesOrders, setFormValues, handleSalesOrderLinesConfirm, formRef]);

	const isLineItemsReady = React.useMemo(() => {
		if (mode === "view" || pageError || setupError) return true;
		return lineItemsValid;
	}, [lineItemsValid, mode, pageError, setupError]);

	const {
		customerOptions, customerBranchOptions, transporterOptions, brokerOptions, salesOrderOptions,
		invoiceTypeOptions,
		getItemOptions, getMakeOptions, getUomOptions,
		getMakeLabel, getUomLabel, getUomConversions, getOptionLabel,
	} = useDeliveryOrderSelectOptions({
		customers,
		transporters,
		brokers,
		approvedSalesOrders,
		invoiceTypes,
		itemGroupsFromLineItems,
		itemGroupCache,
		selectedPartyId,
	});

	const headerSchema = useDeliveryOrderHeaderSchema({
		branchOptions: resolvedBranchOptions,
		customerOptions,
		customerBranchOptions,
		transporterOptions,
		brokerOptions,
		salesOrderOptions,
		invoiceTypeOptions,
		mode,
		headerFieldsDisabled,
		hasManualLines,
	});

	const footerSchema = useDeliveryOrderFooterSchema({ mode });

	const canEdit = mode !== "view";

	const lineItemColumns = useDOLineItemColumns({
		canEdit,
		getItemOptions,
		getMakeOptions,
		getUomOptions,
		getUomLabel,
		handleLineFieldChange,
		invoiceTypeId: String(formValues.invoice_type ?? ""),
		getUomConversions,
	});

	const {
		approvalLoading, approvalInfo, approvalPermissions, statusChipProps,
		handleApprove, handleReject, handleOpen, handleCancelDraft,
		handleReopen, handleSendForApproval, handleViewApprovalLog,
	} = useDeliveryOrderApproval({
		mode,
		requestedId,
		formValues,
		doDetails,
		coId,
		getMenuId,
		setDODetails,
	});

	// Reset unsaved-changes baseline after approval actions refresh doDetails
	React.useEffect(() => {
		if (!doDetails || mode === "create") return;
		const timer = setTimeout(() => resetBaseline(), 0);
		return () => clearTimeout(timer);
	}, [doDetails, mode, resetBaseline]);

	// Reject dialog for approval workflow
	const {
		rejectDialogOpen, rejectReason, setRejectReason,
		openRejectDialog, handleRejectConfirm, handleRejectCancel,
	} = useRejectDialog(handleReject);

	const branchLabel = React.useMemo(() => {
		const value = formValues.branch ?? doDetails?.branch;
		return getOptionLabel(resolvedBranchOptions, value) ?? (typeof value === "string" ? value : undefined);
	}, [resolvedBranchOptions, formValues.branch, doDetails?.branch, getOptionLabel]);

	const branchAddress = React.useMemo(() => {
		const value = formValues.branch ?? doDetails?.branch;
		if (value == null || value === "") return undefined;
		const match = companyBranches.find((b) => b.id === String(value));
		if (!match) return undefined;
		const parts = [match.address1, match.address2, match.stateName, match.zipcode].filter(Boolean);
		return parts.length > 0 ? parts.join(", ") : undefined;
	}, [companyBranches, formValues.branch, doDetails?.branch]);

	const customerLabel = React.useMemo(() => {
		const value = formValues.party ?? doDetails?.party;
		return getOptionLabel(customerOptions, value) ?? (typeof value === "string" ? value : undefined);
	}, [formValues.party, doDetails?.party, customerOptions, getOptionLabel]);

	const customerBranchLabel = React.useMemo(() => {
		const value = formValues.party_branch ?? doDetails?.partyBranch;
		return getOptionLabel(customerBranchOptions, value) ?? (typeof value === "string" ? value : undefined);
	}, [formValues.party_branch, doDetails?.partyBranch, customerBranchOptions, getOptionLabel]);

	const billingToLabel = React.useMemo(() => {
		const value = formValues.billing_to ?? doDetails?.billingTo;
		if (!value) return undefined;
		// First try to get from options
		const fromOptions = getOptionLabel(customerBranchOptions, value);
		if (fromOptions) return fromOptions;
		// Otherwise construct from branch record with full address concatenation
		if (selectedCustomer?.branches) {
			const branch = selectedCustomer.branches.find((b) => b.id === String(value));
			if (branch) {
				const parts = [branch.address, branch.stateName].filter(Boolean);
				return parts.length > 0 ? parts.join(" — ") : branch.address || String(value);
			}
		}
		return typeof value === "string" ? value : undefined;
	}, [formValues.billing_to, doDetails?.billingTo, customerBranchOptions, getOptionLabel, selectedCustomer]);

	const shippingToLabel = React.useMemo(() => {
		const value = formValues.shipping_to ?? doDetails?.shippingTo;
		if (!value) return undefined;
		// First try to get from options
		const fromOptions = getOptionLabel(customerBranchOptions, value);
		if (fromOptions) return fromOptions;
		// Otherwise construct from branch record with full address concatenation
		if (selectedCustomer?.branches) {
			const branch = selectedCustomer.branches.find((b) => b.id === String(value));
			if (branch) {
				const parts = [branch.address, branch.stateName].filter(Boolean);
				return parts.length > 0 ? parts.join(" — ") : branch.address || String(value);
			}
		}
		return typeof value === "string" ? value : undefined;
	}, [formValues.shipping_to, doDetails?.shippingTo, customerBranchOptions, getOptionLabel, selectedCustomer]);

	const salesOrderLabel = React.useMemo(() => {
		const value = formValues.sales_order ?? doDetails?.salesOrder;
		return getOptionLabel(salesOrderOptions, value) ?? doDetails?.salesNo ?? (typeof value === "string" ? value : undefined);
	}, [formValues.sales_order, doDetails?.salesOrder, doDetails?.salesNo, salesOrderOptions, getOptionLabel]);

	const transporterLabel = React.useMemo(() => {
		const value = formValues.transporter ?? doDetails?.transporter;
		return getOptionLabel(transporterOptions, value) ?? doDetails?.transporterName ?? (typeof value === "string" ? value : undefined);
	}, [formValues.transporter, doDetails?.transporter, doDetails?.transporterName, transporterOptions, getOptionLabel]);

	const statusLabel = React.useMemo(() => statusChipProps?.label ?? doDetails?.status, [statusChipProps?.label, doDetails?.status]);

	// Resolve billing/shipping addresses for print preview
	const billingBranchId = formValues.billing_to ? String(formValues.billing_to) : undefined;
	const billingToAddress = React.useMemo(() => {
		if (!selectedCustomer?.branches || !billingBranchId) return undefined;
		return selectedCustomer.branches.find((b) => b.id === billingBranchId)?.fullAddress;
	}, [selectedCustomer, billingBranchId]);

	const shippingToAddress = React.useMemo(() => {
		if (!selectedCustomer?.branches || !shippingBranchId) return undefined;
		return selectedCustomer.branches.find((b) => b.id === shippingBranchId)?.fullAddress;
	}, [selectedCustomer, shippingBranchId]);

	const previewHeader = React.useMemo(() => {
		const isGovtSkg = isGovtInvoice(formValues.invoice_type as string | undefined);
		let pcsoNo: string | undefined;
		let pcsoDate: string | undefined;
		if (isGovtSkg) {
			const soValue = formValues.sales_order ? String(formValues.sales_order) : undefined;
			const selectedSO = soValue
				? approvedSalesOrders.find((so) => String(so.id) === soValue)
				: undefined;
			const extGovtskg = doDetails?.soExtensionData?.govtskg as Record<string, unknown> | undefined;
			pcsoNo = selectedSO?.pcsoNo ?? (extGovtskg?.pcso_no as string | undefined) ?? undefined;
			pcsoDate = selectedSO?.pcsoDate ?? (extGovtskg?.pcso_date as string | undefined) ?? undefined;
		}
		return {
			doNo: doDetails?.deliveryOrderNo,
			doDate: (formValues.date as string) || doDetails?.deliveryOrderDate,
			branch: branchLabel,
			branchAddress,
			customer: customerLabel,
			billingToAddress,
			shippingToAddress,
			salesOrder: salesOrderLabel,
			pcsoNo,
			pcsoDate,
			transporter: transporterLabel,
			vehicleNo: (formValues.vehicle_no as string) || doDetails?.vehicleNo,
			driverName: (formValues.driver_name as string) || doDetails?.driverName,
			companyName,
			companyLogo,
			status: statusLabel,
		};
	}, [
		doDetails, formValues.date, formValues.invoice_type, formValues.sales_order,
		formValues.vehicle_no, formValues.driver_name, approvedSalesOrders,
		branchLabel, branchAddress, customerLabel, billingToAddress, shippingToAddress, salesOrderLabel,
		transporterLabel, companyName, companyLogo, statusLabel,
	]);

	const isHessianInvoice = String(formValues.invoice_type ?? "") === "2";
	const showBalesInPreview = isGovtInvoice(formValues.invoice_type as string | undefined) || isHessianInvoice;
	const previewItems = React.useMemo(() => {
		return filledLineItems.map((line, index) => {
			const itemOptions = getItemOptions(line.itemGroup);
			const itemLabel = itemOptions.find((o) => o.value === line.item)?.label ?? line.itemName ?? "-";
			const uomLabel = getUomLabel(line.itemGroup, line.item, line.uom, line.uomName);
			// Prefer the user-entered bales (govtskgQtyBales / hessianQtyBales); fall back to computing from quantity.
			// Always apply per-item rounding from uom_item_map_mst so legacy unrounded values render correctly.
			let qtyInBales: string | undefined;
			if (showBalesInPreview) {
				const conversions = getUomConversions(line.itemGroup, line.item);
				const balesConvEntry = conversions?.find((c) =>
					(c.mapFromId === line.uom && /\bbales?\b/i.test(c.mapToName ?? "")) ||
					(c.mapToId === line.uom && /\bbales?\b/i.test(c.mapFromName ?? "")),
				);
				const rounding = balesConvEntry?.rounding ?? 2;
				const storedBales = isHessianInvoice ? line.hessianQtyBales : line.govtskgQtyBales;
				if (storedBales && Number(storedBales)) {
					qtyInBales = Number(storedBales).toFixed(rounding);
				} else {
					const computed = computeConvertedQtyBales(line.quantity, line.uom, conversions);
					if (computed) qtyInBales = computed.convertedQty;
				}
			}
			return {
				srNo: index + 1,
				itemCode: line.itemCode || "-",
				item: itemLabel,
				quantity: line.quantity || "-",
				uom: uomLabel,
				qtyInBales,
			};
		});
	}, [filledLineItems, getItemOptions, getUomLabel, getUomConversions, showBalesInPreview, isHessianInvoice]);

	const previewTotals = React.useMemo(
		() => ({
			grossAmount: totals.grossAmount,
			totalIGST: totals.totalIGST,
			totalCGST: totals.totalCGST,
			totalSGST: totals.totalSGST,
			freightCharges: totals.freightCharges,
			roundOffValue: totals.roundOffValue,
			netAmount: totals.netAmount,
		}),
		[totals],
	);

	const previewRemarks = React.useMemo(() => {
		return (
			(formValues.internal_note as string) ||
			doDetails?.internalNote ||
			(formValues.footer_note as string) ||
			doDetails?.footerNote ||
			""
		);
	}, [formValues.internal_note, formValues.footer_note, doDetails?.internalNote, doDetails?.footerNote]);

	const { metadata } = useTransactionPreview({
		header: previewHeader,
		fields: [
			{ label: "DO No", accessor: (header) => header.doNo || "Pending" },
			{ label: "DO Date", accessor: (header) => header.doDate || "-" },
			{ label: "Customer", accessor: (header) => header.customer || "-" },
			{ label: "Status", accessor: (header) => header.status || "-", includeWhen: (header) => Boolean(header.status) },
		],
	});

	const { saving, handleFormSubmit } = useDeliveryOrderFormSubmission({
		mode,
		pageError,
		setupError,
		filledLineItems,
		isLineItemsReady,
		requestedId,
		formValues,
	});

	// Unified primary actions for TransactionWrapper
	const primaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
		if (pageError || setupError) return undefined;

		if (mode === "create") {
			return [{
				label: "Create Delivery Order",
				onClick: () => formRef.current?.submit(),
				disabled: saving || !isLineItemsReady || setupLoading,
				loading: saving,
			}];
		}

		if (!doDetails) return undefined;

		if (mode === "edit" && approvalPermissions.canSave && hasUnsavedChanges) {
			return [{
				label: "Save Changes",
				onClick: () => formRef.current?.submit(),
				disabled: saving || !isLineItemsReady || setupLoading,
				loading: saving,
			}];
		}

		const approvalActions = buildApprovalTransactionActions({
			approvalInfo,
			permissions: approvalPermissions,
			handlers: {
				onOpen: handleOpen,
				onCancelDraft: handleCancelDraft,
				onReopen: handleReopen,
				onSendForApproval: handleSendForApproval,
				onApprove: handleApprove,
				onReject: openRejectDialog,
				onViewApprovalLog: handleViewApprovalLog,
			},
			loading: approvalLoading,
			disabled: saving || loading || setupLoading,
		});

		return approvalActions.length ? approvalActions : undefined;
	}, [pageError, setupError, mode, doDetails, saving, isLineItemsReady, setupLoading,
		approvalPermissions, hasUnsavedChanges, approvalInfo, handleOpen, handleCancelDraft,
		handleReopen, handleSendForApproval, handleApprove, openRejectDialog,
		handleViewApprovalLog, approvalLoading, loading, formRef]);

	const pageTitle = React.useMemo(() => {
		if (mode === "create") return "Create Delivery Order";
		if (mode === "edit") {
			return doDetails?.deliveryOrderNo ? `Edit DO ${doDetails.deliveryOrderNo}` : "Edit Delivery Order";
		}
		return doDetails?.deliveryOrderNo ? `Delivery Order ${doDetails.deliveryOrderNo}` : "Delivery Order Details";
	}, [mode, doDetails?.deliveryOrderNo]);

	// Detect empty customer list issue
	const customerListWarning = React.useMemo(() => {
		if (setupLoading || pageError) return null;
		if (mode === "view") return null;
		if (setupData && customers.length === 0) {
			return (
				<div role="alert" aria-live="assertive" className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
					<p className="text-sm text-yellow-800">
						<strong>⚠️ No customers available:</strong> The customer list is empty. This typically occurs when customer party types are not properly configured.
						Please contact your system administrator to ensure that customer master data with proper party types is set up in the system.
					</p>
				</div>
			);
		}
		return null;
	}, [setupLoading, pageError, mode, setupData, customers.length]);

	return (
		<>
		<TransactionWrapper
			title={pageTitle}
			subtitle={mode === "create" ? "Create a new delivery order" : mode === "edit" ? "Edit delivery order" : "View delivery order details"}
			metadata={metadata}
			statusChip={statusChipProps}
			backAction={{ onClick: () => router.push("/dashboardportal/sales/deliveryOrder") }}
			primaryActions={primaryActions}
			actionsAfterFooter
			loading={loading || setupLoading}
			alerts={pageError ? <div role="alert" aria-live="assertive" className="text-red-600">{pageError}</div> : customerListWarning}
			preview={
				<DeliveryOrderPreview
					header={previewHeader}
					items={previewItems}
					totals={previewTotals}
					remarks={previewRemarks}
				/>
			}
			lineItems={{
				items: lineItems,
				getItemId: (item) => item.id,
				canEdit,
				columns: lineItemColumns,
				placeholder: "Add line items manually or import from a sales order",
				selectionColumnWidth: "28px",
				headerAction: canEdit ? (
					<Button
						type="button"
						size="sm"
						onClick={() => setItemDialogOpen(true)}
						disabled={!coId}
					>
						Add Items
					</Button>
				) : undefined,
			}}
			footer={
				<div className="space-y-6 pt-4 border-t">
					<DeliveryOrderFooterForm
						schema={footerSchema}
						formKey={formKey}
						initialValues={initialValues}
						mode={mode}
						onSubmit={handleFormSubmit}
						onValuesChange={handleFooterFormValuesChange}
					/>
					<DeliveryOrderTotalsDisplay totals={totals} showGSTBreakdown={Boolean(partyState || shippingState)} />
				</div>
			}
		>
			<DeliveryOrderHeaderForm
				schema={headerSchema}
				formKey={formKey}
				initialValues={initialValues}
				mode={mode}
				formRef={formRef}
				onSubmit={handleFormSubmit}
				onValuesChange={handleMainFormValuesChange}
			/>

			<DOSalesOrderExtensionDisplay
				soExtensionData={doDetails?.soExtensionData}
				invoiceTypeId={formValues.invoice_type as string}
			/>
		</TransactionWrapper>

		<ItemSelectionDialog
			open={itemDialogOpen}
			onOpenChange={setItemDialogOpen}
			coId={coId}
			onConfirm={handleItemDialogConfirm}
			filter="saleable"
			excludeItemIds={excludeItemIds}
			title="Select Items for Delivery Order"
		/>

		<Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open) handleRejectCancel(); }}>
			<DialogContent className="sm:max-w-125">
				<DialogHeader>
					<DialogTitle>Reject Delivery Order</DialogTitle>
					<DialogDescription>Please provide a reason for rejecting this delivery order.</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<label htmlFor="reject-reason" className="text-sm font-medium leading-none">
							Rejection Reason *
						</label>
						<AutoResizeTextarea
							id="reject-reason"
							placeholder="Enter rejection reason..."
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							minHeight={80}
							maxHeight={200}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={handleRejectCancel}>Cancel</Button>
					<Button variant="destructive" onClick={handleRejectConfirm} disabled={!rejectReason.trim()}>Reject</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	);
}
