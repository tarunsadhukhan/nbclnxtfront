"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
	createInvoice,
	updateInvoice,
	sendInvoiceForApproval,
	fetchGovtSackingSource,
	type InvoiceDetails,
	type CreateInvoiceRequest,
	type SaveInvoiceRequest,
} from "@/utils/salesInvoiceService";
import type {
	GovtSackingSourceDetail,
	GovtSackingSourceRow,
	InvoiceSetupData,
} from "../types/salesInvoiceTypes";
import { GovtSackingSourcePicker } from "./GovtSackingSourcePicker";
import { GovtSackingSourcePreview } from "./GovtSackingSourcePreview";
import SalesInvoicePreview from "./SalesInvoicePreview";
import { SalesInvoiceApprovalBar } from "./SalesInvoiceApprovalBar";
import { GOVT_SKG_FREIGHT_INVOICE_TYPE_ID } from "../utils/salesInvoiceConstants";
import { computeFreightTax, FREIGHT_GST_PERCENT } from "../utils/freightTax";
import { buildFreightPreviewProps } from "../utils/buildFreightPreviewProps";
import { buildFreightCreatePreviewProps } from "../utils/buildFreightCreatePreviewProps";
import { useSalesInvoiceApproval } from "../hooks/useSalesInvoiceApproval";

const FOOTER_NOTES_MAX = 252;

type Mode = "create" | "view" | "edit";

const isRailMode = (modeStr?: string | null): boolean =>
	!!modeStr && String(modeStr).toUpperCase().trim() === "RAIL";

type Props = {
	coId: string;
	branchId: string;
	mode: Mode;
	existingInvoice?: InvoiceDetails | null;
	menuId?: string;
	setupData?: InvoiceSetupData | null;
	requestedId?: string;
	setInvoiceDetails?: React.Dispatch<React.SetStateAction<InvoiceDetails | null>>;
	getMenuId?: () => string;
};

type FreightFormState = {
	sources: GovtSackingSourceDetail[];
	sourceRows: GovtSackingSourceRow[];
	invoiceDate: string;
	iwBillNo: string;
	iwBillDate: string;
	containerNo: string;
	vehicleNo: string;
	freightAmount: string;
	balesQty: string;
};

type Errors = Partial<Record<keyof FreightFormState | "identity", string>>;

// Must mirror FREIGHT_SOURCE_IDENTITY_FIELDS in the backend. Front-end check is
// advisory only — backend re-validates and is authoritative.
const FREIGHT_IDENTITY_FIELDS: Array<{ key: keyof GovtSackingSourceDetail["header"]; label: string }> = [
	{ key: "party_id", label: "buyer / party" },
	{ key: "branch_id", label: "branch" },
	{ key: "billing_to_id", label: "billing party" },
	{ key: "shipping_to_id", label: "shipping party" },
	{ key: "transporter_id", label: "transporter" },
	{ key: "transporter_branch_id", label: "transporter branch" },
	{ key: "sales_order_id", label: "sales order" },
	{ key: "sales_delivery_order_id", label: "delivery order" },
	{ key: "buyer_order_no", label: "buyer order number" },
	{ key: "buyer_order_date", label: "buyer order date" },
	{ key: "pcso_no", label: "PCSO number" },
	{ key: "pcso_date", label: "PCSO date" },
	{ key: "administrative_office_address", label: "administrative office address" },
	{ key: "destination_rail_head", label: "destination rail head" },
	{ key: "loading_point", label: "loading point" },
	{ key: "mode_of_transport", label: "mode of transport" },
];

function findFreightIdentityMismatch(sources: GovtSackingSourceDetail[]): string | null {
	if (sources.length <= 1) return null;
	const primary = sources[0].header;
	for (let i = 1; i < sources.length; i++) {
		const hdr = sources[i].header;
		for (const { key, label } of FREIGHT_IDENTITY_FIELDS) {
			if (primary[key] !== hdr[key]) {
				return `Source invoices must share the same ${label}. Invoice ${primary.invoice_no} differs from invoice ${hdr.invoice_no}.`;
			}
		}
		const primaryItem = sources[0].lines[0]?.item_id;
		const otherItem = sources[i].lines[0]?.item_id;
		if (primaryItem !== otherItem) {
			return `Source invoices must share the same item. Invoice ${primary.invoice_no} differs from invoice ${hdr.invoice_no}.`;
		}
	}
	return null;
}

