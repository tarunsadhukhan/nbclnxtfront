"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import TransactionWrapper, {
	type TransactionAction,
} from "@/components/ui/TransactionWrapper";
import {
	useTransactionSetup,
	useTransactionPreview,
	buildApprovalTransactionActions,
	useRejectDialog,
	useUnsavedChanges,
	AutoResizeTextarea,
} from "@/components/ui/transaction";
import { useBranchOptions } from "@/utils/branchUtils";
import {
	createIssue,
	fetchIssueSetup1,
	getIssueById,
	updateIssue,
	type IssueDetails,
	type InventoryListItem,
} from "@/utils/issueService";
import { toast } from "@/hooks/use-toast";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import type { MuiFormMode } from "@/components/ui/muiform";

// Types
import type {
	EditableLineItem,
	IssueSetupData,
} from "./types/issueTypes";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Utils
import {
	EMPTY_DEPARTMENTS,
	EMPTY_EXPENSES,
	EMPTY_PROJECTS,
	EMPTY_COST_FACTORS,
	EMPTY_MACHINES,
	EMPTY_SETUP_PARAMS,
} from "./utils/issueConstants";
import {
	createBlankLine,
	createLineFromInventory,
	lineIsComplete,
	lineHasAnyData,
} from "./utils/issueFactories";
import {
	mapIssueSetupResponse,
} from "./utils/issueMappers";

// Hooks
import { useIssueFormState } from "./hooks/useIssueFormState";
import { useIssueLineItems } from "./hooks/useIssueLineItems";
import { useIssueFormSchema } from "./hooks/useIssueFormSchemas";
import { useIssueSelectOptions } from "./hooks/useIssueSelectOptions";
import { useIssueApproval } from "./hooks/useIssueApproval";

// Components
import { IssueHeaderForm } from "./components/IssueHeaderForm";
import { useIssueLineItemColumns } from "./components/IssueLineItemsTable";
import { IssuePreview } from "./components/IssuePreview";
import { InventorySearchTable } from "./components/InventorySearchTable";

// Loading fallback for Suspense
function IssuePageLoading() {
	return (
		<div className="flex items-center justify-center min-h-100">
			<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
		</div>
	);
}

export default function IssueTransactionPage() {
	return (
		<Suspense fallback={<IssuePageLoading />}>
			<IssueTransactionPageContent />
		</Suspense>
	);
}

function IssueTransactionPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();

	const modeParam = (searchParams?.get("mode") || "create").toLowerCase();
	const requestedId = searchParams?.get("id") || "";
	const menuIdFromUrl = searchParams?.get("menu_id") || "";

	const mode: MuiFormMode =
		modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";

	const branchOptions = useBranchOptions();
	const { coId } = useSelectedCompanyCoId();
	const { availableMenus, menuItems: sidebarMenuItems } = useSidebarContext();

	// Get menu_id from URL or lookup from menuItems based on current path
	const getMenuId = React.useCallback((): string => {
		if (menuIdFromUrl) return menuIdFromUrl;

		if (availableMenus && availableMenus.length > 0) {
			const currentPath = pathname?.toLowerCase() || "";

			// First, try exact path match
			const matchingMenu = availableMenus.find((item) => {
				if (!item.menu_path) return false;
				const menuPath = item.menu_path.toLowerCase();
				return (
					currentPath === menuPath || currentPath.startsWith(menuPath + "/")
				);
			});
			if (matchingMenu?.menu_id) return String(matchingMenu.menu_id);

			// Second, try to find by "issue" in path or name
			const issueMenu = availableMenus.find((item) => {
				const path = (item.menu_path || "").toLowerCase();
				const name = (item.menu_name || "").toLowerCase();
				return (
					path.includes("issue") ||
					path.includes("/inventory/issue") ||
					name.includes("issue")
				);
			});
			if (issueMenu?.menu_id) return String(issueMenu.menu_id);
		}

		// Fallback to sidebarMenuItems
		if (sidebarMenuItems && sidebarMenuItems.length > 0) {
			const issueMenu = sidebarMenuItems.find((item) => {
				const path = (item.menu_path || "").toLowerCase();
				const name = (item.menu_name || "").toLowerCase();
				return (
					path.includes("issue") ||
					path.includes("/inventory/issue") ||
					name.includes("issue")
				);
			});
			if (issueMenu?.menu_id) return String(issueMenu.menu_id);
		}

		return "";
	}, [menuIdFromUrl, pathname, availableMenus, sidebarMenuItems]);

	// Form state hook
	const {
		initialValues,
		setInitialValues,
		formValues,
		setFormValues,
		formKey,
		bumpFormKey,
		formRef,
	} = useIssueFormState({ mode });

	// Derived branch values (needed early for caches)
	const branchValue = React.useMemo(
		() => String(formValues.branch ?? ""),
		[formValues.branch]
	);
	const branchIdForSetup = React.useMemo(
		() => (branchValue && /^\d+$/.test(branchValue) ? branchValue : undefined),
		[branchValue]
	);

	// Issue details state
	const [issueDetails, setIssueDetails] = React.useState<IssueDetails | null>(
		null
	);
	const [loading, setLoading] = React.useState<boolean>(mode !== "create");
	const [saving, setSaving] = React.useState(false);
	const [pageError, setPageError] = React.useState<string | null>(null);

	// Hydration mount state - prevents MUI ID mismatch between SSR and client
	const [isMounted, setIsMounted] = React.useState(false);
	React.useEffect(() => {
		setIsMounted(true);
	}, []);

	// Line items hook (simplified - no item group cache needed)
	const {
		lineItems,
		setLineItems,
		replaceItems,
		removeLineItems,
		handleLineFieldChange,
	} = useIssueLineItems({
		mode,
	});

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

	// Initialize blank line for create mode
	const initialLineSeededRef = React.useRef(false);
	React.useEffect(() => {
		if (mode !== "create") {
			initialLineSeededRef.current = false;
			return;
		}
		if (initialLineSeededRef.current) return;
		initialLineSeededRef.current = true;
		setLineItems((prev) => (prev.length ? prev : [createBlankLine()]));
	}, [mode, setLineItems]);

	// Map API line response to editable line item
	// Handles both camelCase keys (from getIssueById transform) and snake_case keys (raw API)
	const mapLineToEditable = React.useCallback(
		(apiLine: Record<string, unknown>): EditableLineItem => ({
			id: String(apiLine.issue_li_id ?? apiLine.id ?? ""),
			// From inventory (read-only)
			grnNo: String(apiLine.srNo ?? apiLine.sr_no ?? apiLine.inward_no ?? ""),
			inwardDtlId: String(apiLine.inwardDtlId ?? apiLine.inward_dtl_id ?? ""),
			itemId: String(apiLine.itemId ?? apiLine.item_id ?? ""),
			itemName: String(apiLine.itemName ?? apiLine.item_name ?? ""),
			itemCode: String(apiLine.full_item_code ?? apiLine.itemCode ?? apiLine.item_code ?? ""),
			itemGrpId: String(apiLine.itemGroupId ?? apiLine.item_grp_id ?? apiLine.item_group_id ?? ""),
			itemGrpName: String(apiLine.itemGroupName ?? apiLine.item_grp_name ?? apiLine.item_group_name ?? ""),
			uomId: String(apiLine.uomId ?? apiLine.uom_id ?? ""),
			uomName: String(apiLine.uomName ?? apiLine.uom_name ?? ""),
			rate: String(apiLine.rate ?? ""),
			availableQty: "", // Not available from saved records
			// Editable
			quantity: String(apiLine.issue_qty ?? apiLine.qty ?? ""),
			expenseType: String(apiLine.expenseId ?? apiLine.expense_type_id ?? apiLine.expense_id ?? ""),
			costFactor: String(apiLine.costFactorId ?? apiLine.cost_factor_id ?? ""),
			machine: String(apiLine.machineId ?? apiLine.machine_id ?? ""),
			remarks: String(apiLine.remarks ?? ""),
		}),
		[]
	);

	// Load issue data for edit/view mode
	React.useEffect(() => {
		if (mode === "create") {
			setIssueDetails(null);
			setPageError(null);
			setLoading(false);
			return;
		}

		if (!requestedId) {
			setIssueDetails(null);
			replaceItems([]);
			setPageError("Missing issue identifier in the URL.");
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);

		const menuId = getMenuId();

		getIssueById(requestedId, coId, menuId || undefined)
			.then((detail) => {
				if (cancelled) return;
				setIssueDetails(detail);
				const base = {
					branch: String(detail.branchId ?? ""),
					department: String(detail.deptId ?? ""),
					date: detail.date ?? "",
					issue_no: detail.issuePassNo ?? "",
					project: String(detail.projectId ?? ""),
					issued_to: detail.issuedTo ?? "",
					req_by: detail.reqBy ?? "",
					internal_note: detail.internalNote ?? "",
				};
				setInitialValues(base);
				setFormValues(base);
				bumpFormKey();
				const mappedLines = (detail.lineItems ?? []).map((line) =>
					mapLineToEditable(line as unknown as Record<string, unknown>)
				);
				replaceItems(mappedLines.length ? mappedLines : [createBlankLine()]);
				setBaseline(base, mappedLines.filter(lineHasAnyData));
				setPageError(null);
			})
			.catch((error) => {
				if (cancelled) return;
				setIssueDetails(null);
				replaceItems([createBlankLine()]);
				setPageError(
					error instanceof Error
						? error.message
						: "Unable to load issue details."
				);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [
		mode,
		requestedId,
		mapLineToEditable,
		coId,
		getMenuId,
		setInitialValues,
		setFormValues,
		bumpFormKey,
		replaceItems,
	]);

	// Setup data
	const setupParams = React.useMemo(
		() => (branchIdForSetup ? { branchId: branchIdForSetup } : EMPTY_SETUP_PARAMS),
		[branchIdForSetup]
	);

	const {
		data: setupData,
		loading: setupLoading,
		error: setupError,
	} = useTransactionSetup<
		{ branchId?: string },
		Record<string, unknown>,
		IssueSetupData
	>({
		coId,
		params: setupParams,
		fetcher: fetchIssueSetup1,
		mapData: mapIssueSetupResponse,
		deps: [branchIdForSetup],
	});

	const departments = setupData?.departments ?? EMPTY_DEPARTMENTS;
	const projects = setupData?.projects ?? EMPTY_PROJECTS;
	const expenses = setupData?.expenses ?? EMPTY_EXPENSES;
	const costFactors = setupData?.costFactors ?? EMPTY_COST_FACTORS;
	const machines = setupData?.machines ?? EMPTY_MACHINES;

	// Get selected department for filtering machines
	const departmentValue = React.useMemo(
		() => String(formValues.department ?? ""),
		[formValues.department]
	);

	// Select options hook - filters machines by selected department
	const {
		departmentOptions,
		projectOptions,
		expenseOptions,
		costFactorOptions,
		machineOptions,
		labelResolvers,
	} = useIssueSelectOptions({
		departments,
		projects,
		expenses,
		costFactors,
		machines,
		branchIdForSetup,
		departmentIdForMachines: departmentValue,
	});

	// Form schema
	const schema = useIssueFormSchema({
		mode,
		branchOptions,
		departmentOptions,
		projectOptions,
	});

	// Approval hook
	const {
		approvalLoading,
		approvalInfo,
		approvalPermissions,
		statusChipProps,
		handleOpen,
		handleCancelDraft,
		handleReopen,
		handleSendForApproval,
		handleApprove,
		handleReject,
		handleViewApprovalLog,
		handleClone,
	} = useIssueApproval({
		mode,
		requestedId,
		formValues,
		issueDetails,
		coId,
		getMenuId,
		setIssueDetails,
		setFormValues,
	});

	// Reject dialog
	const {
		rejectDialogOpen,
		rejectReason,
		setRejectReason,
		openRejectDialog,
		handleRejectConfirm,
		handleRejectCancel,
	} = useRejectDialog(handleReject);

	// Derived values
	const canEdit = mode !== "view" && approvalPermissions.canSave === true;
	const filledLineItems = React.useMemo(
		() => lineItems.filter((item) => lineIsComplete(item)),
		[lineItems]
	);
	const lineItemsValid = filledLineItems.length > 0;

	// Unsaved changes detection
	const getComparableLineData = React.useCallback(
		(item: EditableLineItem) => ({
			itemId: item.itemId,
			inwardDtlId: item.inwardDtlId,
			quantity: item.quantity,
			expenseType: item.expenseType,
			costFactor: item.costFactor,
			machine: item.machine,
			remarks: item.remarks,
		}),
		[]
	);

	const comparableLineItems = React.useMemo(
		() => lineItems.filter(lineHasAnyData),
		[lineItems]
	);

	const { hasUnsavedChanges, resetBaseline, setBaseline } = useUnsavedChanges({
		formValues,
		lineItems: comparableLineItems,
		getComparableLineData,
		enabled: mode !== "create",
	});

	// Line item columns
	const lineItemColumns = useIssueLineItemColumns({
		canEdit,
		expenseOptions,
		costFactorOptions,
		machineOptions,
		labelResolvers,
		handleLineFieldChange,
	});

	// Form submit handler
	const handleFormSubmit = React.useCallback(
		async (values: Record<string, unknown>) => {
			if (mode === "view" || !canEdit || pageError || setupError) return;

			if (!lineItemsValid) {
				toast({
					variant: "destructive",
					title: "Line items incomplete",
					description:
						"Add at least one item and make sure quantity is greater than zero.",
				});
				return;
			}

			const lineItemsPayload = filledLineItems.map((item) => ({
				item_id: item.itemId ? Number(item.itemId) : undefined,
				item_group_id: item.itemGrpId ? Number(item.itemGrpId) : undefined,
				qty: Number(item.quantity) || 0,
				uom_id: item.uomId ? Number(item.uomId) : undefined,
				expense_id: item.expenseType ? Number(item.expenseType) : undefined,
				cost_factor_id: item.costFactor ? Number(item.costFactor) : undefined,
				machine_id: item.machine ? Number(item.machine) : undefined,
				inward_dtl_id: item.inwardDtlId ? Number(item.inwardDtlId) : undefined,
				remarks: item.remarks || undefined,
			}));

			const createPayload = {
				branch_id: Number(values.branch) || 0,
				dept_id: Number(values.department) || 0,
				issue_date: String(values.date ?? ""),
				project_id: values.project ? Number(values.project) : undefined,
				issued_to: values.issued_to ? String(values.issued_to) : undefined,
				req_by: values.req_by ? String(values.req_by) : undefined,
				internal_note: values.internal_note
					? String(values.internal_note)
					: undefined,
				line_items: lineItemsPayload,
			};

			setSaving(true);
			try {
				if (mode === "edit" && requestedId) {
					await updateIssue(coId, {
						issue_id: requestedId,
						...createPayload,
					});
					toast({ title: "Issue updated" });
					router.replace(
						`/dashboardportal/inventory/issue/createIssue?mode=view&id=${encodeURIComponent(requestedId)}`
					);
				} else {
					const result = await createIssue(coId, createPayload);
					toast({
						title: result?.message ?? "Issue created",
						description: result?.issue_pass_no
							? `Issue Pass No: ${result.issue_pass_no}`
							: undefined,
					});
					const issueId = result?.issue_id;
					if (issueId) {
						router.replace(
							`/dashboardportal/inventory/issue/createIssue?mode=view&id=${encodeURIComponent(String(issueId))}`
						);
					}
				}
			} catch (error) {
				toast({
					variant: "destructive",
					title: "Unable to save issue",
					description:
						error instanceof Error ? error.message : "Please try again.",
				});
			} finally {
				setSaving(false);
			}
		},
		[
			filledLineItems,
			lineItemsValid,
			mode,
			canEdit,
			pageError,
			setupError,
			requestedId,
			router,
			coId,
		]
	);

	// Reset baseline after approval actions refresh details
	React.useEffect(() => {
		if (!issueDetails || mode === "create") return;
		const timer = setTimeout(() => resetBaseline(), 0);
		return () => clearTimeout(timer);
	}, [issueDetails, mode, resetBaseline]);

	// Page metadata
	const pageTitle =
		mode === "create"
			? "Create Issue"
			: mode === "edit"
				? "Edit Issue"
				: "Issue Details";
	const subtitle =
		mode === "create"
			? "Record material issue from stores."
			: mode === "edit"
				? "Update the issue before approval."
				: "Review the captured issue information.";

	// Preview data
	const branchLabel = React.useMemo(() => {
		const value = String(formValues.branch ?? "");
		const option = branchOptions.find((opt) => opt.value === value);
		return option?.label || issueDetails?.branchName || "";
	}, [formValues.branch, branchOptions, issueDetails?.branchName]);

	const previewHeader = {
		issuePassNo:
			(formValues.issue_no as string) || issueDetails?.issuePassNo || "Pending",
		issueDate: (formValues.date as string) || issueDetails?.date,
		branch: branchLabel,
		department: labelResolvers.department(
			String(formValues.department ?? "")
		),
		project: labelResolvers.project(String(formValues.project ?? "")),
		issuedTo: (formValues.issued_to as string) || issueDetails?.issuedTo,
		status: issueDetails?.status,
	};

	const { metadata } = useTransactionPreview({
		header: previewHeader,
		fields: [
			{ label: "Issue Pass No", accessor: (header) => header.issuePassNo },
			{ label: "Issue Date", accessor: (header) => header.issueDate || "-" },
			{
				label: "Status",
				accessor: (header) => header.status,
				includeWhen: (header) => Boolean(header.status),
			},
		],
	});

	// Status chip
	const statusChip = React.useMemo(() => {
		if (!issueDetails?.status) return undefined;
		return statusChipProps;
	}, [issueDetails?.status, statusChipProps]);

	// Primary actions (unified save + approval pattern)
	const primaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
		if (pageError || setupError) return undefined;

		// Create mode
		if (mode === "create") {
			return [
				{
					label: "Create Issue",
					onClick: () => formRef.current?.submit(),
					disabled: saving || !lineItemsValid || setupLoading,
					loading: saving,
				},
			];
		}

		// No details yet (still loading)
		if (!issueDetails) return undefined;

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

		// View mode, or edit without changes → Approval buttons
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

		// At Open (1), Reject is unavailable — backend only rejects from Pending
		// Approval (20). Offer Cancel instead so an opened issue can be withdrawn
		// (status → Cancelled, via the same handler used for draft cancel).
		if (approvalInfo.statusId === 1 && approvalPermissions.canSave) {
			approvalActions.push({
				label: "Cancel Issue",
				onClick: handleCancelDraft,
				variant: "destructive",
				disabled: saving || loading || setupLoading || approvalLoading,
			});
		}

		return approvalActions.length ? approvalActions : undefined;
	}, [
		mode, pageError, setupError, saving, lineItemsValid, setupLoading,
		formRef, issueDetails, approvalPermissions, hasUnsavedChanges,
		approvalInfo, approvalLoading, loading,
		handleOpen, handleCancelDraft, handleReopen, handleSendForApproval,
		handleApprove, openRejectDialog, handleViewApprovalLog, handleClone,
	]);

	// Secondary actions
	const secondaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
		if (!requestedId || pageError) return undefined;
		const actions: TransactionAction[] = [];

		if (mode === "view" && approvalPermissions.canSave) {
			actions.push({
				label: "Edit",
				variant: "secondary",
				onClick: () =>
					router.replace(
						`/dashboardportal/inventory/issue/createIssue?mode=edit&id=${encodeURIComponent(requestedId)}`
					),
			});
		}

		if (mode === "edit") {
			actions.push({
				label: "Cancel",
				variant: "ghost",
				onClick: () =>
					router.replace(
						`/dashboardportal/inventory/issue/createIssue?mode=view&id=${encodeURIComponent(requestedId)}`
					),
			});
		}

		return actions.length ? actions : undefined;
	}, [mode, requestedId, router, pageError, approvalPermissions.canSave]);

	// Alerts
	const alerts =
		pageError || setupError ? (
			<div className="space-y-2">
				{pageError ? (
					<div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
						{pageError}
					</div>
				) : null}
				{setupError ? (
					<div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
						{setupError}
					</div>
				) : null}
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

	const getLineItemId = React.useCallback(
		(item: EditableLineItem) => item.id,
		[]
	);

	// inward_dtl_id values already on the issue — passed to the picker so added
	// rows show as "Added", and used here to dedup (one issue line per inward detail).
	const addedInwardDtlIds = React.useMemo(
		() => new Set(lineItems.map((l) => l.inwardDtlId).filter(Boolean)),
		[lineItems]
	);

	// Handle inserting items from inventory search table
	const handleInsertFromInventory = React.useCallback(
		(items: InventoryListItem[]) => {
			if (mode === "view" || !items.length) return;

			const filledLines = lineItems.filter((line) => lineHasAnyData(line));
			const existing = new Set(
				filledLines.map((l) => l.inwardDtlId).filter(Boolean)
			);

			// Skip rows whose inward detail is already on the issue — adding the same
			// inward_dtl_id twice would split one inward line into two over-issuing lines.
			const newLines: EditableLineItem[] = items
				.filter((item) => !existing.has(String(item.inward_dtl_id ?? "")))
				.map((item) => createLineFromInventory(item));

			if (!newLines.length) {
				toast({
					title: "Already added",
					description: "This item is already on the issue.",
				});
				return;
			}

			setLineItems([...filledLines, ...newLines, createBlankLine()]);

			toast({
				title: `Added ${newLines.length} item${newLines.length > 1 ? "s" : ""} to issue`,
				description: "Enter quantities for each item.",
			});
		},
		[mode, lineItems, setLineItems]
	);

	// Wait for client-side hydration to complete before rendering MUI forms
	// This prevents React hydration mismatch errors caused by MUI's useId() hook
	if (!isMounted) {
		return (
			<div className="flex items-center justify-center min-h-100">
				<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
			</div>
		);
	}

	return (
		<>
		<TransactionWrapper
			title={pageTitle}
			subtitle={subtitle}
			backAction={{ label: "Back", onClick: () => router.back() }}
			metadata={metadata}
			statusChip={statusChip}
			primaryActions={primaryActions}
			secondaryActions={secondaryActions}
			loading={loading || setupLoading}
			alerts={alerts}
			preview={
				<IssuePreview details={issueDetails} labelResolvers={labelResolvers} />
			}
			lineItems={{
				title: "Line Items",
				subtitle: "List the materials to issue from stores.",
				items: lineItems,
				getItemId: getLineItemId,
				canEdit,
				columns: lineItemColumns,
				onRemoveSelected: handleBulkRemoveLines,
				placeholder: canEdit
					? "Add items to record the issue."
					: "No line items available.",
				selectionColumnWidth: "28px",
			}}
		>
			<div className="space-y-6">
				<IssueHeaderForm
					schema={schema}
					formKey={formKey}
					initialValues={initialValues}
					mode={mode}
					formRef={formRef}
					onSubmit={handleFormSubmit}
					onValuesChange={setFormValues}
				/>
				{/* Inventory Search Table - only show in create/edit mode */}
				{canEdit && branchIdForSetup ? (
					<InventorySearchTable
						coId={coId}
						branchId={branchIdForSetup}
						disabled={!canEdit}
						onInsertItems={handleInsertFromInventory}
							addedInwardDtlIds={addedInwardDtlIds}
					/>
				) : null}
			</div>
		</TransactionWrapper>

		{/* ── Reject Confirmation Dialog ────────────────────────────────── */}
		<Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open) handleRejectCancel(); }}>
			<DialogContent className="sm:max-w-125">
				<DialogHeader>
					<DialogTitle>Reject Issue</DialogTitle>
					<DialogDescription>Please provide a reason for rejecting this issue.</DialogDescription>
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
					<Button variant="outline" onClick={handleRejectCancel}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleRejectConfirm} disabled={!rejectReason.trim()}>
						Reject
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	);
}
