"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
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
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
	confirmLineCosting,
	createPriceCheck,
	fetchEnquiryById,
	fetchEnquiryTable,
	moveEnquiryStage,
	type EnquiryDetail,
	type EnquiryLine,
	type EnquiryListRow,
} from "@/utils/enquiryService";

type BomVersionRow = {
	bom_hdr_id: number;
	item_id: number;
	bom_version?: number;
	version_label?: string | null;
	is_current?: number;
	bom_status?: string | null;
	total_cost?: number | null;
	cost_per_unit?: number | null;
};

/**
 * Design & Costing worklist — enquiries waiting on costing review or a
 * procurement price check. Per line: confirm the cost basis (approves the
 * BOM cost snapshot), raise a price check, or send the enquiry back to
 * sales with feedback (design §7).
 */
export default function CostingReviewPage() {
	return (
		<Suspense
			fallback={
				<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
					<CircularProgress />
				</Box>
			}
		>
			<CostingReviewContent />
		</Suspense>
	);
}

function CostingReviewContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const menuId = searchParams?.get("menu_id") || "";
	const { selectedCompany, selectedBranches } = useSidebarContext();
	const coId = selectedCompany?.co_id ?? null;

	const [rows, setRows] = React.useState<EnquiryListRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [toast, setToast] = React.useState<string | null>(null);
	const [expandedId, setExpandedId] = React.useState<number | null>(null);
	const [expandedDetail, setExpandedDetail] = React.useState<EnquiryDetail | null>(null);
	const [detailLoading, setDetailLoading] = React.useState(false);

	const [confirmLine, setConfirmLine] = React.useState<EnquiryLine | null>(null);
	const [priceCheckFor, setPriceCheckFor] = React.useState<EnquiryDetail | null>(null);
	const [sendBackFor, setSendBackFor] = React.useState<EnquiryDetail | null>(null);

	const load = React.useCallback(async () => {
		if (!coId) return;
		setLoading(true);
		setErrorMessage(null);
		try {
			const branchId = selectedBranches.length === 1 ? selectedBranches[0] : null;
			const [review, priceCheck] = await Promise.all([
				fetchEnquiryTable({ co_id: coId, branch_id: branchId, stage_code: "COSTING_REVIEW", limit: 100 }),
				fetchEnquiryTable({ co_id: coId, branch_id: branchId, stage_code: "PRICE_CHECK", limit: 100 }),
			]);
			if (review.error) throw new Error(review.error);
			if (priceCheck.error) throw new Error(priceCheck.error);
			setRows([...(review.data?.data ?? []), ...(priceCheck.data?.data ?? [])]);
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to load worklist");
		} finally {
			setLoading(false);
		}
	}, [coId, selectedBranches]);

	React.useEffect(() => {
		load();
	}, [load]);

	const toggleExpand = React.useCallback(
		async (row: EnquiryListRow) => {
			if (expandedId === row.sales_enquiry_id) {
				setExpandedId(null);
				setExpandedDetail(null);
				return;
			}
			setExpandedId(row.sales_enquiry_id);
			setExpandedDetail(null);
			if (!coId) return;
			setDetailLoading(true);
			try {
				const { data, error } = await fetchEnquiryById(row.sales_enquiry_id, coId);
				if (error) throw new Error(error);
				setExpandedDetail(data?.data ?? null);
			} catch (err) {
				setErrorMessage(err instanceof Error ? err.message : "Failed to load enquiry lines");
			} finally {
				setDetailLoading(false);
			}
		},
		[coId, expandedId]
	);

	const refreshExpanded = React.useCallback(async () => {
		if (expandedId && coId) {
			const { data } = await fetchEnquiryById(expandedId, coId);
			setExpandedDetail(data?.data ?? null);
		}
		await load();
	}, [expandedId, coId, load]);

	if (!coId) {
		return (
			<Alert severity="info" sx={{ m: 3 }}>
				Select a company from the sidebar to see the costing worklist.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
				<Box>
					<Typography variant="h5" fontWeight={700}>
						Costing Review
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Enquiries waiting on Design &amp; Costing — confirm cost sheets or consult procurement on prices.
					</Typography>
				</Box>
				<Button size="small" variant="outlined" startIcon={<RefreshCw size={16} />} onClick={load} disabled={loading}>
					Refresh
				</Button>
			</Stack>

			{errorMessage ? <Alert severity="error" onClose={() => setErrorMessage(null)}>{errorMessage}</Alert> : null}

			<Paper variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell sx={{ width: 40 }} />
							<TableCell>Enquiry No.</TableCell>
							<TableCell>Date</TableCell>
							<TableCell>Customer</TableCell>
							<TableCell>Stage</TableCell>
							<TableCell>Days</TableCell>
							<TableCell align="right">Actions</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={7} align="center" sx={{ py: 4 }}>
									<CircularProgress size={28} />
								</TableCell>
							</TableRow>
						) : null}
						{!loading && rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} align="center" sx={{ py: 4 }}>
									<Typography variant="body2" color="text.secondary">
										Nothing waiting on costing — all clear.
									</Typography>
								</TableCell>
							</TableRow>
						) : null}
						{rows.map((row) => (
							<React.Fragment key={row.sales_enquiry_id}>
								<TableRow hover>
									<TableCell>
										<IconButton size="small" onClick={() => toggleExpand(row)}>
											{expandedId === row.sales_enquiry_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
										</IconButton>
									</TableCell>
									<TableCell>
										<Typography variant="body2" color="primary" fontWeight={600}>
											{row.enquiry_no || "Draft"}
										</Typography>
									</TableCell>
									<TableCell>{row.enquiry_date}</TableCell>
									<TableCell>{row.party_name || "—"}</TableCell>
									<TableCell>
										<Chip
											size="small"
											color={row.stage_code === "PRICE_CHECK" ? "warning" : "info"}
											label={row.stage_name}
										/>
									</TableCell>
									<TableCell>{row.days_in_stage ?? "-"}</TableCell>
									<TableCell align="right">
										<Button
											size="small"
											onClick={() =>
												router.push(
													`/dashboardportal/sales/enquiry/createEnquiry?mode=view&id=${row.sales_enquiry_id}${menuId ? `&menu_id=${menuId}` : ""}`
												)
											}
										>
											Open
										</Button>
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
										<Collapse in={expandedId === row.sales_enquiry_id} timeout="auto" unmountOnExit>
											<Box sx={{ p: 2, bgcolor: "background.default" }}>
												{detailLoading ? (
													<CircularProgress size={22} />
												) : expandedDetail ? (
													<>
														<Stack direction="row" sx={{ mb: 1 }}>
															<Chip
																size="small"
																color={
																	expandedDetail.lines.filter(
																		(l) => l.cost_snapshot_id && l.overhead_pct != null && l.margin_pct != null
																	).length === expandedDetail.lines.length
																		? "success"
																		: "default"
																}
																label={`Costed ${
																	expandedDetail.lines.filter(
																		(l) => l.cost_snapshot_id && l.overhead_pct != null && l.margin_pct != null
																	).length
																}/${expandedDetail.lines.length}`}
															/>
														</Stack>
														<Table size="small">
															<TableHead>
																<TableRow>
																	<TableCell>Item</TableCell>
																	<TableCell>Qty</TableCell>
																	<TableCell>Target Price</TableCell>
																	<TableCell>Cost Basis</TableCell>
																	<TableCell align="right">Line Action</TableCell>
																</TableRow>
															</TableHead>
															<TableBody>
																{expandedDetail.lines.map((line) => (
																	<TableRow key={line.enquiry_dtl_id}>
																		<TableCell>
																			{line.item_id ? (
																				<>
																					{line.item_code ? `${line.item_code} — ` : ""}
																					{line.item_name}
																				</>
																			) : (
																				<em>{line.item_desc_freetext} (new item — create it in Item Master + BOM first)</em>
																			)}
																			{Number(line.design_change) === 1 ? (
																				<Chip size="small" sx={{ ml: 1 }} variant="outlined" label="design change" />
																			) : null}
																		</TableCell>
																		<TableCell>
																			{line.qty ?? "-"} {line.uom_name ?? ""}
																		</TableCell>
																		<TableCell>{line.target_price ?? "-"}</TableCell>
																		<TableCell>
																			{line.cost_snapshot_id && line.overhead_pct != null && line.margin_pct != null ? (
																				<Chip
																					size="small"
																					color="success"
																					label={
																						line.sell_price_per_unit != null
																							? `Done · ₹${Number(line.sell_price_per_unit).toLocaleString("en-IN")}/unit`
																							: "Done"
																					}
																				/>
																			) : line.cost_snapshot_id ? (
																				<Chip size="small" color="warning" label="Costed · price pending" />
																			) : (
																				<Chip size="small" variant="outlined" label="Pending" />
																			)}
																		</TableCell>
																		<TableCell align="right">
																			{line.item_id ? (
																				<Button size="small" onClick={() => setConfirmLine(line)}>
																					{line.cost_snapshot_id ? "Re-confirm" : "Confirm Costing"}
																				</Button>
																			) : null}
																		</TableCell>
																	</TableRow>
																))}
															</TableBody>
														</Table>
														<Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
															<Button
																size="small"
																variant="outlined"
																onClick={() => setPriceCheckFor(expandedDetail)}
																disabled={expandedDetail.stage_code !== "COSTING_REVIEW"}
															>
																Ask Procurement (Price Check)
															</Button>
															<Button
																size="small"
																variant="contained"
																onClick={async () => {
																	const { error } = await moveEnquiryStage({
																		sales_enquiry_id: expandedDetail.sales_enquiry_id,
																		action: "FORWARD",
																		to_stage_code: "QUOTATION",
																		feedback: "Costing confirmed — over to sales",
																	});
																	if (error) setErrorMessage(error);
																	else {
																		setToast("Sent back to sales for quotation");
																		await refreshExpanded();
																	}
																}}
															>
																Costing Done → Sales
															</Button>
															<Button size="small" color="warning" variant="outlined" onClick={() => setSendBackFor(expandedDetail)}>
																Send Back to Sales (needs info)
															</Button>
														</Stack>
													</>
												) : null}
											</Box>
										</Collapse>
									</TableCell>
								</TableRow>
							</React.Fragment>
						))}
					</TableBody>
				</Table>
			</Paper>

			<ConfirmCostingDialog
				line={confirmLine}
				coId={coId}
				onClose={() => setConfirmLine(null)}
				onDone={async (message) => {
					setConfirmLine(null);
					setToast(message);
					await refreshExpanded();
				}}
				onError={setErrorMessage}
			/>

			<PriceCheckDialog
				enquiry={priceCheckFor}
				onClose={() => setPriceCheckFor(null)}
				onDone={async (message) => {
					setPriceCheckFor(null);
					setToast(message);
					await refreshExpanded();
				}}
				onError={setErrorMessage}
			/>

			<SendBackDialog
				enquiry={sendBackFor}
				onClose={() => setSendBackFor(null)}
				onDone={async (message) => {
					setSendBackFor(null);
					setToast(message);
					await refreshExpanded();
				}}
				onError={setErrorMessage}
			/>

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
// Confirm costing — pick the BOM/costing version whose current snapshot
// becomes the approved cost basis for the enquiry line.
// ---------------------------------------------------------------------------

interface ConfirmCostingDialogProps {
	line: EnquiryLine | null;
	coId: number;
	onClose: () => void;
	onDone: (message: string) => Promise<void>;
	onError: (message: string) => void;
}

function ConfirmCostingDialog({ line, coId, onClose, onDone, onError }: ConfirmCostingDialogProps) {
	const [versions, setVersions] = React.useState<BomVersionRow[]>([]);
	const [selected, setSelected] = React.useState<number | "">("");
	const [oh, setOh] = React.useState<string>("");
	const [margin, setMargin] = React.useState<string>("");
	const [loading, setLoading] = React.useState(false);
	const [submitting, setSubmitting] = React.useState(false);

	React.useEffect(() => {
		const loadVersions = async () => {
			if (!line?.item_id) return;
			setLoading(true);
			setSelected("");
			try {
				const url = `${apiRoutesPortalMasters.BOM_COSTING_LIST}?co_id=${coId}`;
				const { data, error } = await fetchWithCookie(url, "GET");
				if (error) throw new Error(error);
				const all = ((data as { data?: BomVersionRow[] })?.data ?? []).filter(
					(v) => Number(v.item_id) === Number(line.item_id)
				);
				setVersions(all);
				const current = all.find((v) => Number(v.is_current) === 1);
				if (current) setSelected(current.bom_hdr_id);
			} catch (err) {
				onError(err instanceof Error ? err.message : "Failed to load costing versions");
			} finally {
				setLoading(false);
			}
		};
		if (line) {
			loadVersions();
			setOh(line.overhead_pct != null ? String(line.overhead_pct) : "");
			setMargin(line.margin_pct != null ? String(line.margin_pct) : "");
		}
	}, [line, coId, onError]);

	const handleConfirm = async () => {
		if (!line?.enquiry_dtl_id || selected === "" || oh === "" || margin === "") return;
		setSubmitting(true);
		try {
			const { data, error } = await confirmLineCosting(line.enquiry_dtl_id, Number(selected), Number(oh), Number(margin));
			if (error) throw new Error(error);
			await onDone(data?.message ?? "Cost basis confirmed");
		} catch (err) {
			onError(err instanceof Error ? err.message : "Failed to confirm costing");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={Boolean(line)} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Confirm Cost Basis</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
				<Typography variant="body2">
					{line?.item_code ? `${line.item_code} — ` : ""}
					{line?.item_name}
				</Typography>
				{loading ? (
					<CircularProgress size={24} />
				) : versions.length === 0 ? (
					<Alert severity="warning">
						No costing version exists for this item yet — create one in BOM Costing, run the rollup, then confirm here.
					</Alert>
				) : (
					<TextField
						select
						size="small"
						label="Costing version"
						value={selected}
						onChange={(e) => setSelected(e.target.value === "" ? "" : Number(e.target.value))}
					>
						{versions.map((v) => (
							<MenuItem key={v.bom_hdr_id} value={v.bom_hdr_id}>
								v{v.bom_version ?? "?"}
								{v.version_label ? ` · ${v.version_label}` : ""}
								{Number(v.is_current) === 1 ? " (current)" : ""}
								{v.cost_per_unit != null ? ` · ₹${Number(v.cost_per_unit).toLocaleString("en-IN")}/unit` : ""}
							</MenuItem>
						))}
					</TextField>
				)}
				<Stack direction="row" spacing={2}>
					<TextField
						type="number"
						size="small"
						label="Overhead %"
						value={oh}
						onChange={(e) => setOh(e.target.value)}
						fullWidth
					/>
					<TextField
						type="number"
						size="small"
						label="Margin %"
						value={margin}
						onChange={(e) => setMargin(e.target.value)}
						fullWidth
					/>
				</Stack>
				{selected !== "" && oh !== "" && margin !== "" ? (() => {
					const base = versions.find((v) => v.bom_hdr_id === selected)?.cost_per_unit ?? 0;
					const sell = Number(base) * (1 + Number(oh) / 100) * (1 + Number(margin) / 100);
					return <Typography variant="body2">Sell / unit: ₹{sell.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</Typography>;
				})() : null}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" onClick={handleConfirm} disabled={submitting || selected === "" || oh === "" || margin === ""}>
					{submitting ? "Confirming…" : "Confirm"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Raise a price check with procurement
// ---------------------------------------------------------------------------

interface PriceCheckDialogProps {
	enquiry: EnquiryDetail | null;
	onClose: () => void;
	onDone: (message: string) => Promise<void>;
	onError: (message: string) => void;
}

function PriceCheckDialog({ enquiry, onClose, onDone, onError }: PriceCheckDialogProps) {
	const [note, setNote] = React.useState("");
	const [submitting, setSubmitting] = React.useState(false);

	React.useEffect(() => {
		if (enquiry) setNote("");
	}, [enquiry]);

	const handleSubmit = async () => {
		if (!enquiry) return;
		setSubmitting(true);
		try {
			const { data, error } = await createPriceCheck({
				sales_enquiry_id: enquiry.sales_enquiry_id,
				request_note: note.trim() || null,
			});
			if (error) throw new Error(error);
			await onDone(data?.message ?? "Price check sent to procurement");
		} catch (err) {
			onError(err instanceof Error ? err.message : "Failed to raise price check");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={Boolean(enquiry)} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Ask Procurement to Reconfirm Prices</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
				<Typography variant="body2" color="text.secondary">
					All enquiry lines with an item are included, prefilled with the last purchase rate. Procurement confirms or
					corrects and the enquiry comes back to costing.
				</Typography>
				<TextField
					label="Note to procurement"
					size="small"
					multiline
					minRows={2}
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="e.g. steel prices moved — reconfirm plate & casting rates"
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" onClick={handleSubmit} disabled={submitting}>
					{submitting ? "Sending…" : "Send to Procurement"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Send back to sales with mandatory feedback
// ---------------------------------------------------------------------------

interface SendBackDialogProps {
	enquiry: EnquiryDetail | null;
	onClose: () => void;
	onDone: (message: string) => Promise<void>;
	onError: (message: string) => void;
}

function SendBackDialog({ enquiry, onClose, onDone, onError }: SendBackDialogProps) {
	const [feedback, setFeedback] = React.useState("");
	const [submitting, setSubmitting] = React.useState(false);

	React.useEffect(() => {
		if (enquiry) setFeedback("");
	}, [enquiry]);

	const handleSubmit = async () => {
		if (!enquiry) return;
		if (!feedback.trim()) {
			onError("Feedback is required when sending back");
			return;
		}
		setSubmitting(true);
		try {
			const { data, error } = await moveEnquiryStage({
				sales_enquiry_id: enquiry.sales_enquiry_id,
				action: "SEND_BACK",
				to_stage_code: "ENQ_NOTED",
				feedback: feedback.trim(),
			});
			if (error) throw new Error(error);
			await onDone(data?.message ?? "Sent back to sales");
		} catch (err) {
			onError(err instanceof Error ? err.message : "Failed to send back");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={Boolean(enquiry)} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Send Back to Sales</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
				<TextField
					label="Feedback (required)"
					size="small"
					multiline
					minRows={3}
					value={feedback}
					onChange={(e) => setFeedback(e.target.value)}
					placeholder="e.g. drawing unclear — confirm bore diameter with the customer"
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" color="warning" onClick={handleSubmit} disabled={submitting}>
					{submitting ? "Sending…" : "Send Back"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