const todayISO = (): string => {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
};

const buildFooterNotes = (state: FreightFormState): string => {
	const primary = state.sources[0];
	if (!primary) return "";
	const segments: string[] = [];
	if (state.sources.length > 0) {
		const list = state.sources
			.map((s) => {
				const inv = s.header.invoice_no_formatted ?? s.header.invoice_no ?? "—";
				return s.header.invoice_date ? `${inv} dated ${s.header.invoice_date}` : String(inv);
			})
			.join(", ");
		segments.push(`Source Invoices: ${list}`);
	}
	const pcsoNo = primary.header.pcso_no;
	const pcsoDate = primary.header.pcso_date;
	if (pcsoNo) segments.push(`PCSO No.${pcsoNo}${pcsoDate ? ` Date:${pcsoDate}` : ""}`);
	const doFmt = primary.header.delivery_order_no_formatted ?? primary.header.delivery_order_no;
	if (doFmt != null) segments.push(`DO ${doFmt}`);
	if (state.iwBillNo) {
		const iwLabel = isRailMode(primary.header.mode_of_transport) ? "RR No." : "IW Bill No.";
		segments.push(`${iwLabel}${state.iwBillNo}${state.iwBillDate ? ` Date:${state.iwBillDate}` : ""}`);
	}
	if (state.containerNo) segments.push(`Container No.${state.containerNo}`);
	const joined = segments.join(" | ");
	if (joined.length <= FOOTER_NOTES_MAX) return joined;
	return `${joined.slice(0, FOOTER_NOTES_MAX)}...`;
};

function buildHydratedState(invoice: InvoiceDetails): FreightFormState {
	const freight = invoice.freight ?? null;
	const firstLine = invoice.lines?.[0];
	const freightAmountSource = firstLine?.netAmount ?? firstLine?.totalAmount;
	return {
		sources: [],
		sourceRows: [],
		invoiceDate: invoice.invoiceDate ?? "",
		iwBillNo: freight?.iwBillNo ?? "",
		iwBillDate: freight?.iwBillDate ?? "",
		containerNo: invoice.containerNo ?? "",
		vehicleNo: invoice.vehicleNo ?? "",
		freightAmount: freightAmountSource != null ? String(freightAmountSource) : "",
		balesQty: firstLine?.quantity != null ? String(firstLine.quantity) : "",
	};
}

