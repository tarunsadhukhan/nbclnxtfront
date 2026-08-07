"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TransactionWrapper, { type TransactionAction } from "@/components/ui/TransactionWrapper";
import IndentPreview from "../components/IndentPreview";
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
	createIndent,
	fetchIndentSetup1,
	fetchIndentSetup2,
	getIndentById,
	updateIndent,
	fetchIndentLinesByTitle,
	type IndentDetails,
} from "@/utils/indentService";
import { toast } from "@/hooks/use-toast";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useMenuId } from "@/hooks/useMenuId";
import type { MuiFormMode } from "@/components/ui/muiform";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

// Types
import type { EditableLineItem, IndentSetupData, ItemGroupCacheEntry } from "./types/indentTypes";

// Utils
import { EMPTY_DEPARTMENTS, EMPTY_EXPENSES, EMPTY_ITEM_GROUPS, EMPTY_PROJECTS, EMPTY_INDENT_TITLES, EMPTY_SETUP_PARAMS } from "./utils/indentConstants";
import { buildDefaultFormValues, createBlankLine, lineHasAnyData } from "./utils/indentFactories";
import { mapIndentSetupResponse, mapItemGroupDetailResponse } from "./utils/indentMappers";

// Hooks
import { useIndentFormState } from "./hooks/useIndentFormState";
import { useIndentLineItems } from "./hooks/useIndentLineItems";
import { useIndentApproval } from "./hooks/useIndentApproval";
import { useIndentFormSchema } from "./hooks/useIndentFormSchemas";
import { useIndentSelectOptions } from "./hooks/useIndentSelectOptions";
import { useIndentItemValidation } from "./hooks/useIndentItemValidation";

// Components
import { IndentHeaderForm } from "./components/IndentHeaderForm";
import { useIndentLineItemColumns } from "./components/IndentLineItemsTable";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Loading fallback for Suspense
function IndentPageLoading() {
	return (
		<div className="flex items-center justify-center min-h-100">
			<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
		</div>
	);
}

export default function IndentTransactionPage() {
	return (
		<Suspense fallback={<IndentPageLoading />}>
			<IndentTransactionPageContent />
		</Suspense>
	);
}

function IndentTransactionPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const modeParam = (searchParams?.get("mode") || "create").toLowerCase();
	const requestedId = searchParams?.get("id") || "";
	const menuIdFromUrl = searchParams?.get("menu_id") || "";

	const mode: MuiFormMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";

	const branchOptions = useBranchOptions();
	const { coId } = useSelectedCompanyCoId();
	const companyLogo = useCompanyLogo(coId);

	// Resolve menu_id via centralized hook
	const { getMenuId } = useMenuId({ transactionType: "indent", menuIdFromUrl });

	// Form state hook
	const { initialValues, setInitialValues, formValues, setFormValues, formKey, bumpFormKey, formRef } = useIndentFormState({ mode });

	// Indent details state
	const [indentDetails, setIndentDetails] = React.useState<IndentDetails | null>(null);
	const [loading, setLoading] = React.useState<boolean>(mode !== "create");
	const [saving, setSaving] = React.useState(false);
	const [pageError, setPageError] = React.useState<string | null>(null);
	const [saveError, setSaveError] = React.useState<string | null>(null);

	// ── Template reuse state ───────────────────────────────────────────
	/** Name of the indent title currently used as template source (null if none) */
	const [templateSourceName, setTemplateSourceName] = React.useState<string | null>(null);
	/** Whether the replace confirmation dialog is visible */
	const [showReplaceConfirmDialog, setShowReplaceConfirmDialog] = React.useState(false);
	/** Whether the rename dialog is visible (triggered on first line modification after template load) */
	const [showRenameDialog, setShowRenameDialog] = React.useState(false);
	/** The new indent name typed by the user in the rename dialog */
	const [renameInputValue, setRenameInputValue] = React.useState("");
	/** The indent title the user wants to apply (stored while the confirm dialog is open) */
	const [pendingTemplateName, setPendingTemplateName] = React.useState<string | null>(null);
	/** Whether the template is currently being fetched */
	const [templateLoading, setTemplateLoading] = React.useState(false);

	// Item group cache
	const { cache: itemGroupCache, loading: itemGroupLoading, ensure: ensureItemGroupData, reset: resetItemGroupCache } =
		useDeferredOptionCache<string, ItemGroupCacheEntry>({
			fetcher: async (itemGroupId: string) => {
				if (!itemGroupId || !/^\d+$/.test(itemGroupId)) {
					throw new Error(`Invalid item group ID: ${itemGroupId}. Expected numeric ID.`);
				}
				const response = await fetchIndentSetup2(itemGroupId);
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
		filledLineItems,
		lineItemsValid,
	} = useIndentLineItems({
		mode,
		itemGroupCache,
		itemGroupLoading,
		ensureItemGroupData,
	});

	// Unsaved changes tracking for unified save/approval button display
	const getComparableLineData = React.useCallback(
		(item: EditableLineItem) => ({
			department: item.department,
			itemGroup: item.itemGroup,
			item: item.item,
			itemMake: item.itemMake,
			quantity: item.quantity,
			uom: item.uom,
			remarks: item.remarks,
		}),
		[],
	);

	const comparableLineItems = React.useMemo(
		() => lineItems.filter(lineHasAnyData),
		[lineItems],
	);

	const {
		hasUnsavedChanges,
		resetBaseline,
		setBaseline,
	} = useUnsavedChanges({
		formValues,
		lineItems: comparableLineItems,
		getComparableLineData,
		enabled: mode !== "create",
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

	// Reset item group cache on company change
	React.useEffect(() => {
		resetItemGroupCache();
	}, [coId, resetItemGroupCache]);

	// Initialize blank line for create mode (separate effect to avoid re-running on length change)
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

	// Load indent data for edit/view mode
	React.useEffect(() => {
		if (mode === "create") {
			setIndentDetails(null);
			setPageError(null);
			setLoading(false);
			return;
		}

		if (!requestedId) {
			setIndentDetails(null);
			replaceItems([]);
			setPageError("Missing indent identifier in the URL.");
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);

		const menuId = getMenuId();

		getIndentById(requestedId, coId, menuId || undefined)
			.then((detail) => {
				if (cancelled) return;
				setIndentDetails(detail);
				const base = {
					branch: detail.branch ?? "",
					indent_type: detail.indentType ?? "",
					expense_type: detail.expenseType ?? "",
					date: detail.indentDate ?? "",
					indent_no: detail.indentNo ?? "",
					project: detail.project ?? "",
					requester: detail.requester ?? "",
					remarks: detail.remarks ?? "",
				};
				setInitialValues(base);
				setFormValues(base);
				bumpFormKey();
				const mappedLines = (detail.lines ?? []).map(mapLineToEditable);
				replaceItems(mappedLines.length ? mappedLines : [createBlankLine()]);
				setPageError(null);
				// Set baseline for unsaved changes tracking
				setBaseline(base, mappedLines.filter(lineHasAnyData));
			})
			.catch((error) => {
				if (cancelled) return;
				setIndentDetails(null);
				replaceItems([createBlankLine()]);
				setPageError(error instanceof Error ? error.message : "Unable to load indent details.");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [mode, requestedId, mapLineToEditable, coId, getMenuId, setInitialValues, setFormValues, bumpFormKey, replaceItems, setBaseline]);

	// Setup data
	const branchValue = React.useMemo(() => String(formValues.branch ?? ""), [formValues.branch]);
	const branchIdForSetup = React.useMemo(() => (branchValue && /^\d+$/.test(branchValue) ? branchValue : undefined), [branchValue]);
	const setupParams = React.useMemo(
		() => (branchIdForSetup ? { branchId: branchIdForSetup } : EMPTY_SETUP_PARAMS),
		[branchIdForSetup]
	);

	const { data: setupData, loading: setupLoading, error: setupError } = useTransactionSetup<{ branchId?: string }, Record<string, unknown>, IndentSetupData>({
		coId,
		params: setupParams,
		fetcher: fetchIndentSetup1,
		mapData: mapIndentSetupResponse,
		deps: [branchIdForSetup],
	});

	const departments = setupData?.departments ?? EMPTY_DEPARTMENTS;
	const projects = setupData?.projects ?? EMPTY_PROJECTS;
	const expenses = setupData?.expenses ?? EMPTY_EXPENSES;
	const itemGroups = setupData?.itemGroups ?? EMPTY_ITEM_GROUPS;
	const indentTitles = setupData?.indentTitles ?? EMPTY_INDENT_TITLES;

	// Resolve the expense type name from the selected expense type ID
	const resolvedExpenseTypeName = React.useMemo(() => {
		const expId = String(formValues.expense_type ?? "");
		if (!expId) return undefined;
		const found = expenses.find((e) => e.id === expId);
		return found?.name;
	}, [formValues.expense_type, expenses]);

	// Select options hook
	const {
		departmentOptions,
		projectOptions,
		expenseOptions,
		getExpenseLabel,
		getProjectLabel,
		getMakeOptions,
		getUomOptions,
		labelResolvers,
	} = useIndentSelectOptions({
		departments,
		projects,
		expenses,
		itemGroups,
		branchIdForSetup,
		indentType: String(formValues.indent_type ?? ""),
		itemGroupCache,
	});

	// Item validation hook (per-line max qty / FY checks)
	const {
		validationMap,
		validateLine,
		validateLineAndReturn,
		getQuantityError,
		getLineWarnings,
		allLinesValid: allLinesValidFn,
	} = useIndentItemValidation({
		branchId: branchValue,
		indentType: String(formValues.indent_type ?? ""),
		expenseTypeName: resolvedExpenseTypeName,
		expenseTypeId: String(formValues.expense_type ?? ""),
		indentId: requestedId || undefined,
	});

	// Wrap line field changes so that quantity edits on pre-loaded lines lazily
	// trigger validation (normal item-add validation flow now runs inside
	// handleItemDialogConfirm since items are only added via the dialog).
	const handleLineFieldChangeWithValidation = React.useCallback(
		(id: string, field: keyof EditableLineItem, rawValue: string) => {
			handleLineFieldChange(id, field, rawValue);

			// When quantity changes, ensure validation data exists for the line
			// (handles pre-loaded edit lines that haven't been validated yet)
			if (field === "quantity") {
				const lineItem = lineItems.find((li) => li.id === id);
				if (lineItem?.item && !validationMap[id]) {
					void validateLine(id, lineItem.item);
				}
			}

			// If user modifies a line while a template is active, prompt for rename
			if (templateSourceName && ["quantity", "uom", "department"].includes(field)) {
				setRenameInputValue(templateSourceName);
				setShowRenameDialog(true);
			}
		},
		[handleLineFieldChange, validateLine, templateSourceName, lineItems, validationMap]
	);

	// ── Template reuse handlers ────────────────────────────────────────

	/** Apply template lines fetched from the backend */
	const applyTemplateLines = React.useCallback(
		async (title: string) => {
			if (!coId || !branchIdForSetup) return;
			setTemplateLoading(true);
			try {
				const resp = await fetchIndentLinesByTitle(coId, branchIdForSetup, title);
				if (!resp.lines.length) {
					toast({ variant: "destructive", title: "No lines found", description: `No line items found for indent name "${title}".` });
					setTemplateSourceName(null);
					return;
				}
				const mapped: EditableLineItem[] = resp.lines.map((l) => ({
					id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
					department: l.department ?? "",
					itemGroup: l.itemGroup ?? "",
					item: l.item ?? "",
					itemMake: l.itemMake ?? "",
					quantity: l.quantity != null ? String(l.quantity) : "",
					uom: l.uom ?? "",
					remarks: l.remarks ?? "",
				}));
				// Ensure item group caches are populated
				const groupIds = [...new Set(mapped.map((l) => l.itemGroup).filter(Boolean))];
				await Promise.all(groupIds.map((gid) => ensureItemGroupData(gid)));
				replaceItems(mapped);
				setTemplateSourceName(title);
				toast({ title: "Template applied", description: `Loaded ${mapped.length} line(s) from "${title}".` });
			} catch (err) {
				toast({ variant: "destructive", title: "Template error", description: err instanceof Error ? err.message : "Failed to fetch template lines." });
				setTemplateSourceName(null);
			} finally {
				setTemplateLoading(false);
			}
		},
		[coId, branchIdForSetup, replaceItems, ensureItemGroupData]
	);

	/** Called when the user selects an existing indent title from the autocomplete */
	const handleIndentTitleSelect = React.useCallback(
		(title: string) => {
			if (filledLineItems.length > 0) {
				// There are existing lines — ask for confirmation before replacing
				setPendingTemplateName(title);
				setShowReplaceConfirmDialog(true);
			} else {
				void applyTemplateLines(title);
			}
		},
		[filledLineItems.length, applyTemplateLines]
	);

	/** User confirmed replacing existing lines with the template */
	const handleConfirmReplace = React.useCallback(() => {
		setShowReplaceConfirmDialog(false);
		if (pendingTemplateName) {
			void applyTemplateLines(pendingTemplateName);
			setPendingTemplateName(null);
		}
	}, [pendingTemplateName, applyTemplateLines]);

	/** User dismissed the replace confirmation — keep current lines */
	const handleCancelReplace = React.useCallback(() => {
		setShowReplaceConfirmDialog(false);
		setPendingTemplateName(null);
	}, []);

	/** User chose to save the new indent name from the rename dialog */
	const handleRenameAccept = React.useCallback(() => {
		setShowRenameDialog(false);
		setTemplateSourceName(null);
		// Set the requester field to the new name entered in the dialog
		setFormValues((prev) => ({ ...prev, requester: renameInputValue.trim() }));
	}, [setFormValues, renameInputValue]);

	/** User chose to keep the template name despite line modifications */
	const handleRenameDismiss = React.useCallback(() => {
		setShowRenameDialog(false);
		// Keep the template source name — user is okay with the current name
	}, []);

	// Expense type validation on indent type change
	React.useEffect(() => {
		if (mode === "view") return;
		const indentType = String(formValues.indent_type ?? "");
		if (indentType !== "Open") return;
		const allowed = new Set(["3", "5", "6"]);
		const current = String(formValues.expense_type ?? "");
		if (current && !allowed.has(current)) {
			setFormValues((prev) => ({ ...prev, expense_type: "" }));
		}
	}, [formValues.indent_type, formValues.expense_type, mode, setFormValues]);

	// Clear requester / template state when indent_type switches away from BOM
	React.useEffect(() => {
		if (mode === "view") return;
		const indentType = String(formValues.indent_type ?? "");
		if (indentType && indentType !== "BOM") {
			// Clear Indent Name field and any active template
			setFormValues((prev) => {
				if (prev.requester) return { ...prev, requester: "" };
				return prev;
			});
			setTemplateSourceName(null);
			setPendingTemplateName(null);
			setShowReplaceConfirmDialog(false);
			setShowRenameDialog(false);
		}
	}, [formValues.indent_type, mode, setFormValues]);

	// Check if header fields are complete for line item entry
	const headerFieldsComplete = React.useMemo(() => {
		const indentType = String(formValues.indent_type ?? "").trim();
		const expenseType = String(formValues.expense_type ?? "").trim();
		return Boolean(indentType && expenseType);
	}, [formValues.indent_type, formValues.expense_type]);

	// Item selection dialog state
	const [itemDialogOpen, setItemDialogOpen] = React.useState(false);

	// Set of item IDs already selected in the line items (to exclude from dialog)
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

	// Handle items confirmed from the item selection dialog.
	// Runs per-item validation against the backend before committing lines to
	// the table; items that fail (errors, FY duplicate, etc.) are auto-removed
	// and reported in a toast so the user knows why.
	const handleItemDialogConfirm = React.useCallback(
		async (items: SelectedItem[]) => {
			if (mode === "view" || !items.length) return;

			try {
				// Guard: validation requires header fields to be set. If the
				// user somehow opens the dialog before header is complete,
				// surface a clear error instead of silently skipping.
				if (!branchValue) {
					toast({
						variant: "destructive",
						title: "Branch required",
						description: "Select a branch before adding items.",
					});
					return;
				}
				if (!String(formValues.expense_type ?? "").trim()) {
					toast({
						variant: "destructive",
						title: "Expense type required",
						description: "Select an expense type before adding items.",
					});
					return;
				}

				// Build candidate lines paired with their source SelectedItem
				// for reporting failures by name/code later.
				const candidates = items.map((item) => ({
					source: item,
					line: {
						id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
						department: "",
						itemGroup: String(item.item_grp_id),
						item: String(item.item_id),
						itemMake: "",
						quantity: "",
						uom: String(item.uom_id),
						remarks: "",
					} satisfies EditableLineItem,
				}));

				// Warm the item group caches in the background so
				// labelResolvers can render item code/name once the fetch
				// lands.
				const groupIds = [
					...new Set(items.map((item) => String(item.item_grp_id))),
				];
				for (const gid of groupIds) {
					if (!itemGroupCache[gid] && !itemGroupLoading[gid]) {
						void ensureItemGroupData(gid);
					}
				}

				// Validate every candidate line in parallel. Each call
				// updates validationMap as a side effect (so the forcedQty
				// auto-fill effect still picks up results for passing lines).
				// `allSettled` so a single unexpected rejection can't poison
				// the whole batch.
				console.log("[indent-dialog] handleItemDialogConfirm", {
					itemCount: candidates.length,
					candidates: candidates.map((c) => ({
						lineId: c.line.id,
						itemId: c.line.item,
						itemGroupId: c.line.itemGroup,
					})),
				});
				const settled = await Promise.allSettled(
					candidates.map((c) => validateLineAndReturn(c.line.id, c.line.item))
				);
				console.log("[indent-dialog] settled outcomes", settled);

				const passed: EditableLineItem[] = [];
				const failed: { name: string; reason: string }[] = [];

				candidates.forEach((candidate, idx) => {
					const result = settled[idx];
					const displayName =
						candidate.source.item_name ||
						candidate.source.full_item_code ||
						candidate.source.item_code ||
						String(candidate.source.item_id);

					if (result.status === "rejected") {
						const reason =
							result.reason instanceof Error
								? result.reason.message
								: "Unexpected validation error";
						failed.push({ name: displayName, reason });
						// Log the raw rejection so it's not lost.
						console.error("[indent] validation rejected for item", {
							itemId: candidate.line.item,
							reason: result.reason,
						});
						return;
					}

					const outcome = result.value;
					if (outcome.status === "ok" || outcome.status === "skipped") {
						passed.push(candidate.line);
					} else if (outcome.status === "blocked") {
						failed.push({ name: displayName, reason: outcome.reason });
					} else {
						failed.push({ name: displayName, reason: outcome.message });
					}
				});

				console.log("[indent-dialog] partition result", {
					passedCount: passed.length,
					failedCount: failed.length,
					failed,
				});

				if (passed.length > 0) {
					setLineItems((prev) => {
						const filledLines = prev.filter((line) => lineHasAnyData(line));
						return [...filledLines, ...passed, createBlankLine()];
					});
				}

				// Consolidate into a single toast because use-toast enforces
				// TOAST_LIMIT = 1 (firing two toasts in the same tick clobbers
				// one of them). Failure takes priority so the user sees why
				// items were rejected.
				if (failed.length > 0) {
					const description = [
						passed.length > 0
							? `Added ${passed.length} item${passed.length > 1 ? "s" : ""}. ${failed.length} rejected:`
							: `None of the selected items could be added:`,
						...failed.map((f) => `• ${f.name}: ${f.reason}`),
					].join("\n");
					toast({
						variant: "destructive",
						title:
							passed.length > 0
								? `${failed.length} item${failed.length > 1 ? "s" : ""} rejected`
								: `No items added`,
						description,
						duration: 15000,
					});
				} else if (passed.length > 0) {
					toast({
						title: `Added ${passed.length} item${passed.length > 1 ? "s" : ""}`,
						description: "Fill in quantity and other details for each item.",
					});
				} else {
					// Safety net: empty on both sides — impossible in normal flow.
					toast({
						variant: "destructive",
						title: "No items added",
						description:
							"Validation produced no results. Check your network connection and try again.",
					});
				}
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: "Unexpected error while adding items.";
				console.error("[indent] handleItemDialogConfirm failed", err);
				toast({
					variant: "destructive",
					title: "Unable to add items",
					description: message,
				});
			}
		},
		[
			mode,
			branchValue,
			formValues.expense_type,
			setLineItems,
			itemGroupCache,
			itemGroupLoading,
			ensureItemGroupData,
			validateLineAndReturn,
		]
	);

	// Check if any line item has data entered (to lock indent_type and expense_type)
	const hasLineItemData = React.useMemo(() => {
		return filledLineItems.length > 0;
	}, [filledLineItems]);

	// Form schema
	const schema = useIndentFormSchema({
		mode,
		branchOptions,
		expenseOptions,
		projectOptions,
		hasLineItemData,
		indentTypeValue: String(formValues.indent_type ?? ""),
		indentTitles,
		onIndentTitleSelect: handleIndentTitleSelect,
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
	} = useIndentApproval({
		mode,
		requestedId,
		formValues,
		indentDetails,
		coId,
		getMenuId,
		setIndentDetails,
		setFormValues,
	});

	// Reject dialog hook (extracted from ApprovalActionsBar)
	const {
		rejectDialogOpen,
		rejectReason,
		setRejectReason,
		openRejectDialog,
		handleRejectConfirm,
		handleRejectCancel,
	} = useRejectDialog(handleReject);

	// Reset baseline when indentDetails changes (initial load or post-approval refresh)
	React.useEffect(() => {
		if (!indentDetails || mode === "create") return;
		const timer = setTimeout(() => resetBaseline(), 0);
		return () => clearTimeout(timer);
	}, [indentDetails, mode, resetBaseline]);

	// Line item columns - only allow editing if header fields are complete
	// Only allow editing lines if header is complete AND status permits saving
	const canEdit = mode !== "view" && headerFieldsComplete && approvalPermissions.canSave !== false;
	const lineItemColumns = useIndentLineItemColumns({
		canEdit,
		departmentOptions,
		itemGroupLoading,
		labelResolvers,
		getMakeOptions,
		getUomOptions,
		handleLineFieldChange: handleLineFieldChangeWithValidation,
		validationMap,
		getQuantityError,
		getLineWarnings,
	});

	// Auto-validate pre-loaded lines in edit mode so users see qty constraints immediately
	const editValidationTriggeredRef = React.useRef(false);
	React.useEffect(() => {
		if (mode !== "edit" || loading || editValidationTriggeredRef.current) return;
		if (!lineItems.length || !headerFieldsComplete) return;
		editValidationTriggeredRef.current = true;
		for (const li of lineItems) {
			if (li.item) {
				void validateLine(li.id, li.item);
			}
		}
	}, [mode, loading, lineItems, headerFieldsComplete, validateLine]);

	// Auto-fill forcedQty from validation result (Logic 2 — Open indent: qty = maxqty)
	React.useEffect(() => {
		if (mode === "view") return;
		for (const [lineId, state] of Object.entries(validationMap)) {
			if (!state?.result || state.loading) continue;
			const { forcedQty, errors } = state.result;
			// Only auto-fill when there are no blocking errors and a forced qty is set
			if (forcedQty != null && errors.length === 0) {
				setLineItems((prev) => {
					const target = prev.find((li) => li.id === lineId);
					if (!target) return prev;
					const currentQty = target.quantity.trim();
					const forcedStr = String(forcedQty);
					if (currentQty === forcedStr) return prev;
					return prev.map((li) =>
						li.id === lineId ? { ...li, quantity: forcedStr } : li
					);
				});
			}
		}
	}, [validationMap, mode, setLineItems]);

	// Form submit handler
	const handleFormSubmit = React.useCallback(
		async (values: Record<string, unknown>) => {
			if (mode === "view" || pageError || setupError) return;

			// Block saving when the approval status does not allow it (e.g. Approved, Closed)
			if (mode === "edit" && !approvalPermissions.canSave) {
				toast({
					variant: "destructive",
					title: "Cannot save",
					description: "This indent has been approved and can no longer be modified.",
				});
				return;
			}

			if (!lineItemsValid) {
				toast({
					variant: "destructive",
					title: "Line items incomplete",
					description: "Add at least one item and make sure quantity is greater than zero.",
				});
				return;
			}

			// Check per-line validation (max qty / FY duplicate)
			const lineQtyMap: Record<string, string> = {};
			for (const li of filledLineItems) {
				lineQtyMap[li.id] = li.quantity;
			}
			if (!allLinesValidFn(filledLineItems.map((li) => li.id), lineQtyMap)) {
				toast({
					variant: "destructive",
					title: "Validation errors",
					description: "One or more line items have validation errors. Please review before saving.",
				});
				return;
			}

			const indentType = String(values.indent_type ?? "");
			const expenseType = String(values.expense_type ?? "");
			if (indentType === "Open" && expenseType && !["3", "5", "6"].includes(expenseType)) {
				toast({
					variant: "destructive",
					title: "Select allowed expense type",
					description: "Open indents only support expense types 3, 5, or 6.",
				});
				return;
			}

			const itemsPayload = filledLineItems.map((item) => ({
				item_group: item.itemGroup || undefined,
				item: item.item || undefined,
				quantity: item.quantity || undefined,
				uom: item.uom || undefined,
				item_make: item.itemMake || undefined,
				remarks: item.remarks || undefined,
				department: item.department || undefined,
			}));

			const createPayload = {
				branch: String(values.branch ?? ""),
				indent_type: String(values.indent_type ?? ""),
				expense_type: String(values.expense_type ?? ""),
				date: String(values.date ?? ""),
				indent_no: values.indent_no ? String(values.indent_no) : undefined,
				project: values.project ? String(values.project) : undefined,
				requester: values.requester ? String(values.requester) : undefined,
				remarks: values.remarks ? String(values.remarks) : undefined,
				items: itemsPayload,
			};

			setSaving(true);
			try {
				if (mode === "edit" && requestedId) {
					const updatePayload: Partial<IndentDetails> = {
						id: requestedId,
						branch: createPayload.branch,
						indentType: createPayload.indent_type,
						expenseType: createPayload.expense_type,
						indentDate: createPayload.date,
						project: createPayload.project,
						requester: createPayload.requester,
						remarks: createPayload.remarks,
						lines: filledLineItems.map((item) => ({
							id: item.id,
							department: item.department || undefined,
							itemGroup: item.itemGroup || undefined,
							item: item.item || undefined,
							itemMake: item.itemMake || undefined,
							quantity: item.quantity ? Number(item.quantity) : undefined,
							uom: item.uom || undefined,
							remarks: item.remarks || undefined,
						})),
					};

					await updateIndent(updatePayload);
					toast({ title: "Indent updated" });
					router.replace(`/dashboardportal/procurement/indent/createIndent?mode=view&id=${encodeURIComponent(requestedId)}`);
				} else {
					const result = await createIndent(createPayload);
					toast({
						title: result?.message ?? "Indent created",
						description: result?.indent_no ? `Indent No: ${result.indent_no}` : undefined,
					});
					const indentId = result?.indent_id ?? result?.indentId;
					if (indentId) {
						router.replace(`/dashboardportal/procurement/indent/createIndent?mode=view&id=${encodeURIComponent(String(indentId))}`);
					}
				}
			} catch (error) {
				setSaveError(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.");
			} finally {
				setSaving(false);
			}
		},
		[filledLineItems, lineItemsValid, mode, pageError, setupError, requestedId, router, approvalPermissions.canSave, allLinesValidFn]
	);

	// Page metadata
	const pageTitle = mode === "create" ? "Create Indent" : mode === "edit" ? "Edit Indent" : "Indent Details";
	const subtitle =
		mode === "create"
			? "Capture header information and line items to raise a new indent."
			: mode === "edit"
				? "Update the indent before sending it forward."
				: "Review the captured indent information.";

	// Preview data
	const branchLabel = React.useMemo(() => {
		const value = String(formValues.branch ?? "");
		const option = branchOptions.find((opt) => opt.value === value);
		return option?.label || indentDetails?.branch || "";
	}, [formValues.branch, branchOptions, indentDetails?.branch]);

	const indentTypeLabel = React.useMemo(() => {
		const value = String(formValues.indent_type ?? "");
		const options = [
			{ label: "Regular", value: "Regular" },
			{ label: "Open", value: "Open" },
			{ label: "BOM", value: "BOM" },
		];
		return options.find((opt) => opt.value === value)?.label || indentDetails?.indentType || "";
	}, [formValues.indent_type, indentDetails?.indentType]);

	const expenseTypeLabel = React.useMemo(() => {
		const value = String(formValues.expense_type ?? "");
		return getExpenseLabel(value) || indentDetails?.expenseType || "";
	}, [formValues.expense_type, indentDetails?.expenseType, getExpenseLabel]);

	const projectLabel = React.useMemo(() => {
		const value = String(formValues.project ?? "");
		return getProjectLabel(value) || indentDetails?.project || "";
	}, [formValues.project, indentDetails?.project, getProjectLabel]);

	const previewItems = React.useMemo(
		() =>
			filledLineItems.map((item, index) => ({
				srNo: index + 1,
				department: labelResolvers.department(item.department),
				itemCode: labelResolvers.itemCode(item.itemGroup, item.item),
				itemName: labelResolvers.itemName(item.itemGroup, item.item),
				itemMake: labelResolvers.itemMake(item.itemGroup, item.itemMake),
				quantity: item.quantity || "-",
				uom: labelResolvers.uom(item.itemGroup, item.item, item.uom),
				remarks: item.remarks || "-",
			})),
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
		indentNo: (formValues.indent_no as string) || indentDetails?.indentNo,
		indentDate: (formValues.date as string) || indentDetails?.indentDate,
		branch: branchLabel,
		indentType: indentTypeLabel,
		expenseType: expenseTypeLabel,
		project: projectLabel,
		requester: (formValues.requester as string) || indentDetails?.requester,
		status: indentDetails?.status,
		updatedBy: indentDetails?.updatedBy,
		updatedAt: indentDetails?.updatedAt,
		companyName: companyName,
		companyLogo: companyLogo,
		coId: coId,
		branchId: branchIdForSetup,
	};

	const { metadata } = useTransactionPreview({
		header: previewHeader,
		fields: [
			{ label: "Indent No", accessor: (header) => header.indentNo || "Pending" },
			{ label: "Indent Date", accessor: (header) => header.indentDate || "-" },
			{ label: "Status", accessor: (header) => header.status, includeWhen: (header) => Boolean(header.status) },
			{ label: "Updated By", accessor: (header) => header.updatedBy, includeWhen: (header) => Boolean(header.updatedBy) },
			{
				label: "Updated At",
				accessor: (header) => (header.updatedAt ? new Date(header.updatedAt).toLocaleString() : "-"),
				includeWhen: (header) => Boolean(header.updatedAt),
			},
		],
	});

	// Status chip
	const statusChip = React.useMemo(() => {
		if (!indentDetails?.status) return undefined;
		return statusChipProps;
	}, [indentDetails?.status, statusChipProps]);

	// Unified primary actions — shows Create, Save, or Approval buttons in the same location
	const primaryActions = React.useMemo<TransactionAction[] | undefined>(() => {
		if (pageError || setupError) return undefined;

		// Create mode → Create button
		if (mode === "create") {
			return [
				{
					label: "Create Indent",
					onClick: () => formRef.current?.submit(),
					disabled: saving || !lineItemsValid || setupLoading,
					loading: saving,
				},
			];
		}

		// No indent details yet (still loading)
		if (!indentDetails) return undefined;

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
				onClone: handleClone,
			},
			loading: approvalLoading,
			disabled: saving || loading || setupLoading,
		});

		return approvalActions.length ? approvalActions : undefined;
	}, [
		mode, pageError, setupError, saving, lineItemsValid, setupLoading,
		formRef, indentDetails, approvalPermissions, hasUnsavedChanges,
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
				onClick: () => router.replace(`/dashboardportal/procurement/indent/createIndent?mode=edit&id=${encodeURIComponent(requestedId)}`),
			});
		}
		if (mode === "edit") {
			actions.push({
				label: "Cancel",
				variant: "ghost",
				onClick: () => router.replace(`/dashboardportal/procurement/indent/createIndent?mode=view&id=${encodeURIComponent(requestedId)}`),
			});
		}
		return actions.length ? actions : undefined;
	}, [mode, requestedId, router, pageError, approvalPermissions.canSave]);

	// Alerts
	const alerts = pageError || setupError ? (
		<div className="space-y-2">
			{pageError ? (
				<div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div>
			) : null}
			{setupError ? (
				<div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{setupError}</div>
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

	const getLineItemId = React.useCallback((item: EditableLineItem) => item.id, []);

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
				<IndentPreview
					header={previewHeader}
					items={previewItems}
					remarks={(formValues.remarks as string) || indentDetails?.remarks}
				/>
			}
			lineItems={{
				title: "Line Items",
				subtitle: mode !== "view" && !headerFieldsComplete
					? "Please select Indent Type and Expense Type above before adding line items."
					: "List the materials or services you intend to procure.",
				items: lineItems,
				getItemId: getLineItemId,
				canEdit,
				columns: lineItemColumns,
				onRemoveSelected: handleBulkRemoveLines,
				placeholder: mode !== "view" && !headerFieldsComplete
					? "Select Indent Type and Expense Type to enable line item entry."
					: canEdit
						? "Add items to build the indent."
						: "No line items available.",
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
		>
			<IndentHeaderForm
				schema={schema}
				formKey={formKey}
				initialValues={initialValues}
				mode={mode}
				formRef={formRef}
				onSubmit={handleFormSubmit}
				onValuesChange={setFormValues}
			/>
		</TransactionWrapper>

		{/* ── Replace Confirmation Dialog ──────────────────────────────── */}
		<Dialog open={showReplaceConfirmDialog} onOpenChange={(open) => { if (!open) handleCancelReplace(); }}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Replace existing lines?</DialogTitle>
					<DialogDescription>
						Selecting the template &ldquo;{pendingTemplateName}&rdquo; will replace all
						current line items. This cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={handleCancelReplace}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleConfirmReplace}>
						Replace
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>

		{/* ── Rename Dialog (triggered on line modification after template load) */}
		<Dialog open={showRenameDialog} onOpenChange={(open) => { if (!open) handleRenameDismiss(); }}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Lines modified</DialogTitle>
					<DialogDescription>
						You&apos;ve modified the line items loaded from &ldquo;{templateSourceName}&rdquo;.
						Enter a new indent name or keep the current one.
					</DialogDescription>
				</DialogHeader>
				<div className="py-2">
					<label htmlFor="rename-indent-input" className="text-sm font-medium text-muted-foreground mb-1 block">
						New indent name
					</label>
					<input
						id="rename-indent-input"
						type="text"
						className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						value={renameInputValue}
						onChange={(e) => setRenameInputValue(e.target.value)}
						placeholder="Enter new indent name"
						autoFocus
					/>
				</div>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={handleRenameDismiss}>
						Keep current name
					</Button>
					<Button
						onClick={handleRenameAccept}
						disabled={!renameInputValue.trim() || renameInputValue.trim() === templateSourceName}
					>
						Save indent name
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>

		{/* ── Save Error Dialog ──────────────────────────────────────── */}
		<Dialog open={saveError !== null} onOpenChange={(open) => { if (!open) setSaveError(null); }}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Unable to save indent</DialogTitle>
					<DialogDescription>{saveError}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => setSaveError(null)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>

		{/* ── Item Selection Dialog ─────────────────────────────────────── */}
		<ItemSelectionDialog
			open={itemDialogOpen}
			onOpenChange={setItemDialogOpen}
			coId={coId}
			onConfirm={handleItemDialogConfirm}
			filter="purchaseable"
			excludeItemIds={excludeItemIds}
			title="Select Items for Indent"
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
