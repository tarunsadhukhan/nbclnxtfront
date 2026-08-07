"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TransactionWrapper, { type TransactionAction } from "@/components/ui/TransactionWrapper";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
	fetchInvoiceSetup1,
	fetchInvoiceSetup2,
	getInvoiceById,
	fetchDeliveryOrderLines,
	fetchSalesOrderLinesForInvoice,
	type InvoiceDetails,
	type SoExtensionData,
} from "@/utils/salesInvoiceService";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { toast } from "@/hooks/use-toast";
import { useMenuId } from "@/hooks/useMenuId";
import { useCompanyName } from "@/hooks/useCompanyName";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

import { SalesInvoiceHeaderForm } from "./components/SalesInvoiceHeaderForm";
import { SalesInvoiceFooterForm, SalesInvoiceTotalsDisplay } from "./components/SalesInvoiceFooter";
import SalesInvoicePreview from "./components/SalesInvoicePreview";
import { useInvoiceLineItemColumns } from "./components/SalesInvoiceLineItemsTable";
import { useSalesInvoiceFormState } from "./hooks/useSalesInvoiceFormState";
import { useSalesInvoiceLineItems } from "./hooks/useSalesInvoiceLineItems";
import { useSalesInvoiceSelectOptions } from "./hooks/useSalesInvoiceSelectOptions";
import { useSalesInvoiceHeaderSchema, useSalesInvoiceTypeSpecificHeaderSchema, useSalesInvoiceFooterSchema } from "./hooks/useSalesInvoiceFormSchemas";
import { useSalesInvoiceFormSubmission } from "./hooks/useSalesInvoiceFormSubmission";
import { useSalesInvoiceApproval } from "./hooks/useSalesInvoiceApproval";

import type { EditableLineItem, ItemGroupCacheEntry, InvoiceSetupData, Option } from "./types/salesInvoiceTypes";
import { mapItemGroupDetailResponse, mapInvoiceSetupResponse, mapInvoiceDetailsToFormValues, buildMukamOptions } from "./utils/salesInvoiceMappers";
import { calculateInvoiceTotals } from "./utils/salesInvoiceCalculations";
import { buildDefaultFormValues, createBlankLine } from "./utils/salesInvoiceFactories";
import {
	EMPTY_CUSTOMERS,
	EMPTY_TRANSPORTERS,
	EMPTY_BROKERS,
	EMPTY_APPROVED_DELIVERY_ORDERS,
	EMPTY_APPROVED_SALES_ORDERS,
	EMPTY_ITEM_GROUPS,
	EMPTY_INVOICE_TYPES,
	EMPTY_SETUP_PARAMS,
	isRawJuteInvoice,
	isGovtSkgInvoice,
	isGovtSkgFreightInvoice,
} from "./utils/salesInvoiceConstants";
import { GovtSackingFreightForm } from "./components/GovtSackingFreightForm";
import { AdditionalChargesSection, type AdditionalChargeRow } from "../../salesOrder/createSalesOrder/components/AdditionalChargesSection";
import { computeGovtskgTransportCharges, mergeTransportCharges } from "../../utils/govtskgTransportCharges";
import { computeConvertedQtyBales } from "@/utils/uomConversion";

function InvoicePageLoading() {
	return (
		<div className="flex items-center justify-center min-h-100">
			<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
		</div>
	);
}

export default function InvoiceTransactionPage() {
	return (
		<Suspense fallback={<InvoicePageLoading />}>
			<InvoiceTransactionPageContent />
		</Suspense>
	);
}