export function GovtSackingFreightForm({ coId, branchId, mode, existingInvoice, menuId, setupData, requestedId, setInvoiceDetails, getMenuId: getMenuIdProp }: Props) {
	const router = useRouter();
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const [state, setState] = React.useState<FreightFormState>(() => {
		if ((mode === "view" || mode === "edit") && existingInvoice) return buildHydratedState(existingInvoice);
		const today = todayISO();
		return {
			sources: [],
			sourceRows: [],
			invoiceDate: today,
			iwBillNo: "",
			iwBillDate: today,
			containerNo: "",
			vehicleNo: "",
			freightAmount: "",
			balesQty: "",
		};
	});

	const [errors, setErrors] = React.useState<Errors>({});
	const [submitting, setSubmitting] = React.useState(false);

	const baselineRef = React.useRef<FreightFormState | null>(null);
	React.useEffect(() => {
		if ((mode === "edit" || mode === "view") && existingInvoice) {
			baselineRef.current = buildHydratedState(existingInvoice);
		}
	}, [mode, existingInvoice]);

	const hasUnsavedChanges = React.useMemo(() => {
		const b = baselineRef.current;
		if (!b) return false;
		return b.invoiceDate !== state.invoiceDate
			|| b.iwBillNo !== state.iwBillNo
			|| b.iwBillDate !== state.iwBillDate
			|| b.containerNo !== state.containerNo
			|| b.vehicleNo !== state.vehicleNo
			|| b.freightAmount !== state.freightAmount
			|| b.balesQty !== state.balesQty;
	}, [state]);

	const identityError = React.useMemo(
		() => findFreightIdentityMismatch(state.sources),
		[state.sources],
	);

	const formValuesForApproval = React.useMemo(() => ({ branch: branchId }), [branchId]);
	const getMenuIdCb = React.useCallback(() => {
		if (getMenuIdProp) return getMenuIdProp();
		return menuId ?? "";
	}, [getMenuIdProp, menuId]);
	const noopSetInvoice = React.useCallback<React.Dispatch<React.SetStateAction<InvoiceDetails | null>>>(() => {}, []);
	const {
		approvalLoading,
		approvalInfo,
		approvalPermissions,
		handleApprove,
		handleReject,
		handleOpen,
		handleCancelDraft,
		handleReopen,
		handleSendForApproval,
		handleViewApprovalLog,
	} = useSalesInvoiceApproval({
		mode,
		requestedId: requestedId ?? "",
		formValues: formValuesForApproval,
		invoiceDetails: existingInvoice ?? null,
		coId,
		getMenuId: getMenuIdCb,
		setInvoiceDetails: setInvoiceDetails ?? noopSetInvoice,
	});

	// Re-fetch every source Govt Sacking detail in view/edit modes so tax
	// computation (intra/inter-state) and the source preview block render.
	// The saved invoice carries sourceIds via freight.sources (or freight.source
	// for legacy single-source rows); we need each full header/lines payload.
	React.useEffect(() => {
		if (mode === "create") return;
		const freight = existingInvoice?.freight ?? null;
		const ids: number[] = [];
		if (freight?.sources?.length) {
			for (const s of freight.sources) {
				if (s.invoice_id != null) ids.push(Number(s.invoice_id));
			}
		} else {
			const fallback = freight?.source?.invoice_id ?? freight?.sourceInvoiceId;
			if (fallback != null) ids.push(Number(fallback));
		}
		if (ids.length === 0 || !coId) return;
		let cancelled = false;
		Promise.all(ids.map((id) => fetchGovtSackingSource(id, coId).catch(() => null)))
			.then((results) => {
				if (cancelled) return;
				const sources = results
					.map((r) => r?.data)
					.filter((d): d is GovtSackingSourceDetail => !!d);
				setState((prev) => ({ ...prev, sources }));
			})
			.catch(() => {
				/* silent — preview will fall back to stored govtskg fields */
			});
		return () => {
			cancelled = true;
		};
	}, [mode, existingInvoice, coId]);

	// Tracks the selection key (sorted invoice_id list) we last applied auto-fills
	// for. The picker may call handleSourceSelect multiple times for one user
	// selection — once optimistically with partial details, then again as each
	// fetch resolves — and we must NOT overwrite the user's manual edits to
	// vehicle / container / bales each time. Only preset when the selection set
	// itself changes.
	const lastAppliedSelectionKeyRef = React.useRef<string>("");

	const handleSourceSelect = React.useCallback(
		(details: GovtSackingSourceDetail[], rows: GovtSackingSourceRow[]) => {
			if (rows.length === 0) {
				lastAppliedSelectionKeyRef.current = "";
				setState((prev) => ({
					...prev,
					sources: [],
					sourceRows: [],
					vehicleNo: "",
					containerNo: "",
					balesQty: "",
				}));
				setErrors({});
				return;
			}

			const selectionKey = rows.map((r) => r.invoice_id).slice().sort((a, b) => a - b).join(",");
			const selectionChanged = selectionKey !== lastAppliedSelectionKeyRef.current;
			const allDetailsLoaded = details.length === rows.length;
			const primary = details[0];

			setState((prev) => {
				const next = { ...prev, sources: details, sourceRows: rows };
				if (selectionChanged && primary) {
					next.vehicleNo = primary.header.vehicle_no ?? "";
					next.containerNo = primary.header.container_no ?? "";
					if (allDetailsLoaded) {
						const summedQty = details.reduce((sum, d) => {
							const q = Number(d.lines[0]?.quantity);
							return Number.isFinite(q) ? sum + q : sum;
						}, 0);
						next.balesQty = summedQty > 0 ? String(summedQty) : "";
					} else {
						next.balesQty = "";
					}
				}
				return next;
			});

			if (selectionChanged) setErrors({});
			if (selectionChanged && allDetailsLoaded) {
				lastAppliedSelectionKeyRef.current = selectionKey;
			}
		},
		[],
	);

	const intraInter = React.useMemo<string | number | null>(() => {
		const src = state.sources[0]?.header;
		if (!src) return null;
		const branch = setupData?.branches?.find((b) => b.branch_id === src.branch_id);
		const companyStateCode = branch?.state_code;
		const shippingStateCode = src.shipping_state_code;
		if (companyStateCode == null || shippingStateCode == null) return src.intra_inter_state ?? null;
		return String(companyStateCode) === String(shippingStateCode) ? "0" : "1";
	}, [state.sources, setupData?.branches]);
	const freightAmountNum = Number(state.freightAmount) || 0;
	const balesQtyNum = Number(state.balesQty) || 0;

	const tax = React.useMemo(() => computeFreightTax(freightAmountNum, intraInter), [freightAmountNum, intraInter]);
	const footerNotesPreview = React.useMemo(() => buildFooterNotes(state), [state]);
	const grandTotal = +(freightAmountNum + tax.total).toFixed(2);

	const createPreviewProps = React.useMemo(
		() => buildFreightCreatePreviewProps({
			setupData: setupData ?? null,
			branchId,
			sources: state.sources,
			invoiceDate: state.invoiceDate,
			iwBillNo: state.iwBillNo,
			iwBillDate: state.iwBillDate,
			containerNo: state.containerNo,
			vehicleNo: state.vehicleNo,
			freightAmount: freightAmountNum,
			balesQty: balesQtyNum,
			footerNote: footerNotesPreview,
		}),
		[setupData, branchId, state, freightAmountNum, balesQtyNum, footerNotesPreview],
	);

	const validate = React.useCallback((): Errors => {
		const next: Errors = {};
		if (state.sources.length === 0) {
			next.sources = "Select at least one source Govt Sacking invoice";
			return next;
		}
		const mismatch = findFreightIdentityMismatch(state.sources);
		if (mismatch) {
			next.identity = mismatch;
			return next;
		}
		if (!state.invoiceDate) next.invoiceDate = "Required";
		else if (state.invoiceDate > todayISO()) next.invoiceDate = "Invoice date cannot be in the future";
		if (!state.iwBillNo.trim()) next.iwBillNo = "Required";
		else if (state.iwBillNo.length > 100) next.iwBillNo = "Max 100 characters";
		if (!state.iwBillDate) next.iwBillDate = "Required";
		// Container No is OPTIONAL: trucks dispatched without container.
		if (state.containerNo.length > 100) next.containerNo = "Max 100 characters";
		if (!state.vehicleNo.trim()) next.vehicleNo = "Required";
		else if (state.vehicleNo.length > 255) next.vehicleNo = "Max 255 characters";
		if (!state.freightAmount || freightAmountNum <= 0) next.freightAmount = "Must be greater than 0";
		if (!state.balesQty || balesQtyNum <= 0 || !Number.isInteger(balesQtyNum)) next.balesQty = "Must be a positive integer";
		return next;
	}, [state, freightAmountNum, balesQtyNum]);

	const buildPayload = React.useCallback((): CreateInvoiceRequest => {
		const primary = state.sources[0];
		if (!primary) throw new Error("Source not selected");
		const sourceIds = state.sources.map((s) => s.header.invoice_id);
		const containerNoTrimmed = state.containerNo.trim();
		return {
			branch: branchId,
			date: state.invoiceDate,
			party: String(primary.header.party_id),
			invoice_type: GOVT_SKG_FREIGHT_INVOICE_TYPE_ID,
			co_id: Number(coId),
			footer_note: footerNotesPreview || undefined,
			gross_amount: freightAmountNum,
			net_amount: grandTotal,
			freight: {
				source_invoice_ids: sourceIds,
				iw_bill_no: state.iwBillNo,
				iw_bill_date: state.iwBillDate,
				container_no: containerNoTrimmed || null,
				vehicle_no: state.vehicleNo,
				freight_amount: freightAmountNum,
				bales_qty: balesQtyNum,
			},
			items: [],
		};
	}, [state, branchId, coId, footerNotesPreview, freightAmountNum, grandTotal, balesQtyNum]);

	const submit = React.useCallback(
		async (alsoSendForApproval: boolean) => {
			const validation = validate();
			setErrors(validation);
			if (Object.keys(validation).length > 0) {
				toast({ variant: "destructive", title: "Please correct the highlighted fields" });
				return;
			}
			setSubmitting(true);
			try {
				const isEditSubmit = mode === "edit" && existingInvoice?.id;
				const payload: SaveInvoiceRequest = isEditSubmit
					? { ...buildPayload(), id: String(existingInvoice!.id) }
					: buildPayload();
				const result = isEditSubmit ? await updateInvoice(payload) : await createInvoice(payload);
				const invoiceId = result?.invoice_id ?? (isEditSubmit ? existingInvoice!.id : undefined);
				if (!invoiceId) throw new Error("Backend did not return an invoice ID");

				if (isEditSubmit) {
					baselineRef.current = { ...state };
				}

				if (alsoSendForApproval && !isEditSubmit) {
					try {
						await sendInvoiceForApproval(String(invoiceId));
					} catch (err) {
						toast({
							variant: "destructive",
							title: "Saved as Draft, but Send for Approval failed",
							description: err instanceof Error ? err.message : "Please retry from the detail page.",
						});
					}
				}

				toast({
					title: result?.message ?? (isEditSubmit ? "Govt Sacking Freight invoice updated" : "Govt Sacking Freight invoice created"),
				});
				const params = new URLSearchParams();
				params.set("mode", "view");
				params.set("id", String(invoiceId));
				if (branchId) params.set("branch_id", branchId);
				if (menuId) params.set("menu_id", menuId);
				router.replace(`/dashboardportal/sales/salesInvoice/createSalesInvoice?${params.toString()}`);
			} catch (error) {
				toast({
					variant: "destructive",
					title: mode === "edit" ? "Unable to update freight invoice" : "Unable to create freight invoice",
					description: error instanceof Error ? error.message : "Please try again.",
				});
			} finally {
				setSubmitting(false);
			}
		},
		[validate, buildPayload, branchId, menuId, router, mode, existingInvoice],
	);

	if (!mounted) return null;

	const isView = mode === "view";
	const isEdit = mode === "edit";
	const isCreate = mode === "create";
	const hasSelectedSource = state.sources.length > 0;
	const sourceReady = (isView || isEdit) ? Boolean(existingInvoice) : hasSelectedSource;
	const editableFieldDisabled = isView || submitting || (!isEdit && !sourceReady);
	const lockedFieldDisabled = isView || isEdit || submitting || !sourceReady;
	const actionsDisabled = submitting || !sourceReady || Boolean(identityError);

	const sourceModeOfTransport = state.sources[0]?.header?.mode_of_transport
		?? existingInvoice?.govtskg?.modeOfTransport
		?? null;
	const isRail = isRailMode(sourceModeOfTransport);
	const iwBillNoLabel = isRail ? "RR No" : "IW Bill No";
	const iwBillDateLabel = isRail ? "RR Date" : "IW Bill Date";

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			{(isView || isEdit) && existingInvoice ? (
				<SalesInvoiceApprovalBar
					approvalInfo={approvalInfo}
					permissions={approvalPermissions}
					loading={approvalLoading}
					onApprove={handleApprove}
					onReject={handleReject}
					onOpen={handleOpen}
					onCancelDraft={handleCancelDraft}
					onReopen={handleReopen}
					onSendForApproval={handleSendForApproval}
					onViewApprovalLog={handleViewApprovalLog}
				/>
			) : null}

			{isCreate ? (
				<Box>
					<GovtSackingSourcePicker
						coId={coId}
						branchId={branchId}
						value={state.sourceRows}
						onSelect={handleSourceSelect}
						disabled={submitting}
					/>
					{errors.sources ? (
						<Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
							{errors.sources}
						</Typography>
					) : null}
					{(identityError || errors.identity) ? (
						<Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
							{errors.identity ?? identityError}
						</Typography>
					) : null}
				</Box>
			) : null}

			{(isView || isEdit) && existingInvoice?.freight ? (
				<Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
					<Typography variant="subtitle2">
						{((existingInvoice.freight.sources?.length ?? 0) > 1)
							? "Source Govt Sacking Invoices"
							: "Source Govt Sacking Invoice"}
					</Typography>
					<Divider sx={{ my: 1 }} />
					{existingInvoice.freight.sources && existingInvoice.freight.sources.length > 1 ? (
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Invoice No</TableCell>
									<TableCell>Invoice Date</TableCell>
									<TableCell align="right">Qty (bales)</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{existingInvoice.freight.sources.map((s) => (
									<TableRow key={s.invoice_id}>
										<TableCell>{s.invoice_no_formatted ?? s.invoice_no ?? "—"}</TableCell>
										<TableCell>{s.invoice_date ?? "—"}</TableCell>
										<TableCell align="right">{s.bales_qty ?? "—"}</TableCell>
									</TableRow>
								))}
								<TableRow>
									<TableCell colSpan={2}><strong>Total</strong></TableCell>
									<TableCell align="right">
										<strong>{existingInvoice.freight.sources.reduce((sum, s) => sum + (Number(s.bales_qty) || 0), 0)}</strong>
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					) : existingInvoice.freight.source ? (
						<Typography variant="body2">
							Invoice No <strong>{existingInvoice.freight.source.invoice_no ?? "—"}</strong>
							{existingInvoice.freight.source.invoice_date ? ` (${existingInvoice.freight.source.invoice_date})` : ""}
							{existingInvoice.freight.source.pcso_no ? ` — PCSO ${existingInvoice.freight.source.pcso_no}` : ""}
						</Typography>
					) : null}
				</Paper>
			) : null}

			{state.sources[0] ? <GovtSackingSourcePreview source={state.sources[0]} /> : null}

			{state.sources.length > 1 ? (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						Source invoices in this freight bill
					</Typography>
					<Divider sx={{ mb: 1 }} />
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Invoice No</TableCell>
								<TableCell>Invoice Date</TableCell>
								<TableCell align="right">Qty (bales)</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{state.sources.map((s) => (
								<TableRow key={s.header.invoice_id}>
									<TableCell>{s.header.invoice_no_formatted ?? s.header.invoice_no ?? "—"}</TableCell>
									<TableCell>{s.header.invoice_date ?? "—"}</TableCell>
									<TableCell align="right">{s.lines[0]?.quantity ?? "—"}</TableCell>
								</TableRow>
							))}
							<TableRow>
								<TableCell colSpan={2}><strong>Total</strong></TableCell>
								<TableCell align="right">
									<strong>{state.sources.reduce((sum, s) => sum + (Number(s.lines[0]?.quantity) || 0), 0)}</strong>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</Paper>
			) : null}

			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1 }}>
					Freight Details
				</Typography>
				<Divider sx={{ mb: 2 }} />
				{!sourceReady && isCreate ? (
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
						Select a source Govt Sacking invoice above to enable these fields.
					</Typography>
				) : null}
				<Grid container spacing={2}>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Invoice Date"
							type="date"
							fullWidth
							required
							value={state.invoiceDate}
							onChange={(e) => setState((prev) => ({ ...prev, invoiceDate: e.target.value }))}
							error={Boolean(errors.invoiceDate)}
							helperText={errors.invoiceDate}
							InputLabelProps={{ shrink: true }}
							disabled={lockedFieldDisabled}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label={iwBillNoLabel}
							fullWidth
							required
							inputProps={{ maxLength: 100 }}
							value={state.iwBillNo}
							onChange={(e) => setState((prev) => ({ ...prev, iwBillNo: e.target.value }))}
							error={Boolean(errors.iwBillNo)}
							helperText={errors.iwBillNo}
							disabled={editableFieldDisabled}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label={iwBillDateLabel}
							type="date"
							fullWidth
							required
							value={state.iwBillDate}
							onChange={(e) => setState((prev) => ({ ...prev, iwBillDate: e.target.value }))}
							error={Boolean(errors.iwBillDate)}
							helperText={errors.iwBillDate}
							InputLabelProps={{ shrink: true }}
							disabled={editableFieldDisabled}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Container No"
							fullWidth
							inputProps={{ maxLength: 100 }}
							value={state.containerNo}
							onChange={(e) => setState((prev) => ({ ...prev, containerNo: e.target.value }))}
							error={Boolean(errors.containerNo)}
							helperText={errors.containerNo ?? "Optional"}
							disabled={editableFieldDisabled}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Vehicle No"
							fullWidth
							required
							inputProps={{ maxLength: 255 }}
							value={state.vehicleNo}
							onChange={(e) => setState((prev) => ({ ...prev, vehicleNo: e.target.value }))}
							error={Boolean(errors.vehicleNo)}
							helperText={errors.vehicleNo}
							disabled={editableFieldDisabled}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Freight Amount (₹)"
							type="number"
							fullWidth
							required
							inputProps={{ min: 0, step: "0.01" }}
							value={state.freightAmount}
							onChange={(e) => setState((prev) => ({ ...prev, freightAmount: e.target.value }))}
							error={Boolean(errors.freightAmount)}
							helperText={errors.freightAmount}
							disabled={lockedFieldDisabled}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Bales Qty"
							type="number"
							fullWidth
							required
							inputProps={{ min: 1, step: 1 }}
							value={state.balesQty}
							onChange={(e) => setState((prev) => ({ ...prev, balesQty: e.target.value }))}
							error={Boolean(errors.balesQty)}
							helperText={errors.balesQty}
							disabled={lockedFieldDisabled}
						/>
					</Grid>
				</Grid>
			</Paper>

			{isCreate ? (
				<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 1 }}>
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push("/dashboardportal/sales/salesInvoice")}
						disabled={submitting}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => void submit(false)}
						disabled={actionsDisabled}
					>
						{submitting ? "Saving..." : "Save as Draft"}
					</Button>
					<Button
						type="button"
						onClick={() => void submit(true)}
						disabled={actionsDisabled}
					>
						{submitting ? "Saving..." : "Save + Send for Approval"}
					</Button>
				</Box>
			) : null}

			{isEdit ? (
				<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 1 }}>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							const params = new URLSearchParams();
							params.set("mode", "view");
							if (existingInvoice?.id) params.set("id", String(existingInvoice.id));
							if (branchId) params.set("branch_id", branchId);
							if (menuId) params.set("menu_id", menuId);
							router.replace(`/dashboardportal/sales/salesInvoice/createSalesInvoice?${params.toString()}`);
						}}
						disabled={submitting}
					>
						Cancel
					</Button>
					{approvalPermissions.canSave && hasUnsavedChanges ? (
						<Button
							type="button"
							onClick={() => void submit(false)}
							disabled={submitting || state.sources.length === 0}
						>
							{submitting ? "Updating..." : state.sources.length === 0 ? "Loading source..." : "Update"}
						</Button>
					) : null}
				</Box>
			) : null}

			{isCreate && state.sources[0] ? (
				<Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
						Printable Preview ({String(intraInter ?? "") === "0" ? "Intra-state" : "Inter-state"} @ {FREIGHT_GST_PERCENT}%) — Grand Total: ₹{grandTotal.toFixed(2)}
					</Typography>
					<Divider sx={{ mb: 2 }} />
					<SalesInvoicePreview {...createPreviewProps} />
				</Paper>
			) : null}

			{isEdit && existingInvoice ? (
				<Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
						Printable Preview
					</Typography>
					<Divider sx={{ mb: 2 }} />
					<SalesInvoicePreview {...buildFreightPreviewProps(existingInvoice)} />
				</Paper>
			) : null}

			{isView && existingInvoice ? (
				<Paper variant="outlined" sx={{ p: 3 }}>
					<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
						Printable Preview
					</Typography>
					<Divider sx={{ mb: 2 }} />
					<SalesInvoicePreview {...buildFreightPreviewProps(existingInvoice)} />
				</Paper>
			) : null}
		</Box>
	);
}

export default GovtSackingFreightForm;
