"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TextField } from "@mui/material";
import TransactionWrapper, { type TransactionAction } from "@/components/ui/TransactionWrapper";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import type { MuiFormMode } from "@/components/ui/muiform";
import {
	useDeferredOptionCache,
	useTransactionSetup,
	useTransactionPreview,
	buildApprovalTransactionActions,
	useRejectDialog,
	useUnsavedChanges,
	AutoResizeTextarea,
	ItemSelectionDialog,
	type SelectedItem,
} from "@/components/ui/transaction";
import { useBranchOptions } from "@/utils/branchUtils";
import {
	fetchSalesOrderSetup1,
	fetchSalesOrderSetup2,
	getQuotationLines,
	getSalesOrderById,
	type SalesOrderDetails,
} from "@/utils/salesOrderService";
import { fetchEnquiryLinesForSalesOrder } from "@/utils/enquiryService";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { toast } from "@/hooks/use-toast";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { useMenuId } from "@/hooks/useMenuId";
import { useCompanyName } from "@/hooks/useCompanyName";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

import { SalesOrderHeaderForm } from "./components/SalesOrderHeaderForm";
import { SalesOrderTotalsDisplay } from "./components/SalesOrderTotalsDisplay";
import SalesOrderPreview from "./components/SalesOrderPreview";
import { useSalesOrderLineItemColumns } from "./components/SalesOrderLineItemsTable";
import { AdditionalChargesSection, type AdditionalChargeRow } from "./components/AdditionalChargesSection";

import { useSalesOrderFormState } from "./hooks/useSalesOrderFormState";
import { useSalesOrderTaxCalculations } from "./hooks/useSalesOrderTaxCalculations";
import { useSalesOrderSelectOptions } from "./hooks/useSalesOrderSelectOptions";
import { useSalesOrderHeaderSchema } from "./hooks/useSalesOrderFormSchemas";
import { useSalesOrderGovtskgSchema } from "./hooks/useSalesOrderGovtskgSchema";
import { useSalesOrderJuteSchema } from "./hooks/useSalesOrderJuteSchema";
import { useSalesOrderJuteYarnSchema } from "./hooks/useSalesOrderJuteYarnSchema";
import { useSalesOrderFormSubmission } from "./hooks/useSalesOrderFormSubmission";
import { useSalesOrderApproval } from "./hooks/useSalesOrderApproval";
import { useSalesOrderLineItems } from "./hooks/useSalesOrderLineItems";
import type { EditableLineItem, ItemGroupCacheEntry, SalesOrderSetupData } from "./types/salesOrderTypes";

import { mapItemGroupDetailResponse, mapSalesOrderSetupResponse, mapSalesOrderDetailsToFormValues } from "./utils/salesOrderMappers";
import { buildDefaultFormValues, createBlankLine } from "./utils/salesOrderFactories";
import {
	EMPTY_BRANCH_ADDRESSES,
	EMPTY_BROKERS,
	EMPTY_CUSTOMERS,
	EMPTY_INVOICE_TYPES,
	EMPTY_ITEM_GROUPS,
	EMPTY_QUOTATIONS,
	EMPTY_SETUP_PARAMS,
	EMPTY_TRANSPORTERS,
	isHessianOrder,
	isGovtSkgOrder,
} from "./utils/salesOrderConstants";
import { computeGovtskgTransportCharges, mergeTransportCharges } from "../../utils/govtskgTransportCharges";
import { computeSalesOrderTotals } from "./utils/salesOrderTotals";

function SOPageLoading() {
	return (
		<div className="flex items-center justify-center min-h-100">
			<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
		</div>
	);
}

export default function SalesOrderTransactionPage() {
	return (
		<Suspense fallback={<SOPageLoading />}>
			<SalesOrderTransactionPageContent />
		</Suspense>
	);
}

function SalesOrderTransactionPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const modeParam = (searchParams?.get("mode") || "create").toLowerCase();
	const requestedId = searchParams?.get("id") || "";
	const branchIdFromUrl = searchParams?.get("branch_id") || "";
	const menuIdFromUrl = searchParams?.get("menu_id") || "";
	const salesEnquiryIdFromUrl = searchParams?.get("sales_enquiry_id") || "";

	const mode: MuiFormMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";

	// AMCL enquiry flow: direct sales order from an enquiry (tender path, decision Q3).
	const [salesEnquiryId, setSalesEnquiryId] = React.useState<string | null>(
		mode === "create" && salesEnquiryIdFromUrl ? salesEnquiryIdFromUrl : null
	);

	const branchOptions = useBranchOptions();
	const { coId } = useSelectedCompanyCoId();
	const { selectedBranches } = useSidebarContext();
	const [isMounted, setIsMounted] = React.useState(false);
	const branchPrefillAppliedRef = React.useRef(false);
	const [lockedBranchId, setLockedBranchId] = React.useState<string | null>(() => (mode !== "create" && branchIdFromUrl ? String(branchIdFromUrl) : null));

	React.useEffect(() => {
		setIsMounted(true);
	}, []);

	const { getMenuId } = useMenuId({ transactionType: "salesOrder", menuIdFromUrl });
	const companyName = useCompanyName();
	const companyLogo = useCompanyLogo(coId);

	const {
		initialValues,
		setInitialValues,
		formValues,
		setFormValues,
		formKey,
		bumpFormKey,
		formRef,
		handleFormValuesChange,
	} = useSalesOrderFormState({
		mode,
		buildDefaultFormValues,
		branchIdFromUrl,
	});

	const [soDetails, setSODetails] = React.useState<SalesOrderDetails | null>(null);
	const [loading, setLoading] = React.useState<boolean>(mode !== "create");
	const [pageError, setPageError] = React.useState<string | null>(null);
	const [additionalCharges, setAdditionalCharges] = React.useState<AdditionalChargeRow[]>([]);

	// Branch value resolution
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
		const fallbackLabel =
			(soDetails?.branch && typeof soDetails.branch === "string" ? soDetails.branch : undefined) ||
			branchValue;
		return [...branchOptions, { label: fallbackLabel, value: branchValue }];
	}, [branchOptions, branchValue, soDetails?.branch]);

	// SO-GOVT-006: in create mode, fall back to the first sidebar branch when the
	// user hasn't explicitly picked one yet, so get_sales_order_setup_1 fires on
	// page mount and the form unblocks. The branch dropdown still lets the user
	// override afterwards. Edit/view modes always pass branch_id from the URL.
	const branchIdForSetup = React.useMemo(() => {
		if (branchValue && /^\d+$/.test(branchValue)) return branchValue;
		if (mode === "create") {
			const firstBranch = branchOptions.find((opt) => /^\d+$/.test(String(opt.value)));
			if (firstBranch) return String(firstBranch.value);
		}
		return undefined;
	}, [branchValue, mode, branchOptions]);

	// Setup params with stable reference
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

	const memoizedMapSetupResponse = React.useCallback(mapSalesOrderSetupResponse, []);
	const memoizedFetchSetup1 = React.useCallback(fetchSalesOrderSetup1, []);

	const setupEnabled = React.useMemo(() => Boolean(coId && branchIdForSetup), [coId, branchIdForSetup]);

	const { data: setupData, loading: setupLoading, error: setupError } = useTransactionSetup<{ branchId?: string }, Record<string, unknown>, SalesOrderSetupData>({
		coId: coId || undefined,
		params: setupParams,
		fetcher: memoizedFetchSetup1,
		mapData: memoizedMapSetupResponse,
		enabled: setupEnabled,
	});

	const headerFieldsDisabled = React.useMemo(() => {
		if (mode === "view") return true;
		if (mode === "edit") return false;
		return !branchIdForSetup;
	}, [mode, branchIdForSetup]);

	// Extract setup data
	const customers = setupData?.customers ?? EMPTY_CUSTOMERS;
	const brokers = setupData?.brokers ?? EMPTY_BROKERS;
	const transporters = setupData?.transporters ?? EMPTY_TRANSPORTERS;
	const approvedQuotations = setupData?.approvedQuotations ?? EMPTY_QUOTATIONS;
	const itemGroups = setupData?.itemGroups ?? EMPTY_ITEM_GROUPS;
	const coConfig = setupData?.coConfig;
	const invoiceTypes = setupData?.invoiceTypes ?? EMPTY_INVOICE_TYPES;
	const branchAddresses = setupData?.branchAddresses ?? EMPTY_BRANCH_ADDRESSES;

	const chargeOptions = React.useMemo(() => {
		const raw = setupData?.additionalChargesMaster;
		if (!Array.isArray(raw) || !raw.length) return [];
		return raw.map((c) => ({
			value: String(c.additional_charges_id ?? ""),
			label: String(c.additional_charges_name ?? ""),
			defaultValue: c.default_value != null ? Number(c.default_value) : undefined,
		}));
	}, [setupData]);

	const quotationRequired = React.useMemo(
		() => Boolean(coConfig?.quotation_required),
		[coConfig?.quotation_required],
	);

	// Item group cache
	const fetchItemGroupDetail = React.useCallback(async (itemGroupId: string) => {
		if (!itemGroupId || !/^\d+$/.test(itemGroupId)) {
			throw new Error(`Invalid item group identifier: ${itemGroupId}`);
		}
		const response = await fetchSalesOrderSetup2(itemGroupId);
		return mapItemGroupDetailResponse(response);
	}, []);

	// Sync lockedBranchId for edit/view mode
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

	// Derive customer branches from selected customer
	const customerBranches = React.useMemo(() => {
		const selectedPartyId = String(formValues.party ?? "");
		if (!selectedPartyId) return [];
		const customer = customers.find((c) => c.id === selectedPartyId);
		return customer?.branches ?? [];
	}, [formValues.party, customers]);

	// Derive billing/shipping state from party (customer) branches
	const billingToState = React.useMemo(() => {
		const billingId = String(formValues.billing_to ?? "");
		if (!billingId) return undefined;
		return customerBranches.find((b) => b.id === billingId)?.stateName;
	}, [formValues.billing_to, customerBranches]);

	const shippingToState = React.useMemo(() => {
		const shippingId = String(formValues.shipping_to ?? "");
		if (!shippingId) return undefined;
		return customerBranches.find((b) => b.id === shippingId)?.stateName;
	}, [formValues.shipping_to, customerBranches]);

	// Resolve invoice type code from selected ID + invoiceTypes list (name-based, not hardcoded ID)
	const invoiceTypeCode = React.useMemo(() => {
		const selectedId = String(formValues.invoice_type ?? "");
		if (!selectedId) return "";
		const found = invoiceTypes.find((t) => t.id === selectedId);
		return found?.typeCode ?? "";
	}, [formValues.invoice_type, invoiceTypes]);

	// Lock invoice type dropdown when type-specific header fields have data
	const hasTypeSpecificHeaderData = React.useMemo(() => {
		const v = formValues;
		const hasGovtskg = !!(v.govtskg_pcso_no || v.govtskg_pcso_date || v.govtskg_admin_office || v.govtskg_rail_head || v.govtskg_loading_point || v.govtskg_mode_of_transport);
		const hasJute = !!(v.jute_mr_no || v.jute_mukam_id || v.jute_claim_amount || v.jute_claim_description);
		const hasJuteYarn = !!(v.juteyarn_pcso_no || v.juteyarn_container_no || v.juteyarn_customer_ref_no);
		return hasGovtskg || hasJute || hasJuteYarn;
	}, [formValues]);

	// Clear previous type's header fields when invoice type changes.
	// IMPORTANT: prevInvoiceTypeCodeRef starts as `null` (NOT ""), so the first time
	// invoiceTypeCode resolves to anything (including the initial "") we just record it
	// without firing a clear. This prevents an infinite update loop when the user
	// picks an invoice type for the first time on a freshly loaded page — see
	// SO-GOVT-003. The ref must be updated AFTER the equality guard so a re-run
	// triggered by the same code is a no-op (no setState inside the effect).
	const prevInvoiceTypeCodeRef = React.useRef<string | null>(null);
	React.useEffect(() => {
		if (mode === "view") return;
		const currentCode = invoiceTypeCode;
		const prevCode = prevInvoiceTypeCodeRef.current;
		// Guard FIRST, then update the ref. This way a same-value re-run never sets state.
		if (prevCode === currentCode) return;
		prevInvoiceTypeCodeRef.current = currentCode;
		// First observation (ref was null) or transitioning from empty: nothing to clear.
		if (prevCode === null || prevCode === "") return;

		const clearFields: Record<string, string> = {};
		if (prevCode === "govt_skg") {
			Object.assign(clearFields, { govtskg_pcso_no: "", govtskg_pcso_date: "", govtskg_admin_office: "", govtskg_rail_head: "", govtskg_loading_point: "", govtskg_mode_of_transport: "" });
		} else if (prevCode === "jute") {
			Object.assign(clearFields, { jute_mr_no: "", jute_mukam_id: "", jute_claim_amount: "", jute_claim_description: "" });
		} else if (prevCode === "jute_yarn") {
			Object.assign(clearFields, { juteyarn_pcso_no: "", juteyarn_container_no: "", juteyarn_customer_ref_no: "" });
		}
		if (Object.keys(clearFields).length) {
			setFormValues((prev) => ({ ...prev, ...clearFields }));
		}
	}, [invoiceTypeCode, mode, setFormValues]);

	// Clear party-dependent fields when customer changes
	const prevPartyRef = React.useRef<string>("");
	React.useEffect(() => {
		if (mode === "view") return;
		const currentParty = String(formValues.party ?? "");
		if (prevPartyRef.current !== "" && prevPartyRef.current !== currentParty) {
			setFormValues((prev) => ({ ...prev, party_branch: "", billing_to: "", shipping_to: "" }));
		}
		prevPartyRef.current = currentParty;
	}, [formValues.party, mode, setFormValues]);

	// Line items
	const {
		lineItems,
		setLineItems,
		replaceItems,
		removeLineItems,
		handleLineFieldChange,
		handleQuotationItemsConfirm,
		mapLineToEditable,
		filledLineItems,
		lineItemsValid,
		itemGroupsFromLineItems,
		lineHasAnyData,
	} = useSalesOrderLineItems({
		mode,
		coConfig,
		billingToState,
		shippingToState,
		itemGroupCache,
		itemGroupLoading,
		ensureItemGroupData,
		itemGroups,
		invoiceTypeCode,
		brokeragePercent: formValues.broker_commission_percent ? Number(formValues.broker_commission_percent) : undefined,
	});

	// Unsaved changes detection for unified action bar
	const getComparableLineData = React.useCallback(
		(item: EditableLineItem) => ({
			itemGroup: item.itemGroup,
			item: item.item,
			itemMake: item.itemMake,
			quantity: item.quantity,
			rate: item.rate,
			uom: item.uom,
			discountValue: item.discountValue,
			remarks: item.remarks,
			hsnCode: item.hsnCode,
		}),
		[],
	);

	const comparableLineItems = React.useMemo(
		() => lineItems.filter(lineHasAnyData),
		[lineItems],
	);

	const { hasUnsavedChanges, resetBaseline, setBaseline } = useUnsavedChanges({
		formValues,
		lineItems: comparableLineItems,
		getComparableLineData,
		enabled: mode !== "create",
	});

	// Seed an initial blank line in create mode
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
				itemMake: "",
				hsnCode: item.hsn_code ?? "",
				quantity: "",
				rate: "",
				uom: String(item.uom_id),
				discountValue: "",
				remarks: "",
				taxPercentage: item.tax_percentage ?? undefined,
			fullItemCode: item.full_item_code || undefined,
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

	const suppressTaxRecalcRef = React.useRef(false);
	const { taxType } = useSalesOrderTaxCalculations({
		mode,
		coConfig,
		billingToState,
		shippingToState,
		setLineItems,
		suppressRef: suppressTaxRecalcRef,
	});

	// Auto-populate additional charges when Govt Sacking transport mode or line qty changes
	React.useEffect(() => {
		const mode = String(formValues.govtskg_mode_of_transport ?? "");
		if (!mode || !isGovtSkgOrder(invoiceTypeCode)) return;

		const totalQty = filledLineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0), 0);
		if (totalQty <= 0) return;

		const rates = setupData?.transportChargeRates ?? [];
		if (!rates.length) return;

		const lineTaxPct = filledLineItems[0]?.taxPercentage;
		const computed = computeGovtskgTransportCharges(mode, totalQty, rates, chargeOptions, lineTaxPct, billingToState, shippingToState);
		setAdditionalCharges((prev) => mergeTransportCharges(prev, computed, mode));
	}, [formValues.govtskg_mode_of_transport, filledLineItems, invoiceTypeCode, setupData?.transportChargeRates, chargeOptions, billingToState, shippingToState]);

	const totals = React.useMemo(
		() => computeSalesOrderTotals({
			lineItems: filledLineItems,
			additionalCharges,
			freightCharges: Number(formValues.freight_charges) || 0,
		}),
		[filledLineItems, additionalCharges, formValues.freight_charges],
	);

	// Phase A: Fetch details immediately in edit/view mode (no setup dependency)
	// This breaks the circular dependency: details contain branch_id which is needed to load setup
	const detailsFetchedRef = React.useRef(false);
	// Use refs for values that may change reference across renders but shouldn't cancel in-flight fetches
	const getMenuIdRef = React.useRef(getMenuId);
	getMenuIdRef.current = getMenuId;
	const coIdRef = React.useRef(coId);
	coIdRef.current = coId;

	React.useEffect(() => {
		if (mode === "create") {
			setSODetails(null);
			setPageError(null);
			setLoading(false);
			detailsFetchedRef.current = false;
			return;
		}

		if (!requestedId) {
			setSODetails(null);
			setPageError("Sales order id is required to load details.");
			setLoading(false);
			return;
		}

		if (detailsFetchedRef.current) return;
		detailsFetchedRef.current = true;

		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const details = await getSalesOrderById(
					requestedId,
					coIdRef.current || undefined,
					getMenuIdRef.current() || undefined,
				);
				if (cancelled) return;
				setSODetails(details);
				// Extract branch_id to unblock setup loading
				if (details.branch && /^\d+$/.test(details.branch)) {
					setLockedBranchId(details.branch);
				}
				setPageError(null);
			} catch (error) {
				if (cancelled) return;
				const description = error instanceof Error ? error.message : "Unable to load sales order.";
				setSODetails(null);
				setPageError(description);
				toast({ variant: "destructive", title: "Unable to load sales order", description });
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => { cancelled = true; detailsFetchedRef.current = false; };
	// Only re-run when the actual identity of the SO changes, not when callback refs change
	}, [mode, requestedId]);

	// Phase B: Populate form once both details AND setup are ready
	const formPopulatedRef = React.useRef(false);

	React.useEffect(() => {
		if (mode === "create") {
			formPopulatedRef.current = false;
			return;
		}
		if (!soDetails) {
				return;
		}
		if (!setupEnabled || setupLoading || !setupData) {
				return;
		}
		if (formPopulatedRef.current) return;
		formPopulatedRef.current = true;

		const nextValues = mapSalesOrderDetailsToFormValues(soDetails, buildDefaultFormValues());

		const resolvedBranchValue = soDetails.branch || branchIdFromUrl || branchValue;
		if (resolvedBranchValue && /^\d+$/.test(resolvedBranchValue)) {
			nextValues.branch = resolvedBranchValue;
			setLockedBranchId(resolvedBranchValue);
		}

		const loadedBrokPct = Number(nextValues.broker_commission_percent) || 0;
		const normalizedLines = (soDetails.lines ?? []).map((line) => mapLineToEditable(line, loadedBrokPct));

		// Suppress the tax recalculation effect that would fire from billing/shipping state change
		suppressTaxRecalcRef.current = true;

		setInitialValues(nextValues);
		setFormValues(nextValues);
		bumpFormKey();
		replaceItems(normalizedLines);

		// Map additional charges from SO details
		const rawCharges = (soDetails as Record<string, unknown>).additionalCharges;
		if (Array.isArray(rawCharges) && rawCharges.length > 0) {
			setAdditionalCharges(
				rawCharges.map((ch: Record<string, unknown>, idx: number) => {
					// Backend returns flat GST fields (igst_amount, cgst_amount, etc.),
					// not a nested gst object.
					const gstTotal = Number(ch.gst_total ?? 0);
					const igstPercent = Number(ch.igst_percent ?? 0);
					const cgstPercent = Number(ch.cgst_percent ?? 0);
					const sgstPercent = Number(ch.sgst_percent ?? 0);
					// Derive tax_pct: IGST% or CGST% + SGST% (whichever is non-zero)
					const taxPct = igstPercent > 0 ? igstPercent : cgstPercent + sgstPercent;
					return {
						id: `charge_loaded_${idx}`,
						additionalChargesId: String(ch.additional_charges_id ?? ch.additionalChargesId ?? ""),
						chargeName: String(ch.additional_charges_name ?? ch.chargeName ?? ""),
						qty: String(ch.qty ?? "1"),
						rate: String(ch.rate ?? ""),
						netAmount: String(ch.net_amount ?? ch.netAmount ?? ""),
						remarks: String(ch.remarks ?? ""),
						taxPct: taxPct > 0 ? String(taxPct) : "",
						gst: gstTotal > 0 ? {
							igstAmount: Number(ch.igst_amount ?? 0),
							igstPercent,
							cgstAmount: Number(ch.cgst_amount ?? 0),
							cgstPercent,
							sgstAmount: Number(ch.sgst_amount ?? 0),
							sgstPercent,
							gstTotal,
						} : undefined,
					};
				}),
			);
		} else {
			setAdditionalCharges([]);
		}

		// Set baseline for unsaved changes detection
		setBaseline(nextValues, normalizedLines.filter(lineHasAnyData));

		return () => { formPopulatedRef.current = false; };
	}, [
		mode, soDetails, setupEnabled, setupLoading, setupData,
		setInitialValues, setFormValues, bumpFormKey,
		replaceItems, mapLineToEditable,
		branchIdFromUrl, branchValue,
		setBaseline, lineHasAnyData,
	]);

	// Pre-load item group data for existing line items
	React.useEffect(() => {
		if (!soDetails?.lines?.length) return;
		const uniqueGroups = new Set(
			soDetails.lines
				.map((line) => (line.itemGroup ? String(line.itemGroup) : ""))
				.filter((groupId) => groupId && /^\d+$/.test(groupId)),
		);
		uniqueGroups.forEach((groupId) => ensureItemGroupData(groupId));
	}, [soDetails, ensureItemGroupData]);

	const isLineItemsReady = React.useMemo(() => {
		if (mode === "view" || pageError || setupError) return true;
		return lineItemsValid;
	}, [lineItemsValid, mode, pageError, setupError]);

	// Quotation load handler
	const handleQuotationSelect = React.useCallback(async () => {
		const quotationId = String(formValues.quotation ?? "");
		if (!quotationId) {
			toast({ variant: "destructive", title: "Please select a quotation first" });
			return;
		}
		try {
			const result = await getQuotationLines(quotationId);
			const items = Array.isArray(result?.data) ? result.data : [];
			if (!items.length) {
				toast({ title: "No line items found in the selected quotation" });
				return;
			}
			handleQuotationItemsConfirm(items);
			toast({ title: `Loaded ${items.length} item(s) from quotation` });
		} catch (error) {
			toast({ variant: "destructive", title: "Failed to load quotation items", description: error instanceof Error ? error.message : "Please try again." });
		}
	}, [formValues.quotation, handleQuotationItemsConfirm]);

	// Select options
	const {
		customerOptions,
		customerBranchOptions,
		brokerOptions,
		transporterOptions,
		quotationOptions,
		invoiceTypeOptions,
		itemGroupOptions,
		getItemGroupLabel,
		getItemOptions,
		getMakeOptions,
		getUomOptions,
		getUomConversions,
		getItemLabel,
		getItemFullCode,
		getUomLabel,
	} = useSalesOrderSelectOptions({
		customers,
		customerBranches,
		brokers,
		transporters,
		approvedQuotations,
		branchAddresses,
		invoiceTypes,
		itemGroupsFromLineItems,
		itemGroupCache,
	});

	const headerSchema = useSalesOrderHeaderSchema({
		branchOptions: resolvedBranchOptions,
		customerOptions,
		customerBranchOptions,
		brokerOptions,
		transporterOptions,
		quotationOptions,
		invoiceTypeOptions,
		quotationRequired,
		mode,
		headerFieldsDisabled,
		invoiceTypeLocked: hasTypeSpecificHeaderData,
	});

	const govtskgSchema = useSalesOrderGovtskgSchema({ mode, headerFieldsDisabled });
	const juteYarnSchema = useSalesOrderJuteYarnSchema({ mode, headerFieldsDisabled });
	const juteSchema = useSalesOrderJuteSchema({ mukamOptions: [], mode, headerFieldsDisabled });

	const canEdit = mode !== "view";

	const lineItemColumns = useSalesOrderLineItemColumns({
		canEdit,
		invoiceTypeCode,
		itemGroupOptions,
		itemGroupLoading,
		getItemOptions,
		getMakeOptions,
		getUomOptions,
		getUomConversions,
		getItemGroupLabel,
		getItemFullCode,
		handleLineFieldChange,
	});

	const {
		approvalLoading,
		approvalInfo,
		approvalPermissions,
		statusChipProps,
		handleApprove,
		handleReject,
		handleOpen,
		handleCancelDraft,
		handleReopen,
		handleSendForApproval,
		handleViewApprovalLog,
	} = useSalesOrderApproval({
		mode,
		requestedId,
		formValues,
		details: soDetails,
		coId: coId || undefined,
		getMenuId,
		setDetails: setSODetails,
	});

	// Reject dialog hook
	const {
		rejectDialogOpen,
		rejectReason,
		setRejectReason,
		openRejectDialog,
		handleRejectConfirm,
		handleRejectCancel,
	} = useRejectDialog(handleReject);

	// Reset baseline when soDetails changes (initial load or post-approval refresh)
	React.useEffect(() => {
		if (!soDetails || mode === "create") return;
		const timer = setTimeout(() => resetBaseline(), 0);
		return () => clearTimeout(timer);
	}, [soDetails, mode, resetBaseline]);

	// Preview data
	const previewHeader = React.useMemo(() => {
		const isGovtSkgHeader = isGovtSkgOrder(invoiceTypeCode);
		return {
			salesNo: soDetails?.salesNo,
			pcsoNo: isGovtSkgHeader ? ((formValues.govtskg_pcso_no as string) || undefined) : undefined,
			pcsoDate: isGovtSkgHeader ? ((formValues.govtskg_pcso_date as string) || undefined) : undefined,
			salesOrderDate: (formValues.date as string) || soDetails?.salesOrderDate,
			branch: resolvedBranchOptions.find((o) => String(o.value) === branchValue)?.label ?? branchValue,
			customerName: customerOptions.find((o) => String(o.value) === String(formValues.party))?.label ?? soDetails?.partyName,
			brokerName: brokerOptions.find((o) => String(o.value) === String(formValues.broker))?.label ?? soDetails?.brokerName ?? undefined,
			transporterName: transporterOptions.find((o) => String(o.value) === String(formValues.transporter))?.label ?? soDetails?.transporterName ?? undefined,
			status: statusChipProps?.label ?? soDetails?.status,
			companyName,
			companyLogo,
		};
	}, [
		soDetails, formValues.date, formValues.party, formValues.broker, formValues.transporter,
		formValues.govtskg_pcso_no, formValues.govtskg_pcso_date, invoiceTypeCode,
		branchValue, resolvedBranchOptions, customerOptions, brokerOptions, transporterOptions,
		statusChipProps?.label, companyName, companyLogo,
	]);

	const previewItems = React.useMemo(() => {
		const isHessian = isHessianOrder(invoiceTypeCode);
		const isGovtSkg = isGovtSkgOrder(invoiceTypeCode);
		return filledLineItems.map((line, index) => {
			const itemLabel = getItemLabel(line.itemGroup, line.item);
			const fullItemName = itemLabel || "-";

			const uomOptions = getUomOptions(line.itemGroup, line.item);
			const uomLabel = uomOptions.find((opt) => opt.value === line.uom)?.label ?? line.uom ?? "";
			const qtyRounding = line.qtyRounding;
			const rawQty = line.quantity;
			const formattedQty = rawQty && Number(rawQty) && qtyRounding != null
				? Number(rawQty).toFixed(qtyRounding) : (rawQty || "-");
			const qtyDisplay = `${formattedQty} ${uomLabel}`.trim();

			// Hessian / Govt Sacking: show bales qty as other qty
			let otherQtyDisplay: string | undefined;
			if (isHessian && line.qtyBales && Number(line.qtyBales)) {
				otherQtyDisplay = `${line.qtyBales} Bales`;
			} else if (isGovtSkg && line.govtskgQtyBales && Number(line.govtskgQtyBales)) {
				otherQtyDisplay = `${line.govtskgQtyBales} Bales`;
			} else if (!isHessian && !isGovtSkg) {
				// For non-hessian, show converted qty if available
				const conversions = getUomConversions?.(line.itemGroup, line.item);
				if (conversions?.length && rawQty && Number(rawQty) && line.uom) {
					for (const conv of conversions) {
						if (conv.relationValue === 0) continue;
						let convertedQty: number;
						let otherUomName: string;
						if (line.uom === conv.mapFromId) {
							convertedQty = Number(rawQty) * conv.relationValue;
							otherUomName = conv.mapToName;
						} else if (line.uom === conv.mapToId) {
							convertedQty = Number(rawQty) / conv.relationValue;
							otherUomName = conv.mapFromName;
						} else {
							continue;
						}
						otherQtyDisplay = `${convertedQty.toFixed(conv.rounding ?? 2)} ${otherUomName}`;
						break;
					}
				}
			}

			// Rate with UOM label
			const rateRounding = line.rateRounding ?? 2;
			const rateVal = line.rate;
			const formattedRate = rateVal && Number(rateVal) ? Number(rateVal).toFixed(rateRounding) : (rateVal || "-");
			const rateUomLabel = uomLabel;
			const rateDisplay = formattedRate !== "-"
				? `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(Number(formattedRate))} / ${rateUomLabel}`
				: "-";

			return {
				index: index + 1,
				itemName: fullItemName,
				qtyDisplay,
				otherQtyDisplay,
				rateDisplay,
				amount: line.amount ?? "-",
				gst: line.taxAmount ?? "-",
				total: ((line.amount ?? 0) + (line.taxAmount ?? 0)) || "-",
			};
		});
	}, [filledLineItems, getItemLabel, getUomOptions, getUomConversions, invoiceTypeCode]);

	const previewRemarks = React.useMemo(() => {
		return (formValues.internal_note as string) || soDetails?.internalNote || (formValues.footer_note as string) || soDetails?.footerNote || "";
	}, [formValues.internal_note, formValues.footer_note, soDetails?.internalNote, soDetails?.footerNote]);

	const previewAdditionalCharges = React.useMemo(() => {
		return additionalCharges
			.filter((c) => c.additionalChargesId)
			.map((c) => {
				const netAmount = parseFloat(c.netAmount) || 0;
				const taxAmount = c.gst?.gstTotal ?? 0;
				return {
					chargeName: c.chargeName || "-",
					qty: parseFloat(c.qty) || 1,
					rate: parseFloat(c.rate) || 0,
					netAmount,
					taxAmount,
					total: netAmount + taxAmount,
				};
			});
	}, [additionalCharges]);

	const { metadata } = useTransactionPreview({
		header: previewHeader,
		fields: [
			{ label: "SO No", accessor: (header) => header.salesNo || "Pending" },
			{ label: "Order Date", accessor: (header) => header.salesOrderDate || "-" },
			{ label: "Customer", accessor: (header) => header.customerName || "-" },
			{ label: "Status", accessor: (header) => header.status || "-", includeWhen: (header) => Boolean(header.status) },
		],
	});

	const {
		saving,
		handleFormSubmit,
	} = useSalesOrderFormSubmission({
		mode,
		pageError,
		setupError,
		filledLineItems,
		isLineItemsReady,
		requestedId,
		formValues,
		invoiceTypeCode,
		salesEnquiryId,
	});

	// Prefill customer/branch from the source enquiry (direct/tender path) and
	// carry the link from loaded details in edit/view mode.
	const enquiryPrefillAppliedRef = React.useRef(false);
	React.useEffect(() => {
		if (mode !== "create" || !salesEnquiryIdFromUrl || enquiryPrefillAppliedRef.current) return;
		enquiryPrefillAppliedRef.current = true;
		void (async () => {
			try {
				const { data, error } = await fetchEnquiryLinesForSalesOrder(salesEnquiryIdFromUrl);
				if (error) throw new Error(error);
				const enquiryHeader = (data?.master?.enquiry ?? {}) as Record<string, unknown>;
				const partyId = enquiryHeader.party_id != null ? String(enquiryHeader.party_id) : "";
				const enquiryBranch = enquiryHeader.branch_id != null ? String(enquiryHeader.branch_id) : "";
				setFormValues((prev) => ({
					...prev,
					...(partyId ? { party: partyId } : {}),
					...(enquiryBranch ? { branch: enquiryBranch } : {}),
				}));
				toast({
					title: "Direct sales order from enquiry",
					description: "Customer pre-filled from the enquiry. Add the order lines as per the customer's PO.",
				});
			} catch (error) {
				toast({
					variant: "destructive",
					title: "Unable to load the source enquiry",
					description: error instanceof Error ? error.message : "Please try again.",
				});
				setSalesEnquiryId(null);
			}
		})();
	}, [mode, salesEnquiryIdFromUrl, setFormValues]);

	React.useEffect(() => {
		if (soDetails?.salesEnquiryId) setSalesEnquiryId(String(soDetails.salesEnquiryId));
	}, [soDetails]);

	// Unified primary actions — shows Create, Save, or Approval buttons in the same location
	const primaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
		if (pageError || setupError) return undefined;

		// Create mode → Create button
		if (mode === "create") {
			return [
				{
					label: "Create Sales Order",
					onClick: () => formRef.current?.submit(),
					disabled: saving || !lineItemsValid || setupLoading,
					loading: saving,
				},
			];
		}

		// No SO details yet (still loading)
		if (!soDetails) return undefined;

		// Edit mode with unsaved changes → Save button
		if (mode === "edit" && approvalPermissions.canSave && hasUnsavedChanges) {
			return [
				{
					label: "Save Changes",
					onClick: () => formRef.current?.submit(),
					disabled: saving || !lineItemsValid || setupLoading,
					loading: saving,
				},
			];
		}

		// View mode, or edit mode without unsaved changes → Approval buttons
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
	}, [
		mode, pageError, setupError, saving, lineItemsValid, setupLoading,
		formRef, soDetails, approvalPermissions, hasUnsavedChanges,
		approvalInfo, approvalLoading, loading,
		handleOpen, handleCancelDraft, handleReopen, handleSendForApproval,
		handleApprove, openRejectDialog, handleViewApprovalLog,
	]);

	// Wrap submit to inject notes fields and additional charges (rendered outside MuiForm) into the submitted values
	const handleFormSubmitWithNotes = React.useCallback(
		async (values: Record<string, unknown>) => {
			const merged = {
				...values,
				footer_note: formValues.footer_note ?? "",
				internal_note: formValues.internal_note ?? "",
				terms_conditions: formValues.terms_conditions ?? "",
				additional_charges: additionalCharges
					.filter((c) => c.additionalChargesId)
					.map((c) => ({
						additional_charges_id: c.additionalChargesId,
						charge_name: c.chargeName,
						qty: parseFloat(c.qty) || 1,
						rate: parseFloat(c.rate) || 0,
						net_amount: parseFloat(c.netAmount) || 0,
						remarks: c.remarks || "",
						gst: c.gst ? {
							igst_amount: c.gst.igstAmount ?? 0,
							igst_percent: c.gst.igstPercent ?? 0,
							cgst_amount: c.gst.cgstAmount ?? 0,
							cgst_percent: c.gst.cgstPercent ?? 0,
							sgst_amount: c.gst.sgstAmount ?? 0,
							sgst_percent: c.gst.sgstPercent ?? 0,
							gst_total: c.gst.gstTotal ?? 0,
						} : undefined,
					})),
			};
			await handleFormSubmit(merged);
		},
		[handleFormSubmit, formValues.footer_note, formValues.internal_note, formValues.terms_conditions, additionalCharges],
	);

	const pageTitle = React.useMemo(() => {
		if (mode === "create") return "Create Sales Order";
		if (mode === "edit") {
			return soDetails?.salesNo ? `Edit SO ${soDetails.salesNo}` : "Edit Sales Order";
		}
		return soDetails?.salesNo ? `Sales Order ${soDetails.salesNo}` : "Sales Order Details";
	}, [mode, soDetails?.salesNo]);

	return (
		<>
		<TransactionWrapper
			title={pageTitle}
			subtitle={mode === "create" ? "Create a new sales order" : mode === "edit" ? "Edit sales order" : "View sales order details"}
			metadata={metadata}
			statusChip={statusChipProps}
			backAction={{ onClick: () => router.push("/dashboardportal/sales/salesOrder") }}
			primaryActions={primaryActions}
			actionsAfterFooter
			loading={loading || setupLoading}
			alerts={pageError ? <div role="alert" aria-live="assertive" className="text-red-600">{pageError}</div> : undefined}
			preview={
				<SalesOrderPreview
					header={previewHeader}
					items={previewItems}
					remarks={previewRemarks}
					additionalCharges={previewAdditionalCharges}
					freightCharges={Number(formValues.freight_charges) || 0}
				/>
			}
			lineItems={{
				items: lineItems,
				getItemId: (item) => item.id,
				canEdit,
				columns: lineItemColumns,
				placeholder: "Add line items to the sales order",
				selectionColumnWidth: "28px",
				onRemoveSelected: canEdit ? removeLineItems : undefined,
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
						<AdditionalChargesSection
							charges={additionalCharges}
							chargeOptions={chargeOptions}
							onChange={setAdditionalCharges}
							disabled={mode === "view"}
							billingToState={billingToState}
							shippingToState={shippingToState}
							indiaGst={Boolean(coConfig?.india_gst)}
						/>
						<SalesOrderTotalsDisplay
							grossAmount={totals.grossAmount}
							totalTax={totals.totalTax}
							freightCharges={totals.freightCharges}
							additionalChargesTotal={totals.additionalChargesTotal}
							netAmount={totals.netAmount}
							taxType={taxType || undefined}
						/>
						<div className="grid grid-cols-1 gap-4 pt-2">
							<TextField
								label="Footer Note"
								multiline
								minRows={2}
								fullWidth
								size="small"
								value={String(formValues.footer_note ?? "")}
								onChange={(e) => setFormValues((prev) => ({ ...prev, footer_note: e.target.value }))}
								disabled={mode === "view"}
							/>
							<TextField
								label="Internal Note"
								multiline
								minRows={2}
								fullWidth
								size="small"
								value={String(formValues.internal_note ?? "")}
								onChange={(e) => setFormValues((prev) => ({ ...prev, internal_note: e.target.value }))}
								disabled={mode === "view"}
							/>
							<TextField
								label="Terms and Conditions"
								multiline
								minRows={3}
								fullWidth
								size="small"
								value={String(formValues.terms_conditions ?? "")}
								onChange={(e) => setFormValues((prev) => ({ ...prev, terms_conditions: e.target.value }))}
								disabled={mode === "view"}
							/>
						</div>
					</div>
				}
		>
			<SalesOrderHeaderForm
				schema={headerSchema}
				formKey={formKey}
				initialValues={initialValues}
				mode={mode}
				formRef={formRef}
				onSubmit={handleFormSubmitWithNotes}
				onValuesChange={handleFormValuesChange}
				showQuotationButton={quotationRequired && mode !== "view"}
				onQuotationSelect={handleQuotationSelect}
				quotationButtonDisabled={!isMounted || !formValues.quotation}
				govtskgSchema={govtskgSchema}
				juteSchema={juteSchema}
				juteYarnSchema={juteYarnSchema}
				invoiceTypeCode={invoiceTypeCode}
			/>
		</TransactionWrapper>

		<ItemSelectionDialog
			open={itemDialogOpen}
			onOpenChange={setItemDialogOpen}
			coId={coId}
			onConfirm={handleItemDialogConfirm}
			filter="saleable"
			excludeItemIds={excludeItemIds}
			title="Select Items for Sales Order"
		/>

		<Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open) handleRejectCancel(); }}>
			<DialogContent className="sm:max-w-125">
				<DialogHeader>
					<DialogTitle>Reject Sales Order</DialogTitle>
					<DialogDescription>Please provide a reason for rejecting this sales order.</DialogDescription>
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
