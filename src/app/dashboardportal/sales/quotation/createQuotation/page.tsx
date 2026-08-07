"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TransactionWrapper from "@/components/ui/TransactionWrapper";
import { Button } from "@/components/ui/button";
import type { MuiFormMode } from "@/components/ui/muiform";
import {
	useDeferredOptionCache,
	useTransactionSetup,
	useTransactionPreview,
	ItemSelectionDialog,
	type SelectedItem,
} from "@/components/ui/transaction";
import { useBranchOptions } from "@/utils/branchUtils";
import {
	fetchQuotationSetup1,
	fetchQuotationSetup2,
	getQuotationById,
	type QuotationDetails,
} from "@/utils/quotationService";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { toast } from "@/hooks/use-toast";
import { fetchEnquiryLinesForQuotation } from "@/utils/enquiryService";
import {
	Button as MuiButton,
	Dialog as MuiDialog,
	DialogActions as MuiDialogActions,
	DialogContent as MuiDialogContent,
	DialogTitle as MuiDialogTitle,
	TextField as MuiTextField,
	Typography as MuiTypography,
} from "@mui/material";
import { useMenuId } from "@/hooks/useMenuId";
import { useCompanyName } from "@/hooks/useCompanyName";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";
import { QuotationHeaderForm } from "./components/QuotationHeaderForm";
import { QuotationFooterForm } from "./components/QuotationFooterForm";
import { QuotationTotalsDisplay } from "./components/QuotationTotalsDisplay";
import { QuotationApprovalBar } from "./components/QuotationApprovalBar";
import QuotationPreview from "./components/QuotationPreview";
import { useQuotationLineItemColumns } from "./components/QuotationLineItemsTable";
import { useQuotationFormState } from "./hooks/useQuotationFormState";
import { useQuotationAddresses } from "./hooks/useQuotationAddresses";
import { useQuotationTaxCalculations } from "./hooks/useQuotationTaxCalculations";
import { useQuotationSelectOptions } from "./hooks/useQuotationSelectOptions";
import { useQuotationHeaderSchema, useQuotationFooterSchema } from "./hooks/useQuotationFormSchemas";
import { useQuotationFormSubmission } from "./hooks/useQuotationFormSubmission";
import { useQuotationApproval } from "./hooks/useQuotationApproval";
import { useQuotationLineItems } from "./hooks/useQuotationLineItems";
import type { EditableLineItem, ItemGroupCacheEntry, QuotationSetupData } from "./types/quotationTypes";
import { mapItemGroupDetailResponse, mapQuotationSetupResponse, mapQuotationDetailsToFormValues } from "./utils/quotationMappers";
import { calculateTotals } from "./utils/quotationCalculations";
import { buildDefaultFormValues, createBlankLine } from "./utils/quotationFactories";
import {
	EMPTY_BRANCH_ADDRESSES,
	EMPTY_BROKERS,
	EMPTY_CUSTOMERS,
	EMPTY_CUSTOMER_BRANCHES,
	EMPTY_ITEM_GROUPS,
	EMPTY_SETUP_PARAMS,
	DISCOUNT_MODE,
} from "./utils/quotationConstants";

function QuotationPageLoading() {
	return (
		<div className="flex items-center justify-center min-h-100">
			<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
		</div>
	);
}

export default function QuotationTransactionPage() {
	return (
		<Suspense fallback={<QuotationPageLoading />}>
			<QuotationTransactionPageContent />
		</Suspense>
	);
}

function QuotationTransactionPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const modeParam = (searchParams?.get("mode") || "create").toLowerCase();
	const requestedId = searchParams?.get("id") || "";
	const branchIdFromUrl = searchParams?.get("branch_id") || "";
	const menuIdFromUrl = searchParams?.get("menu_id") || "";
	const salesEnquiryIdFromUrl = searchParams?.get("sales_enquiry_id") || "";

	const mode: MuiFormMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";

	const branchOptions = useBranchOptions();
	const { coId } = useSelectedCompanyCoId();
	const [lockedBranchId, setLockedBranchId] = React.useState<string | null>(() => (mode !== "create" && branchIdFromUrl ? String(branchIdFromUrl) : null));
	const branchPrefillAppliedRef = React.useRef(false);

	const { getMenuId } = useMenuId({ transactionType: "quotation", menuIdFromUrl });
	const companyName = useCompanyName();
	const companyLogo = useCompanyLogo(coId);

	const {
		initialValues,
		setInitialValues,
		formValues,
		setFormValues,
		formKey,
		setFormKey,
		formRef,
		handleMainFormValuesChange,
		handleFooterFormValuesChange,
	} = useQuotationFormState({ mode, requestedId, branchIdFromUrl });

	const [quotationDetails, setQuotationDetails] = React.useState<QuotationDetails | null>(null);
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
		const fallbackLabel =
			(quotationDetails?.branch && typeof quotationDetails.branch === "string" ? quotationDetails.branch : undefined) ||
			branchValue;
		return [...branchOptions, { label: fallbackLabel, value: branchValue }];
	}, [branchOptions, branchValue, quotationDetails?.branch]);

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

	const memoizedMapSetupResponse = React.useCallback(mapQuotationSetupResponse, []);
	const memoizedFetchSetup1 = React.useCallback(fetchQuotationSetup1, []);

	const setupEnabled = React.useMemo(() => Boolean(coId && branchIdForSetup), [coId, branchIdForSetup]);

	const { data: setupData, loading: setupLoading, error: setupError } = useTransactionSetup<{ branchId?: string }, Record<string, unknown>, QuotationSetupData>({
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
	const customerBranches = setupData?.customerBranches ?? EMPTY_CUSTOMER_BRANCHES;
	const brokers = setupData?.brokers ?? EMPTY_BROKERS;
	const itemGroups = setupData?.itemGroups ?? EMPTY_ITEM_GROUPS;
	const coConfig = setupData?.coConfig;
	const branchAddresses = setupData?.branchAddresses ?? EMPTY_BRANCH_ADDRESSES;

	const fetchItemGroupDetail = React.useCallback(async (itemGroupId: string) => {
		if (!itemGroupId || !/^\d+$/.test(itemGroupId)) {
			throw new Error(`Invalid item group identifier: ${itemGroupId}`);
		}
		const response = await fetchQuotationSetup2(itemGroupId);
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

	const { billingState, shippingState } = useQuotationAddresses({
		branchAddresses,
		customerBranches,
		formValues,
		branchId: branchIdForSetup,
	});

	// Cascade: when the customer changes in create/edit mode, clear the customer-linked address fields.
	const prevCustomerRef = React.useRef<string>("");
	React.useEffect(() => {
		if (mode === "view") return;
		const currentCustomer = formValues.customer != null ? String(formValues.customer) : "";
		if (prevCustomerRef.current !== "" && prevCustomerRef.current !== currentCustomer) {
			setFormValues((prev) => ({ ...prev, billing_address: "", shipping_address: "" }));
			setFormKey((k) => k + 1);
		}
		prevCustomerRef.current = currentCustomer;
	}, [formValues.customer, mode, setFormValues, setFormKey]);

	const {
		lineItems,
		setLineItems,
		replaceItems,
		removeLineItems,
		handleLineFieldChange,
		mapLineToEditable,
		filledLineItems,
		lineItemsValid,
		itemGroupsFromLineItems,
		lineHasAnyData,
	} = useQuotationLineItems({
		mode,
		coConfig,
		billingState,
		shippingState,
		itemGroupCache,
		itemGroupLoading,
		ensureItemGroupData,
		itemGroups,
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

	// ---- From Enquiry (AMCL enquiry flow): prefill lines with the confirmed
	// cost basis and price them as cost × (1 + overhead%) × (1 + margin%) ----
	const [salesEnquiryId, setSalesEnquiryId] = React.useState<string | null>(
		mode === "create" && salesEnquiryIdFromUrl ? salesEnquiryIdFromUrl : null
	);
	const [sourceEnquiryNo, setSourceEnquiryNo] = React.useState<string | null>(null);
	const [enquiryPricingOpen, setEnquiryPricingOpen] = React.useState(mode === "create" && Boolean(salesEnquiryIdFromUrl));
	const [enquiryOverheadPct, setEnquiryOverheadPct] = React.useState("");
	const [enquiryMarginPct, setEnquiryMarginPct] = React.useState("");
	const [enquiryPrefillBusy, setEnquiryPrefillBusy] = React.useState(false);

	// Edit/view of an enquiry-linked quotation: carry the link from the details.
	React.useEffect(() => {
		if (!quotationDetails) return;
		if (quotationDetails.salesEnquiryId) setSalesEnquiryId(String(quotationDetails.salesEnquiryId));
		if (quotationDetails.enquiryNo) setSourceEnquiryNo(String(quotationDetails.enquiryNo));
	}, [quotationDetails]);

	const applyEnquiryPrefill = React.useCallback(async () => {
		if (!salesEnquiryIdFromUrl) return;
		setEnquiryPrefillBusy(true);
		try {
			const { data, error } = await fetchEnquiryLinesForQuotation(salesEnquiryIdFromUrl);
			if (error) throw new Error(error);
			const enquiryHeader = (data?.master?.enquiry ?? {}) as Record<string, unknown>;
			const sourceLines = (data?.data ?? []).filter((line) => line.item_id != null);
			if (!sourceLines.length) {
				throw new Error("This enquiry has no costed item lines to quote (new items must be created first).");
			}

			// Header dialog values are a fallback for lines the enquiry never costed;
			// per-line overhead/margin from the enquiry (Task 1) take priority when present.
			const overheadOverride = Number(enquiryOverheadPct) || 0;
			const marginOverride = Number(enquiryMarginPct) || 0;
			const newLines: EditableLineItem[] = sourceLines.map((line) => {
				const base = line.confirmed_cost_per_unit != null ? Number(line.confirmed_cost_per_unit) : null;
				const overhead = line.overhead_pct ?? overheadOverride;
				const margin = line.margin_pct ?? marginOverride;
				const computedRate =
					base != null
						? Math.round(base * (1 + overhead / 100) * (1 + margin / 100) * 100) / 100
						: line.target_price != null
							? Number(line.target_price)
							: null;
				return {
					id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
					itemGroup: line.item_grp_id != null ? String(line.item_grp_id) : "",
					item: String(line.item_id),
					itemMake: "",
					hsnCode: line.hsn_code ?? "",
					quantity: line.qty != null ? String(line.qty) : "",
					rate: computedRate != null ? String(computedRate) : "",
					uom: line.uom_id != null ? String(line.uom_id) : "",
					discountValue: "",
					remarks: line.remarks ?? "",
					enquiryDtlId: String(line.enquiry_dtl_id),
					costSnapshotId: line.cost_snapshot_id != null ? String(line.cost_snapshot_id) : null,
					baseCost: base,
					overheadPct: base != null ? overhead : null,
					marginPct: base != null ? margin : null,
				};
			});

			const groupIds = [...new Set(newLines.map((l) => l.itemGroup).filter((gid) => gid && /^\d+$/.test(gid)))];
			for (const gid of groupIds) {
				if (!itemGroupCache[gid] && !itemGroupLoading[gid]) {
					void ensureItemGroupData(gid);
				}
			}

			setLineItems(() => [...newLines, createBlankLine()]);

			const partyId = enquiryHeader.party_id != null ? String(enquiryHeader.party_id) : "";
			const enquiryBranch = enquiryHeader.branch_id != null ? String(enquiryHeader.branch_id) : "";
			setFormValues((prev) => ({
				...prev,
				...(partyId ? { customer: partyId } : {}),
				...(enquiryBranch ? { branch: enquiryBranch } : {}),
			}));
			if (enquiryBranch) setLockedBranchId(enquiryBranch);
			setFormKey((k) => k + 1);
			setSourceEnquiryNo(enquiryHeader.enquiry_no != null ? String(enquiryHeader.enquiry_no) : null);

			const unpriced = sourceLines.filter((line) => line.confirmed_cost_per_unit == null).length;
			toast({
				title: `Pre-filled ${newLines.length} line${newLines.length > 1 ? "s" : ""} from the enquiry`,
				description: unpriced
					? `${unpriced} line(s) have no confirmed cost — rates left at the customer's target price.`
					: "Rates computed from the confirmed cost basis. Adjust as needed.",
			});
			setEnquiryPricingOpen(false);
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Unable to pre-fill from enquiry",
				description: error instanceof Error ? error.message : "Please try again.",
			});
			setEnquiryPricingOpen(false);
			setSalesEnquiryId(null);
		} finally {
			setEnquiryPrefillBusy(false);
		}
	}, [
		salesEnquiryIdFromUrl,
		enquiryOverheadPct,
		enquiryMarginPct,
		itemGroupCache,
		itemGroupLoading,
		ensureItemGroupData,
		setLineItems,
		setFormValues,
		setFormKey,
	]);

	const { taxType } = useQuotationTaxCalculations({
		coConfig,
		billingState,
		shippingState,
		setLineItems,
	});

	const totals = React.useMemo(() => calculateTotals(filledLineItems), [filledLineItems]);

	// Fetch quotation details for edit/view mode — simple effect pattern (matches indent page)
	const [detailsRefreshIndex, setDetailsRefreshIndex] = React.useState(0);

	React.useEffect(() => {
		if (mode === "create") {
			setQuotationDetails(null);
			setPageError(null);
			setLoading(false);
			return;
		}

		if (!requestedId) {
			setQuotationDetails(null);
			setPageError("Quotation ID is required to load details.");
			setLoading(false);
			return;
		}

		if (!coId) return;

		let cancelled = false;
		setLoading(true);

		const menuId = getMenuId();

		getQuotationById(requestedId, coId || undefined, menuId || undefined)
			.then((details) => {
				if (cancelled) return;

				setQuotationDetails(details);
				const defaultFormValues = buildDefaultFormValues();
				const nextValues = mapQuotationDetailsToFormValues(details, defaultFormValues);

				const detailsWithBranchId = details as unknown as { branch_id?: unknown; branchId?: unknown };
				const branchIdFromDetails = detailsWithBranchId?.branch_id ?? detailsWithBranchId?.branchId;
				const resolvedBranchValue = (() => {
					if (branchIdFromDetails != null && branchIdFromDetails !== "") return String(branchIdFromDetails);
					if (branchIdFromUrl) return String(branchIdFromUrl);
					const mappedValue = nextValues.branch != null ? String(nextValues.branch) : "";
					return /^\d+$/.test(mappedValue) ? mappedValue : "";
				})();

				if (resolvedBranchValue) {
					nextValues.branch = resolvedBranchValue;
					setLockedBranchId(resolvedBranchValue);
				}

				setInitialValues(nextValues);
				setFormValues(nextValues);
				setFormKey((k) => k + 1);

				const normalizedLines = (details.lines ?? []).map((line) => mapLineToEditable(line));
				replaceItems(normalizedLines);

				setPageError(null);
			})
			.catch((error) => {
				if (cancelled) return;
				const description = error instanceof Error ? error.message : "Unable to load quotation.";
				setQuotationDetails(null);
				setPageError(description);
				toast({ variant: "destructive", title: "Unable to load quotation", description });
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => { cancelled = true; };
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode, requestedId, coId, detailsRefreshIndex, getMenuId, setInitialValues, setFormValues, setFormKey, replaceItems, mapLineToEditable]);

	// Pre-load item group data for existing line items
	React.useEffect(() => {
		if (!quotationDetails?.lines?.length) return;
		const uniqueGroups = new Set(
			quotationDetails.lines
				.map((line) => (line.itemGroup ? String(line.itemGroup) : ""))
				.filter((groupId) => groupId && /^\d+$/.test(groupId)),
		);
		uniqueGroups.forEach((groupId) => ensureItemGroupData(groupId));
	}, [quotationDetails, ensureItemGroupData]);

	const isLineItemsReady = React.useMemo(() => {
		if (mode === "view" || pageError || setupError) return true;
		return lineItemsValid;
	}, [lineItemsValid, mode, pageError, setupError]);

	const selectedCustomerId = formValues.customer != null ? String(formValues.customer) : undefined;

	const {
		customerOptions,
		brokerOptions,
		customerBranchOptions,
		branchAddressOptions,
		itemGroupOptions,
		getItemOptions,
		getMakeOptions,
		getMakeLabel,
		getUomOptions,
		getItemGroupLabel,
		getItemLabel,
		getUomLabel,
		getOptionLabel,
	} = useQuotationSelectOptions({
		customers,
		brokers,
		customerBranches,
		selectedCustomerId,
		branchAddresses,
		itemGroupsFromLineItems,
		itemGroupCache,
	});

	const headerSchema = useQuotationHeaderSchema({
		branchOptions: resolvedBranchOptions,
		customerOptions,
		brokerOptions,
		customerBranchOptions,
		coConfig,
		billingState,
		shippingState,
		taxType,
		mode,
		headerFieldsDisabled,
	});

	const footerSchema = useQuotationFooterSchema({
		coConfig,
		billingState,
		shippingState,
		taxType,
	});

	const canEdit = mode !== "view";

	const lineItemColumns = useQuotationLineItemColumns({
		canEdit,
		itemGroupOptions,
		getItemGroupLabel,
		getItemOptions,
		getItemLabel,
		getMakeOptions,
		getMakeLabel,
		getUomOptions,
		getUomLabel,
		onFieldChange: handleLineFieldChange,
	});

	const handleRefresh = React.useCallback(() => {
		setDetailsRefreshIndex((i) => i + 1);
	}, []);

	const {
		approvalInfo,
		approvalPermissions,
		statusChipProps,
		loading: approvalLoading,
		handleOpen,
		handleCancelDraft,
		handleSendForApproval,
		handleApprove,
		handleReject,
		handleReopen,
	} = useQuotationApproval({
		mode,
		requestedId,
		quotationDetails,
		branchId: branchValue,
		menuId: getMenuId() || "",
		onRefresh: handleRefresh,
	});

	const branchLabel = React.useMemo(() => {
		const value = formValues.branch ?? quotationDetails?.branch;
		return getOptionLabel(resolvedBranchOptions, value) ?? (typeof value === "string" ? value : undefined);
	}, [resolvedBranchOptions, formValues.branch, quotationDetails?.branch, getOptionLabel]);

	const customerLabel = React.useMemo(() => {
		const value = formValues.customer ?? quotationDetails?.customer;
		return getOptionLabel(customerOptions, value) ?? (typeof value === "string" ? value : undefined);
	}, [formValues.customer, quotationDetails?.customer, customerOptions, getOptionLabel]);

	const brokerLabel = React.useMemo(() => {
		const value = formValues.broker ?? quotationDetails?.broker;
		return getOptionLabel(brokerOptions, value) ?? (typeof value === "string" ? value : undefined);
	}, [formValues.broker, quotationDetails?.broker, brokerOptions, getOptionLabel]);

	const billingAddressLabel = React.useMemo(() => {
		const value = formValues.billing_address ?? quotationDetails?.billingAddress;
		return getOptionLabel(customerBranchOptions, value) ?? (typeof value === "string" ? value : undefined);
	}, [formValues.billing_address, quotationDetails?.billingAddress, customerBranchOptions, getOptionLabel]);

	const shippingAddressLabel = React.useMemo(() => {
		const value = formValues.shipping_address ?? quotationDetails?.shippingAddress;
		return getOptionLabel(customerBranchOptions, value) ?? (typeof value === "string" ? value : undefined);
	}, [formValues.shipping_address, quotationDetails?.shippingAddress, customerBranchOptions, getOptionLabel]);

	const statusLabel = React.useMemo(() => statusChipProps?.label ?? quotationDetails?.status, [statusChipProps?.label, quotationDetails?.status]);

	const previewHeader = React.useMemo(
		() => ({
			quotationNo: quotationDetails?.quotationNo,
			quotationDate: (formValues.quotation_date as string) || quotationDetails?.quotationDate,
			expiryDate: (formValues.quotation_expiry_date as string) || quotationDetails?.expiryDate,
			branch: branchLabel,
			customer: customerLabel,
			broker: brokerLabel,
			billingAddress: billingAddressLabel,
			shippingAddress: shippingAddressLabel,
			companyName,
			companyLogo,
			status: statusLabel,
			updatedBy: quotationDetails?.updatedBy,
			updatedAt: quotationDetails?.updatedAt,
			taxType,
			paymentTerms: (formValues.payment_terms as string) || quotationDetails?.paymentTerms,
			deliveryTerms: (formValues.delivery_terms as string) || quotationDetails?.deliveryTerms,
			deliveryDays: (formValues.delivery_days as string) || (quotationDetails?.deliveryDays != null ? String(quotationDetails.deliveryDays) : undefined),
			brokeragePercentage: (formValues.brokerage_percentage as string) || (quotationDetails?.brokeragePercentage != null ? String(quotationDetails.brokeragePercentage) : undefined),
		}),
		[
			quotationDetails, formValues.quotation_date, formValues.quotation_expiry_date,
			formValues.payment_terms, formValues.delivery_terms, formValues.delivery_days,
			formValues.brokerage_percentage, branchLabel, customerLabel, brokerLabel,
			billingAddressLabel, shippingAddressLabel, companyName, companyLogo, statusLabel, taxType,
		],
	);

	const previewItems = React.useMemo(() => {
		return filledLineItems.map((line, index) => {
			const groupLabel = itemGroups.find((grp) => grp.id === line.itemGroup)?.label ?? line.itemGroup ?? "";
			const itemLabel = getItemLabel(line.itemGroup, line.item, line.itemCode);
			const makeLabel = getMakeLabel(line.itemGroup, line.itemMake);
			const uomLabel = getUomLabel(line.itemGroup, line.item, line.uom);
			const displayItem = (() => {
				const parts = [groupLabel, itemLabel].filter(Boolean);
				if (parts.length > 0) return parts.join(" — ");
				return line.item || "-";
			})();
			const discountType = (() => {
				if (line.discountMode === DISCOUNT_MODE.PERCENTAGE) return "%";
				if (line.discountMode === DISCOUNT_MODE.AMOUNT) return "Amt";
				return "";
			})();
			return {
				srNo: index + 1,
				itemGroup: groupLabel || undefined,
				item: displayItem,
				make: makeLabel !== "-" ? makeLabel : undefined,
				hsnCode: line.hsnCode || undefined,
				quantity: line.quantity || "-",
				uom: uomLabel,
				rate: line.rate,
				discountType,
				discountValue: line.discountValue || "",
				amount: typeof line.netAmount === "number" ? line.netAmount : "",
				remarks: line.remarks || "-",
			};
		});
	}, [filledLineItems, getItemLabel, getMakeLabel, getUomLabel, itemGroups]);

	const previewTotals = React.useMemo(
		() => ({
			netAmount: totals.netAmount,
			totalIGST: totals.totalIGST,
			totalCGST: totals.totalCGST,
			totalSGST: totals.totalSGST,
			totalAmount: totals.totalAmount,
			roundOffValue: quotationDetails?.roundOffValue,
		}),
		[totals, quotationDetails?.roundOffValue],
	);

	const previewRemarks = React.useMemo(() => {
		return (
			(formValues.internal_note as string) ||
			quotationDetails?.internalNote ||
			(formValues.footer_notes as string) ||
			quotationDetails?.footerNotes ||
			""
		);
	}, [formValues.internal_note, formValues.footer_notes, quotationDetails?.internalNote, quotationDetails?.footerNotes]);

	const previewTermsCondition = React.useMemo(() => {
		return (formValues.terms_condition as string) || quotationDetails?.termsCondition || "";
	}, [formValues.terms_condition, quotationDetails?.termsCondition]);

	const { metadata } = useTransactionPreview({
		header: previewHeader,
		fields: [
			{ label: "Quotation No", accessor: (header) => header.quotationNo || "Pending" },
			{ label: "Quotation Date", accessor: (header) => header.quotationDate || "-" },
			{ label: "Customer", accessor: (header) => header.customer || "-" },
			{ label: "Status", accessor: (header) => header.status || "-", includeWhen: (header) => Boolean(header.status) },
		],
	});

	const { saving, handleFormSubmit } = useQuotationFormSubmission({
		mode,
		pageError,
		setupError,
		branchAddresses,
		filledLineItems,
		isLineItemsReady,
		requestedId,
		salesEnquiryId,
	});

	const primaryActionLabel = mode === "create" ? "Create" : "Save";
	const handleSaveClick = React.useCallback(() => {
		console.log("[Quotation] handleSaveClick called, formRef.current=", formRef.current, "submit=", formRef.current?.submit);
		if (!formRef.current?.submit) return;
		void formRef.current.submit();
	}, [formRef]);

	const pageTitle = React.useMemo(() => {
		if (mode === "create") return "Create Sales Quotation";
		if (mode === "edit") {
			return quotationDetails?.quotationNo ? `Edit Quotation ${quotationDetails.quotationNo}` : "Edit Sales Quotation";
		}
		return quotationDetails?.quotationNo ? `Sales Quotation ${quotationDetails.quotationNo}` : "Sales Quotation Details";
	}, [mode, quotationDetails?.quotationNo]);

	return (
		<>
		<TransactionWrapper
			title={pageTitle}
			subtitle={`${mode === "create" ? "Create a new sales quotation" : mode === "edit" ? "Edit sales quotation" : "View sales quotation details"}${sourceEnquiryNo ? ` — from enquiry ${sourceEnquiryNo}` : salesEnquiryId ? ` — from enquiry #${salesEnquiryId}` : ""}`}
			metadata={metadata}
			statusChip={statusChipProps}
			backAction={{ onClick: () => router.push("/dashboardportal/sales/quotation") }}
			loading={loading || setupLoading}
			alerts={pageError ? <div role="alert" aria-live="assertive" className="text-red-600">{pageError}</div> : undefined}
			preview={
				<QuotationPreview
					header={previewHeader}
					items={previewItems}
					totals={previewTotals}
					remarks={previewRemarks}
					termsCondition={previewTermsCondition}
				/>
			}
			lineItems={{
				items: lineItems,
				getItemId: (item) => item.id,
				canEdit,
				columns: lineItemColumns,
				placeholder: "Add line items by selecting an item group and item",
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
					<QuotationFooterForm
						schema={footerSchema}
						formKey={formKey}
						initialValues={initialValues}
						mode={mode}
						onSubmit={handleFormSubmit}
						onValuesChange={handleFooterFormValuesChange}
					/>
					<QuotationTotalsDisplay
						totals={totals}
						showGSTBreakdown={Boolean(coConfig?.india_gst)}
						roundOffValue={quotationDetails?.roundOffValue}
					/>
					<QuotationApprovalBar
						approvalInfo={approvalInfo}
						permissions={approvalPermissions}
						loading={approvalLoading}
						onApprove={handleApprove}
						onReject={handleReject}
						onOpen={handleOpen}
						onCancelDraft={handleCancelDraft}
						onReopen={handleReopen}
						onSendForApproval={handleSendForApproval}
					/>
					{mode !== "view" ? (
						<div className="flex justify-end pt-2">
							<Button type="button" onClick={handleSaveClick} disabled={saving || setupLoading || !isLineItemsReady}>
								{saving ? "Processing..." : primaryActionLabel}
							</Button>
						</div>
					) : null}
				</div>
			}
		>
			<QuotationHeaderForm
				schema={headerSchema}
				formKey={formKey}
				initialValues={initialValues}
				mode={mode}
				formRef={formRef}
				onSubmit={handleFormSubmit}
				onValuesChange={handleMainFormValuesChange}
			/>
		</TransactionWrapper>

		<ItemSelectionDialog
			open={itemDialogOpen}
			onOpenChange={setItemDialogOpen}
			coId={coId}
			onConfirm={handleItemDialogConfirm}
			filter="saleable"
			excludeItemIds={excludeItemIds}
			title="Select Items for Quotation"
		/>
		<MuiDialog open={enquiryPricingOpen} onClose={() => setEnquiryPricingOpen(false)} maxWidth="xs" fullWidth>
			<MuiDialogTitle>Price from Enquiry Costing</MuiDialogTitle>
			<MuiDialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
				<MuiTypography variant="body2" color="text.secondary">
					Lines will be pre-filled from the enquiry&apos;s confirmed cost basis. Enter the overhead and margin to
					apply on top of cost — the computed rate stays editable per line (decision Q1: entered per quote).
				</MuiTypography>
				<MuiTextField
					label="Overhead %"
					size="small"
					type="number"
					value={enquiryOverheadPct}
					onChange={(e) => setEnquiryOverheadPct(e.target.value)}
				/>
				<MuiTextField
					label="Margin %"
					size="small"
					type="number"
					value={enquiryMarginPct}
					onChange={(e) => setEnquiryMarginPct(e.target.value)}
				/>
			</MuiDialogContent>
			<MuiDialogActions>
				<MuiButton
					onClick={() => {
						setEnquiryPricingOpen(false);
						setSalesEnquiryId(null);
					}}
				>
					Skip
				</MuiButton>
				<MuiButton variant="contained" onClick={applyEnquiryPrefill} disabled={enquiryPrefillBusy}>
					{enquiryPrefillBusy ? "Loading…" : "Pre-fill Lines"}
				</MuiButton>
			</MuiDialogActions>
		</MuiDialog>
		</>
	);
}
