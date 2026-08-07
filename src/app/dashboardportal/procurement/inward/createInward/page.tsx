"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import TransactionWrapper, { type TransactionAction } from "@/components/ui/TransactionWrapper";
import { Button } from "@/components/ui/button";
import {
	useDeferredOptionCache,
	useTransactionSetup,
	useTransactionPreview,
	ItemSelectionDialog,
	type SelectedItem,
} from "@/components/ui/transaction";
import { useBranchOptions } from "@/utils/branchUtils";
import {
	fetchInwardSetup1,
	fetchInwardSetup2,
	getInwardById,
	createInward,
	updateInward,
	cancelInward,
	type InwardDetails,
} from "@/utils/inwardService";
import { toast } from "@/hooks/use-toast";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import type { MuiFormMode } from "@/components/ui/muiform";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

// Types
import type { EditableLineItem, InwardSetupData, ItemGroupCacheEntry, POLineItem } from "./types/inwardTypes";

// Utils
import { EMPTY_SUPPLIERS, EMPTY_ITEM_GROUPS, EMPTY_SETUP_PARAMS } from "./utils/inwardConstants";
import { buildDefaultFormValues, lineHasAnyData, generateLineId } from "./utils/inwardFactories";
import { mapInwardSetupResponse, mapItemGroupDetailResponse, mapInwardDetailsToFormValues } from "./utils/inwardMappers";

// Hooks
import { useInwardFormState } from "./hooks/useInwardFormState";
import { useInwardLineItems } from "./hooks/useInwardLineItems";
import { useInwardFormSchema } from "./hooks/useInwardFormSchemas";
import { useInwardSelectOptions } from "./hooks/useInwardSelectOptions";

// Components
import { InwardHeaderForm } from "./components/InwardHeaderForm";
import InwardPreview from "./components/InwardPreview";
import { useInwardLineItemColumns } from "./components/InwardLineItemsTable";
import { POLineItemsDialog } from "./components/POLineItemsDialog";

// Loading fallback for Suspense
function InwardPageLoading() {
	return (
		<div className="flex items-center justify-center min-h-100">
			<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
		</div>
	);
}

export default function InwardTransactionPage() {
	return (
		<Suspense fallback={<InwardPageLoading />}>
			<InwardTransactionPageContent />
		</Suspense>
	);
}

function InwardTransactionPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();

	const modeParam = (searchParams?.get("mode") || "create").toLowerCase();
	const requestedId = searchParams?.get("id") || "";
	const menuIdFromUrl = searchParams?.get("menu_id") || "";

	const mode: MuiFormMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";

	const branchOptions = useBranchOptions();
	const { coId } = useSelectedCompanyCoId();
	const companyLogo = useCompanyLogo(coId);
	const { availableMenus, menuItems: sidebarMenuItems } = useSidebarContext();

	// Get menu_id from URL, or lookup from menuItems based on current path
	const getMenuId = React.useCallback((): string => {
		if (menuIdFromUrl) return menuIdFromUrl;

		if (availableMenus && availableMenus.length > 0) {
			const currentPath = pathname?.toLowerCase() || "";

			// First, try exact path match
			const matchingMenu = availableMenus.find((item) => {
				if (!item.menu_path) return false;
				const menuPath = item.menu_path.toLowerCase();
				return currentPath === menuPath || currentPath.startsWith(menuPath + "/");
			});
			if (matchingMenu?.menu_id) return String(matchingMenu.menu_id);

			// Second, try to find by "inward" in path or name
			const inwardMenu = availableMenus.find((item) => {
				const path = (item.menu_path || "").toLowerCase();
				const name = (item.menu_name || "").toLowerCase();
				return path.includes("inward") || path.includes("/procurement/inward") || name.includes("inward");
			});
			if (inwardMenu?.menu_id) return String(inwardMenu.menu_id);
		}

		// Fallback to sidebarMenuItems
		if (sidebarMenuItems && sidebarMenuItems.length > 0) {
			const inwardMenu = sidebarMenuItems.find((item) => {
				const path = (item.menu_path || "").toLowerCase();
				const name = (item.menu_name || "").toLowerCase();
				return path.includes("inward") || path.includes("/procurement/inward") || name.includes("inward");
			});
			if (inwardMenu?.menu_id) return String(inwardMenu.menu_id);
		}

		// Try localStorage
		if (typeof window !== "undefined" && pathname) {
			try {
				const storedMenuItems = localStorage.getItem("sidebar_menuItems");
				if (storedMenuItems) {
					const menuItems = JSON.parse(storedMenuItems) as Array<{ menu_id?: number; menu_path?: string; menu_name?: string }> | null;
					if (Array.isArray(menuItems)) {
						const inwardMenu = menuItems.find((item) => {
							const path = (item.menu_path || "").toLowerCase();
							const name = (item.menu_name || "").toLowerCase();
							return path.includes("inward") || path.includes("/procurement/inward") || name.includes("inward");
						});
						if (inwardMenu?.menu_id) return String(inwardMenu.menu_id);
					}
				}
			} catch {
				// Ignore errors
			}
		}

		return "";
	}, [menuIdFromUrl, pathname, availableMenus, sidebarMenuItems]);

	// Form state hook
	const { initialValues, setInitialValues, formValues, setFormValues, formKey, bumpFormKey, formRef } = useInwardFormState({ mode });

	// Inward details state
	const [inwardDetails, setInwardDetails] = React.useState<InwardDetails | null>(null);
	const [loading, setLoading] = React.useState<boolean>(mode !== "create");
	const [saving, setSaving] = React.useState(false);
	const [pageError, setPageError] = React.useState<string | null>(null);
	const [poDialogOpen, setPODialogOpen] = React.useState(false);
	const [itemDialogOpen, setItemDialogOpen] = React.useState(false);

	// Item group cache
	const { cache: itemGroupCache, loading: itemGroupLoading, ensure: ensureItemGroupData, reset: resetItemGroupCache } =
		useDeferredOptionCache<string, ItemGroupCacheEntry>({
			fetcher: async (itemGroupId: string) => {
				if (!itemGroupId || !/^\d+$/.test(itemGroupId)) {
					throw new Error(`Invalid item group ID: ${itemGroupId}. Expected numeric ID.`);
				}
				const response = await fetchInwardSetup2(itemGroupId);
				return mapItemGroupDetailResponse(response);
			},
			onError: (error) => {
				const message = error instanceof Error ? error.message : "Unable to load item options.";
				toast({
					variant: "destructive",
					title: "Item data not available",
					description: message,
				});
			},
		});

	// Line items hook
	const {
		lineItems,
		setLineItems,
		replaceItems,
		removeLineItems,
		mapLineToEditable,
		handleLineFieldChange,
		handlePOItemsConfirm,
		filledLineItems,
		lineItemsValid,
		hasRowErrors,
		firstRowError,
		computeRowError,
	} = useInwardLineItems({
		mode,
		itemGroupCache,
		itemGroupLoading,
		ensureItemGroupData,
	});

	// Ref for mapLineToEditable to avoid re-triggering the fetch effect
	const mapLineToEditableRef = React.useRef(mapLineToEditable);
	React.useEffect(() => {
		mapLineToEditableRef.current = mapLineToEditable;
	}, [mapLineToEditable]);

	// Branch options prefill for create mode
	React.useEffect(() => {
		if (mode !== "create") return;
		if (!branchOptions.length) return;

		setFormValues((prev) => {
			const currentBranch = (prev.branch as string) || "";
			if (currentBranch) return prev;
			const next = { ...prev, branch: branchOptions[0].value };
			setInitialValues(next);
			bumpFormKey();
			return next;
		});
	}, [mode, branchOptions, setFormValues, setInitialValues, bumpFormKey]);

	// Reset item group cache on company change
	React.useEffect(() => {
		resetItemGroupCache();
	}, [coId, resetItemGroupCache]);

	// Load inward data for edit/view mode
	React.useEffect(() => {
		if (mode === "create") {
			setInwardDetails(null);
			setPageError(null);
			setLoading(false);
			return;
		}

		if (!requestedId) {
			setInwardDetails(null);
			replaceItems([]);
			setPageError("Missing inward identifier in the URL.");
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);

		const menuId = getMenuId();

		getInwardById(requestedId, coId ?? undefined, menuId || undefined)
			.then((detail) => {
				if (cancelled) return;
				setInwardDetails(detail);
				const defaults = buildDefaultFormValues();
				const nextValues = mapInwardDetailsToFormValues(detail as unknown as Record<string, unknown>, defaults);
				setInitialValues(nextValues);
				setFormValues(nextValues);
				bumpFormKey();
				// Use ref to avoid dependency on mapLineToEditable which changes with itemGroupCache
				const mappedLines = (detail.lines ?? []).map((line) => mapLineToEditableRef.current(line as unknown as Record<string, unknown>));
				replaceItems(mappedLines.length ? mappedLines : []);
				setPageError(null);
			})
			.catch((error) => {
				if (cancelled) return;
				setInwardDetails(null);
				replaceItems([]);
				setPageError(error instanceof Error ? error.message : "Unable to load inward details.");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps -- mapLineToEditableRef is stable, getMenuId uses refs internally
	}, [mode, requestedId, coId, setInitialValues, setFormValues, bumpFormKey, replaceItems]);

	// Setup data
	const branchValue = React.useMemo(() => String(formValues.branch ?? ""), [formValues.branch]);
	const branchIdForSetup = React.useMemo(() => (branchValue && /^\d+$/.test(branchValue) ? branchValue : undefined), [branchValue]);
	const setupParams = React.useMemo(
		() => (branchIdForSetup ? { branchId: branchIdForSetup } : EMPTY_SETUP_PARAMS),
		[branchIdForSetup]
	);

	const { data: setupData, loading: setupLoading, error: setupError } = useTransactionSetup<{ branchId?: string }, Record<string, unknown>, InwardSetupData>({
		coId: coId ?? undefined,
		params: setupParams,
		fetcher: fetchInwardSetup1,
		mapData: mapInwardSetupResponse,
		deps: [branchIdForSetup],
	});

	const suppliers = setupData?.suppliers ?? EMPTY_SUPPLIERS;
	const itemGroups = setupData?.itemGroups ?? EMPTY_ITEM_GROUPS;
	const poRequired = setupData?.coConfig?.po_required === 1;

	// Select options hook
	const {
		supplierOptions,
		getSupplierLabel,
		getUomOptions,
		labelResolvers,
	} = useInwardSelectOptions({
		suppliers,
		itemGroups,
		itemGroupCache,
	});

	// Determine if branch and supplier are both selected (for progressive disclosure in create mode)
	const supplierValue = React.useMemo(() => String(formValues.supplier ?? ""), [formValues.supplier]);
	const hasBranchAndSupplier = React.useMemo(
		() => Boolean(branchValue && supplierValue),
		[branchValue, supplierValue]
	);

	// In create mode, show full form only after branch and supplier are selected
	// In edit/view mode, always show full form
	const showFullForm = React.useMemo(
		() => mode !== "create" || hasBranchAndSupplier,
		[mode, hasBranchAndSupplier]
	);

	// Lock editing once material inspection is done, or SR status has moved past pending.
	// Pending = sr_status is null OR 21 (Draft).
	const isInwardLocked = React.useMemo(() => {
		if (!inwardDetails) return false;
		const inspectionDone = inwardDetails.inspection_check === true || inwardDetails.inspection_check === 1;
		const rawStatusId = inwardDetails.statusId;
		const statusIdNum = rawStatusId === null || rawStatusId === undefined || rawStatusId === ""
			? null
			: Number(rawStatusId);
		const statusPending = statusIdNum === null || statusIdNum === 21;
		return inspectionDone || !statusPending;
	}, [inwardDetails]);

	// Form schema
	const headerFieldsDisabled = React.useMemo(() => {
		if (mode === "view") return true;
		if (mode === "edit") return isInwardLocked;
		return !branchIdForSetup;
	}, [mode, branchIdForSetup, isInwardLocked]);

	const schema = useInwardFormSchema({
		mode,
		branchOptions,
		supplierOptions,
		headerFieldsDisabled,
		showFullForm,
	});

	// Line item columns — no inline item group / item dropdowns.
	const canEdit = mode !== "view" && !isInwardLocked;
	const lineItemColumns = useInwardLineItemColumns({
		canEdit,
		labelResolvers,
		getUomOptions,
		handleLineFieldChange,
	});

	// Validation: Either challan or invoice must be filled
	const validateChallanInvoice = React.useCallback((values: Record<string, unknown>): boolean => {
		const challanNo = String(values.challan_no ?? "").trim();
		const invoiceNo = String(values.invoice_no ?? "").trim();
		return Boolean(challanNo || invoiceNo);
	}, []);

	// Form submit handler
	const handleFormSubmit = React.useCallback(
		async (values: Record<string, unknown>) => {
			if (mode === "view" || pageError || setupError) return;
			if (mode === "edit" && isInwardLocked) {
				toast({
					variant: "destructive",
					title: "Inward is locked",
					description: "Changes are not allowed once material inspection is complete or the SR status has advanced past pending.",
				});
				return;
			}

			// Validate challan/invoice requirement
			if (!validateChallanInvoice(values)) {
				toast({
					variant: "destructive",
					title: "Missing document reference",
					description: "Please provide either Challan No. or Invoice No.",
				});
				return;
			}

			if (filledLineItems.length === 0) {
				toast({
					variant: "destructive",
					title: "No items added",
					description: "Add at least one item before saving the inward.",
				});
				return;
			}

			if (hasRowErrors) {
				toast({
					variant: "destructive",
					title: "Fix line errors before saving",
					description: firstRowError ?? "One or more line items have errors.",
				});
				return;
			}

			if (!lineItemsValid) {
				toast({
					variant: "destructive",
					title: "Line items incomplete",
					description: "Ensure every line has an item, UOM, and quantity greater than zero.",
				});
				return;
			}

			const itemsPayload = filledLineItems.map((item) => ({
				po_dtl_id: item.poDtlId || undefined,
				item: item.item || undefined,
				quantity: item.quantity || undefined,
				uom: item.uom || undefined,
				remarks: item.remarks || undefined,
				hsn_code: item.hsnCode || undefined,
			}));

			const createPayload = {
				branch: String(values.branch ?? ""),
				supplier: String(values.supplier ?? ""),
				inward_date: String(values.inward_date ?? ""),
				challan_no: values.challan_no ? String(values.challan_no) : undefined,
				challan_date: values.challan_date ? String(values.challan_date) : undefined,
				invoice_no: values.invoice_no ? String(values.invoice_no) : undefined,
				invoice_date: values.invoice_date ? String(values.invoice_date) : undefined,
				vehicle_no: values.vehicle_no ? String(values.vehicle_no) : undefined,
				driver_name: values.driver_name ? String(values.driver_name) : undefined,
				driver_contact_no: values.driver_contact_no ? String(values.driver_contact_no) : undefined,
				invoice_recvd_date: values.invoice_recvd_date ? String(values.invoice_recvd_date) : undefined,
				consignment_no: values.consignment_no ? String(values.consignment_no) : undefined,
				consignment_date: values.consignment_date ? String(values.consignment_date) : undefined,
				ewaybillno: values.ewaybillno ? String(values.ewaybillno) : undefined,
				ewaybill_date: values.ewaybill_date ? String(values.ewaybill_date) : undefined,
				despatch_remarks: values.despatch_remarks ? String(values.despatch_remarks) : undefined,
				receipts_remarks: values.receipts_remarks ? String(values.receipts_remarks) : undefined,
				items: itemsPayload,
			};

			setSaving(true);
			try {
				if (mode === "edit" && requestedId) {
					const updatePayload: Partial<InwardDetails> = {
						id: requestedId,
						branchId: createPayload.branch,
						supplierId: createPayload.supplier,
						inwardDate: createPayload.inward_date,
						challanNo: createPayload.challan_no,
						challanDate: createPayload.challan_date,
						invoiceNo: createPayload.invoice_no,
						invoiceDate: createPayload.invoice_date,
						invoiceRecvdDate: createPayload.invoice_recvd_date,
						vehicleNo: createPayload.vehicle_no,
						driverName: createPayload.driver_name,
						driverContactNo: createPayload.driver_contact_no,
						consignmentNo: createPayload.consignment_no,
						consignmentDate: createPayload.consignment_date,
						ewaybillno: createPayload.ewaybillno,
						ewaybillDate: createPayload.ewaybill_date,
						despatchRemarks: createPayload.despatch_remarks,
						receiptsRemarks: createPayload.receipts_remarks,
						lines: filledLineItems.map((item) => ({
							id: item.id,
							poDtlId: item.poDtlId,
							item: item.item || undefined,
							quantity: item.quantity ? Number(item.quantity) : undefined,
							uom: item.uom || undefined,
							remarks: item.remarks || undefined,
							hsnCode: item.hsnCode || undefined,
						})),
					};

					await updateInward(updatePayload);
					toast({ title: "Inward updated" });
					router.replace(`/dashboardportal/procurement/inward/createInward?mode=view&id=${encodeURIComponent(requestedId)}`);
				} else {
					const result = await createInward(createPayload);
					toast({
						title: result?.message ?? "Inward created",
						description: result?.inward_no ? `Inward No: ${result.inward_no}` : "Inward No will be generated on open.",
					});
					const inwardId = result?.inward_id ?? result?.inwardId;
					if (inwardId) {
						router.replace(`/dashboardportal/procurement/inward/createInward?mode=view&id=${encodeURIComponent(String(inwardId))}`);
					}
				}
			} catch (error) {
				toast({
					variant: "destructive",
					title: "Unable to save inward",
					description: error instanceof Error ? error.message : "Please try again.",
				});
			} finally {
				setSaving(false);
			}
		},
		[filledLineItems, lineItemsValid, hasRowErrors, firstRowError, mode, pageError, setupError, isInwardLocked, requestedId, router, validateChallanInvoice]
	);

	// Handle PO selection
	const handlePOSelect = React.useCallback(() => {
		if (!formValues.supplier) {
			toast({
				variant: "destructive",
				title: "Select supplier first",
				description: "Please select a supplier before selecting items from PO.",
			});
			return;
		}
		setPODialogOpen(true);
	}, [formValues.supplier]);

	// Handle PO items confirm — surfaces counts for user feedback.
	const handlePOItemsConfirmWrapper = React.useCallback(
		(selectedItems: POLineItem[]) => {
			const result = handlePOItemsConfirm(selectedItems);
			setPODialogOpen(false);

			if (result.addedCount > 0) {
				toast({
					title: `Added ${result.addedCount} PO line${result.addedCount > 1 ? "s" : ""}`,
					description: "Review quantity and save when ready.",
				});
			}
			if (result.duplicateCount > 0) {
				toast({
					variant: "destructive",
					title: "Duplicate PO lines skipped",
					description: `${result.duplicateCount} PO line${result.duplicateCount > 1 ? "s were" : " was"} already added and ${result.duplicateCount > 1 ? "were" : "was"} skipped.`,
				});
			}
			if (result.skippedNoPendingCount > 0) {
				toast({
					variant: "destructive",
					title: "No pending quantity",
					description: `${result.skippedNoPendingCount} PO line${result.skippedNoPendingCount > 1 ? "s" : ""} had no pending quantity and ${result.skippedNoPendingCount > 1 ? "were" : "was"} skipped.`,
				});
			}
			if (
				result.addedCount === 0 &&
				result.duplicateCount === 0 &&
				result.skippedNoPendingCount === 0
			) {
				toast({
					variant: "destructive",
					title: "Nothing to add",
					description: "No PO lines were selected.",
				});
			}
		},
		[handlePOItemsConfirm]
	);

	// Handle items from item selection dialog
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

			// Build a set of already-present item IDs for a defensive duplicate check.
			const existingItemIds = new Set<string>();
			for (const li of lineItems) {
				if (li.item) existingItemIds.add(String(li.item));
			}

			let duplicateCount = 0;
			let missingUomCount = 0;
			const newLines: EditableLineItem[] = [];

			for (const item of items) {
				const itemIdStr = String(item.item_id);
				if (existingItemIds.has(itemIdStr)) {
					duplicateCount += 1;
					continue;
				}
				if (!item.uom_id || !item.item_grp_id) {
					missingUomCount += 1;
					continue;
				}

				const line: EditableLineItem = {
					id: generateLineId(),
					itemGroup: String(item.item_grp_id),
					item: itemIdStr,
					itemCode: item.full_item_code || item.item_code || undefined,
					itemMake: "",
					quantity: "",
					uom: String(item.uom_id),
					remarks: "",
					hsnCode: item.hsn_code ?? "",
					taxPercentage: item.tax_percentage ?? undefined,
				};
				line.rowError = computeRowError(line);
				newLines.push(line);
			}

			const groupIds = [...new Set(newLines.map((line) => line.itemGroup))];
			for (const gid of groupIds) {
				if (gid && !itemGroupCache[gid] && !itemGroupLoading[gid]) {
					void ensureItemGroupData(gid);
				}
			}

			if (newLines.length > 0) {
				setLineItems((prev) => {
					const filledLines = prev.filter((line) => lineHasAnyData(line));
					return [...filledLines, ...newLines];
				});
				toast({
					title: `Added ${newLines.length} item${newLines.length > 1 ? "s" : ""}`,
					description: "Fill in quantity and other details.",
				});
			}

			if (duplicateCount > 0) {
				toast({
					variant: "destructive",
					title: "Duplicate items skipped",
					description: `${duplicateCount} item${duplicateCount > 1 ? "s were" : " was"} already in the list and ${duplicateCount > 1 ? "were" : "was"} skipped.`,
				});
			}
			if (missingUomCount > 0) {
				toast({
					variant: "destructive",
					title: "Missing default UOM",
					description: `${missingUomCount} item${missingUomCount > 1 ? "s were" : " was"} skipped due to missing default UOM or group. Please check item master.`,
				});
			}
		},
		[mode, lineItems, setLineItems, itemGroupCache, itemGroupLoading, ensureItemGroupData, computeRowError]
	);

	// Page metadata
	const pageTitle = React.useMemo(() => {
		if (mode === "create") {
			return showFullForm ? "Create Inward" : "New Inward";
		}
		return mode === "edit" ? "Edit Inward" : "Inward Details";
	}, [mode, showFullForm]);

	const subtitle = React.useMemo(() => {
		if (mode === "create") {
			return showFullForm
				? "Record goods received against a purchase order."
				: "Select branch and supplier to begin.";
		}
		return mode === "edit"
			? "Update the inward before finalizing."
			: "Review the inward details.";
	}, [mode, showFullForm]);

	// Preview data
	const branchLabel = React.useMemo(() => {
		const value = String(formValues.branch ?? "");
		const option = branchOptions.find((opt) => opt.value === value);
		return option?.label || inwardDetails?.branch || "";
	}, [formValues.branch, branchOptions, inwardDetails?.branch]);

	const supplierLabel = React.useMemo(() => {
		const value = String(formValues.supplier ?? "");
		return getSupplierLabel(value) || inwardDetails?.supplier || "";
	}, [formValues.supplier, inwardDetails?.supplier, getSupplierLabel]);

	const previewItems = React.useMemo(
		() =>
			filledLineItems.map((item, index) => {
				return {
					srNo: index + 1,
					poNo: item.poNo,
					itemCode: item.itemCode || "-",
					item: labelResolvers.item(item.itemGroup, item.item) || item.itemCode || "-",
					quantity: item.quantity || "-",
					uom: labelResolvers.uom(item.itemGroup, item.item, item.uom),
					remarks: item.remarks || "-",
				};
			}),
		[filledLineItems, labelResolvers]
	);

	// Company name from localStorage
	const companyName = React.useMemo(() => {
		if (typeof window === "undefined") return undefined;
		try {
			const storedCompany = localStorage.getItem("sidebar_selectedCompany");
			if (storedCompany) {
				const parsed = JSON.parse(storedCompany) as { co_name?: string; name?: string; company_name?: string } | null;
				return parsed?.co_name || parsed?.name || parsed?.company_name || undefined;
			}
		} catch {
			// Ignore errors
		}
		return undefined;
	}, []);

	const previewHeader = {
		inwardNo: (formValues.inward_no as string) || inwardDetails?.inwardNo,
		inwardDate: (formValues.inward_date as string) || inwardDetails?.inwardDate,
		branch: branchLabel,
		supplier: supplierLabel,
		challanNo: (formValues.challan_no as string) || inwardDetails?.challanNo,
		challanDate: (formValues.challan_date as string) || inwardDetails?.challanDate,
		invoiceNo: (formValues.invoice_no as string) || inwardDetails?.invoiceNo,
		invoiceDate: (formValues.invoice_date as string) || inwardDetails?.invoiceDate,
		vehicleNo: (formValues.vehicle_no as string) || inwardDetails?.vehicleNo,
		transporterName: (formValues.transporter_name as string) || inwardDetails?.transporterName,
		updatedBy: inwardDetails?.updatedBy,
		updatedAt: inwardDetails?.updatedAt,
		companyName: companyName,
		companyLogo: companyLogo,
		coId: coId,
		branchId: branchIdForSetup,
	};

	const { metadata } = useTransactionPreview({
		header: previewHeader,
		fields: [
			{ label: "Inward No", accessor: (header) => header.inwardNo || "Pending" },
			{ label: "Inward Date", accessor: (header) => header.inwardDate || "-" },
		],
	});

	// Primary actions
	const primaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
		if (mode === "view" || pageError || setupError) return undefined;
		if (mode === "edit" && isInwardLocked) return undefined;
		return [
			{
				label: mode === "create" ? "Create Inward" : "Save Changes",
				onClick: () => formRef.current?.submit(),
				disabled: saving || !lineItemsValid || hasRowErrors || setupLoading,
				loading: saving,
			},
		];
	}, [mode, pageError, setupError, isInwardLocked, saving, lineItemsValid, hasRowErrors, setupLoading, formRef]);

	// Cancel inward handler — only available in edit mode for non-inspected, active inwards
	const [cancelling, setCancelling] = React.useState(false);
	const handleCancelInward = React.useCallback(async () => {
		if (!requestedId) return;
		const confirmed = typeof window !== "undefined"
			? window.confirm("Cancel this inward? This cannot be undone.")
			: false;
		if (!confirmed) return;

		setCancelling(true);
		try {
			const result = await cancelInward(requestedId);
			toast({
				title: result?.message ?? "Inward cancelled",
			});
			router.push("/dashboardportal/procurement/inward");
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Unable to cancel inward",
				description: error instanceof Error ? error.message : "Please try again.",
			});
		} finally {
			setCancelling(false);
		}
	}, [requestedId, router]);

	// Secondary actions
	const secondaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
		if (mode !== "edit" || !requestedId) return undefined;
		const inspectionDone = inwardDetails?.inspection_check === true || inwardDetails?.inspection_check === 1;
		const isActive = inwardDetails?.active === undefined || inwardDetails?.active === null
			|| inwardDetails?.active === true || inwardDetails?.active === 1;
		if (inspectionDone || !isActive) return undefined;
		return [
			{
				label: "Cancel Inward",
				variant: "destructive",
				onClick: handleCancelInward,
				disabled: cancelling || saving,
				loading: cancelling,
			},
		];
	}, [mode, requestedId, inwardDetails?.inspection_check, inwardDetails?.active, handleCancelInward, cancelling, saving]);

	// Alerts
	const lockedNotice = mode === "edit" && isInwardLocked ? (
		<div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
			This inward is no longer editable — material inspection has been completed or the SR status has moved past pending.
		</div>
	) : null;

	const alerts = pageError || setupError || lockedNotice ? (
		<div className="space-y-2">
			{pageError ? (
				<div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div>
			) : null}
			{setupError ? (
				<div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{setupError}</div>
			) : null}
			{lockedNotice}
		</div>
	) : null;

	// Line item handlers
	const handleBulkRemoveLines = React.useCallback(
		(ids: string[]) => {
			if (mode === "view" || !ids.length) return;
			removeLineItems(ids);
		},
		[mode, removeLineItems]
	);

	const getLineItemId = React.useCallback((item: typeof lineItems[0]) => item.id, []);

	// Line items config - only show after branch/supplier selected in create mode
	const lineItemsConfig = React.useMemo(() => {
		if (!showFullForm) return undefined;
		return {
			title: "Line Items",
			subtitle: "Items received against the purchase order.",
			items: lineItems,
			getItemId: getLineItemId,
			canEdit,
			columns: lineItemColumns,
			onRemoveSelected: handleBulkRemoveLines,
			placeholder: canEdit
				? poRequired
					? "Use 'Select from PO' to add items to this inward."
					: "Use 'Add Items' or 'Select from PO' to add items to this inward."
				: "No line items available.",
			selectionColumnWidth: "28px",
			headerAction:
				canEdit && !poRequired ? (
					<Button
						type="button"
						size="sm"
						onClick={() => setItemDialogOpen(true)}
						disabled={!coId}
					>
						Add Items
					</Button>
				) : undefined,
		};
	}, [showFullForm, lineItems, getLineItemId, canEdit, lineItemColumns, handleBulkRemoveLines, coId, poRequired]);

	return (
		<TransactionWrapper
			title={pageTitle}
			subtitle={subtitle}
			backAction={{ label: "Back", onClick: () => router.push("/dashboardportal/procurement/inward") }}
			metadata={metadata}
			primaryActions={showFullForm ? primaryActions : undefined}
			secondaryActions={secondaryActions}
			loading={loading || setupLoading}
			alerts={alerts}
			preview={showFullForm ? (
				<InwardPreview
					header={previewHeader}
					items={previewItems}
					remarks={(formValues.remarks as string) || inwardDetails?.remarks}
				/>
			) : undefined}
			lineItems={lineItemsConfig}
		>
			<InwardHeaderForm
				schema={schema}
				formKey={formKey}
				initialValues={initialValues}
				mode={mode}
				formRef={formRef}
				onSubmit={handleFormSubmit}
				onValuesChange={setFormValues}
				showPOButton={showFullForm && mode !== "view" && !isInwardLocked}
				onPOSelect={handlePOSelect}
				poButtonDisabled={!formValues.supplier || setupLoading || isInwardLocked}
				poRequired={poRequired}
			/>

			{/* Prompt to select branch and supplier in create mode */}
			{mode === "create" && !showFullForm && (
				<div className="mt-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
					Please select a <strong>Branch</strong> and <strong>Supplier</strong> to continue with the inward entry.
				</div>
			)}

			<POLineItemsDialog
				open={poDialogOpen}
				onOpenChange={setPODialogOpen}
				onConfirm={handlePOItemsConfirmWrapper}
				supplierId={formValues.supplier as string}
				branchId={branchValue || undefined}
			/>

			{!poRequired && (
				<ItemSelectionDialog
					open={itemDialogOpen}
					onOpenChange={setItemDialogOpen}
					coId={coId}
					onConfirm={handleItemDialogConfirm}
					filter="purchaseable"
					excludeItemIds={excludeItemIds}
					title="Select Items for Inward"
				/>
			)}
		</TransactionWrapper>
	);
}
