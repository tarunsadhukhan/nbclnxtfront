"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Checkbox,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControlLabel,
	IconButton,
	MenuItem,
	Paper,
	Snackbar,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { ApprovalActionsBar, type ApprovalStatusId } from "@/components/ui/transaction/ApprovalActionsBar";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
	cancelDraftEnquiry,
	closeEnquiry,
	createEnquiry,
	fetchEnquiryById,
	fetchEnquirySetup,
	moveEnquiryStage,
	openEnquiry,
	rejectEnquiry,
	reopenEnquiry,
	approveEnquiry,
	sendEnquiryForApproval,
	updateEnquiry,
	type EnquiryDetail,
	type EnquiryLinePayload,
	type EnquirySetup,
	type EnquiryStage,
	type MoveStageAction,
} from "@/utils/enquiryService";

// ---------------------------------------------------------------------------
// Validation (Zod — single source of truth for the form payload)
// ---------------------------------------------------------------------------

const lineSchema = z
	.object({
		item_id: z.number().int().positive().nullable(),
		item_desc_freetext: z.string().trim().max(500).nullable(),
		is_new_item: z.boolean(),
		design_change: z.boolean(),
		qty: z.number().positive().nullable(),
		uom_id: z.number().int().positive().nullable(),
		target_price: z.number().nonnegative().nullable(),
		remarks: z.string().trim().max(500).nullable(),
	})
	.refine((line) => line.item_id !== null || (line.item_desc_freetext ?? "").length > 0, {
		message: "Each line needs an item or a description of the new item",
	});

const headerSchema = z.object({
	enquiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enquiry date is required"),
	received_via: z.string().nullable(),
	branch_id: z.number().int().positive({ message: "Branch is required" }),
	party_id: z.number().int().positive().nullable(),
	contact_person: z.string().trim().max(255).nullable(),
	contact_detail: z.string().trim().max(255).nullable(),
	customer_ref_no: z.string().trim().max(100).nullable(),
	expected_delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
	enquiry_desc: z.string().trim().max(1000).nullable(),
	internal_note: z.string().trim().max(1000).nullable(),
	lines: z.array(lineSchema).min(1, "At least one line is required"),
});

type LineForm = z.infer<typeof lineSchema>;
type HeaderForm = z.infer<typeof headerSchema>;

const createBlankLine = (): LineForm => ({
	item_id: null,
	item_desc_freetext: null,
	is_new_item: false,
	design_change: false,
	qty: null,
	uom_id: null,
	target_price: null,
	remarks: null,
});

const EMPTY_SETUP: EnquirySetup = Object.freeze({
	customers: [],
	uoms: [],
	items: [],
	stages: [],
	received_via_options: [],
	iso_doc_no: null,
}) as EnquirySetup;