function InvoiceTransactionPageContent() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => { setMounted(true); }, []);

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

	const { getMenuId } = useMenuId({ transactionType: "sales-invoice", menuIdFromUrl });
	const companyName = useCompanyName();
	const companyLogo = useCompanyLogo(coId);

	const {
		initialValues, setInitialValues, formValues, setFormValues,
		formKey, bumpFormKey, formRef,
		handleMainFormValuesChange, handleFooterFormValuesChange,
	} = useSalesInvoiceFormState({ mode, buildDefaultFormValues, branchIdFromUrl });

	const [invoiceDetails, setInvoiceDetails] = React.useState<InvoiceDetails | null>(null);
	const [loading, setLoading] = React.useState<boolean>(mode !== "create");
	const [pageError, setPageError] = React.useState<string | null>(null);
	const [linesLoading, setLinesLoading] = React.useState(false);
	const [additionalCharges, setAdditionalCharges] = React.useState<AdditionalChargeRow[]>([]);

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
		const fallbackLabel = (invoiceDetails?.branchId && typeof invoiceDetails.branchId === "string" ? invoiceDetails.branchId : undefined) || branchValue;
		return [...branchOptions, { label: fallbackLabel, value: branchValue }];
	}, [branchOptions, branchValue, invoiceDetails?.branchId]);

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

	const memoizedMapSetupResponse = React.useCallback(mapInvoiceSetupResponse, []);
	const memoizedFetchSetup1 = React.useCallback(fetchInvoiceSetup1, []);

	const setupEnabled = React.useMemo(() => Boolean(coId && branchIdForSetup), [coId, branchIdForSetup]);

	const { data: setupData, loading: setupLoading, error: setupError } = useTransactionSetup<{ branchId?: string }, Record<string, unknown>, InvoiceSetupData>({
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

	const customers = setupData?.customers ?? EMPTY_CUSTOMERS;
	const transporters = setupData?.transporters ?? EMPTY_TRANSPORTERS;
	const brokers = setupData?.brokers ?? EMPTY_BROKERS;
	const approvedDeliveryOrders = setupData?.approvedDeliveryOrders ?? EMPTY_APPROVED_DELIVERY_ORDERS;
	const approvedSalesOrders = setupData?.approvedSalesOrders ?? EMPTY_APPROVED_SALES_ORDERS;
	const itemGroups = setupData?.itemGroups ?? EMPTY_ITEM_GROUPS;
	const invoiceTypes = setupData?.invoiceTypes ?? EMPTY_INVOICE_TYPES;

	const fetchItemGroupDetail = React.useCallback(async (itemGroupId: string) => {
		if (!itemGroupId || !/^\d+$/.test(itemGroupId)) {
			throw new Error(`Invalid item group identifier: ${itemGroupId}`);
		}
		const response = await fetchInvoiceSetup2(itemGroupId);
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

	const selectedPartyId = formValues.party ? String(formValues.party) : undefined;
	const selectedCustomer = React.useMemo(
		() => customers.find((c) => c.id === selectedPartyId),
		[customers, selectedPartyId],
	);
	const partyBranchId = formValues.party_branch ? String(formValues.party_branch) : undefined;
	const shippingBranchId = formValues.shipping_to ? String(formValues.shipping_to) : undefined;

	// Tax split rule: company branch state vs customer's shipping branch state.
	// Compare by numeric state_id to avoid "Gujarat" vs "GJ" string mismatches.
	const companyBranchStateId = React.useMemo(() => {
		if (!setupData?.branches || !branchValue) return undefined;
		const branch = setupData.branches.find((b) => String(b.branch_id) === branchValue);
		return branch?.state_id;
	}, [setupData, branchValue]);
	const shippingBranchStateId = React.useMemo(() => {
		if (!selectedCustomer?.branches) return undefined;
		const ship = shippingBranchId ? selectedCustomer.branches.find((b) => b.id === shippingBranchId) : undefined;
		if (ship?.stateId != null) return ship.stateId;
		const bill = partyBranchId ? selectedCustomer.branches.find((b) => b.id === partyBranchId) : undefined;
		return bill?.stateId;
	}, [shippingBranchId, partyBranchId, selectedCustomer]);

	// Derive company branch state_code from setup data (used by header auto-fill effect below).
	const companyBranchStateCode = React.useMemo(() => {
		if (!setupData?.branches || !branchValue) return undefined;
		const branch = setupData.branches.find((b) => String(b.branch_id) === branchValue);
		return branch?.state_code;
	}, [setupData, branchValue]);

	// Auto-fill shipping_state_code and intra_inter_state based on shipping_to selection
	React.useEffect(() => {
		if (mode === "view") return;
		const shippingBranch = shippingBranchId && selectedCustomer?.branches
			? selectedCustomer.branches.find((b) => b.id === shippingBranchId)
			: undefined;
		const shippingStateCode = shippingBranch?.stateCode ?? "";

		setFormValues((prev) => {
			const updates: Record<string, unknown> = {};
			if (prev.shipping_state_code !== shippingStateCode) {
				updates.shipping_state_code = shippingStateCode;
			}
			if (companyBranchStateCode && shippingStateCode) {
				const intraInter = companyBranchStateCode === shippingStateCode ? "0" : "1";
				if (prev.intra_inter_state !== intraInter) {
					updates.intra_inter_state = intraInter;
				}
			}
			if (Object.keys(updates).length === 0) return prev;
			return { ...prev, ...updates };
		});
	}, [shippingBranchId, selectedCustomer, companyBranchStateCode, mode, setFormValues]);

	// Auto-fill billing_state_code based on billing_to selection
	const billingBranchId = formValues.billing_to ? String(formValues.billing_to) : undefined;
	React.useEffect(() => {
		if (mode === "view") return;
		const billingBranch = billingBranchId && selectedCustomer?.branches
			? selectedCustomer.branches.find((b) => b.id === billingBranchId)
			: undefined;
		const billingStateCode = billingBranch?.stateCode ?? "";
		setFormValues((prev) => {
			if (prev.billing_state_code === billingStateCode) return prev;
			return { ...prev, billing_state_code: billingStateCode };
		});
	}, [billingBranchId, selectedCustomer, mode, setFormValues]);

	// Auto-fill header fields from delivery order when DO is selected
	React.useEffect(() => {
		if (mode === "view") return;
		const doId = formValues.delivery_order ? String(formValues.delivery_order) : "";
		if (!doId) return;
		const doRecord = approvedDeliveryOrders.find((d) => d.id === doId);
		if (!doRecord) return;
		const updates: Record<string, unknown> = {};
		if (doRecord.salesOrderId) {
			updates.sales_order_id = String(doRecord.salesOrderId);
			if (doRecord.salesOrderDate) updates.sales_order_date = doRecord.salesOrderDate;
		}
		if (doRecord.partyId) updates.party = String(doRecord.partyId);
		if (doRecord.billingToId) { updates.billing_to = String(doRecord.billingToId); updates.party_branch = String(doRecord.billingToId); }
		if (doRecord.shippingToId) updates.shipping_to = String(doRecord.shippingToId);
		if (doRecord.transporterId) updates.transporter = String(doRecord.transporterId);
		if (doRecord.invoiceType) updates.invoice_type = String(doRecord.invoiceType);
		if (Object.keys(updates).length === 0) return;
		for (const [key, value] of Object.entries(updates)) {
			formRef.current?.setValue(key, value);
		}
		setFormValues((prev) => ({ ...prev, ...updates }));
	}, [formValues.delivery_order, approvedDeliveryOrders, mode, setFormValues, formRef]);

	// Auto-fill header fields when sales_order_id changes
	React.useEffect(() => {
		if (mode === "view") return;
		const soId = formValues.sales_order_id ? String(formValues.sales_order_id) : "";
		if (!soId) {
			formRef.current?.setValue("sales_order_date", "");
			formRef.current?.setValue("payment_terms", "");
			setFormValues((prev) => {
				if (!prev.sales_order_date && !prev.payment_terms) return prev;
				return { ...prev, sales_order_date: "", payment_terms: "" };
			});
			return;
		}
		const soRecord = approvedSalesOrders.find((s) => s.id === soId);
		if (!soRecord) return;
		const updates: Record<string, unknown> = {};
		if (soRecord.salesOrderDate) updates.sales_order_date = soRecord.salesOrderDate;
		if (soRecord.paymentTerms != null) updates.payment_terms = String(soRecord.paymentTerms);
		if (soRecord.partyId) updates.party = String(soRecord.partyId);
		if (soRecord.billingToId) { updates.billing_to = String(soRecord.billingToId); updates.party_branch = String(soRecord.billingToId); }
		if (soRecord.shippingToId) updates.shipping_to = String(soRecord.shippingToId);
		if (soRecord.brokerId) updates.broker = String(soRecord.brokerId);
		if (soRecord.transporterId) updates.transporter = String(soRecord.transporterId);
		if (soRecord.invoiceType) updates.invoice_type = String(soRecord.invoiceType);
		if (soRecord.buyerOrderNo) updates.buyer_order_no = soRecord.buyerOrderNo;
		if (soRecord.buyerOrderDate) updates.buyer_order_date = soRecord.buyerOrderDate;
		if (Object.keys(updates).length === 0) return;
		for (const [key, value] of Object.entries(updates)) {
			formRef.current?.setValue(key, value);
		}
		setFormValues((prev) => ({ ...prev, ...updates }));
	}, [formValues.sales_order_id, approvedSalesOrders, mode, setFormValues, formRef]);

	// Whether sales order dropdown should be disabled (auto-populated from DO)
	const salesOrderDisabled = React.useMemo(() => {
		const doId = formValues.delivery_order ? String(formValues.delivery_order) : "";
		if (!doId) return false;
		const doRecord = approvedDeliveryOrders.find((d) => d.id === doId);
		return Boolean(doRecord?.salesOrderId);
	}, [formValues.delivery_order, approvedDeliveryOrders]);

	// Whether delivery order dropdown should be disabled (no DOs exist for selected SO)
	const deliveryOrderDisabled = React.useMemo(() => {
		if (headerFieldsDisabled) return true;
		const soId = formValues.sales_order_id ? String(formValues.sales_order_id) : "";
		if (!soId) return false;
		const dosForSo = approvedDeliveryOrders.filter(
			(d) => d.salesOrderId != null && String(d.salesOrderId) === soId,
		);
		return dosForSo.length === 0;
	}, [formValues.sales_order_id, approvedDeliveryOrders, headerFieldsDisabled]);

	const {
		lineItems, setLineItems, replaceItems, removeLineItems,
		handleLineFieldChange, replaceWithDeliveryOrderLines, replaceWithSalesOrderLines,
		clearImportedLines,
		mapLineToEditable, filledLineItems, lineItemsValid, itemGroupsFromLineItems,
		lineHasAnyData,
	} = useSalesInvoiceLineItems({
		mode,
		companyBranchStateId,
		shippingBranchStateId,
		itemGroupCache,
		itemGroupLoading,
		ensureItemGroupData,
		itemGroups,
		invoiceTypeId: String(formValues.invoice_type ?? ""),
	});

	// Unsaved changes tracking for unified save/approval button display
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
			juteClaimAmountDtl: item.juteClaimAmountDtl,
			juteClaimDesc: item.juteClaimDesc,
			juteClaimRate: item.juteClaimRate,
			hessianQtyBales: item.hessianQtyBales,
			hessianRatePerBale: item.hessianRatePerBale,
			hessianBillingRateMt: item.hessianBillingRateMt,
			govtskgPackSheet: item.govtskgPackSheet,
			govtskgNetWeight: item.govtskgNetWeight,
			govtskgTotalWeight: item.govtskgTotalWeight,
			govtskgQtyBales: item.govtskgQtyBales,
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

	// Govtskg fields live inside a nested MuiForm bound to juteFormRef, so populating
	// them requires calling setValue on juteFormRef (not the main formRef). Because
	// that nested form is conditionally rendered on invoice_type, its ref may be null
	// at the moment the API response arrives — stash the payload and retry until mounted.
	const juteFormRef = React.useRef<{ submit: () => Promise<void>; isDirty: () => boolean; setValue: (name: string, value: unknown) => void } | null>(null);
	const pendingGovtSkgRef = React.useRef<NonNullable<SoExtensionData["so_govtskg"]> | null>(null);
	const [pendingGovtSkgTick, setPendingGovtSkgTick] = React.useState(0);

	// Helper: apply SO extension data (invoice_type + govtskg header + additional charges) from a lines response
	const applySoExtensionData = React.useCallback((ext: SoExtensionData) => {
		// 1. Align invoice_type first so the govtskg schema registers its fields
		if (ext.invoice_type != null) {
			const nextType = String(ext.invoice_type);
			formRef.current?.setValue("invoice_type", nextType);
			setFormValues((prev) => (
				String(prev.invoice_type ?? "") === nextType ? prev : { ...prev, invoice_type: nextType }
			));
		}

		// 2. Queue the govtskg payload — the effect below applies it once fields are registered
		if (ext.so_govtskg) {
			pendingGovtSkgRef.current = ext.so_govtskg;
			setPendingGovtSkgTick((t) => t + 1);
		}

		if (ext.so_additional_charges && ext.so_additional_charges.length > 0) {
			const mappedCharges: AdditionalChargeRow[] = ext.so_additional_charges.map((c, idx) => ({
				id: `so-charge-${idx}`,
				additionalChargesId: String(c.additional_charges_id ?? ""),
				chargeName: String(c.additional_charges_name ?? ""),
				qty: String(c.qty ?? ""),
				rate: String(c.rate ?? ""),
				netAmount: String(c.net_amount ?? ""),
				remarks: c.remarks ?? "",
				taxPct: "",
				gst: (c.gst_total != null) ? {
					igstAmount: c.igst_amount ?? 0,
					igstPercent: c.igst_percent ?? 0,
					cgstAmount: c.cgst_amount ?? 0,
					cgstPercent: c.cgst_percent ?? 0,
					sgstAmount: c.sgst_amount ?? 0,
					sgstPercent: c.sgst_percent ?? 0,
					gstTotal: c.gst_total ?? 0,
				} : undefined,
			}));
			setAdditionalCharges(mappedCharges);
		}
	}, [formRef, setFormValues, setAdditionalCharges]);

	// Drain pending govtskg payload once invoice_type resolves to Govt Sacking AND
	// the nested MuiForm (juteFormRef) has mounted. If the nested form isn't ready yet,
	// retry on the next frame until it is.
	React.useEffect(() => {
		if (mode === "view") return;
		const g = pendingGovtSkgRef.current;
		if (!g) return;
		if (!isGovtSkgInvoice(String(formValues.invoice_type ?? ""))) return;

		const govtUpdates: Record<string, unknown> = {};
		if (g.pcso_no) govtUpdates.govtskg_pcso_no = g.pcso_no;
		if (g.pcso_date) govtUpdates.govtskg_pcso_date = g.pcso_date;
		if (g.mode_of_transport) govtUpdates.govtskg_mode_of_transport = g.mode_of_transport;
		if (g.administrative_office_address) govtUpdates.govtskg_admin_office_address = g.administrative_office_address;
		if (g.destination_rail_head) govtUpdates.govtskg_destination_rail_head = g.destination_rail_head;
		if (g.loading_point) govtUpdates.govtskg_loading_point = g.loading_point;

		if (Object.keys(govtUpdates).length === 0) {
			pendingGovtSkgRef.current = null;
			return;
		}

		let cancelled = false;
		let attempts = 0;
		const maxAttempts = 30; // ~500ms budget for the nested MuiForm to mount

		const tryApply = () => {
			if (cancelled) return;
			const ref = juteFormRef.current;
			if (!ref) {
				if (++attempts < maxAttempts) {
					requestAnimationFrame(tryApply);
				}
				return;
			}
			for (const [key, value] of Object.entries(govtUpdates)) {
				ref.setValue(key, value);
			}
			setFormValues((prev) => ({ ...prev, ...govtUpdates }));
			pendingGovtSkgRef.current = null;
		};

		tryApply();
		return () => { cancelled = true; };
	}, [formValues.invoice_type, pendingGovtSkgTick, mode, setFormValues]);

	// Auto-fetch lines when delivery order changes
	React.useEffect(() => {
		if (mode === "view") return;
		const doId = formValues.delivery_order ? String(formValues.delivery_order) : "";

		if (!doId) {
			if (linesLoadedFromInvoiceApiRef.current) return;
			clearImportedLines();
			return;
		}

		linesLoadedFromInvoiceApiRef.current = false;
		let cancelled = false;
		setLinesLoading(true);
		fetchDeliveryOrderLines(doId)
			.then((response) => {
				if (cancelled) return;
				replaceWithDeliveryOrderLines(response.data || []);
				applySoExtensionData(response);
			})
			.catch((error) => {
				if (!cancelled) {
					console.error("Error fetching DO lines:", error);
					toast({ variant: "destructive", title: "Unable to load delivery order lines", description: error instanceof Error ? error.message : "Please try again." });
				}
			})
			.finally(() => { if (!cancelled) setLinesLoading(false); });

		return () => { cancelled = true; };
	}, [formValues.delivery_order, mode, replaceWithDeliveryOrderLines, clearImportedLines, applySoExtensionData]);

	// Auto-fetch lines when sales order changes (only if no DO is selected)
	React.useEffect(() => {
		if (mode === "view") return;
		const soId = formValues.sales_order_id ? String(formValues.sales_order_id) : "";

		if (!soId) {
			if (!formValues.delivery_order) {
				if (!linesLoadedFromInvoiceApiRef.current) {
					clearImportedLines();
				}
			}
			return;
		}

		// DO lines take priority — skip SO fetch if a DO is selected
		if (formValues.delivery_order) return;

		linesLoadedFromInvoiceApiRef.current = false;
		let cancelled = false;
		setLinesLoading(true);
		fetchSalesOrderLinesForInvoice(soId)
			.then((response) => {
				if (cancelled) return;
				replaceWithSalesOrderLines(response.data || []);
				applySoExtensionData(response);
			})
			.catch((error) => {
				if (!cancelled) {
					console.error("Error fetching SO lines:", error);
					toast({ variant: "destructive", title: "Unable to load sales order lines", description: error instanceof Error ? error.message : "Please try again." });
				}
			})
			.finally(() => { if (!cancelled) setLinesLoading(false); });

		return () => { cancelled = true; };
	}, [formValues.sales_order_id, formValues.delivery_order, mode, replaceWithSalesOrderLines, clearImportedLines, applySoExtensionData]);

	// Auto-sum header claim amount from line item claim amounts for Raw Jute invoices
	React.useEffect(() => {
		const invoiceTypeId = String(formValues.invoice_type ?? "");
		if (!isRawJuteInvoice(invoiceTypeId)) return;
		if (mode === "view") return;

		const sum = filledLineItems.reduce(
			(acc, line) => acc + (Number(line.juteClaimAmountDtl) || 0),
			0,
		);
		const rounded = Number(sum.toFixed(2));

		setFormValues((prev) => {
			const current = Number(prev.jute_claim_amount) || 0;
			if (current === rounded) return prev;
			return { ...prev, jute_claim_amount: rounded };
		});

		juteFormRef.current?.setValue("jute_claim_amount", rounded);
	}, [filledLineItems, formValues.invoice_type, mode, setFormValues]);

	// Additional charges options from setup data
	const chargeOptions = React.useMemo(() => {
		const raw = setupData?.additionalChargesMaster;
		if (!Array.isArray(raw) || !raw.length) return [];
		return raw.map((c) => ({
			value: String(c.additional_charges_id ?? ""),
			label: String(c.additional_charges_name ?? ""),
			defaultValue: c.default_value != null ? Number(c.default_value) : undefined,
		}));
	}, [setupData]);

	// Auto-populate additional charges when Govt Sacking transport mode or line qty changes
	const invoiceTypeId = String(formValues.invoice_type ?? "");
	React.useEffect(() => {
		const mode_val = String(formValues.govtskg_mode_of_transport ?? "");
		if (!mode_val || !isGovtSkgInvoice(invoiceTypeId)) return;

		const totalQty = filledLineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0), 0);
		if (totalQty <= 0) return;

		const rates = setupData?.transportChargeRates ?? [];
		if (!rates.length) return;

		const lineTaxPct = filledLineItems[0]?.taxPercentage;
		// computeGovtskgTransportCharges does an equality check on the two state strings.
		// Feed it company-branch vs shipping-branch state ids (stringified) so the GST
		// split matches the same rule used by line-item tax.
		const companyStateKey = companyBranchStateId != null ? String(companyBranchStateId) : undefined;
		const shippingStateKey = shippingBranchStateId != null ? String(shippingBranchStateId) : undefined;
		const computed = computeGovtskgTransportCharges(mode_val, totalQty, rates, chargeOptions, lineTaxPct, companyStateKey, shippingStateKey);
		setAdditionalCharges((prev) => mergeTransportCharges(prev, computed, mode_val));
	}, [formValues.govtskg_mode_of_transport, filledLineItems, invoiceTypeId, setupData?.transportChargeRates, chargeOptions, companyBranchStateId, shippingBranchStateId]);

	const additionalChargesBreakdown = React.useMemo(
		() => additionalCharges.reduce(
			(acc, c) => {
				const net = parseFloat(c.netAmount) || 0;
				return {
					net: acc.net + net,
					igst: acc.igst + (c.gst?.igstAmount ?? 0),
					cgst: acc.cgst + (c.gst?.cgstAmount ?? 0),
					sgst: acc.sgst + (c.gst?.sgstAmount ?? 0),
					gst: acc.gst + (c.gst?.gstTotal ?? 0),
				};
			},
			{ net: 0, igst: 0, cgst: 0, sgst: 0, gst: 0 },
		),
		[additionalCharges],
	);
	const additionalChargesTotal = additionalChargesBreakdown.net + additionalChargesBreakdown.gst;

	const freightCharges = Number(formValues.freight_charges) || 0;
	const roundOff = Number(formValues.round_off) || 0;
	const claimAmount = isRawJuteInvoice(invoiceTypeId)
		? Number(formValues.jute_claim_amount) || 0
		: 0;
	const totals = React.useMemo(
		() => {
			const base = calculateInvoiceTotals(filledLineItems, freightCharges, roundOff, claimAmount);
			return {
				...base,
				grossAmount: base.grossAmount + additionalChargesBreakdown.net,
				totalIGST: base.totalIGST + additionalChargesBreakdown.igst,
				totalCGST: base.totalCGST + additionalChargesBreakdown.cgst,
				totalSGST: base.totalSGST + additionalChargesBreakdown.sgst,
				totalGST: base.totalGST + additionalChargesBreakdown.gst,
				netAmount: base.netAmount + additionalChargesTotal,
				additionalChargesTotal,
				additionalChargesNet: additionalChargesBreakdown.net,
			};
		},
		[filledLineItems, freightCharges, roundOff, claimAmount, additionalChargesBreakdown, additionalChargesTotal],
	);

	const detailsFetchKey = React.useMemo(
		() => [mode, requestedId || "", branchIdForSetup || branchIdFromUrl || "", coId || ""].join("|"),
		[mode, requestedId, branchIdForSetup, branchIdFromUrl, coId],
	);

	const lastDetailsKeyRef = React.useRef<string | null>(null);
	const detailsFetchedRef = React.useRef(false);
	const linesLoadedFromInvoiceApiRef = React.useRef(false);

	React.useEffect(() => {
		if (lastDetailsKeyRef.current !== detailsFetchKey) {
			lastDetailsKeyRef.current = detailsFetchKey;
			detailsFetchedRef.current = false;
		}
	}, [detailsFetchKey]);

	React.useEffect(() => {
		if (mode === "create") {
			setInvoiceDetails(null);
			setPageError(null);
			setLoading(false);
			return;
		}

		if (!requestedId) {
			setInvoiceDetails(null);
			setPageError("Invoice id is required to load details.");
			setLoading(false);
			return;
		}

		if (!setupEnabled) return;
		if (setupLoading) return;
		if (!setupData) return;
		if (detailsFetchedRef.current) return;

		detailsFetchedRef.current = true;

		let cancelled = false;
		const fetchDetails = async () => {
			setLoading(true);
			try {
				const details = await getInvoiceById(requestedId, coId || undefined, getMenuId() || undefined);
				if (cancelled) return;

				setInvoiceDetails(details);
				const defaultFormValues = buildDefaultFormValues();
				const nextValues = mapInvoiceDetailsToFormValues(details, defaultFormValues);

				const detailsWithBranchId = details as unknown as { branch_id?: unknown; branchId?: unknown };
				const branchIdFromDetails = detailsWithBranchId?.branch_id ?? detailsWithBranchId?.branchId;
				const resolvedBranchValue = (() => {
					if (branchIdFromDetails != null && branchIdFromDetails !== "") return String(branchIdFromDetails);
					if (branchIdFromUrl) return String(branchIdFromUrl);
					if (branchValue && /^\d+$/.test(branchValue)) return branchValue;
					const mappedValue = nextValues.branch != null ? String(nextValues.branch) : "";
					return /^\d+$/.test(mappedValue) ? mappedValue : "";
				})();

				if (resolvedBranchValue) {
					nextValues.branch = resolvedBranchValue;
					setLockedBranchId(resolvedBranchValue);
				}

				setInitialValues(nextValues);
				setFormValues(nextValues);
				bumpFormKey();

				const normalizedLines = (details.lines ?? []).map((line) => mapLineToEditable(line));
				replaceItems(normalizedLines);
				linesLoadedFromInvoiceApiRef.current = true;
				setBaseline(nextValues as Record<string, unknown>, normalizedLines.filter(lineHasAnyData));

				// Load additional charges from invoice details
				const rawCharges = (details as Record<string, unknown>).additionalCharges;
				if (Array.isArray(rawCharges) && rawCharges.length > 0) {
					setAdditionalCharges(rawCharges.map((c: Record<string, unknown>, i: number) => ({
						id: `loaded_${i}`,
						additionalChargesId: String(c.additional_charges_id ?? ""),
						chargeName: String(c.additional_charges_name ?? ""),
						qty: c.qty != null ? String(c.qty) : "1",
						rate: c.rate != null ? String(c.rate) : "",
						netAmount: c.net_amount != null ? String(c.net_amount) : "",
						remarks: String(c.remarks ?? ""),
						taxPct: "",
						gst: c.gst_total != null ? {
							igstAmount: Number(c.igst_amount) || undefined,
							igstPercent: Number(c.igst_percent) || undefined,
							cgstAmount: Number(c.cgst_amount) || undefined,
							cgstPercent: Number(c.cgst_percent) || undefined,
							sgstAmount: Number(c.sgst_amount) || undefined,
							sgstPercent: Number(c.sgst_percent) || undefined,
							gstTotal: Number(c.gst_total) || undefined,
						} : undefined,
					})));
				}

				setPageError(null);
			} catch (error) {
				if (cancelled) return;
				const description = error instanceof Error ? error.message : "Unable to load sales invoice.";
				setInvoiceDetails(null);
				setPageError(description);
				toast({ variant: "destructive", title: "Unable to load sales invoice", description });
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		void fetchDetails();

		return () => { cancelled = true; };
	}, [
		mode, requestedId, coId, getMenuId,
		setInitialValues, setFormValues, bumpFormKey,
		replaceItems, mapLineToEditable,
		setupEnabled, setupLoading, setupData,
		branchIdFromUrl, branchValue,
		setBaseline, lineHasAnyData,
	]);

	React.useEffect(() => {
		if (!invoiceDetails?.lines?.length) return;
		const uniqueGroups = new Set(
			invoiceDetails.lines
				.map((line) => (line.itemGroup ? String(line.itemGroup) : ""))
				.filter((groupId) => groupId && /^\d+$/.test(groupId)),
		);
		uniqueGroups.forEach((groupId) => { ensureItemGroupData(groupId); });
	}, [invoiceDetails, ensureItemGroupData]);

	const isLineItemsReady = React.useMemo(() => {
		if (mode === "view" || pageError || setupError) return true;
		return lineItemsValid;
	}, [lineItemsValid, mode, pageError, setupError]);

	const {
		customerOptions, customerBranchOptions, transporterOptions, brokerOptions, deliveryOrderOptions, salesOrderOptions,
		invoiceTypeOptions, itemGroupOptions, getItemGroupLabel,
		getItemOptions, getMakeOptions, getUomOptions,
		getItemLabel, getMakeLabel, getUomLabel, getUomConversions, getOptionLabel,
		transporterBranchOptions, fetchTransporterBranches,
	} = useSalesInvoiceSelectOptions({
		customers,
		transporters,
		brokers,
		approvedDeliveryOrders,
		approvedSalesOrders,
		invoiceTypes,
		itemGroupsFromLineItems,
		itemGroupCache,
		selectedPartyId,
		coId: coId ? Number(coId) : undefined,
	});

	// Fetch transporter branches whenever the selected transporter changes.
	// Auto-fill branch_id + gst_no when exactly one branch exists.
	// On edit-mode initial load we preserve the saved branch_id; on explicit
	// transporter switch (prev non-null → different non-null) we clear it.
	const prevTransporterRef = React.useRef<number | null>(null);
	React.useEffect(() => {
		const tId = formValues.transporter ? Number(formValues.transporter) : null;
		if (prevTransporterRef.current === tId) return;
		const wasTransporterSwitch = prevTransporterRef.current !== null && tId !== null;
		prevTransporterRef.current = tId;
		if (!tId) return;
		(async () => {
			const branches = await fetchTransporterBranches(tId);
			if (branches.length === 1) {
				const only = branches[0];
				setFormValues((prev) => ({
					...prev,
					transporter_branch_id: only.id,
					transporter_gst_no: only.gst_no || undefined,
				}));
			} else if (wasTransporterSwitch) {
				setFormValues((prev) => ({
					...prev,
					transporter_branch_id: undefined,
					transporter_gst_no: undefined,
				}));
			}
		})();
	}, [formValues.transporter, fetchTransporterBranches, setFormValues]);

	const resolvedCustomerOptions = React.useMemo(() => {
		const strValue = formValues.party != null ? String(formValues.party)
			: invoiceDetails?.party != null ? String(invoiceDetails.party) : "";
		if (!strValue) return customerOptions;
		if (customerOptions.some((opt) => String(opt.value) === strValue)) return customerOptions;
		return [...customerOptions, { label: invoiceDetails?.partyName ?? strValue, value: strValue }];
	}, [customerOptions, formValues.party, invoiceDetails?.party, invoiceDetails?.partyName]);

	const resolvedCustomerBranchOptions = React.useMemo(() => {
		let opts = customerBranchOptions;
		const billingStr = formValues.billing_to != null ? String(formValues.billing_to)
			: invoiceDetails?.billingTo != null ? String(invoiceDetails.billingTo) : "";
		if (billingStr && !opts.some((opt) => String(opt.value) === billingStr)) {
			opts = [...opts, { label: billingStr, value: billingStr }];
		}
		const shippingStr = formValues.shipping_to != null ? String(formValues.shipping_to)
			: invoiceDetails?.shippingTo != null ? String(invoiceDetails.shippingTo) : "";
		if (shippingStr && !opts.some((opt) => String(opt.value) === shippingStr)) {
			opts = [...opts, { label: shippingStr, value: shippingStr }];
		}
		return opts;
	}, [customerBranchOptions, formValues.billing_to, formValues.shipping_to,
		invoiceDetails?.billingTo, invoiceDetails?.shippingTo]);

	const bankDetailOptions = React.useMemo<Option[]>(
		() => (setupData?.bankDetails ?? []).map((b) => ({ label: `${b.bankName} - ${b.accNo}`, value: b.id })),
		[setupData?.bankDetails],
	);

	const headerSchema = useSalesInvoiceHeaderSchema({
		branchOptions: resolvedBranchOptions,
		customerOptions: resolvedCustomerOptions,
		customerBranchOptions: resolvedCustomerBranchOptions,
		transporterOptions,
		brokerOptions,
		deliveryOrderOptions,
		salesOrderOptions,
		invoiceTypeOptions,
		bankDetailOptions,
		mode,
		headerFieldsDisabled,
		salesOrderDisabled,
		deliveryOrderDisabled,
	});

	const mukamOptions = React.useMemo(() => buildMukamOptions(setupData?.mukamList ?? []), [setupData?.mukamList]);
	const typeSpecificHeaderSchema = useSalesInvoiceTypeSpecificHeaderSchema({ mode, headerFieldsDisabled, mukamOptions, invoiceTypeId: String(formValues.invoice_type ?? "") });
	const footerSchema = useSalesInvoiceFooterSchema({ mode });

	const {
		approvalLoading, approvalInfo, approvalPermissions, statusChipProps,
		handleApprove, handleReject, handleOpen, handleCancelDraft,
		handleReopen, handleSendForApproval, handleViewApprovalLog,
	} = useSalesInvoiceApproval({
		mode,
		requestedId,
		formValues,
		invoiceDetails,
		coId,
		getMenuId,
		setInvoiceDetails,
	});

	// Reject dialog hook (replaces the inline dialog inside ApprovalBar)
	const {
		rejectDialogOpen,
		rejectReason,
		setRejectReason,
		openRejectDialog,
		handleRejectConfirm,
		handleRejectCancel,
	} = useRejectDialog(handleReject);

	// Reset baseline when invoiceDetails changes (initial load or post-approval refresh)
	React.useEffect(() => {
		if (!invoiceDetails || mode === "create") return;
		const timer = setTimeout(() => resetBaseline(), 0);
		return () => clearTimeout(timer);
	}, [invoiceDetails, mode, resetBaseline]);

	const canEdit = mode !== "view";

	// Gate editing on approval permissions (follow PO/Indent pattern)
	const canSave = mode !== "view" && approvalPermissions.canSave !== false;

	const lineItemColumns = useInvoiceLineItemColumns({
		canEdit: canSave,
		itemGroupOptions,
		getItemGroupLabel,
		getItemOptions,
		getItemLabel,
		getUomOptions,
		getUomLabel,
		onFieldChange: handleLineFieldChange,
		invoiceTypeId: String(formValues.invoice_type ?? ""),
		getUomConversions,
	});

	const branchLabel = React.useMemo(() => {
		const value = formValues.branch ?? invoiceDetails?.branchId;
		return getOptionLabel(resolvedBranchOptions, value) ?? (typeof value === "string" ? value : undefined);
	}, [resolvedBranchOptions, formValues.branch, invoiceDetails?.branchId, getOptionLabel]);

	const customerLabel = React.useMemo(() => {
		const value = formValues.party ?? invoiceDetails?.party;
		return getOptionLabel(resolvedCustomerOptions, value) ?? (typeof value === "string" ? value : undefined);
	}, [formValues.party, invoiceDetails?.party, resolvedCustomerOptions, getOptionLabel]);

	const customerBranchLabel = React.useMemo(() => {
		const value = formValues.party_branch ?? invoiceDetails?.partyBranch;
		return getOptionLabel(customerBranchOptions, value) ?? (typeof value === "string" ? value : undefined);
	}, [formValues.party_branch, invoiceDetails?.partyBranch, customerBranchOptions, getOptionLabel]);

	const deliveryOrderLabel = React.useMemo(() => {
		const value = formValues.delivery_order ?? invoiceDetails?.salesDeliveryOrderId;
		return getOptionLabel(deliveryOrderOptions, value) ?? invoiceDetails?.deliveryOrderNo ?? (typeof value === "string" ? value : undefined);
	}, [formValues.delivery_order, invoiceDetails?.salesDeliveryOrderId, invoiceDetails?.deliveryOrderNo, deliveryOrderOptions, getOptionLabel]);

	const transporterLabel = React.useMemo(() => {
		const value = formValues.transporter ?? invoiceDetails?.transporter;
		return getOptionLabel(transporterOptions, value) ?? invoiceDetails?.transporterName ?? (typeof value === "string" ? value : undefined);
	}, [formValues.transporter, invoiceDetails?.transporter, invoiceDetails?.transporterName, transporterOptions, getOptionLabel]);

	const statusLabel = React.useMemo(() => statusChipProps?.label ?? invoiceDetails?.status, [statusChipProps?.label, invoiceDetails?.status]);

	const billingBranchRecord = React.useMemo(() => {
		const id = billingBranchId ?? (invoiceDetails?.billingTo ? String(invoiceDetails.billingTo) : undefined);
		if (!id || !selectedCustomer?.branches) return null;
		return selectedCustomer.branches.find((b) => b.id === id) ?? null;
	}, [billingBranchId, invoiceDetails?.billingTo, selectedCustomer]);

	const shippingBranchRecord = React.useMemo(() => {
		const id = shippingBranchId ?? (invoiceDetails?.shippingTo ? String(invoiceDetails.shippingTo) : undefined);
		if (!id || !selectedCustomer?.branches) return null;
		return selectedCustomer.branches.find((b) => b.id === id) ?? null;
	}, [shippingBranchId, invoiceDetails?.shippingTo, selectedCustomer]);

	const billingToLabel = React.useMemo(() => {
		const value = formValues.billing_to ?? invoiceDetails?.billingTo;
		if (!value) return undefined;
		// First try to get from options
		const fromOptions = getOptionLabel(resolvedCustomerBranchOptions, value);
		if (fromOptions) return fromOptions;
		// Otherwise construct from branch record with full address concatenation
		if (billingBranchRecord) {
			const parts = [billingBranchRecord.address, billingBranchRecord.stateName].filter(Boolean);
			return parts.length > 0 ? parts.join(" — ") : billingBranchRecord.address || String(value);
		}
		// Last resort: use the snapshot returned inline by the invoice-by-id API.
		if (invoiceDetails?.billingAddress) {
			const parts = [invoiceDetails.billingAddress, invoiceDetails.billingStateName].filter(Boolean);
			return parts.length > 0 ? parts.join(" — ") : invoiceDetails.billingAddress;
		}
		return typeof value === "string" ? value : undefined;
	}, [formValues.billing_to, invoiceDetails?.billingTo, invoiceDetails?.billingAddress, invoiceDetails?.billingStateName, resolvedCustomerBranchOptions, getOptionLabel, billingBranchRecord]);

	const shippingToLabel = React.useMemo(() => {
		const value = formValues.shipping_to ?? invoiceDetails?.shippingTo;
		if (!value) return undefined;
		// First try to get from options
		const fromOptions = getOptionLabel(resolvedCustomerBranchOptions, value);
		if (fromOptions) return fromOptions;
		// Otherwise construct from branch record with full address concatenation
		if (shippingBranchRecord) {
			const parts = [shippingBranchRecord.address, shippingBranchRecord.stateName].filter(Boolean);
			return parts.length > 0 ? parts.join(" — ") : shippingBranchRecord.address || String(value);
		}
		// Last resort: use the snapshot returned inline by the invoice-by-id API.
		if (invoiceDetails?.shippingAddress) {
			const parts = [invoiceDetails.shippingAddress, invoiceDetails.shippingStateName].filter(Boolean);
			return parts.length > 0 ? parts.join(" — ") : invoiceDetails.shippingAddress;
		}
		return typeof value === "string" ? value : undefined;
	}, [formValues.shipping_to, invoiceDetails?.shippingTo, invoiceDetails?.shippingAddress, invoiceDetails?.shippingStateName, resolvedCustomerBranchOptions, getOptionLabel, shippingBranchRecord]);

	const selectedDeliveryOrderRecord = React.useMemo(() => {
		const doId = formValues.delivery_order ? String(formValues.delivery_order) : "";
		if (!doId) return null;
		return approvedDeliveryOrders.find((d) => d.id === doId) ?? null;
	}, [formValues.delivery_order, approvedDeliveryOrders]);

	const dominantGstPercents = React.useMemo(() => {
		const firstWithIgst = filledLineItems.find((l) => (l.igstAmount ?? 0) > 0);
		const firstWithCgst = filledLineItems.find((l) => (l.cgstAmount ?? 0) > 0);
		return {
			igstPercent: firstWithIgst?.igstPercent,
			cgstPercent: firstWithCgst?.cgstPercent,
			sgstPercent: firstWithCgst?.sgstPercent,
		};
	}, [filledLineItems]);

	const previewHeader = React.useMemo(
		() => ({
			invoiceNo: invoiceDetails?.invoiceNo,
			invoiceDate: (formValues.date as string) || invoiceDetails?.invoiceDate,
			challanNo: (formValues.challan_no as string) || invoiceDetails?.challanNo,
			challanDate: (formValues.challan_date as string) || invoiceDetails?.challanDate,
			saleNo: invoiceDetails?.saleNo,
			deliveryOrderNo: invoiceDetails?.deliveryOrderNo || selectedDeliveryOrderRecord?.deliveryOrderNo,
			deliveryOrderDate: selectedDeliveryOrderRecord?.deliveryOrderDate || invoiceDetails?.challanDate,
			salesOrderNo: (() => {
				// Prefer formatted SO no from approvedSalesOrders dropdown (matches backend format_indent_no)
				const soId = String(formValues.sales_order_id ?? invoiceDetails?.salesOrderId ?? "");
				if (soId) {
					const soRecord = approvedSalesOrders.find((s) => s.id === soId);
					if (soRecord?.salesOrderNo) return soRecord.salesOrderNo;
				}
				return invoiceDetails?.salesOrderNo || soId || undefined;
			})(),
			salesOrderDate: (formValues.sales_order_date as string) || invoiceDetails?.salesOrderDate,
			invoiceType: (() => {
				// Prefer formValues; fall back to invoiceDetails when formValues is empty/"".
				// `??` alone misses "", which can happen transiently after save → view
				// before the refetch repopulates formValues.
				const fromForm = formValues.invoice_type;
				if (fromForm != null && fromForm !== "") return String(fromForm);
				if (invoiceDetails?.invoiceType != null) return String(invoiceDetails.invoiceType);
				return "";
			})(),
			pcsoNo: (formValues.govtskg_pcso_no as string) || invoiceDetails?.govtskg?.pcsoNo,
			pcsoDate: (formValues.govtskg_pcso_date as string) || invoiceDetails?.govtskg?.pcsoDate,
			branch: branchLabel,
			customer: customerLabel,
			customerBranch: customerBranchLabel,
			deliveryOrder: deliveryOrderLabel,
			billingTo: billingToLabel,
			shippingTo: shippingToLabel,
			billingToName: customerLabel ?? invoiceDetails?.partyName,
			// Prefer the live branch-record lookup (from setup customers), but fall back to
			// the snapshot the backend stored on the invoice header itself. The backend
			// returns billingAddress/billingGstNo/etc. inline (see get_sales_invoice_by_id),
			// which covers us even if `selectedCustomer` fails to resolve transiently
			// (e.g., right after save → view while refetch is in flight, or when the party
			// is missing from the current customers dropdown).
			billingToAddress: billingBranchRecord?.address ?? invoiceDetails?.billingAddress,
			billingToState: billingBranchRecord?.stateName ?? invoiceDetails?.billingStateName,
			billingToStateCode: billingBranchRecord?.stateCode
				?? (invoiceDetails?.billingStateCode != null ? String(invoiceDetails.billingStateCode) : undefined),
			billingToGstin: billingBranchRecord?.gstNo ?? invoiceDetails?.billingGstNo,
			shippingToName: customerLabel ?? invoiceDetails?.partyName,
			shippingToAddress: shippingBranchRecord?.address ?? invoiceDetails?.shippingAddress,
			shippingToState: shippingBranchRecord?.stateName ?? invoiceDetails?.shippingStateName,
			shippingToStateCode: shippingBranchRecord?.stateCode
				?? (invoiceDetails?.shippingStateCode != null ? String(invoiceDetails.shippingStateCode) : undefined),
			shippingToGstin: shippingBranchRecord?.gstNo ?? invoiceDetails?.shippingGstNo,
			transporter: transporterLabel,
			transporterGstNo: (formValues.transporter_gst_no as string) || invoiceDetails?.transporterGstNo,
			transporterDocNo: (formValues.transporter_doc_no as string) || invoiceDetails?.transporterDocNo,
			transporterDocDate: (formValues.transporter_doc_date as string) || invoiceDetails?.transporterDocDate,
			loadingPoint: (formValues.govtskg_loading_point as string) || invoiceDetails?.govtskg?.loadingPoint,
			modeOfTransport: (formValues.govtskg_mode_of_transport as string) || invoiceDetails?.govtskg?.modeOfTransport,
			vehicleNo: (formValues.vehicle_no as string) || invoiceDetails?.vehicleNo,
			ewayBillNo: (formValues.eway_bill_no as string) || invoiceDetails?.ewayBillNo,
			ewayBillDate: (formValues.eway_bill_date as string) || invoiceDetails?.ewayBillDate,
			transactionType: (formValues.type_of_sale as string) || invoiceDetails?.typeOfSale,
			companyName,
			companyLogo,
			companyAddress: (() => {
				const co = setupData?.company;
				if (!co) return invoiceDetails?.companyAddress1 ? [invoiceDetails.companyAddress1, invoiceDetails.companyAddress2, invoiceDetails.companyZipcode ? String(invoiceDetails.companyZipcode) : null, invoiceDetails.companyStateName].filter(Boolean).join(", ") : undefined;
				const parts = [co.co_address1, co.co_address2, co.co_zipcode ? String(co.co_zipcode) : null, co.state_name].filter(Boolean);
				return parts.length > 0 ? parts.join(", ") : undefined;
			})(),
			companyStateCode: (() => {
				const selectedBranch = setupData?.branches?.find((b) => String(b.branch_id) === branchValue);
				if (selectedBranch?.state_code) return String(selectedBranch.state_code);
				if (setupData?.company?.state_code) return String(setupData.company.state_code);
				return invoiceDetails?.companyStateCode ? String(invoiceDetails.companyStateCode) : undefined;
			})(),
			companyGstin: (() => {
				const selectedBranch = setupData?.branches?.find((b) => String(b.branch_id) === branchValue);
				if (selectedBranch?.gst_no) return selectedBranch.gst_no;
				return invoiceDetails?.branchGstNo ?? undefined;
			})(),
			companyCinNo: setupData?.company?.co_cin_no ?? invoiceDetails?.companyCinNo ?? undefined,
			branchAddress: (() => {
				const selectedBranch = setupData?.branches?.find((b) => String(b.branch_id) === branchValue);
				if (!selectedBranch) {
					if (invoiceDetails?.branchAddress1) return [invoiceDetails.branchAddress1, invoiceDetails.branchAddress2, invoiceDetails.branchZipcode ? String(invoiceDetails.branchZipcode) : null, invoiceDetails.branchStateName].filter(Boolean).join(", ");
					return undefined;
				}
				const parts = [selectedBranch.branch_address1, selectedBranch.branch_address2, selectedBranch.branch_zipcode ? String(selectedBranch.branch_zipcode) : null, selectedBranch.state_name].filter(Boolean);
				return parts.length > 0 ? parts.join(", ") : undefined;
			})(),
			branchGstNo: (() => {
				const selectedBranch = setupData?.branches?.find((b) => String(b.branch_id) === branchValue);
				return selectedBranch?.gst_no ?? invoiceDetails?.branchGstNo ?? undefined;
			})(),
			branchStateCode: (() => {
				const selectedBranch = setupData?.branches?.find((b) => String(b.branch_id) === branchValue);
				return selectedBranch?.state_code ? String(selectedBranch.state_code) : (invoiceDetails?.branchStateCode ? String(invoiceDetails.branchStateCode) : undefined);
			})(),
			bankName: (() => {
				const bankId = (formValues.bank_detail_id as string) ?? invoiceDetails?.bankDetailId;
				if (!bankId) return invoiceDetails?.bankName ?? undefined;
				return setupData?.bankDetails?.find((b) => b.id === String(bankId))?.bankName ?? invoiceDetails?.bankName ?? undefined;
			})(),
			bankAccNo: (() => {
				const bankId = (formValues.bank_detail_id as string) ?? invoiceDetails?.bankDetailId;
				if (!bankId) return invoiceDetails?.bankAccNo ?? undefined;
				return setupData?.bankDetails?.find((b) => b.id === String(bankId))?.accNo ?? invoiceDetails?.bankAccNo ?? undefined;
			})(),
			bankIfscCode: (() => {
				const bankId = (formValues.bank_detail_id as string) ?? invoiceDetails?.bankDetailId;
				if (!bankId) return invoiceDetails?.bankIfscCode ?? undefined;
				return setupData?.bankDetails?.find((b) => b.id === String(bankId))?.ifscCode ?? invoiceDetails?.bankIfscCode ?? undefined;
			})(),
			status: statusLabel,
			updatedBy: invoiceDetails?.updatedBy,
			updatedAt: invoiceDetails?.updatedAt,
			destination: (() => {
				const typeId = String(formValues.invoice_type ?? invoiceDetails?.invoiceType ?? "");
				if (!isGovtSkgInvoice(typeId)) return undefined;
				const addr = (formValues.govtskg_admin_office_address as string)
					|| invoiceDetails?.govtskg?.administrativeOfficeAddress
					|| "";
				return addr ? String(addr) : undefined;
			})(),
			irn: (formValues.irn as string) || invoiceDetails?.irn,
			ackNo: (formValues.ack_no as string) || invoiceDetails?.ackNo,
			ackDate: (formValues.ack_date as string) || invoiceDetails?.ackDate,
			qrCode: (formValues.qr_code as string) || invoiceDetails?.qrCode,
		}),
		[
			invoiceDetails, formValues.date, formValues.challan_no, formValues.challan_date,
			formValues.vehicle_no, formValues.transporter_doc_no, formValues.transporter_doc_date, formValues.transporter_gst_no, formValues.eway_bill_no, formValues.eway_bill_date,
			formValues.invoice_type, formValues.type_of_sale, formValues.sales_order_id, formValues.sales_order_date,
			formValues.bank_detail_id, formValues.govtskg_admin_office_address, formValues.govtskg_loading_point,
			formValues.govtskg_mode_of_transport,
			formValues.govtskg_pcso_no, formValues.govtskg_pcso_date,
			formValues.irn, formValues.ack_no, formValues.ack_date, formValues.qr_code,
			branchLabel, branchValue, customerLabel, customerBranchLabel, deliveryOrderLabel,
			billingToLabel, shippingToLabel, transporterLabel, companyName, companyLogo, statusLabel,
			billingBranchRecord, shippingBranchRecord, selectedDeliveryOrderRecord,
			setupData, approvedSalesOrders,
		],
	);

	const previewItems = React.useMemo(() => {
		const isGovtSkg = isGovtSkgInvoice(String(formValues.invoice_type ?? ""));
		return filledLineItems.map((line, index) => {
			// Prefer the backend-resolved unit name; getUomLabel falls back to the raw
			// uom id when the item-group UOM cache isn't loaded (e.g. view mode).
			const cachedUomLabel = getUomLabel(line.itemGroup, line.item, line.uom);
			const uomLabel = line.uomName || (cachedUomLabel !== line.uom ? cachedUomLabel : "");
			const discountType = (() => {
				if (line.discountType === 1) return "%";
				if (line.discountType === 2) return "Amt";
				return "";
			})();
			// Prefer user-entered govtskgQtyBales; fall back to on-the-fly conversion (view mode / pre-backfill)
			let otherQtyDisplay: string | undefined;
			if (line.govtskgQtyBales && Number(line.govtskgQtyBales)) {
				otherQtyDisplay = `${line.govtskgQtyBales} Bales`;
			} else if (isGovtSkg && line.quantity) {
				const conv = computeConvertedQtyBales(line.quantity, line.uom, getUomConversions(line.itemGroup, line.item));
				if (conv) otherQtyDisplay = `${conv.convertedQty} ${conv.otherUomName}`;
			}
			return {
				srNo: index + 1,
				hsnCode: line.hsnCode,
				itemCode: line.fullItemCode || line.itemCode || undefined,
				item: line.itemName || line.item || "-",
				netWeight: line.govtskgNetWeight != null ? line.govtskgNetWeight : undefined,
				quantity: line.quantity || "-",
				otherQtyDisplay,
				uom: uomLabel,
				rate: line.rate,
				discountType,
				discountAmount: typeof line.discountAmount === "number" ? line.discountAmount : "",
				netAmount: typeof line.netAmount === "number" ? line.netAmount : "",
				remarks: line.remarks || "-",
			};
		});
	}, [filledLineItems, getUomLabel, getUomConversions, formValues.invoice_type, itemGroups]);

	const previewTotals = React.useMemo(
		() => ({
			grossAmount: totals.grossAmount,
			claimAmount: totals.claimAmount,
			totalIGST: totals.totalIGST,
			totalCGST: totals.totalCGST,
			totalSGST: totals.totalSGST,
			cgstPercent: dominantGstPercents.cgstPercent,
			sgstPercent: dominantGstPercents.sgstPercent,
			igstPercent: dominantGstPercents.igstPercent,
			freightCharges: totals.freightCharges,
			roundOff: totals.roundOff,
			netAmount: totals.netAmount,
		}),
		[totals, dominantGstPercents],
	);

	const previewAdditionalCharges = React.useMemo(
		() => additionalCharges
			.filter((c) => (parseFloat(c.netAmount) || 0) > 0 && c.chargeName)
			.map((c) => {
				const qty = c.qty ? parseFloat(c.qty) : undefined;
				const rate = c.rate ? parseFloat(c.rate) : undefined;
				return {
					chargeName: c.chargeName,
					netAmount: parseFloat(c.netAmount) || 0,
					qty: qty !== undefined && !Number.isNaN(qty) ? qty : undefined,
					rate: rate !== undefined && !Number.isNaN(rate) ? rate : undefined,
				};
			}),
		[additionalCharges],
	);

	const previewRemarks = React.useMemo(() => {
		return (
			(formValues.internal_note as string) ||
			invoiceDetails?.internalNote ||
			(formValues.footer_note as string) ||
			invoiceDetails?.footerNote ||
			""
		);
	}, [formValues.internal_note, formValues.footer_note, invoiceDetails?.internalNote, invoiceDetails?.footerNote]);

	const previewTermsConditions = React.useMemo(() => {
		return (formValues.terms_conditions as string) || invoiceDetails?.termsConditions || "";
	}, [formValues.terms_conditions, invoiceDetails?.termsConditions]);

	const { metadata } = useTransactionPreview({
		header: previewHeader,
		fields: [
			{ label: "Invoice No", accessor: (header) => header.invoiceNo || "Pending" },
			{ label: "Invoice Date", accessor: (header) => header.invoiceDate || "-" },
			{ label: "Customer", accessor: (header) => header.customer || "-" },
			{ label: "Status", accessor: (header) => header.status || "-", includeWhen: (header) => Boolean(header.status) },
		],
	});

	const { saving, handleFormSubmit } = useSalesInvoiceFormSubmission({
		mode,
		pageError,
		setupError,
		filledLineItems,
		isLineItemsReady,
		requestedId,
		formValues,
		approvalPermissions,
		additionalCharges,
	});

	// Unified primary actions — shows Create, Save, or Approval buttons in the same location
	const primaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
		if (pageError || setupError) return undefined;

		if (mode === "create") {
			return [
				{
					label: "Create Invoice",
					onClick: () => formRef.current?.submit(),
					disabled: saving || !isLineItemsReady || setupLoading,
					loading: saving,
				},
			];
		}

		if (!invoiceDetails) return undefined;

		if (mode === "edit" && approvalPermissions.canSave && hasUnsavedChanges) {
			return [
				{
					label: "Save Changes",
					onClick: () => formRef.current?.submit(),
					disabled: saving || !isLineItemsReady || setupLoading,
					loading: saving,
				},
			];
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
	}, [
		mode, pageError, setupError, saving, isLineItemsReady, setupLoading,
		formRef, invoiceDetails, approvalPermissions, hasUnsavedChanges,
		approvalInfo, approvalLoading, loading,
		handleOpen, handleCancelDraft, handleReopen, handleSendForApproval,
		handleApprove, openRejectDialog, handleViewApprovalLog,
	]);

	const secondaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
		if (!requestedId || pageError) return undefined;
		const actions: TransactionAction[] = [];
		const qs = `?id=${encodeURIComponent(requestedId)}&branch_id=${encodeURIComponent(branchIdFromUrl)}&menu_id=${encodeURIComponent(menuIdFromUrl)}`;
		if (mode === "view" && approvalPermissions.canSave) {
			actions.push({
				label: "Edit",
				variant: "secondary",
				onClick: () => router.replace(`${qs}&mode=edit`),
			});
		}
		if (mode === "edit") {
			actions.push({
				label: "Cancel",
				variant: "ghost",
				onClick: () => router.replace(`${qs}&mode=view`),
			});
		}
		return actions.length ? actions : undefined;
	}, [mode, requestedId, router, pageError, approvalPermissions.canSave, branchIdFromUrl, menuIdFromUrl]);

	const pageTitle = React.useMemo(() => {
		if (mode === "create") return "Create Sales Invoice";
		if (mode === "edit") {
			return invoiceDetails?.invoiceNo ? `Edit Invoice ${invoiceDetails.invoiceNo}` : "Edit Sales Invoice";
		}
		return invoiceDetails?.invoiceNo ? `Sales Invoice ${invoiceDetails.invoiceNo}` : "Sales Invoice Details";
	}, [mode, invoiceDetails?.invoiceNo]);

	// Detect empty customer list issue
	const customerListWarning = React.useMemo(() => {
		if (setupLoading || pageError) return null;
		if (mode === "view") return null;
		if (setupData && customers.length === 0 && (setupData.company || setupData.branches)) {
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

	if (!mounted) return <InvoicePageLoading />;

	const activeInvoiceTypeId = String(formValues.invoice_type ?? invoiceDetails?.invoiceType ?? "");
	const isFreightType = isGovtSkgFreightInvoice(activeInvoiceTypeId);
	if (isFreightType && coId && branchValue) {
		const freightMode: "create" | "view" | "edit" =
			mode === "view" ? "view" : mode === "edit" ? "edit" : "create";
		const freightSubtitle =
			freightMode === "view" ? "Govt Sacking Freight invoice details"
				: freightMode === "edit" ? "Edit Govt Sacking Freight invoice"
					: "Create a new Govt Sacking Freight invoice";
		return (
			<TransactionWrapper
				title={pageTitle}
				subtitle={freightSubtitle}
				metadata={metadata}
				statusChip={statusChipProps}
				backAction={{ onClick: () => router.push("/dashboardportal/sales/salesInvoice") }}
				loading={loading || setupLoading}
				alerts={pageError ? <div role="alert" aria-live="assertive" className="text-red-600">{pageError}</div> : null}
			>
				<GovtSackingFreightForm
					coId={coId}
					branchId={branchValue}
					mode={freightMode}
					existingInvoice={invoiceDetails ?? undefined}
					menuId={menuIdFromUrl}
					setupData={setupData ?? null}
					requestedId={requestedId}
					setInvoiceDetails={setInvoiceDetails}
					getMenuId={getMenuId}
				/>
			</TransactionWrapper>
		);
	}

	return (
		<>
		<TransactionWrapper
			title={pageTitle}
			subtitle={mode === "create" ? "Create a new sales invoice" : mode === "edit" ? "Edit sales invoice" : "View sales invoice details"}
			metadata={metadata}
			statusChip={statusChipProps}
			backAction={{ onClick: () => router.push("/dashboardportal/sales/salesInvoice") }}
			primaryActions={primaryActions}
			secondaryActions={secondaryActions}
			actionsAfterFooter
			loading={loading || setupLoading || linesLoading}
			alerts={pageError ? <div role="alert" aria-live="assertive" className="text-red-600">{pageError}</div> : customerListWarning}
			preview={
				<SalesInvoicePreview
					header={previewHeader}
					items={previewItems}
					totals={previewTotals}
					additionalCharges={previewAdditionalCharges}
					remarks={previewRemarks}
					termsConditions={previewTermsConditions}
				/>
			}
			lineItems={{
				items: lineItems,
				getItemId: (item) => item.id,
				canEdit: canSave,
				columns: lineItemColumns,
				placeholder: linesLoading ? "Loading line items..." : "Add line items manually, or select a Delivery Order / Sales Order above to auto-populate",
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
					<SalesInvoiceFooterForm
						schema={footerSchema}
						formKey={formKey}
						initialValues={initialValues}
						mode={canSave ? mode : "view"}
						onSubmit={handleFormSubmit}
						onValuesChange={handleFooterFormValuesChange}
					/>
					<AdditionalChargesSection
						charges={additionalCharges}
						chargeOptions={chargeOptions}
						onChange={setAdditionalCharges}
						disabled={!canSave}
						billingToState={companyBranchStateId != null ? String(companyBranchStateId) : undefined}
						shippingToState={shippingBranchStateId != null ? String(shippingBranchStateId) : undefined}
						indiaGst={true}
					/>
					<SalesInvoiceTotalsDisplay
						totals={totals}
						showGSTBreakdown={Boolean(companyBranchStateId || shippingBranchStateId)}
						roundOffInput={(formValues.round_off as string) ?? ""}
						onRoundOffChange={(value) => setFormValues((prev) => ({ ...prev, round_off: value }))}
						roundOffEditable={canSave}
					/>
				</div>
			}
		>
			<SalesInvoiceHeaderForm
				schema={headerSchema}
				formKey={formKey}
				initialValues={initialValues}
				mode={canSave ? mode : "view"}
				formRef={formRef}
				onSubmit={handleFormSubmit}
				onValuesChange={handleMainFormValuesChange}
				typeSpecificSchema={typeSpecificHeaderSchema}
				invoiceTypeId={String(formValues.invoice_type ?? "")}
				juteFormRef={juteFormRef}
				formValues={formValues}
				isView={!canSave}
				transporterBranchOptions={transporterBranchOptions}
			/>
		</TransactionWrapper>

		<ItemSelectionDialog
			open={itemDialogOpen}
			onOpenChange={setItemDialogOpen}
			coId={coId}
			onConfirm={handleItemDialogConfirm}
			filter="saleable"
			excludeItemIds={excludeItemIds}
			title="Select Items for Sales Invoice"
		/>

		<Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open) handleRejectCancel(); }}>
			<DialogContent className="sm:max-w-125">
				<DialogHeader>
					<DialogTitle>Reject Document</DialogTitle>
					<DialogDescription>Please provide a reason for rejecting this document.</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<label htmlFor="reject-reason" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
							Rejection Reason *
						</label>
						<AutoResizeTextarea
							id="reject-reason"
							placeholder="Enter rejection reason..."
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
