"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import TransactionWrapper, { type TransactionAction } from "@/components/ui/TransactionWrapper";
import { Button } from "@/components/ui/button";
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
  fetchPOSetup1,
  fetchPOSetup2,
  getPOById,
  type PODetails,
} from "@/utils/poService";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { getPOPrefillData } from "@/utils/priceEnquiryService";
import { toast } from "@/hooks/use-toast";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { useMenuId } from "@/hooks/useMenuId";
import { useCompanyName } from "@/hooks/useCompanyName";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";
import { IndentLineItemsDialog, type IndentLineItem } from "../components/IndentLineItemsDialog";
import { POHeaderForm } from "./components/POHeaderForm";
import { POFooterForm } from "./components/POFooterForm";
import { POTotalsDisplay } from "./components/POTotalsDisplay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { POAdditionalCharges } from "./components/POAdditionalCharges";
import POPreview from "./components/POPreview";
import { usePOLineItemColumns, shouldAllowManualLineEntry } from "./components/POLineItemsTable";
import { usePOFormState } from "./hooks/usePOFormState";
import { usePOAddresses } from "./hooks/usePOAddresses";
import { usePOTaxCalculations } from "./hooks/usePOTaxCalculations";
import { usePOSelectOptions } from "./hooks/usePOSelectOptions";
import { usePOHeaderSchema, usePOFooterSchema } from "./hooks/usePOFormSchemas";
import { usePOFormSubmission } from "./hooks/usePOFormSubmission";
import { usePOApproval } from "./hooks/usePOApproval";
import { usePOLineItems, lineHasAnyData } from "./hooks/usePOLineItems";
import { usePOAdditionalCharges } from "./hooks/usePOAdditionalCharges";
import type { EditableLineItem, ItemGroupCacheEntry, POAdditionalChargeRaw, POSetupData } from "./types/poTypes";

import { mapItemGroupDetailResponse, mapPOSetupResponse, mapPODetailsToFormValues } from "./utils/poMappers";
import { calculateExpectedDate, calculateTotals } from "./utils/poCalculations";
import { buildDefaultFormValues } from "./utils/poFactories";
import {
  EMPTY_BRANCH_ADDRESSES,
  EMPTY_BROKERS,
  EMPTY_EXPENSES,
  EMPTY_ITEM_GROUPS,
  EMPTY_PROJECTS,
  EMPTY_SETUP_PARAMS,
  EMPTY_SUPPLIERS,
  EMPTY_ADDITIONAL_CHARGE_OPTIONS,
  DISCOUNT_MODE,
} from "./utils/poConstants";

// Loading fallback for Suspense
function POPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-100">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

export default function POTransactionPage() {
  return (
    <Suspense fallback={<POPageLoading />}>
      <POTransactionPageContent />
    </Suspense>
  );
}

function POTransactionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const modeParam = (searchParams?.get("mode") || "create").toLowerCase();
  const requestedId = searchParams?.get("id") || "";
  const branchIdFromUrl = searchParams?.get("branch_id") || "";
  const menuIdFromUrl = searchParams?.get("menu_id") || "";
  const fromEnquiry = searchParams?.get("from_enquiry") === "1";
  const enquiryResponseId = searchParams?.get("response_id") || "";

  const mode: MuiFormMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";

  const branchOptions = useBranchOptions();
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches } = useSidebarContext();
  const [isMounted, setIsMounted] = React.useState(false);
  const branchPrefillAppliedRef = React.useRef(false);
  const [lockedBranchId, setLockedBranchId] = React.useState<string | null>(() => (mode !== "create" && branchIdFromUrl ? String(branchIdFromUrl) : null));

  // Prevent hydration mismatch by only enabling after mount
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use shared menu ID hook
  const { getMenuId } = useMenuId({ transactionType: "po", menuIdFromUrl });

  // Use shared company name/logo hooks
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
    handleMainFormValuesChange,
    handleFooterFormValuesChange,
  } = usePOFormState({
    mode,
    buildDefaultFormValues,
    branchIdFromUrl,
  });
  const [poDetails, setPODetails] = React.useState<PODetails | null>(null);
  const [loading, setLoading] = React.useState<boolean>(mode !== "create");
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [indentDialogOpen, setIndentDialogOpen] = React.useState(false);
  const [itemDialogOpen, setItemDialogOpen] = React.useState(false);

  // Memoize branch value to prevent unnecessary recalculations.
  // In edit/view mode, we prefer the branch id passed from the index page
  // (branch_id query param) when the form has not yet been populated.
  const branchValue = React.useMemo(
    () => {
      if (lockedBranchId) return lockedBranchId;
      const fromForm = formValues.branch != null ? String(formValues.branch) : "";
      if (fromForm) return fromForm;
      return branchIdFromUrl ? String(branchIdFromUrl) : "";
    },
    [formValues.branch, branchIdFromUrl, lockedBranchId],
  );

  const resolvedBranchOptions = React.useMemo(() => {
    if (!branchValue) return branchOptions;
    const exists = branchOptions.some((opt) => String(opt.value) === String(branchValue));
    if (exists) return branchOptions;
    const fallbackLabel =
      poDetails?.branchName ||
      branchValue;
    return [...branchOptions, { label: fallbackLabel, value: branchValue }];
  }, [branchOptions, branchValue, poDetails?.branchName]);

  // Memoize branch ID for setup - only changes when branch value actually changes
  const branchIdForSetup = React.useMemo(() => {
    if (!branchValue || !/^\d+$/.test(branchValue)) return undefined;
    return branchValue;
  }, [branchValue]);

  // Memoize setup params - use stable reference to prevent unnecessary API calls
  // Use a ref to store the actual params object to maintain reference stability
  const setupParamsRef = React.useRef<typeof EMPTY_SETUP_PARAMS>(EMPTY_SETUP_PARAMS);
  const setupParams = React.useMemo(() => {
    // If branchId hasn't changed, return the same object reference
    const currentBranchId = branchIdForSetup;
    const prevBranchId = setupParamsRef.current.branchId;

    if (currentBranchId === prevBranchId) {
      return setupParamsRef.current; // Return same object reference
    }

    // BranchId changed - create new params object
    if (!currentBranchId) {
      setupParamsRef.current = EMPTY_SETUP_PARAMS;
      return EMPTY_SETUP_PARAMS;
    }

    setupParamsRef.current = { branchId: currentBranchId };
    return setupParamsRef.current;
  }, [branchIdForSetup]);

  // Memoize the mapper function to prevent unnecessary re-renders
  const memoizedMapPOSetupResponse = React.useCallback(mapPOSetupResponse, []);
  const memoizedFetchPOSetup1 = React.useCallback(fetchPOSetup1, []);

  const setupEnabled = React.useMemo(() => {
    return Boolean(coId && branchIdForSetup);
  }, [coId, branchIdForSetup]);

  // Setup hook - params will change only when branchIdForSetup actually changes
  // No deps needed since params already captures branch changes
  // Only fetches when enabled (both coId and branchIdForSetup are present)
  const { data: setupData, loading: setupLoading, error: setupError } = useTransactionSetup<{ branchId?: string }, Record<string, unknown>, POSetupData>({
    coId: coId || undefined,
    params: setupParams,
    fetcher: memoizedFetchPOSetup1,
    mapData: memoizedMapPOSetupResponse,
    enabled: setupEnabled,
  });

  // Determine if header fields should be disabled (when branch is not selected in create mode)
  // This is the base value — may be overridden after approval state is known
  const headerFieldsDisabledBase = React.useMemo(() => {
    if (mode === "view") return true; // Always disabled in view mode
    if (mode === "edit") return false; // Never disabled in edit mode (data is loaded)
    // In create mode, disable if branch is not selected
    return !branchIdForSetup;
  }, [mode, branchIdForSetup]);

  // Extract data from setupData - use direct access since setupData is memoized in the hook
  const suppliers = setupData?.suppliers ?? EMPTY_SUPPLIERS;
  const brokers = setupData?.brokers ?? EMPTY_BROKERS;
  const projects = setupData?.projects ?? EMPTY_PROJECTS;
  const expenses = setupData?.expenses ?? EMPTY_EXPENSES;
  const itemGroups = setupData?.itemGroups ?? EMPTY_ITEM_GROUPS;
  const coConfig = setupData?.coConfig;
  const manualEntryAllowed = React.useMemo(
    () => shouldAllowManualLineEntry(mode, coConfig?.indent_required),
    [mode, coConfig?.indent_required],
  );
  const branchAddresses = setupData?.branchAddresses ?? EMPTY_BRANCH_ADDRESSES;
  const additionalChargeOptions = setupData?.additionalChargeOptions ?? EMPTY_ADDITIONAL_CHARGE_OPTIONS;

  const fetchItemGroupDetail = React.useCallback(async (itemGroupId: string) => {
    if (!itemGroupId || !/^\d+$/.test(itemGroupId)) {
      throw new Error(`Invalid item group identifier: ${itemGroupId}`);
    }
    const response = await fetchPOSetup2(itemGroupId, coId ? String(coId) : undefined);
    return mapItemGroupDetailResponse(response);
  }, [coId]);

  // Sync lockedBranchId when branch becomes available from URL (SSR -> hydration)
  React.useEffect(() => {
    if (mode === "create") return;
    if (branchPrefillAppliedRef.current) return;
    if (!branchIdFromUrl) return;

    branchPrefillAppliedRef.current = true;
    setLockedBranchId(String(branchIdFromUrl));
  }, [branchIdFromUrl, mode]);

  const handleItemGroupError = React.useCallback((error: unknown) => {
    const description = error instanceof Error ? error.message : "Please try again.";
    toast({
      variant: "destructive",
      title: "Unable to load item options",
      description,
    });
  }, []);

  const { cache: itemGroupCache, loading: itemGroupLoading, ensure: ensureItemGroupData } =
    useDeferredOptionCache<string, ItemGroupCacheEntry>({
      fetcher: fetchItemGroupDetail,
      onError: handleItemGroupError,
    });

  const { supplierBranches, billingState, shippingState, supplierBranchState } = usePOAddresses({
    mode,
    suppliers,
    branchAddresses,
    formValues,
    setFormValues,
    fallbackBillingState: poDetails?.billingState,
    fallbackShippingState: poDetails?.shippingState,
    fallbackSupplierBranchState: poDetails?.supplierState,
  });

  const {
    lineItems,
    setLineItems,
    replaceItems,
    removeLineItems,
    handleLineFieldChange,
    handleIndentItemsConfirm: handleIndentItemsFromHook,
    mapLineToEditable,
    revalidateLoadedLines,
    filledLineItems,
    lineItemsValid,
    itemGroupsFromLineItems,
  } = usePOLineItems({
    mode,
    coConfig,
    supplierBranchState,
    shippingState,
    itemGroupCache,
    itemGroupLoading,
    ensureItemGroupData,
    itemGroups,
    allowManualEntry: manualEntryAllowed,
    poType: String(formValues.po_type ?? "Regular"),
    expenseTypeId: formValues.expense_type ? String(formValues.expense_type) : undefined,
    branchId: branchIdForSetup ?? undefined,
    coId: coId ?? undefined,
    poId: mode === "edit" ? requestedId || undefined : undefined,
  });

  // Additional charges hook
  const {
    charges: additionalCharges,
    addCharge,
    removeCharge,
    updateCharge,
    replaceCharges,
    mapRawToCharges,
    getChargesToSave,
    chargesTotals,
  } = usePOAdditionalCharges({
    mode,
    supplierBranchState,
    shippingState,
    indiaGst: Boolean(coConfig?.india_gst),
  });

  const { taxType } = usePOTaxCalculations({
    mode,
    coConfig,
    supplierBranchState,
    shippingState,
    setLineItems,
  });

  const totals = React.useMemo(() => {
    const advancePercentage = Number(formValues.advance_percentage) || 0;
    return calculateTotals(filledLineItems, advancePercentage);
  }, [filledLineItems, formValues.advance_percentage]);

  // ── Unsaved changes tracking ──────────────────────────────────
  const getComparableLineData = React.useCallback(
    (item: EditableLineItem) => ({
      itemGroup: item.itemGroup,
      item: item.item,
      itemMake: item.itemMake,
      quantity: item.quantity,
      rate: item.rate,
      uom: item.uom,
      discountMode: item.discountMode,
      discountValue: item.discountValue,
      remarks: item.remarks,
      taxPercentage: item.taxPercentage,
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

  const detailsFetchKey = React.useMemo(
    () => [mode, requestedId || "", branchIdForSetup || branchIdFromUrl || "", coId || ""].join("|"),
    [mode, requestedId, branchIdForSetup, branchIdFromUrl, coId],
  );

  const lastDetailsKeyRef = React.useRef<string | null>(null);
  const detailsFetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (lastDetailsKeyRef.current !== detailsFetchKey) {
      lastDetailsKeyRef.current = detailsFetchKey;
      detailsFetchedRef.current = false;
    }
  }, [detailsFetchKey]);

  React.useEffect(() => {
    if (mode === "create") {
      setPODetails(null);
      setPageError(null);
      setLoading(false);
      return;
    }

    if (!requestedId) {
      setPODetails(null);
      setPageError("Purchase order id is required to load details.");
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
        const details = await getPOById(requestedId, coId || undefined, getMenuId() || undefined);
        if (cancelled) return;

        setPODetails(details);
        const defaultFormValues = buildDefaultFormValues();
        const nextValues = mapPODetailsToFormValues(details, defaultFormValues);

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

        // Populate validation state for all loaded lines so quantity rules
        // are enforced immediately when the user edits in this mode.
        revalidateLoadedLines(normalizedLines, {
          branchId: resolvedBranchValue || undefined,
          coId: coId || undefined,
          expenseTypeId: nextValues.expense_type ? String(nextValues.expense_type) : undefined,
          poType: nextValues.po_type ? String(nextValues.po_type) : "Regular",
        });

        // Set baseline for unsaved changes tracking
        setBaseline(nextValues, normalizedLines.filter(lineHasAnyData));

        // Map additional charges if present
        const rawAdditionalCharges = (details as unknown as { additionalCharges?: POAdditionalChargeRaw[] })?.additionalCharges ?? [];
        if (rawAdditionalCharges.length > 0) {
          const mappedCharges = mapRawToCharges(rawAdditionalCharges);
          replaceCharges(mappedCharges);
        }

        setPageError(null);
      } catch (error) {
        if (cancelled) return;
        const description = error instanceof Error ? error.message : "Unable to load purchase order.";
        setPODetails(null);
        setPageError(description);
        toast({
          variant: "destructive",
          title: "Unable to load purchase order",
          description,
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [
    mode,
    requestedId,
    coId,
    getMenuId,
    setInitialValues,
    setFormValues,
    bumpFormKey,
    replaceItems,
    mapLineToEditable,
    revalidateLoadedLines,
    mapRawToCharges,
    replaceCharges,
    setBaseline,
    setupEnabled,
    setupLoading,
    setupData,
    branchIdFromUrl,
    branchValue,
  ]);

  // ── Enquiry prefill: when coming from price enquiry comparison page ──
  const enquiryPrefillAppliedRef = React.useRef(false);
  React.useEffect(() => {
    if (!fromEnquiry || !enquiryResponseId || mode !== "create") return;
    if (enquiryPrefillAppliedRef.current) return;
    // Do NOT gate on setup here: setup only fetches once a branch is known,
    // and in the from-enquiry flow the branch comes from this prefill —
    // gating on setup deadlocks and the prefill never fires. Setting the
    // branch below triggers the setup fetch, and option lists resolve the
    // already-set values when they arrive.

    enquiryPrefillAppliedRef.current = true;

    let cancelled = false;
    const fetchEnquiryPrefill = async () => {
      setLoading(true);
      try {
        // The service validates the payload with Zod at the boundary.
        const prefillData = await getPOPrefillData(enquiryResponseId);
        if (cancelled) return;

        const prefill = prefillData as unknown as Record<string, unknown>;
        if (!prefill) throw new Error("No prefill data returned");

        const defaultValues = buildDefaultFormValues();
        const nextValues = {
          ...defaultValues,
          branch: prefill.branch_id != null ? String(prefill.branch_id) : defaultValues.branch,
          supplier: prefill.supplier_id != null ? String(prefill.supplier_id) : "",
          supplier_branch: prefill.supplier_branch_id != null ? String(prefill.supplier_branch_id) : "",
          credit_term: prefill.credit_days != null ? Number(prefill.credit_days) : undefined,
          delivery_timeline: prefill.delivery_days != null ? Number(prefill.delivery_days) : undefined,
          terms_conditions: (prefill.terms_conditions ?? "") as string,
          expense_type: prefill.expense_type_id != null ? String(prefill.expense_type_id) : "",
          project: prefill.project_id != null ? String(prefill.project_id) : "",
          price_enquiry_id: String(prefill.enquiry_id ?? ""),
        };

        if (nextValues.branch) {
          setLockedBranchId(nextValues.branch);
        }

        setInitialValues(nextValues);
        setFormValues(nextValues);
        bumpFormKey();

        const rawItems = Array.isArray(prefill.items) ? (prefill.items as Record<string, unknown>[]) : [];
        const mappedLines = rawItems.map((item) => ({
          id: `enq-${Math.random().toString(36).slice(2, 10)}`,
          indentDtlId: item.indent_dtl_id != null ? String(item.indent_dtl_id) : undefined,
          itemGroup: item.item_grp_id != null ? String(item.item_grp_id) : "",
          item: item.item_id != null ? String(item.item_id) : "",
          itemCode: (item.item_code ?? "") as string,
          hsnCode: (item.hsn_code ?? "") as string,
          itemMake: item.item_make_id != null ? String(item.item_make_id) : "",
          quantity: item.qty != null ? Number(item.qty) : 0,
          rate: item.rate != null ? Number(item.rate) : 0,
          uom: item.uom_id != null ? String(item.uom_id) : "",
          discountMode: item.discount_mode != null ? Number(item.discount_mode) : 0,
          discountValue: item.discount_value != null ? Number(item.discount_value) : 0,
          discountAmount: item.discount_amount != null ? Number(item.discount_amount) : 0,
          amount: 0,
          remarks: "",
        }));

        // Hydrate the item-group cache so the grid/preview resolve
        // "code — name" item labels and uom names (same as loaded-PO lines).
        new Set(mappedLines.map((l) => l.itemGroup).filter((g) => /^\d+$/.test(g))).forEach((groupId) => {
          void ensureItemGroupData(groupId);
        });

        replaceItems(mappedLines as unknown as EditableLineItem[]);
        setPageError(null);

        toast({
          title: "Enquiry data loaded",
          description: "Purchase order has been pre-filled from the selected price enquiry response.",
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load enquiry prefill data";
        toast({ variant: "destructive", title: "Enquiry prefill error", description: message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchEnquiryPrefill();
    return () => { cancelled = true; };
  }, [
    fromEnquiry, enquiryResponseId, mode,
    setInitialValues, setFormValues, bumpFormKey, replaceItems, ensureItemGroupData, coId, toast,
  ]);

  React.useEffect(() => {
    if (!poDetails?.lines?.length) return;
    const uniqueGroups = new Set(
      poDetails.lines
        .map((line) => (line.itemGroup ? String(line.itemGroup) : ""))
        .filter((groupId) => groupId && /^\d+$/.test(groupId)),
    );
    uniqueGroups.forEach((groupId) => {
      ensureItemGroupData(groupId);
    });
  }, [poDetails, ensureItemGroupData]);

  const isLineItemsReady = React.useMemo(() => {
    if (mode === "view" || pageError || setupError) return true;
    return lineItemsValid;
  }, [lineItemsValid, mode, pageError, setupError]);

  const expectedDate = React.useMemo(() => {
    const dateStr = String(formValues.date ?? "");
    const timeline = Number(formValues.delivery_timeline) || 0;
    return calculateExpectedDate(dateStr, timeline);
  }, [formValues.date, formValues.delivery_timeline]);


  // Update computed fields in formValues when dependencies change
  React.useEffect(() => {
    setFormValues((prev) => {
      // Only update if values actually changed to prevent unnecessary re-renders
      if (
        prev.expected_date === expectedDate &&
        prev.billing_state === (billingState || "") &&
        prev.shipping_state === (shippingState || "") &&
        prev.tax_type === taxType
      ) {
        return prev;
      }
      return {
        ...prev,
        expected_date: expectedDate,
        billing_state: billingState || "",
        shipping_state: shippingState || "",
        tax_type: taxType,
      };
    });
  }, [expectedDate, billingState, shippingState, taxType]);

  // Handle indent selection - just open the dialog, selection happens inside
  const handleIndentSelect = React.useCallback(() => {
    setIndentDialogOpen(true);
  }, []);

  const handleIndentItemsConfirm = React.useCallback(
    (selectedItems: IndentLineItem[]) => {
      handleIndentItemsFromHook(selectedItems);

      if (selectedItems.length > 0 && selectedItems[0].expense_type_id) {
        setFormValues((prev) => ({
          ...prev,
          expense_type: String(selectedItems[0].expense_type_id),
        }));
      }

      setIndentDialogOpen(false);
    },
    [handleIndentItemsFromHook, setIndentDialogOpen],
  );

  // Handle items confirmed from the item selection dialog
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
      if (mode === "view") return;
      if (!items.length) {
        toast({
          variant: "destructive",
          title: "No items added",
          description: "Selected items are already on this purchase order.",
        });
        return;
      }

      const newLines: EditableLineItem[] = items.map((item) => ({
        id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
        itemGroup: String(item.item_grp_id),
        item: String(item.item_id),
        itemCode: item.full_item_code || item.item_code,
        itemMake: "",
        quantity: "",
        rate: "",
        uom: String(item.uom_id),
        discountValue: "",
        remarks: "",
        hsnCode: item.hsn_code ?? "",
        taxPercentage: item.tax_percentage ?? undefined,
      }));

      const groupIds = [...new Set(items.map((item) => String(item.item_grp_id)))];
      for (const gid of groupIds) {
        if (!itemGroupCache[gid] && !itemGroupLoading[gid]) {
          void ensureItemGroupData(gid);
        }
      }

      setLineItems((prev) => {
        const filledLines = prev.filter((line) => lineHasAnyData(line));
        return [...filledLines, ...newLines];
      });

      // Run PO validation against the newly added lines so min/max PO qty,
      // MOQ multiples, and any blocking errors get populated. Errors surface
      // both inline (rowError) and as a destructive toast via the callback.
      revalidateLoadedLines(newLines, {
        branchId: branchIdForSetup ?? undefined,
        coId: coId ?? undefined,
        expenseTypeId: formValues.expense_type ? String(formValues.expense_type) : undefined,
        poType: String(formValues.po_type ?? "Regular"),
        onValidationError: (line, errors) => {
          toast({
            variant: "destructive",
            title: "Item validation failed",
            description: `${line.itemCode || "Item"}: ${errors.join(" ")}`,
          });
        },
      });

      toast({
        title: `Added ${newLines.length} item${newLines.length > 1 ? "s" : ""}`,
        description: "Fill in quantity, rate and other details.",
      });
    },
    [
      mode,
      setLineItems,
      itemGroupCache,
      itemGroupLoading,
      ensureItemGroupData,
      revalidateLoadedLines,
      branchIdForSetup,
      coId,
      formValues.expense_type,
      formValues.po_type,
    ]
  );

  // Line item field handlers and columns
  const {
    supplierOptions,
    brokerOptions,
    supplierBranchOptions,
    branchAddressOptions,
    projectOptions,
    expenseOptions,
    getMakeOptions,
    getUomOptions,
    getItemLabel,
    getMakeLabel,
    getUomLabel,
    getLastPurchaseInfo,
    getOptionLabel,
  } = usePOSelectOptions({
    suppliers,
    brokers,
    supplierBranches,
    branchAddresses,
    projects,
    expenses,
    itemGroupsFromLineItems,
    itemGroupCache,
  });

  // For Open PO, Capital and Overhaul are invalid expense combinations — filter them out
  const filteredExpenseOptions = React.useMemo(() => {
    const currentPoType = String(formValues.po_type ?? "Regular");
    if (currentPoType === "Open") {
      return expenseOptions.filter((opt) => !["Capital", "Overhaul"].includes(opt.label));
    }
    return expenseOptions;
  }, [expenseOptions, formValues.po_type]);

  // If the user switches to Open PO and the currently selected expense type is Capital/Overhaul, clear it
  React.useEffect(() => {
    if (String(formValues.po_type ?? "") !== "Open") return;
    if (!formValues.expense_type) return;
    const selectedExpense = expenseOptions.find((opt) => String(opt.value) === String(formValues.expense_type));
    if (selectedExpense && ["Capital", "Overhaul"].includes(selectedExpense.label)) {
      setFormValues((prev) => ({ ...prev, expense_type: "" }));
    }
  }, [formValues.po_type, formValues.expense_type, expenseOptions, setFormValues]);

  // Approval hook must be called before canEdit so we can gate editing by approval status
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
    handleClone,
  } = usePOApproval({
    mode,
    requestedId,
    formValues,
    poDetails,
    coId,
    getMenuId,
    setPODetails,
  });

  // ── Reject dialog ─────────────────────────────────────────────
  const {
    rejectDialogOpen,
    rejectReason,
    setRejectReason,
    openRejectDialog,
    handleRejectConfirm,
    handleRejectCancel,
  } = useRejectDialog(handleReject);

  // Reset baseline when poDetails changes (initial load or post-approval refresh)
  React.useEffect(() => {
    if (!poDetails || mode === "create") return;
    const timer = setTimeout(() => resetBaseline(), 0);
    return () => clearTimeout(timer);
  }, [poDetails, mode, resetBaseline]);

  // Editing is allowed only when not in view mode AND the status permits saving
  // (e.g. Approved POs have canSave = false, so they become view-only even in edit mode)
  const canEditByMode = mode !== "view";
  const canSave = canEditByMode && approvalPermissions.canSave !== false;
  const canEdit = canSave;

  // Header fields are disabled in view mode, or when approval status prevents editing (e.g. Approved)
  const headerFieldsDisabled = headerFieldsDisabledBase || !canEdit;

  const headerSchema = usePOHeaderSchema({
    branchOptions: resolvedBranchOptions,
    supplierOptions,
    brokerOptions,
    supplierBranchOptions,
    branchAddressOptions,
    projectOptions,
    expenseOptions: filteredExpenseOptions,
    coConfig,
    billingState,
    shippingState,
    taxType,
    expectedDate,
    mode,
    headerFieldsDisabled,
    hasLineItems: filledLineItems.length > 0,
  });

  const footerSchema = usePOFooterSchema({
    coConfig,
    billingState,
    shippingState,
    taxType,
  });

  // Required header fields must be filled before the user can interact with line items.
  // In edit/view mode this is always satisfied (data is already saved).
  const headerFilled = React.useMemo(() => {
    if (mode !== "create") return true;
    return Boolean(
      formValues.branch &&
      formValues.supplier &&
      formValues.supplier_branch &&
      formValues.expense_type &&
      formValues.po_type,
    );
  }, [mode, formValues.branch, formValues.supplier, formValues.supplier_branch, formValues.expense_type, formValues.po_type]);

  const lineItemsCanEdit = canEdit && headerFilled;

  const lineItemColumns = usePOLineItemColumns({
    canEdit: lineItemsCanEdit,
    getItemLabel,
    getUomOptions,
    getUomLabel,
    onFieldChange: handleLineFieldChange,
    getLastPurchaseInfo,
  });

  const branchLabel = React.useMemo(() => {
    const value = formValues.branch ?? poDetails?.branch;
    return getOptionLabel(resolvedBranchOptions, value) ?? poDetails?.branchName ?? (typeof value === "string" ? value : undefined);
  }, [resolvedBranchOptions, formValues.branch, poDetails?.branch, poDetails?.branchName, getOptionLabel]);

  const supplierLabel = React.useMemo(() => {
    const value = formValues.supplier ?? poDetails?.supplier;
    return getOptionLabel(supplierOptions, value) ?? (typeof value === "string" ? value : undefined);
  }, [formValues.supplier, poDetails?.supplier, supplierOptions, getOptionLabel]);

  const supplierBranchLabel = React.useMemo(() => {
    const value = formValues.supplier_branch ?? poDetails?.supplierBranch;
    return getOptionLabel(supplierBranchOptions, value) ?? (typeof value === "string" ? value : undefined);
  }, [formValues.supplier_branch, poDetails?.supplierBranch, supplierBranchOptions, getOptionLabel]);

  const billingAddressLabel = React.useMemo(() => {
    const value = formValues.billing_address ?? poDetails?.billingAddress;
    return getOptionLabel(branchAddressOptions, value) ?? (typeof value === "string" ? value : undefined);
  }, [formValues.billing_address, poDetails?.billingAddress, branchAddressOptions, getOptionLabel]);

  const shippingAddressLabel = React.useMemo(() => {
    const value = formValues.shipping_address ?? poDetails?.shippingAddress;
    return getOptionLabel(branchAddressOptions, value) ?? (typeof value === "string" ? value : undefined);
  }, [formValues.shipping_address, poDetails?.shippingAddress, branchAddressOptions, getOptionLabel]);

  const projectLabel = React.useMemo(() => {
    const value = formValues.project ?? poDetails?.project;
    return getOptionLabel(projectOptions, value) ?? (typeof value === "string" ? value : undefined);
  }, [formValues.project, poDetails?.project, projectOptions, getOptionLabel]);

  const expenseLabel = React.useMemo(() => {
    const value = formValues.expense_type ?? poDetails?.expenseType;
    return getOptionLabel(expenseOptions, value) ?? (typeof value === "string" ? value : undefined);
  }, [formValues.expense_type, poDetails?.expenseType, expenseOptions, getOptionLabel]);

  const statusLabel = React.useMemo(() => statusChipProps?.label ?? poDetails?.status, [statusChipProps?.label, poDetails?.status]);

  const previewHeader = React.useMemo(
    () => ({
      poNo: poDetails?.poNo,
      poDate: (formValues.date as string) || poDetails?.poDate,
      expectedDate,
      branch: branchLabel,
      supplier: supplierLabel,
      supplierBranch: supplierBranchLabel,
      billingAddress: billingAddressLabel,
      shippingAddress: shippingAddressLabel,
      project: projectLabel,
      expenseType: expenseLabel,
      companyName,
      companyLogo,
      contactPerson: (formValues.contact_person as string) || poDetails?.contactPerson,
      contactNo: (formValues.contact_no as string) || poDetails?.contactNo,
      status: statusLabel,
      updatedBy: poDetails?.updatedBy,
      updatedAt: poDetails?.updatedAt,
      taxType: (formValues.tax_type as string) || poDetails?.taxType,
      coId: coId,
      branchId: branchIdForSetup,
    }),
    [
      poDetails?.poNo,
      poDetails?.poDate,
      poDetails?.contactPerson,
      poDetails?.contactNo,
      poDetails?.updatedBy,
      poDetails?.updatedAt,
      poDetails?.taxType,
      formValues.date,
      formValues.contact_person,
      formValues.contact_no,
      formValues.tax_type,
      branchLabel,
      supplierLabel,
      supplierBranchLabel,
      billingAddressLabel,
      shippingAddressLabel,
      projectLabel,
      expenseLabel,
      companyName,
      companyLogo,
      expectedDate,
      statusLabel,
      coId,
      branchIdForSetup,
    ],
  );

  const previewItems = React.useMemo(() => {
    return filledLineItems.map((line, index) => {
      const itemLabel = getItemLabel(line.itemGroup, line.item, line.itemCode);
      // Extract item name only (after " — " separator)
      const sepIdx = itemLabel.indexOf(" — ");
      const itemName = sepIdx >= 0 ? itemLabel.substring(sepIdx + 3) : itemLabel;
      const uomOptions = getUomOptions(line.itemGroup, line.item);
      const uomLabel = uomOptions.find((opt) => opt.value === line.uom)?.label ?? line.uom ?? "-";
      // Discount type label
      const discountType = (() => {
        if (line.discountMode === DISCOUNT_MODE.PERCENTAGE) return "%";
        if (line.discountMode === DISCOUNT_MODE.AMOUNT) return "Amt";
        return "";
      })();
      return {
        srNo: index + 1,
        indentNo: line.indentNo || undefined,
        itemCode: line.itemCode || "-",
        item: itemName || "-",
        quantity: line.quantity || "-",
        uom: uomLabel,
        rate: line.rate,
        discountType,
        discountValue: line.discountValue || "",
        discountAmount: typeof line.discountAmount === "number" ? line.discountAmount : "",
        amount: typeof line.amount === "number" ? line.amount : line.amount ?? "",
        remarks: line.remarks || "-",
      };
    });
  }, [filledLineItems, getItemLabel, getUomOptions]);

  const previewTotals = React.useMemo(
    () => {
      const chargesBase = chargesTotals?.baseAmount ?? 0;
      const chargesIGST = chargesTotals?.totalIGST ?? 0;
      const chargesCGST = chargesTotals?.totalCGST ?? 0;
      const chargesSGST = chargesTotals?.totalSGST ?? 0;
      const chargesTax = chargesTotals?.totalTax ?? 0;
      return {
        netAmount: totals.netAmount,
        additionalCharges: chargesBase,
        totalIGST: totals.totalIGST + chargesIGST,
        totalCGST: totals.totalCGST + chargesCGST,
        totalSGST: totals.totalSGST + chargesSGST,
        totalAmount: totals.totalAmount + chargesBase + chargesTax,
        advanceAmount: totals.advanceAmount,
        advancePercentage:
          formValues.advance_percentage != null && formValues.advance_percentage !== ""
            ? Number(formValues.advance_percentage)
            : poDetails?.advancePercentage,
      };
    },
    [totals, chargesTotals, formValues.advance_percentage, poDetails?.advancePercentage],
  );

  const previewAdditionalCharges = React.useMemo(() => {
    return additionalCharges
      .filter((c) => c.additional_charges_id > 0 && c.net_amount > 0)
      .map((c) => ({
        name: c.additional_charges_name,
        qty: c.qty,
        rate: c.rate,
        amount: c.net_amount,
        taxPct: c.tax_pct,
        taxAmount: c.tax_amount,
        remarks: c.remarks || undefined,
      }));
  }, [additionalCharges]);

  const previewRemarks = React.useMemo(() => {
    return (
      (formValues.internal_note as string) ||
      poDetails?.internalNote ||
      (formValues.footer_note as string) ||
      poDetails?.footerNote ||
      ""
    );
  }, [formValues.internal_note, formValues.footer_note, poDetails?.internalNote, poDetails?.footerNote]);

  const { metadata } = useTransactionPreview({
    header: previewHeader,
    fields: [
      { label: "PO No", accessor: (header) => header.poNo || "Pending" },
      { label: "PO Date", accessor: (header) => header.poDate || "-" },
      { label: "Supplier", accessor: (header) => header.supplier || "-" },
      { label: "Status", accessor: (header) => header.status || "-", includeWhen: (header) => Boolean(header.status) },
    ],
  });

  const {
    saving,
    handleFormSubmit,
  } = usePOFormSubmission({
    mode,
    pageError,
    setupError,
    branchAddresses,
    filledLineItems,
    isLineItemsReady,
    requestedId,
    getChargesToSave,
    formValues,
  });

  // ── Unified primary actions ──────────────────────────────────
  const primaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
    if (pageError || setupError) return undefined;

    // Create mode
    if (mode === "create") {
      return [{
        label: "Create Purchase Order",
        onClick: () => formRef.current?.submit(),
        disabled: saving || !lineItemsValid || setupLoading,
        loading: saving,
      }];
    }

    if (!poDetails) return undefined;

    // Edit mode with unsaved changes
    if (mode === "edit" && approvalPermissions.canSave && hasUnsavedChanges) {
      return [{
        label: "Save Changes",
        onClick: () => formRef.current?.submit(),
        disabled: saving || !lineItemsValid || setupLoading,
        loading: saving,
      }];
    }

    // View mode, or edit without changes -> approval buttons
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
        onClone: handleClone,
      },
      loading: approvalLoading,
      disabled: saving || loading || setupLoading,
    });

    return approvalActions.length ? approvalActions : undefined;
  }, [
    mode, pageError, setupError, saving, lineItemsValid, setupLoading,
    formRef, poDetails, approvalPermissions, hasUnsavedChanges,
    approvalInfo, approvalLoading, loading,
    handleOpen, handleCancelDraft, handleReopen, handleSendForApproval,
    handleApprove, openRejectDialog, handleViewApprovalLog, handleClone,
  ]);

  // ── Secondary actions (Edit / Cancel in top-right) ─────────
  const secondaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
    if (!requestedId || pageError) return undefined;
    const actions: TransactionAction[] = [];
    if (mode === "view" && approvalPermissions.canSave) {
      actions.push({
        label: "Edit",
        variant: "secondary",
        onClick: () => router.replace(
          `/dashboardportal/procurement/purchaseOrder/createPO?mode=edit&id=${encodeURIComponent(requestedId)}&branch_id=${encodeURIComponent(branchValue)}&menu_id=${encodeURIComponent(menuIdFromUrl)}`,
        ),
      });
    }
    if (mode === "edit") {
      actions.push({
        label: "Cancel",
        variant: "ghost",
        onClick: () => router.replace(
          `/dashboardportal/procurement/purchaseOrder/createPO?mode=view&id=${encodeURIComponent(requestedId)}&branch_id=${encodeURIComponent(branchValue)}&menu_id=${encodeURIComponent(menuIdFromUrl)}`,
        ),
      });
    }
    return actions.length ? actions : undefined;
  }, [mode, requestedId, router, pageError, approvalPermissions.canSave, branchValue, menuIdFromUrl]);

  const pageTitle = React.useMemo(() => {
    if (mode === "create") return "Create Purchase Order";
    if (mode === "edit") {
      return poDetails?.poNo ? `Edit PO ${poDetails.poNo}` : "Edit Purchase Order";
    }
    return poDetails?.poNo ? `Purchase Order ${poDetails.poNo}` : "Purchase Order Details";
  }, [mode, poDetails?.poNo]);

  return (
    <>
    <TransactionWrapper
      title={pageTitle}
      subtitle={mode === "create" ? "Create a new purchase order" : mode === "edit" ? "Edit purchase order" : "View purchase order details"}
      metadata={metadata}
      statusChip={statusChipProps}
      backAction={{ onClick: () => router.push("/dashboardportal/procurement/purchaseOrder") }}
      primaryActions={primaryActions}
      secondaryActions={secondaryActions}
      actionsAfterFooter
      loading={loading || setupLoading}
      alerts={pageError ? <div role="alert" aria-live="assertive" className="text-red-600">{pageError}</div> : undefined}
      preview={
        <POPreview
          header={previewHeader}
          items={previewItems}
          totals={previewTotals}
          additionalCharges={previewAdditionalCharges}
          remarks={previewRemarks}
        />
      }
      lineItems={{
        items: lineItems,
        getItemId: (item) => item.id,
        canEdit: lineItemsCanEdit,
        columns: lineItemColumns,
        onRemoveSelected: (ids: string[]) => {
          if (mode === "view" || !ids.length) return;
          removeLineItems(ids);
        },
        placeholder: !headerFilled
          ? "Fill in Branch, Supplier, Expense Type and PO Type to add line items"
          : manualEntryAllowed
            ? "Add line items by selecting from indent or manually entering items"
            : "Select items from an indent to populate the PO line items",
        selectionColumnWidth: "28px",
        headerAction: lineItemsCanEdit && manualEntryAllowed ? (
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
          <POFooterForm
            schema={footerSchema}
            formKey={formKey}
            initialValues={initialValues}
            mode={mode}
            onSubmit={handleFormSubmit}
            onValuesChange={handleFooterFormValuesChange}
          />
          <POAdditionalCharges
            charges={additionalCharges}
            options={[...additionalChargeOptions]}
            canEdit={canEdit}
            onAddCharge={addCharge}
            onRemoveCharge={removeCharge}
            onChargeChange={updateCharge}
          />
          <POTotalsDisplay totals={totals} showGSTBreakdown={Boolean(coConfig?.india_gst)} chargesTotals={chargesTotals} />
        </div>
      }
    >
      <POHeaderForm
        schema={headerSchema}
        formKey={formKey}
        initialValues={initialValues}
        mode={mode}
        formRef={formRef}
        onSubmit={handleFormSubmit}
        onValuesChange={handleMainFormValuesChange}
        showIndentButton={canEdit}
        onIndentSelect={handleIndentSelect}
        indentButtonDisabled={!isMounted || !selectedBranches || selectedBranches.length === 0 || !headerFilled}
      />

      <IndentLineItemsDialog
        open={indentDialogOpen}
        onOpenChange={setIndentDialogOpen}
        onConfirm={handleIndentItemsConfirm}
        branchId={branchValue || undefined}
        coId={coId || undefined}
        poDate={(formValues.date as string) || undefined}
      />
    </TransactionWrapper>

    {/* ── Item Selection Dialog ─────────────────────────────────────── */}
    <ItemSelectionDialog
      open={itemDialogOpen}
      onOpenChange={setItemDialogOpen}
      coId={coId}
      onConfirm={handleItemDialogConfirm}
      filter="purchaseable"
      excludeItemIds={excludeItemIds}
      title="Select Items for Purchase Order"
    />

    {/* ── Reject Confirmation Dialog ────────────────────────────────── */}
    <Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open) handleRejectCancel(); }}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Reject Document</DialogTitle>
          <DialogDescription>Please provide a reason for rejecting this document.</DialogDescription>
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