const ACTION_LABELS: Record<MoveStageAction, string> = {
	FORWARD: "Forward to next stage",
	SEND_BACK: "Send back with feedback",
	HOLD: "Put on hold",
	RESUME: "Resume",
	MARK_LOST: "Mark as lost",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CreateEnquiryPage() {
	return (
		<Suspense
			fallback={
				<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
					<CircularProgress />
				</Box>
			}
		>
			<CreateEnquiryContent />
		</Suspense>
	);
}

function CreateEnquiryContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { selectedCompany, selectedBranches } = useSidebarContext();

	const enquiryId = searchParams?.get("id") || "";
	const menuId = searchParams?.get("menu_id") || "";
	const urlMode = searchParams?.get("mode") || (enquiryId ? "view" : "create");
	const [mode, setMode] = React.useState<"create" | "edit" | "view">(
		urlMode === "edit" ? "edit" : urlMode === "view" ? "view" : "create"
	);

	const coId = selectedCompany?.co_id ?? null;

	// Sidebar context hydrates from localStorage on the client only — defer
	// rendering until mounted to avoid an SSR/client hydration mismatch.
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const branchOptions = React.useMemo(
		() => (selectedCompany?.branches ?? []).map((b) => ({ branch_id: b.branch_id, branch_name: b.branch_name })),
		[selectedCompany]
	);

	const [setup, setSetup] = React.useState<EnquirySetup>(EMPTY_SETUP);
	const [detail, setDetail] = React.useState<EnquiryDetail | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [toast, setToast] = React.useState<string | null>(null);
	const [validationError, setValidationError] = React.useState<string | null>(null);

	const [header, setHeader] = React.useState<Omit<HeaderForm, "lines">>({
		enquiry_date: new Date().toISOString().slice(0, 10),
		received_via: null,
		branch_id: selectedBranches[0] ?? 0,
		party_id: null,
		contact_person: null,
		contact_detail: null,
		customer_ref_no: null,
		expected_delivery_date: null,
		enquiry_desc: null,
		internal_note: null,
	});
	const [lines, setLines] = React.useState<LineForm[]>([createBlankLine()]);

	const [moveDialogOpen, setMoveDialogOpen] = React.useState(false);
	const [closeDialogOpen, setCloseDialogOpen] = React.useState(false);

	const isView = mode === "view";
	const statusId = detail?.status_id ?? 21;
	const isDraft = statusId === 21;
	const canEditForm = !isView && (mode === "create" || isDraft);

	// ---- data loading ----

	const loadSetup = React.useCallback(async () => {
		if (!coId) return;
		const { data, error } = await fetchEnquirySetup(coId, menuId || null);
		if (error) {
			setErrorMessage(error);
			return;
		}
		if (data?.data) setSetup(data.data);
	}, [coId, menuId]);

	const loadDetail = React.useCallback(async () => {
		if (!enquiryId || !coId) return;
		setLoading(true);
		try {
			const { data, error } = await fetchEnquiryById(enquiryId, coId, menuId || null);
			if (error) throw new Error(error);
			const d = data?.data;
			if (!d) throw new Error("Enquiry not found");
			setDetail(d);
			setHeader({
				enquiry_date: d.enquiry_date || new Date().toISOString().slice(0, 10),
				received_via: d.received_via ?? null,
				branch_id: Number(d.branch_id) || 0,
				party_id: d.party_id ? Number(d.party_id) : null,
				contact_person: d.contact_person ?? null,
				contact_detail: d.contact_detail ?? null,
				customer_ref_no: d.customer_ref_no ?? null,
				expected_delivery_date: d.expected_delivery_date || null,
				enquiry_desc: d.enquiry_desc ?? null,
				internal_note: d.internal_note ?? null,
			});
			setLines(
				(d.lines ?? []).map((line) => ({
					item_id: line.item_id ? Number(line.item_id) : null,
					item_desc_freetext: line.item_desc_freetext ?? null,
					is_new_item: Number(line.is_new_item) === 1,
					design_change: Number(line.design_change) === 1,
					qty: line.qty != null ? Number(line.qty) : null,
					uom_id: line.uom_id ? Number(line.uom_id) : null,
					target_price: line.target_price != null ? Number(line.target_price) : null,
					remarks: line.remarks ?? null,
				}))
			);
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to load enquiry");
		} finally {
			setLoading(false);
		}
	}, [enquiryId, coId, menuId]);

	React.useEffect(() => {
		loadSetup();
	}, [loadSetup]);

	React.useEffect(() => {
		loadDetail();
	}, [loadDetail]);

	// ---- form handlers ----

	const setLine = React.useCallback((index: number, patch: Partial<LineForm>) => {
		setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
	}, []);

	const buildPayload = React.useCallback((): { payload?: Parameters<typeof createEnquiry>[0]; error?: string } => {
		const activeLines = lines.filter(
			(line) => line.item_id !== null || (line.item_desc_freetext ?? "").trim().length > 0
		);
		const candidate: HeaderForm = { ...header, lines: activeLines };
		const parsed = headerSchema.safeParse(candidate);
		if (!parsed.success) {
			return { error: parsed.error.issues[0]?.message ?? "Please complete the required fields" };
		}
		const linePayloads: EnquiryLinePayload[] = parsed.data.lines.map((line) => ({
			item_id: line.item_id,
			item_desc_freetext: line.item_desc_freetext,
			is_new_item: line.is_new_item ? 1 : 0,
			design_change: line.design_change ? 1 : 0,
			qty: line.qty,
			uom_id: line.uom_id,
			target_price: line.target_price,
			remarks: line.remarks,
		}));
		return {
			payload: {
				...(detail?.sales_enquiry_id ? { sales_enquiry_id: detail.sales_enquiry_id } : {}),
				enquiry_date: parsed.data.enquiry_date,
				received_via: parsed.data.received_via,
				branch_id: parsed.data.branch_id,
				party_id: parsed.data.party_id,
				contact_person: parsed.data.contact_person,
				contact_detail: parsed.data.contact_detail,
				customer_ref_no: parsed.data.customer_ref_no,
				expected_delivery_date: parsed.data.expected_delivery_date,
				enquiry_desc: parsed.data.enquiry_desc,
				internal_note: parsed.data.internal_note,
				lines: linePayloads,
			},
		};
	}, [detail?.sales_enquiry_id, header, lines]);

	const refreshAfterAction = React.useCallback(
		async (message?: string | null) => {
			if (message) setToast(message);
			await loadDetail();
		},
		[loadDetail]
	);

	const handleSave = React.useCallback(async () => {
		setValidationError(null);
		const { payload, error } = buildPayload();
		if (error || !payload) {
			setValidationError(error ?? "Invalid form");
			return;
		}
		setSaving(true);
		try {
			const result = detail?.sales_enquiry_id ? await updateEnquiry(payload) : await createEnquiry(payload);
			if (result.error) throw new Error(result.error);
			const newId = result.data?.data?.sales_enquiry_id ?? detail?.sales_enquiry_id;
			setToast(detail?.sales_enquiry_id ? "Enquiry updated" : "Enquiry saved as draft");
			if (!detail?.sales_enquiry_id && newId) {
				setMode("edit");
				router.replace(
					`/dashboardportal/sales/enquiry/createEnquiry?mode=edit&id=${newId}${menuId ? `&menu_id=${menuId}` : ""}`
				);
			} else {
				await loadDetail();
			}
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to save enquiry");
		} finally {
			setSaving(false);
		}
	}, [buildPayload, detail?.sales_enquiry_id, loadDetail, menuId, router]);

	const requireId = detail?.sales_enquiry_id ?? 0;

	const runAction = React.useCallback(
		async (action: () => Promise<{ data: { message?: string } | null; error: string | null }>) => {
			setSaving(true);
			try {
				const { data, error } = await action();
				if (error) throw new Error(error);
				await refreshAfterAction(data?.message ?? "Done");
			} catch (err) {
				setErrorMessage(err instanceof Error ? err.message : "Action failed");
			} finally {
				setSaving(false);
			}
		},
		[refreshAfterAction]
	);

	// ---- render helpers ----

	const stageInfo = React.useMemo(() => {
		if (!detail) return null;
		return {
			code: detail.stage_code ?? null,
			name: detail.stage_name ?? "-",
			dept: detail.dept_hint ?? null,
			days: detail.days_in_stage ?? null,
			onHold: Number(detail.hold_flag) === 1,
		};
	}, [detail]);

	const permissions = detail?.permissions ?? {};
	const showApprovalBar = Boolean(detail?.sales_enquiry_id);

	if (!mounted) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (!coId) {
		return (
			<Alert severity="info" sx={{ m: 3 }}>
				Select a company from the sidebar to work with enquiries.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
			<Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={1}>
				<Box>
					<Typography variant="h5" fontWeight={700}>
						{mode === "create" ? "Note Customer Enquiry" : `Enquiry ${detail?.enquiry_no || "(draft)"}`}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						{setup.iso_doc_no ? `ISO Doc No: ${setup.iso_doc_no}` : " "}
					</Typography>
				</Box>
				{stageInfo ? (
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
						<Chip color="primary" label={`Stage: ${stageInfo.name}`} />
						{stageInfo.dept ? <Chip variant="outlined" label={`Pending on: ${stageInfo.dept}`} /> : null}
						{stageInfo.days != null ? <Chip variant="outlined" label={`${stageInfo.days} day(s) in stage`} /> : null}
						{stageInfo.onHold ? <Chip color="warning" label="On hold" /> : null}
					</Stack>
				) : null}
			</Stack>

			{errorMessage ? (
				<Alert severity="error" onClose={() => setErrorMessage(null)}>
					{errorMessage}
				</Alert>
			) : null}
			{validationError ? (
				<Alert severity="warning" onClose={() => setValidationError(null)}>
					{validationError}
				</Alert>
			) : null}

			{showApprovalBar && detail ? (
				<ApprovalActionsBar
					approvalInfo={{
						statusId: (detail.status_id ?? 21) as ApprovalStatusId,
						statusLabel: detail.status_name ?? "Draft",
						approvalLevel: detail.approval_level ?? null,
					}}
					permissions={{
						canSave: canEditForm && Boolean(permissions.canSave ?? isDraft),
						canOpen: permissions.canOpen,
						canCancelDraft: permissions.canCancelDraft,
						canReopen: permissions.canReopen,
						canSendForApproval: permissions.canSendForApproval,
						canApprove: permissions.canApprove,
						canReject: permissions.canReject,
					}}
					loading={saving}
					onSave={handleSave}
					onOpen={() => runAction(() => openEnquiry(requireId, header.branch_id))}
					onCancelDraft={() => runAction(() => cancelDraftEnquiry(requireId))}
					onReopen={() => runAction(() => reopenEnquiry(requireId))}
					onSendForApproval={() => runAction(() => sendEnquiryForApproval(requireId, menuId))}
					onApprove={() => runAction(() => approveEnquiry(requireId, menuId))}
					onReject={(reason) => runAction(() => rejectEnquiry(requireId, menuId, reason))}
				/>
			) : null}

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
					<CircularProgress />
				</Box>
			) : (
				<>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle1" fontWeight={600} gutterBottom>
							Enquiry Details
						</Typography>
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
								gap: 2,
							}}
						>
							<TextField
								label="Enquiry Date"
								type="date"
								size="small"
								value={header.enquiry_date}
								onChange={(e) => setHeader((h) => ({ ...h, enquiry_date: e.target.value }))}
								InputLabelProps={{ shrink: true }}
								disabled={!canEditForm}
								required
							/>
							<TextField
								label="Received Via"
								select
								size="small"
								value={header.received_via ?? ""}
								onChange={(e) => setHeader((h) => ({ ...h, received_via: e.target.value || null }))}
								disabled={!canEditForm}
							>
								<MenuItem value="">—</MenuItem>
								{setup.received_via_options.map((option) => (
									<MenuItem key={option} value={option}>
										{option}
									</MenuItem>
								))}
							</TextField>
							<TextField
								label="Branch"
								select
								size="small"
								value={header.branch_id || ""}
								onChange={(e) => setHeader((h) => ({ ...h, branch_id: Number(e.target.value) }))}
								disabled={!canEditForm || mode !== "create"}
								required
							>
								{branchOptions.map((branch) => (
									<MenuItem key={branch.branch_id} value={branch.branch_id}>
										{branch.branch_name}
									</MenuItem>
								))}
							</TextField>
							<Autocomplete
								size="small"
								options={setup.customers}
								getOptionLabel={(option) => option.party_name ?? ""}
								value={setup.customers.find((c) => c.party_id === header.party_id) ?? null}
								onChange={(_, value) => setHeader((h) => ({ ...h, party_id: value?.party_id ?? null }))}
								renderOption={(props, option) => (
									<li {...props} key={option.party_id}>
										{option.party_name}
									</li>
								)}
								renderInput={(params) => <TextField {...params} label="Customer" />}
								disabled={!canEditForm}
							/>
							<TextField
								label="Contact Person"
								size="small"
								value={header.contact_person ?? ""}
								onChange={(e) => setHeader((h) => ({ ...h, contact_person: e.target.value || null }))}
								disabled={!canEditForm}
							/>
							<TextField
								label="Contact Phone / Email"
								size="small"
								value={header.contact_detail ?? ""}
								onChange={(e) => setHeader((h) => ({ ...h, contact_detail: e.target.value || null }))}
								disabled={!canEditForm}
							/>
							<TextField
								label="Customer Ref / Tender No."
								size="small"
								value={header.customer_ref_no ?? ""}
								onChange={(e) => setHeader((h) => ({ ...h, customer_ref_no: e.target.value || null }))}
								disabled={!canEditForm}
							/>
							<TextField
								label="Customer Expected Delivery"
								type="date"
								size="small"
								value={header.expected_delivery_date ?? ""}
								onChange={(e) => setHeader((h) => ({ ...h, expected_delivery_date: e.target.value || null }))}
								InputLabelProps={{ shrink: true }}
								disabled={!canEditForm}
							/>
						</Box>
						<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
							<TextField
								label="What the customer asked for"
								size="small"
								multiline
								minRows={2}
								value={header.enquiry_desc ?? ""}
								onChange={(e) => setHeader((h) => ({ ...h, enquiry_desc: e.target.value || null }))}
								disabled={!canEditForm}
							/>
							<TextField
								label="Internal Note"
								size="small"
								multiline
								minRows={2}
								value={header.internal_note ?? ""}
								onChange={(e) => setHeader((h) => ({ ...h, internal_note: e.target.value || null }))}
								disabled={!canEditForm}
							/>
						</Box>
					</Paper>

					<Paper variant="outlined" sx={{ p: 2 }}>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
							<Typography variant="subtitle1" fontWeight={600}>
								Enquired Items
							</Typography>
							{canEditForm ? (
								<Button size="small" startIcon={<Plus size={16} />} onClick={() => setLines((prev) => [...prev, createBlankLine()])}>
									Add Line
								</Button>
							) : null}
						</Stack>
						<Box sx={{ overflowX: "auto" }}>
							<Table size="small" sx={{ minWidth: 900 }}>
								<TableHead>
									<TableRow>
										<TableCell sx={{ minWidth: 220 }}>Item / New Item Description</TableCell>
										<TableCell sx={{ width: 150 }}>Flags</TableCell>
										<TableCell sx={{ width: 100 }}>Qty</TableCell>
										<TableCell sx={{ width: 140 }}>UOM</TableCell>
										<TableCell sx={{ width: 130 }}>Target Price</TableCell>
										<TableCell sx={{ minWidth: 160 }}>Remarks</TableCell>
										<TableCell sx={{ width: 120 }}>Cost Basis</TableCell>
										{canEditForm ? <TableCell sx={{ width: 48 }} /> : null}
									</TableRow>
								</TableHead>
								<TableBody>
									{lines.map((line, index) => {
										const detailLine = detail?.lines?.[index];
										return (
											<TableRow key={index}>
												<TableCell>
													<Stack spacing={1}>
														<Autocomplete
															size="small"
															options={setup.items}
															getOptionLabel={(option) =>
																option.item_code ? `${option.item_code} — ${option.item_name}` : option.item_name
															}
															value={setup.items.find((i) => i.item_id === line.item_id) ?? null}
															onChange={(_, value) => setLine(index, { item_id: value?.item_id ?? null })}
															renderOption={(props, option) => (
																	<li {...props} key={option.item_id}>
																		{option.item_code ? `${option.item_code} — ${option.item_name}` : option.item_name}
																	</li>
																)}
																renderInput={(params) => <TextField {...params} label="Existing item" />}
															disabled={!canEditForm || line.is_new_item}
														/>
														{line.is_new_item || (!line.item_id && line.item_desc_freetext) || canEditForm ? (
															<TextField
																size="small"
																label="New item description"
																value={line.item_desc_freetext ?? ""}
																onChange={(e) => setLine(index, { item_desc_freetext: e.target.value || null })}
																disabled={!canEditForm}
															/>
														) : null}
													</Stack>
												</TableCell>
												<TableCell>
													<FormControlLabel
														control={
															<Checkbox
																size="small"
																checked={line.is_new_item}
																onChange={(e) => setLine(index, { is_new_item: e.target.checked })}
																disabled={!canEditForm}
															/>
														}
														label={<Typography variant="caption">New item</Typography>}
													/>
													<FormControlLabel
														control={
															<Checkbox
																size="small"
																checked={line.design_change}
																onChange={(e) => setLine(index, { design_change: e.target.checked })}
																disabled={!canEditForm}
															/>
														}
														label={<Typography variant="caption">Design change</Typography>}
													/>
												</TableCell>
												<TableCell>
													<TextField
														size="small"
														type="number"
														value={line.qty ?? ""}
														onChange={(e) => setLine(index, { qty: e.target.value === "" ? null : Number(e.target.value) })}
														disabled={!canEditForm}
													/>
												</TableCell>
												<TableCell>
													<TextField
														select
														size="small"
														fullWidth
														value={line.uom_id ?? ""}
														onChange={(e) => setLine(index, { uom_id: e.target.value === "" ? null : Number(e.target.value) })}
														disabled={!canEditForm}
													>
														<MenuItem value="">—</MenuItem>
														{setup.uoms.map((uom) => (
															<MenuItem key={uom.uom_id} value={uom.uom_id}>
																{uom.uom_name}
															</MenuItem>
														))}
													</TextField>
												</TableCell>
												<TableCell>
													<TextField
														size="small"
														type="number"
														value={line.target_price ?? ""}
														onChange={(e) =>
															setLine(index, { target_price: e.target.value === "" ? null : Number(e.target.value) })
														}
														disabled={!canEditForm}
													/>
												</TableCell>
												<TableCell>
													<TextField
														size="small"
														fullWidth
														value={line.remarks ?? ""}
														onChange={(e) => setLine(index, { remarks: e.target.value || null })}
														disabled={!canEditForm}
													/>
												</TableCell>
												<TableCell>
													{detailLine?.cost_snapshot_id ? (
														<>
															<Chip
																size="small"
																color="success"
																label={
																	detailLine.confirmed_cost_per_unit != null
																		? `₹${Number(detailLine.confirmed_cost_per_unit).toLocaleString("en-IN")}`
																		: "Confirmed"
																}
															/>
															{detailLine?.overhead_pct != null && detailLine?.margin_pct != null ? (
																<Typography variant="caption" color="text.secondary" display="block">
																	OH {detailLine.overhead_pct}% · Margin {detailLine.margin_pct}%
																	{detailLine.sell_price_per_unit != null ? ` · ₹${Number(detailLine.sell_price_per_unit).toLocaleString("en-IN")}/unit` : ""}
																</Typography>
															) : null}
														</>
													) : (
														<Typography variant="caption" color="text.secondary">
															Pending
														</Typography>
													)}
												</TableCell>
												{canEditForm ? (
													<TableCell>
														<IconButton
															size="small"
															onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
															disabled={lines.length <= 1}
														>
															<Trash2 size={16} />
														</IconButton>
													</TableCell>
												) : null}
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</Box>
					</Paper>

					{detail ? (
						<Paper variant="outlined" sx={{ p: 2 }}>
							<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" gap={1}>
								<Typography variant="subtitle1" fontWeight={600}>
									Flow &amp; Internal Feedback
								</Typography>
								<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
									{["COSTING_REVIEW", "PRICE_CHECK", "QUOTATION"].includes(detail.stage_code ?? "") && statusId === 3 ? (
										<>
											<Button
												size="small"
												variant="contained"
												onClick={() =>
													router.push(
														`/dashboardportal/sales/quotation/createQuotation?sales_enquiry_id=${detail.sales_enquiry_id}`
													)
												}
											>
												Create Quotation
											</Button>
											<Button
												size="small"
												variant="outlined"
												onClick={() =>
													router.push(
														`/dashboardportal/sales/salesOrder/createSalesOrder?sales_enquiry_id=${detail.sales_enquiry_id}`
													)
												}
											>
												Direct Sales Order (tender)
											</Button>
										</>
									) : null}
									<Button
										size="small"
										variant="outlined"
										onClick={() => setMoveDialogOpen(true)}
										disabled={saving || statusId === 5 || statusId === 6}
									>
										Move Stage
									</Button>
									<Button
										size="small"
										variant="outlined"
										color="error"
										onClick={() => setCloseDialogOpen(true)}
										disabled={saving || statusId === 5 || statusId === 6}
									>
										Close / Lost
									</Button>
								</Stack>
							</Stack>

							{detail.linked_docs?.length ? (
								<Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
									{detail.linked_docs.map((doc) => (
										<Chip
											key={`${doc.doc_type}-${doc.doc_id}`}
											size="small"
											variant="outlined"
											label={`${doc.doc_type === "QUOTATION" ? "Quotation" : doc.doc_type === "SALES_ORDER" ? "Sales Order" : doc.doc_type} ${doc.doc_no ?? doc.doc_id}${doc.status_name ? ` · ${doc.status_name}` : ""}`}
										/>
									))}
								</Stack>
							) : null}

							<Divider sx={{ mb: 1 }} />
							<Stack spacing={1.5}>
								{(detail.timeline ?? []).map((entry) => (
									<Box key={entry.stage_log_id} sx={{ display: "flex", gap: 1.5 }}>
										<Chip size="small" label={entry.action} sx={{ minWidth: 90 }} />
										<Box>
											<Typography variant="body2">
												{entry.from_stage_name ? `${entry.from_stage_name} → ` : ""}
												<strong>{entry.to_stage_name ?? "-"}</strong>
												{entry.linked_doc_type ? ` · ${entry.linked_doc_type} #${entry.linked_doc_id}` : ""}
											</Typography>
											{entry.feedback ? (
												<Typography variant="body2" color="text.secondary">
													“{entry.feedback}”
												</Typography>
											) : null}
											<Typography variant="caption" color="text.secondary">
												{entry.action_by_name || `User ${entry.action_by ?? "-"}`} · {entry.action_date_time ?? ""}
											</Typography>
										</Box>
									</Box>
								))}
								{!detail.timeline?.length ? (
									<Typography variant="body2" color="text.secondary">
										No flow activity yet — open the enquiry to start the trail.
									</Typography>
								) : null}
							</Stack>
						</Paper>
					) : null}

					{mode === "create" && !detail ? (
						<Stack direction="row" spacing={1}>
							<Button variant="contained" onClick={handleSave} disabled={saving}>
								{saving ? "Saving…" : "Save Draft"}
							</Button>
							<Button variant="outlined" onClick={() => router.back()}>
								Cancel
							</Button>
						</Stack>
					) : null}
				</>
			)}

			{detail ? (
				<MoveStageDialog
					open={moveDialogOpen}
					onClose={() => setMoveDialogOpen(false)}
					stages={setup.stages}
					currentStageCode={detail.stage_code ?? null}
					onHold={Number(detail.hold_flag) === 1}
					onSubmit={async (payload) => {
						setMoveDialogOpen(false);
						await runAction(() => moveEnquiryStage({ sales_enquiry_id: detail.sales_enquiry_id, ...payload }));
					}}
				/>
			) : null}

			{detail ? (
				<CloseEnquiryDialog
					open={closeDialogOpen}
					onClose={() => setCloseDialogOpen(false)}
					onSubmit={async (close_reason, remarks) => {
						setCloseDialogOpen(false);
						await runAction(() => closeEnquiry(detail.sales_enquiry_id, close_reason, remarks));
					}}
				/>
			) : null}

			<Snackbar
				open={Boolean(toast)}
				autoHideDuration={3500}
				onClose={() => setToast(null)}
				message={toast ?? ""}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			/>
		</Box>
	);
}

// ---------------------------------------------------------------------------
// Move Stage dialog — the department handoff with mandatory feedback on
// send-backs (design §4).
// ---------------------------------------------------------------------------

interface MoveStageDialogProps {
	open: boolean;
	onClose: () => void;
	stages: EnquiryStage[];
	currentStageCode: string | null;
	onHold: boolean;
	onSubmit: (payload: {
		action: MoveStageAction;
		to_stage_code?: string | null;
		feedback?: string | null;
	}) => Promise<void>;
}

function MoveStageDialog({ open, onClose, stages, currentStageCode, onHold, onSubmit }: MoveStageDialogProps) {
	const [action, setAction] = React.useState<MoveStageAction>("FORWARD");
	const [toStage, setToStage] = React.useState<string>("");
	const [feedback, setFeedback] = React.useState<string>("");
	const [localError, setLocalError] = React.useState<string | null>(null);

	const currentSeq = React.useMemo(
		() => stages.find((s) => s.stage_code === currentStageCode)?.sequence_no ?? null,
		[stages, currentStageCode]
	);

	const stageOptions = React.useMemo(() => {
		const selectable = stages.filter((s) => !s.is_terminal && s.stage_code !== currentStageCode);
		if (action === "FORWARD" && currentSeq != null) {
			return selectable.filter((s) => s.sequence_no > currentSeq);
		}
		if (action === "SEND_BACK" && currentSeq != null) {
			return selectable.filter((s) => s.sequence_no < currentSeq);
		}
		return selectable;
	}, [stages, action, currentSeq, currentStageCode]);

	const needsStage = action === "FORWARD" || action === "SEND_BACK";
	const needsFeedback = action === "SEND_BACK" || action === "MARK_LOST";

	React.useEffect(() => {
		if (open) {
			setAction(onHold ? "RESUME" : "FORWARD");
			setToStage("");
			setFeedback("");
			setLocalError(null);
		}
	}, [open, onHold]);

	const handleSubmit = async () => {
		if (needsStage && !toStage) {
			setLocalError("Choose the stage to move to");
			return;
		}
		if (needsFeedback && !feedback.trim()) {
			setLocalError(action === "SEND_BACK" ? "Feedback is required when sending back" : "A reason is required");
			return;
		}
		await onSubmit({
			action,
			to_stage_code: needsStage ? toStage : null,
			feedback: feedback.trim() || null,
		});
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Move Enquiry Stage</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
				{localError ? <Alert severity="warning">{localError}</Alert> : null}
				<TextField
					select
					label="Action"
					size="small"
					value={action}
					onChange={(e) => {
						setAction(e.target.value as MoveStageAction);
						setToStage("");
					}}
				>
					{(Object.keys(ACTION_LABELS) as MoveStageAction[])
						.filter((a) => (onHold ? a === "RESUME" : a !== "RESUME"))
						.map((a) => (
							<MenuItem key={a} value={a}>
								{ACTION_LABELS[a]}
							</MenuItem>
						))}
				</TextField>
				{needsStage ? (
					<TextField select label="Move to stage" size="small" value={toStage} onChange={(e) => setToStage(e.target.value)}>
						{stageOptions.map((stage) => (
							<MenuItem key={stage.stage_code} value={stage.stage_code}>
								{stage.stage_name}
								{stage.dept_hint ? ` (${stage.dept_hint})` : ""}
							</MenuItem>
						))}
					</TextField>
				) : null}
				<TextField
					label={needsFeedback ? "Feedback (required)" : "Feedback / note (optional)"}
					size="small"
					multiline
					minRows={3}
					value={feedback}
					onChange={(e) => setFeedback(e.target.value)}
					placeholder="Pass on what the next department needs to know"
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" onClick={handleSubmit}>
					Move
				</Button>
			</DialogActions>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Close / Lost dialog
// ---------------------------------------------------------------------------

interface CloseEnquiryDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (close_reason: "won" | "lost" | "cancelled", remarks?: string) => Promise<void>;
}

function CloseEnquiryDialog({ open, onClose, onSubmit }: CloseEnquiryDialogProps) {
	const [reason, setReason] = React.useState<"won" | "lost" | "cancelled">("lost");
	const [remarks, setRemarks] = React.useState("");

	React.useEffect(() => {
		if (open) {
			setReason("lost");
			setRemarks("");
		}
	}, [open]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>Close Enquiry</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
				<TextField select label="Outcome" size="small" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
					<MenuItem value="won">Won (completed)</MenuItem>
					<MenuItem value="lost">Lost / Regret</MenuItem>
					<MenuItem value="cancelled">Cancelled</MenuItem>
				</TextField>
				<TextField
					label="Remarks"
					size="small"
					multiline
					minRows={2}
					value={remarks}
					onChange={(e) => setRemarks(e.target.value)}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" color="error" onClick={() => onSubmit(reason, remarks.trim() || undefined)}>
					Close Enquiry
				</Button>
			</DialogActions>
		</Dialog>
	);
}
