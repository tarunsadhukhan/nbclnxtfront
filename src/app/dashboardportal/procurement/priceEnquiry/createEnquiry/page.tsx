"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Typography,
	Button,
	Chip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Checkbox,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Paper,
	Alert,
	CircularProgress,
	Divider,
	Box,
	TextField,
} from "@mui/material";
import type { MuiFormMode, Schema } from "@/components/ui/muiform";
import { useBranchOptions } from "@/utils/branchUtils";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useMenuId } from "@/hooks/useMenuId";
import { toast } from "@/hooks/use-toast";
import {
	fetchEnquirySetup,
	getEnquiryById,
	createEnquiry,
	updateEnquiry,
	fetchApprovedIndentItems,
	sendEnquiryForApproval,
	approveEnquiry,
	rejectEnquiry,
	cancelEnquiry,
	reopenEnquiry,
	markRfqSent,
} from "@/utils/priceEnquiryService";
import type {
	EnquiryLineItem,
	EnquirySupplierEntry,
	EnquirySetupData,
	EnquiryResponseSummary,
	EnquirySupplierInfo,
	IndentLineItemForEnquiry,
} from "./types/enquiryTypes";
import { ENQUIRY_STATUS_IDS as STATUS_IDS } from "./utils/enquiryConstants";
import {
	compareUrl,
	createResponseUrl,
	editResponseUrl,
	hubUrl,
	indexUrl,
	viewResponseUrl,
} from "./utils/enquiryRoutes";
import { useEnquiryFormState } from "./hooks/useEnquiryFormState";
import { useEnquirySelectOptions } from "./hooks/useEnquirySelectOptions";
import { EnquiryHeaderForm } from "./_components/EnquiryHeaderForm";
import { EnquiryLineItemsTable } from "./_components/EnquiryLineItemsTable";
import { EnquirySupplierSelect } from "./_components/EnquirySupplierSelect";
import { EnquiryPreview, type EnquiryPreviewHeader } from "./_components/EnquiryPreview";

function PageLoading() {
	return (
		<div className="flex items-center justify-center min-h-100">
			<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
		</div>
	);
}

export default function EnquiryPage() {
	return (
		<Suspense fallback={<PageLoading />}>
			<EnquiryPageContent />
		</Suspense>
	);
}

const STATUS_COLORS: Record<number, "success" | "error" | "warning" | "info" | "default"> = {
	[STATUS_IDS.DRAFT]: "default",
	[STATUS_IDS.OPEN]: "info",
	[STATUS_IDS.PENDING_APPROVAL]: "warning",
	[STATUS_IDS.APPROVED]: "success",
	[STATUS_IDS.REJECTED]: "error",
	[STATUS_IDS.CLOSED]: "info",
	[STATUS_IDS.CANCELLED]: "error",
};

function EnquiryPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const modeParam = (searchParams?.get("mode") || "create").toLowerCase();
	const requestedId = searchParams?.get("id") || "";
	const menuIdFromUrl = searchParams?.get("menu_id") || "";
	const mode: MuiFormMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";

	const { coId } = useSelectedCompanyCoId();
	const branchOptions = useBranchOptions();
	const { getMenuId } = useMenuId({ transactionType: "priceEnquiry", menuIdFromUrl });

	// ── Form state ──
	const {
		initialValues,
		setInitialValues,
		formValues,
		setFormValues,
		formKey,
		bumpFormKey,
		formRef,
		lineItems,
		setLineItems,
		selectedSuppliers,
		setSelectedSuppliers,
	} = useEnquiryFormState({ mode });

	// ── Setup data ──
	const [setupData, setSetupData] = React.useState<EnquirySetupData | null>(null);
	const [loading, setLoading] = React.useState(mode !== "create");
	const [pageError, setPageError] = React.useState<string | null>(null);
	const [saving, setSaving] = React.useState(false);
	// Guards workflow actions (approve/cancel/...) against double submits.
	const [actionBusy, setActionBusy] = React.useState(false);
	// enquiry_type has no form field, so keep it out of MuiForm state (which
	// replaces values wholesale) or edits would silently reset it to Regular.
	const [enquiryType, setEnquiryType] = React.useState<string>("Regular");
	// Tracks the last branch seen so a user-driven branch change can
	// cascade-reset indent-sourced line items.
	const lastBranchRef = React.useRef<string>("");

	const { supplierOptions, expenseOptions, projectOptions } = useEnquirySelectOptions({ setupData });

	// ── Enquiry details (for edit/view) ──
	const [enquiryStatusId, setEnquiryStatusId] = React.useState<number>(STATUS_IDS.DRAFT);
	const [enquiryStatusName, setEnquiryStatusName] = React.useState<string>("Draft");
	const [approvalPermissions, setApprovalPermissions] = React.useState<Record<string, boolean>>({});
	const [responses, setResponses] = React.useState<EnquiryResponseSummary[]>([]);
	// Raw supplier rows (incl. sent_status) + header info for the RFQ document.
	const [rawSuppliers, setRawSuppliers] = React.useState<EnquirySupplierInfo[]>([]);
	const [previewHeader, setPreviewHeader] = React.useState<EnquiryPreviewHeader>({});
	const [rfqPreviewOpen, setRfqPreviewOpen] = React.useState(false);

	// ── Indent items dialog ──
	const [indentDialogOpen, setIndentDialogOpen] = React.useState(false);
	const [availableIndentItems, setAvailableIndentItems] = React.useState<IndentLineItemForEnquiry[]>([]);
	const [selectedIndentIds, setSelectedIndentIds] = React.useState<Set<number>>(new Set());
	const [loadingIndentItems, setLoadingIndentItems] = React.useState(false);
	const [indentSearchQuery, setIndentSearchQuery] = React.useState("");

	const filteredIndentItems = React.useMemo(() => {
		const q = indentSearchQuery.trim().toLowerCase();
		if (!q) return availableIndentItems;
		return availableIndentItems.filter((item) => {
			const indentNo = String(item.indent_no ?? "").toLowerCase();
			const itemCode = String(item.item_code ?? "").toLowerCase();
			const itemName = String(item.item_name ?? "").toLowerCase();
			const makeName = String(item.item_make_name ?? "").toLowerCase();
			return (
				indentNo.includes(q) ||
				itemCode.includes(q) ||
				itemName.includes(q) ||
				makeName.includes(q)
			);
		});
	}, [indentSearchQuery, availableIndentItems]);

	const branchValue = React.useMemo(() => {
		const fromForm = formValues.branch != null ? String(formValues.branch) : "";
		return fromForm;
	}, [formValues.branch]);

	// ── Fetch setup data ──
	React.useEffect(() => {
		if (!coId) return;
		let cancelled = false;
		const load = async () => {
			try {
				const data = await fetchEnquirySetup(coId, branchValue || undefined);
				if (!cancelled) setSetupData(data);
			} catch (err) {
				if (!cancelled) {
					const msg = err instanceof Error ? err.message : "Failed to load setup data";
					setPageError(msg);
				}
			}
		};
		void load();
		return () => { cancelled = true; };
	}, [coId, branchValue]);

	// ── Load enquiry data in edit/view mode ──
	React.useEffect(() => {
		if (mode === "create") return;
		if (!requestedId) {
			setLoading(false);
			setPageError("Missing enquiry id — open this page from the enquiry list.");
			return;
		}
		if (!coId) return;
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			try {
				const data = await getEnquiryById(requestedId, coId, menuIdFromUrl || undefined);
				if (cancelled) return;

				const raw = data as Record<string, unknown>;
				setEnquiryStatusId(Number(raw.status_id) || STATUS_IDS.DRAFT);
				setEnquiryStatusName(String(raw.status_name || "Draft"));

				if (raw.approval_permissions) {
					setApprovalPermissions(raw.approval_permissions as Record<string, boolean>);
				}

				setEnquiryType(String(raw.enquiry_type || "Regular"));

				const nextValues: Record<string, unknown> = {
					branch: raw.branch_id != null ? String(raw.branch_id) : "",
					date: raw.price_enquiry_date ? String(raw.price_enquiry_date).split("T")[0] : "",
					expense_type: raw.expense_type_id != null ? String(raw.expense_type_id) : "",
					project: raw.project_id != null ? String(raw.project_id) : "",
					remarks: raw.remarks ?? "",
				};
				lastBranchRef.current = String(nextValues.branch ?? "");
				setInitialValues(nextValues);
				setFormValues(nextValues);
				bumpFormKey();

				if (Array.isArray(raw.items)) {
					const items = (raw.items as Record<string, unknown>[]).map((item, idx) => ({
						id: `loaded-${idx}-${Date.now()}`,
						indentDtlId: item.indent_dtl_id != null ? Number(item.indent_dtl_id) : undefined,
						indentNo: item.indent_no != null ? String(item.indent_no) : undefined,
						itemId: item.item_id != null ? Number(item.item_id) : undefined,
						itemCode: String(item.item_code || ""),
						itemName: String(item.item_name || ""),
						itemMakeId: item.item_make_id != null ? Number(item.item_make_id) : null,
						itemMakeName: item.item_make_name != null ? String(item.item_make_name) : null,
						uomId: item.uom_id != null ? Number(item.uom_id) : undefined,
						uomName: String(item.uom_name || ""),
						qty: item.qty != null ? Number(item.qty) : undefined,
						remarks: item.remarks != null ? String(item.remarks) : undefined,
					} satisfies EnquiryLineItem));
					setLineItems(items);
				}

				if (Array.isArray(raw.suppliers)) {
					const suppliers = (raw.suppliers as Record<string, unknown>[]).map((s) => ({
						supplierId: Number(s.supplier_id),
						supplierName: String(s.supp_name || ""),
						supplierCode: String(s.supp_code || ""),
					} satisfies EnquirySupplierEntry));
					setSelectedSuppliers(suppliers);
					setRawSuppliers(raw.suppliers as EnquirySupplierInfo[]);
				}

				setPreviewHeader({
					enquiryNo: String(raw.price_enquiry_squence_no || raw.enquiry_no || ""),
					enquiryDate: raw.price_enquiry_date ? String(raw.price_enquiry_date) : undefined,
					branchName: raw.branch_name ? String(raw.branch_name) : undefined,
					companyName: raw.co_name ? String(raw.co_name) : undefined,
					expenseType: raw.expense_type_name ? String(raw.expense_type_name) : undefined,
					project: raw.project_name ? String(raw.project_name) : undefined,
					remarks: raw.remarks ? String(raw.remarks) : undefined,
				});

				if (Array.isArray(raw.responses)) {
					setResponses(raw.responses as EnquiryResponseSummary[]);
				} else {
					setResponses([]);
				}
			} catch (err) {
				if (!cancelled) {
					const msg = err instanceof Error ? err.message : "Failed to load enquiry";
					setPageError(msg);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		void load();
		return () => { cancelled = true; };
	}, [mode, requestedId, coId, menuIdFromUrl, setInitialValues, setFormValues, bumpFormKey, setLineItems, setSelectedSuppliers]);

	// ── Header form schema ──
	const headerSchema = React.useMemo<Schema>(() => ({
		fields: [
			{
				name: "branch",
				label: "Branch",
				type: "select" as const,
				options: branchOptions,
				required: true,
				gridProps: { xs: 12, sm: 6, md: 3 },
			},
			{
				name: "date",
				label: "Enquiry Date",
				type: "date" as const,
				required: true,
				gridProps: { xs: 12, sm: 6, md: 3 },
			},
			{
				name: "expense_type",
				label: "Expense Type",
				type: "select" as const,
				options: expenseOptions,
				gridProps: { xs: 12, sm: 6, md: 3 },
			},
			{
				name: "project",
				label: "Project",
				type: "select" as const,
				options: projectOptions,
				gridProps: { xs: 12, sm: 6, md: 3 },
			},
			{
				name: "remarks",
				label: "Remarks",
				type: "textarea" as const,
				gridProps: { xs: 12 },
			},
		],
	}), [branchOptions, expenseOptions, projectOptions]);

	// ── Handle form values change ──
	// Changing the branch invalidates any indent-sourced lines (indent items
	// are branch-scoped), so cascade-reset them rather than let an enquiry be
	// saved under branch B with branch A's indent lines.
	const handleFormValuesChange = React.useCallback((values: Record<string, unknown>) => {
		const nextBranch = values.branch != null ? String(values.branch) : "";
		const prevBranch = lastBranchRef.current;
		lastBranchRef.current = nextBranch;
		if (prevBranch && nextBranch && prevBranch !== nextBranch) {
			setLineItems((items) => {
				if (items.length > 0) {
					toast({ title: "Branch changed — indent items cleared" });
				}
				return items.length > 0 ? [] : items;
			});
		}
		setFormValues(values);
	}, [setFormValues, setLineItems]);

	// ── Open indent items dialog ──
	const handleOpenIndentDialog = React.useCallback(async () => {
		if (!branchValue) {
			toast({ variant: "destructive", title: "Please select a branch first" });
			return;
		}
		setLoadingIndentItems(true);
		setIndentDialogOpen(true);
		try {
			const response = await fetchApprovedIndentItems(branchValue);
			const items = Array.isArray(response) ? response : (response as Record<string, unknown>).data as IndentLineItemForEnquiry[] ?? [];
			setAvailableIndentItems(items);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to load indent items";
			toast({ variant: "destructive", title: "Error", description: msg });
		} finally {
			setLoadingIndentItems(false);
		}
	}, [branchValue, toast]);

	// ── Toggle indent item selection ──
	const toggleIndentItem = React.useCallback((dtlId: number) => {
		setSelectedIndentIds((prev) => {
			const next = new Set(prev);
			if (next.has(dtlId)) next.delete(dtlId);
			else next.add(dtlId);
			return next;
		});
	}, []);

	// ── Add selected indent items to line items ──
	const handleAddIndentItems = React.useCallback(() => {
		const existingDtlIds = new Set(lineItems.map((li) => li.indentDtlId).filter(Boolean));
		const newItems: EnquiryLineItem[] = [];

		for (const dtlId of selectedIndentIds) {
			if (existingDtlIds.has(dtlId)) continue;
			const item = availableIndentItems.find((i) => i.indent_dtl_id === dtlId);
			if (!item) continue;
			newItems.push({
				id: `indent-${dtlId}-${Date.now()}`,
				indentDtlId: item.indent_dtl_id,
				indentNo: String(item.indent_no),
				itemId: item.item_id,
				itemCode: item.item_code,
				itemName: item.item_name,
				itemMakeId: item.item_make_id,
				itemMakeName: item.item_make_name,
				uomId: item.uom_id,
				uomName: item.uom_name,
				qty: item.qty,
				remarks: item.remarks ?? undefined,
			});
		}

		setLineItems((prev) => [...prev, ...newItems]);
		setIndentDialogOpen(false);
		setSelectedIndentIds(new Set());
		setIndentSearchQuery("");

		if (newItems.length > 0) {
			toast({ title: `Added ${newItems.length} item(s) from indent` });
		}
	}, [selectedIndentIds, availableIndentItems, lineItems, setLineItems, toast]);

	// ── Remove line item ──
	const handleRemoveItem = React.useCallback((id: string) => {
		setLineItems((prev) => prev.filter((li) => li.id !== id));
	}, [setLineItems]);

	// ── Save (Create/Update) ──
	const handleSave = React.useCallback(async () => {
		if (!branchValue) {
			toast({ variant: "destructive", title: "Please select a branch" });
			return;
		}
		if (!formValues.date || String(formValues.date).trim() === "") {
			toast({ variant: "destructive", title: "Please select an enquiry date" });
			return;
		}
		if (lineItems.length === 0) {
			toast({ variant: "destructive", title: "Please add at least one item" });
			return;
		}
		if (selectedSuppliers.length === 0) {
			toast({ variant: "destructive", title: "Please select at least one supplier" });
			return;
		}

		setSaving(true);
		try {
			const payload = {
				branch_id: branchValue,
				date: formValues.date,
				expense_type_id: formValues.expense_type || null,
				project_id: formValues.project || null,
				remarks: formValues.remarks || null,
				enquiry_type: enquiryType || "Regular",
				items: lineItems.map((li) => ({
					item_id: li.itemId,
					item_make_id: li.itemMakeId,
					uom_id: li.uomId,
					qty: li.qty,
					remarks: li.remarks,
					indent_dtl_id: li.indentDtlId,
				})),
				suppliers: selectedSuppliers.map((s) => ({
					supplier_id: s.supplierId,
					supplier_branch_id: null,
				})),
			};

			if (mode === "create") {
				const result = await createEnquiry(payload);
				toast({ title: "Price enquiry created successfully" });
				router.push(hubUrl(String(result.enquiry_id), getMenuId()));
			} else {
				await updateEnquiry({ ...payload, enquiry_id: requestedId });
				toast({ title: "Price enquiry updated successfully" });
				router.push(hubUrl(requestedId, getMenuId()));
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to save enquiry";
			toast({ variant: "destructive", title: "Error", description: msg });
		} finally {
			setSaving(false);
		}
	}, [branchValue, lineItems, selectedSuppliers, formValues, enquiryType, mode, requestedId, router, getMenuId, toast]);

	// ── Approval actions ──
	// Re-fetch the enquiry after a workflow action so the status chip, action
	// buttons, and approval permissions reflect the new state immediately
	// (router.refresh() alone does not re-run this client component's fetch).
	const refreshEnquiryState = React.useCallback(async () => {
		if (!requestedId || !coId) return;
		try {
			const data = await getEnquiryById(requestedId, coId, getMenuId() || undefined);
			const raw = data as Record<string, unknown>;
			setEnquiryStatusId(Number(raw.status_id) || STATUS_IDS.DRAFT);
			setEnquiryStatusName(String(raw.status_name || "Draft"));
			setApprovalPermissions(
				(raw.approval_permissions as Record<string, boolean>) ?? {},
			);
			if (Array.isArray(raw.responses)) {
				setResponses(raw.responses as EnquiryResponseSummary[]);
			}
			if (Array.isArray(raw.suppliers)) {
				setRawSuppliers(raw.suppliers as EnquirySupplierInfo[]);
			}
		} catch {
			// Fall back to a router refresh if the inline reload fails.
			router.refresh();
		}
	}, [requestedId, coId, getMenuId, router]);

	const handleSendForApproval = React.useCallback(async () => {
		if (actionBusy) return;
		const menuId = getMenuId();
		if (!menuId) {
			toast({ variant: "destructive", title: "Menu ID not available" });
			return;
		}
		setActionBusy(true);
		try {
			await sendEnquiryForApproval(requestedId, menuId);
			toast({ title: "Enquiry sent for approval" });
			await refreshEnquiryState();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to send for approval";
			toast({ variant: "destructive", title: "Error", description: msg });
		} finally {
			setActionBusy(false);
		}
	}, [actionBusy, requestedId, getMenuId, refreshEnquiryState, toast]);

	const handleApprove = React.useCallback(async () => {
		if (actionBusy) return;
		const menuId = getMenuId();
		if (!menuId) return;
		setActionBusy(true);
		try {
			await approveEnquiry(requestedId, menuId);
			toast({ title: "Enquiry approved" });
			await refreshEnquiryState();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Approval failed";
			toast({ variant: "destructive", title: "Error", description: msg });
		} finally {
			setActionBusy(false);
		}
	}, [actionBusy, requestedId, getMenuId, refreshEnquiryState, toast]);

	const handleReject = React.useCallback(async () => {
		if (actionBusy) return;
		const menuId = getMenuId();
		if (!menuId) return;
		setActionBusy(true);
		try {
			await rejectEnquiry(requestedId, menuId, "Rejected");
			toast({ title: "Enquiry rejected" });
			await refreshEnquiryState();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Rejection failed";
			toast({ variant: "destructive", title: "Error", description: msg });
		} finally {
			setActionBusy(false);
		}
	}, [actionBusy, requestedId, getMenuId, refreshEnquiryState, toast]);

	const handleCancel = React.useCallback(async () => {
		if (actionBusy) return;
		setActionBusy(true);
		try {
			await cancelEnquiry(requestedId);
			toast({ title: "Enquiry cancelled" });
			await refreshEnquiryState();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Cancellation failed";
			toast({ variant: "destructive", title: "Error", description: msg });
		} finally {
			setActionBusy(false);
		}
	}, [actionBusy, requestedId, refreshEnquiryState, toast]);

	const handleReopen = React.useCallback(async () => {
		if (actionBusy) return;
		setActionBusy(true);
		try {
			await reopenEnquiry(requestedId);
			toast({ title: "Enquiry reopened" });
			await refreshEnquiryState();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Reopen failed";
			toast({ variant: "destructive", title: "Error", description: msg });
		} finally {
			setActionBusy(false);
		}
	}, [actionBusy, requestedId, refreshEnquiryState, toast]);

	// ── RFQ print → mark suppliers as sent ──
	const handleRfqPrinted = React.useCallback(async (supplierIds: number[]) => {
		try {
			await markRfqSent(requestedId, supplierIds.length > 0 ? supplierIds : undefined);
			await refreshEnquiryState();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to record RFQ as sent";
			toast({ variant: "destructive", title: "Error", description: msg });
		}
	}, [requestedId, refreshEnquiryState, toast]);

	// ── Navigation ──
	const navigateToCreateResponse = React.useCallback(
		(supplierId: number) => {
			router.push(createResponseUrl(requestedId, supplierId, getMenuId()));
		},
		[router, requestedId, getMenuId],
	);

	const navigateToEditResponse = React.useCallback(
		(responseId: number) => {
			router.push(editResponseUrl(requestedId, responseId, getMenuId()));
		},
		[router, requestedId, getMenuId],
	);

	const navigateToViewResponse = React.useCallback(
		(responseId: number) => {
			router.push(viewResponseUrl(requestedId, responseId, getMenuId()));
		},
		[router, requestedId, getMenuId],
	);

	const navigateToComparison = React.useCallback(() => {
		router.push(compareUrl(requestedId, getMenuId()));
	}, [router, requestedId, getMenuId]);

	const navigateBack = React.useCallback(() => {
		router.push(indexUrl(getMenuId()));
	}, [router, getMenuId]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-100">
				<CircularProgress />
			</div>
		);
	}

	if (pageError) {
		return (
			<div className="p-4">
				<Alert severity="error">{pageError}</Alert>
				<Button onClick={navigateBack} className="mt-4">Back to List</Button>
			</div>
		);
	}

	const isEditable = mode !== "view" && enquiryStatusId === STATUS_IDS.DRAFT;
	const isApproved = enquiryStatusId === STATUS_IDS.APPROVED || enquiryStatusId === STATUS_IDS.CLOSED;

	return (
		<div className="flex flex-col gap-4 p-4">
			{/* Page Header */}
			<div className="flex justify-between items-center flex-wrap gap-2">
				<div className="flex items-center gap-3">
					<Button variant="outlined" size="small" onClick={navigateBack}>
						Back
					</Button>
					<Typography variant="h5">
						{mode === "create"
							? "Create Price Enquiry"
							: mode === "edit"
								? "Edit Price Enquiry"
								: "Price Enquiry Details"}
					</Typography>
					{mode !== "create" && (
						<Chip
							label={enquiryStatusName}
							color={STATUS_COLORS[enquiryStatusId] ?? "default"}
							size="small"
						/>
					)}
				</div>
				<div className="flex gap-2 flex-wrap">
					{mode === "view" && isApproved && (
						<Button variant="outlined" onClick={() => setRfqPreviewOpen(true)}>
							Print RFQ
						</Button>
					)}
					{isEditable && (
						<Button
							variant="contained"
							onClick={handleSave}
							disabled={saving}
						>
							{saving ? "Saving..." : "Save as Draft"}
						</Button>
					)}
					{mode === "view" && enquiryStatusId === STATUS_IDS.DRAFT && (
						<Button variant="contained" color="primary" onClick={handleSendForApproval} disabled={actionBusy}>
							Send for Approval
						</Button>
					)}
					{mode === "view" && approvalPermissions.canApprove && (
						<Button variant="contained" color="success" onClick={handleApprove} disabled={actionBusy}>
							Approve
						</Button>
					)}
					{mode === "view" && approvalPermissions.canReject && (
						<Button variant="contained" color="error" onClick={handleReject} disabled={actionBusy}>
							Reject
						</Button>
					)}
					{mode === "view" &&
						(enquiryStatusId === STATUS_IDS.DRAFT || enquiryStatusId === STATUS_IDS.OPEN) && (
							<Button variant="outlined" color="error" onClick={handleCancel} disabled={actionBusy}>
								Cancel Enquiry
							</Button>
						)}
					{mode === "view" &&
						(enquiryStatusId === STATUS_IDS.CANCELLED || enquiryStatusId === STATUS_IDS.REJECTED) && (
							<Button variant="outlined" color="primary" onClick={handleReopen} disabled={actionBusy}>
								Reopen
							</Button>
						)}
				</div>
			</div>

			<Divider />

			{/* Header Form */}
			<Paper className="p-4">
				<Typography variant="subtitle1" className="mb-2 font-semibold">
					Enquiry Details
				</Typography>
				<EnquiryHeaderForm
					schema={headerSchema}
					formKey={formKey}
					initialValues={initialValues}
					mode={isEditable ? mode : "view"}
					formRef={formRef}
					onSubmit={async () => {}}
					onValuesChange={handleFormValuesChange}
				/>
			</Paper>

			{/* Line Items */}
			<Paper className="p-4">
				<div className="flex justify-between items-center mb-3">
					<Typography variant="subtitle1" className="font-semibold">
						Items ({lineItems.length})
					</Typography>
					{isEditable && (
						<Button variant="outlined" size="small" onClick={handleOpenIndentDialog}>
							Add from Indent
						</Button>
					)}
				</div>
				{lineItems.length === 0 ? (
					<Typography variant="body2" color="textSecondary">
						No items added. Click &quot;Add from Indent&quot; to select approved indent items.
					</Typography>
				) : (
					<EnquiryLineItemsTable
						items={lineItems}
						canEdit={isEditable}
						onRemoveItems={
							isEditable
								? (ids) => ids.forEach((id) => handleRemoveItem(id))
								: undefined
						}
					/>
				)}
			</Paper>

			{/* Supplier Selection */}
			<Paper className="p-4">
				<Typography variant="subtitle1" className="mb-2 font-semibold">
					Suppliers ({selectedSuppliers.length})
				</Typography>
				<EnquirySupplierSelect
					supplierOptions={supplierOptions}
					suppliers={setupData?.suppliers ?? []}
					selectedSuppliers={selectedSuppliers}
					onSuppliersChange={setSelectedSuppliers}
					readOnly={!isEditable}
				/>
			</Paper>

			{/* View mode actions: Record / Edit / View / Compare */}
			{mode === "view" && isApproved && (
				<Paper className="p-4">
					<div className="flex justify-between items-center mb-3 flex-wrap gap-2">
						<Typography variant="subtitle1" className="font-semibold">
							Supplier Responses ({responses.length}/{selectedSuppliers.length})
						</Typography>
						{responses.length > 0 && (
							<Button
								variant="contained"
								color="primary"
								size="small"
								onClick={navigateToComparison}
							>
								Compare Responses
							</Button>
						)}
					</div>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Supplier</TableCell>
								<TableCell>Response Date</TableCell>
								<TableCell align="right">Net Amount</TableCell>
								<TableCell>Status</TableCell>
								<TableCell align="right">Actions</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{selectedSuppliers.map((s) => {
								const resp = responses.find((r) => r.supplier_id === s.supplierId);
								const respId = resp?.proc_price_enquiry_response_id;
								const rawSupp = rawSuppliers.find((rs) => rs.supplier_id === s.supplierId);
								const rfqSent = Number(rawSupp?.sent_status ?? 0) === 1;
								return (
									<TableRow key={s.supplierId} hover>
										<TableCell>{s.supplierName}</TableCell>
										<TableCell>
											{resp?.response_date
												? String(resp.response_date).slice(0, 10)
												: "-"}
										</TableCell>
										<TableCell align="right">
											{resp?.net_amount != null ? resp.net_amount : "-"}
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												{resp ? (
													resp.is_selected === 1 ? (
														<Chip size="small" color="success" label="Selected" />
													) : (
														<Chip size="small" color="info" label="Received" />
													)
												) : rfqSent ? (
													<Chip size="small" color="primary" variant="outlined" label="RFQ Sent" />
												) : (
													<Chip size="small" label="Pending" />
												)}
											</div>
										</TableCell>
										<TableCell align="right">
											<div className="flex gap-1 justify-end">
												{!resp && (
													<Button
														size="small"
														variant="outlined"
														onClick={() => navigateToCreateResponse(s.supplierId)}
													>
														Record
													</Button>
												)}
												{resp && respId != null && (
													<>
														<Button
															size="small"
															variant="outlined"
															onClick={() => navigateToEditResponse(respId)}
														>
															Edit
														</Button>
														<Button
															size="small"
															variant="text"
															onClick={() => navigateToViewResponse(respId)}
														>
															View
														</Button>
													</>
												)}
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Paper>
			)}

			{/* RFQ Print Preview */}
			<EnquiryPreview
				open={rfqPreviewOpen}
				onClose={() => setRfqPreviewOpen(false)}
				header={previewHeader}
				items={lineItems}
				suppliers={rawSuppliers}
				onPrinted={handleRfqPrinted}
			/>

			{/* Indent Items Selection Dialog */}
			<Dialog
				open={indentDialogOpen}
				onClose={() => {
					setIndentDialogOpen(false);
					setIndentSearchQuery("");
					setSelectedIndentIds(new Set());
				}}
				maxWidth="md"
				fullWidth
			>
				<DialogTitle>Select Approved Indent Items</DialogTitle>
				<DialogContent>
					{loadingIndentItems ? (
						<Box className="flex justify-center p-8">
							<CircularProgress />
						</Box>
					) : availableIndentItems.length === 0 ? (
						<Alert severity="info">
							No approved indent items found for this branch.
						</Alert>
					) : (
						<>
							<TextField
								fullWidth
								size="small"
								label="Search"
								placeholder="Search by indent no, item code, item name, or make"
								value={indentSearchQuery}
								onChange={(e) => setIndentSearchQuery(e.target.value)}
								autoFocus
								sx={{ mt: 1, mb: 2 }}
							/>
							{filteredIndentItems.length === 0 ? (
								<Alert severity="info">
									No items match &quot;{indentSearchQuery}&quot;.
								</Alert>
							) : (
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell padding="checkbox" />
									<TableCell>Indent No</TableCell>
									<TableCell>Item Code</TableCell>
									<TableCell>Item Name</TableCell>
									<TableCell>Make</TableCell>
									<TableCell>UOM</TableCell>
									<TableCell align="right">Qty</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{filteredIndentItems.map((item) => {
									const alreadyAdded = lineItems.some(
										(li) => li.indentDtlId === item.indent_dtl_id,
									);
									return (
										<TableRow
											key={item.indent_dtl_id}
											hover
											onClick={() => !alreadyAdded && toggleIndentItem(item.indent_dtl_id)}
											sx={{ cursor: alreadyAdded ? "default" : "pointer", opacity: alreadyAdded ? 0.5 : 1 }}
										>
											<TableCell padding="checkbox">
												<Checkbox
													checked={selectedIndentIds.has(item.indent_dtl_id) || alreadyAdded}
													disabled={alreadyAdded}
												/>
											</TableCell>
											<TableCell>{item.indent_no}</TableCell>
											<TableCell>{item.item_code}</TableCell>
											<TableCell>{item.item_name}</TableCell>
											<TableCell>{item.item_make_name ?? "-"}</TableCell>
											<TableCell>{item.uom_name}</TableCell>
											<TableCell align="right">{item.qty}</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
							)}
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => {
							setIndentDialogOpen(false);
							setIndentSearchQuery("");
							setSelectedIndentIds(new Set());
						}}
					>
						Cancel
					</Button>
					<Button
						variant="contained"
						onClick={handleAddIndentItems}
						disabled={selectedIndentIds.size === 0}
					>
						Add Selected ({selectedIndentIds.size})
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
}
