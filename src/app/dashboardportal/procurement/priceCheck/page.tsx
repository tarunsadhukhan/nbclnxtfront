"use client";

import React, { Suspense } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
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
import { RefreshCw } from "lucide-react";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
	fetchPriceCheckById,
	fetchPriceCheckPending,
	respondPriceCheck,
	type PriceCheckDtl,
	type PriceCheckRow,
} from "@/utils/enquiryService";

const RATE_SOURCES = [
	{ value: "last_po", label: "Last PO rate" },
	{ value: "supplier_quote", label: "Supplier quote" },
	{ value: "estimate", label: "Estimate" },
] as const;

type ResponseLine = PriceCheckDtl & { confirmed_rate_input: string; rate_source_input: string; remarks_input: string };

/**
 * Procurement worklist — price checks raised by Design & Costing during an
 * enquiry's costing review. Last-PO rates arrive prefilled; procurement
 * confirms or corrects, and the enquiry bounces back to costing with the
 * response as internal feedback (design §7).
 */
export default function PriceCheckPage() {
	return (
		<Suspense
			fallback={
				<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
					<CircularProgress />
				</Box>
			}
		>
			<PriceCheckContent />
		</Suspense>
	);
}

function PriceCheckContent() {
	const { selectedCompany, selectedBranches } = useSidebarContext();
	const coId = selectedCompany?.co_id ?? null;

	const [rows, setRows] = React.useState<PriceCheckRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [toast, setToast] = React.useState<string | null>(null);

	const [respondingTo, setRespondingTo] = React.useState<PriceCheckRow | null>(null);
	const [responseLines, setResponseLines] = React.useState<ResponseLine[]>([]);
	const [responseNote, setResponseNote] = React.useState("");
	const [dialogLoading, setDialogLoading] = React.useState(false);
	const [submitting, setSubmitting] = React.useState(false);

	const load = React.useCallback(async () => {
		if (!coId) return;
		setLoading(true);
		setErrorMessage(null);
		try {
			const { data, error } = await fetchPriceCheckPending(coId, selectedBranches.length === 1 ? selectedBranches[0] : null);
			if (error) throw new Error(error);
			setRows(data?.data ?? []);
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to load price checks");
		} finally {
			setLoading(false);
		}
	}, [coId, selectedBranches]);

	React.useEffect(() => {
		load();
	}, [load]);

	const openRespond = React.useCallback(async (row: PriceCheckRow) => {
		setRespondingTo(row);
		setResponseNote("");
		setResponseLines([]);
		setDialogLoading(true);
		try {
			const { data, error } = await fetchPriceCheckById(row.price_check_id);
			if (error) throw new Error(error);
			const lines = data?.data?.lines ?? [];
			setResponseLines(
				lines.map((line) => ({
					...line,
					confirmed_rate_input: line.confirmed_rate != null ? String(line.confirmed_rate) : line.last_po_rate != null ? String(line.last_po_rate) : "",
					rate_source_input: line.rate_source ?? "last_po",
					remarks_input: line.remarks ?? "",
				}))
			);
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to load price check detail");
			setRespondingTo(null);
		} finally {
			setDialogLoading(false);
		}
	}, []);

	const handleSubmit = React.useCallback(async () => {
		if (!respondingTo) return;
		setSubmitting(true);
		try {
			const { data, error } = await respondPriceCheck({
				price_check_id: respondingTo.price_check_id,
				response_note: responseNote.trim() || null,
				items: responseLines.map((line) => ({
					price_check_dtl_id: line.price_check_dtl_id,
					confirmed_rate: line.confirmed_rate_input === "" ? null : Number(line.confirmed_rate_input),
					rate_source: line.rate_source_input || null,
					remarks: line.remarks_input.trim() || null,
				})),
			});
			if (error) throw new Error(error);
			setToast(data?.message ?? "Prices confirmed — sent back to costing");
			setRespondingTo(null);
			await load();
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to respond");
		} finally {
			setSubmitting(false);
		}
	}, [respondingTo, responseNote, responseLines, load]);

	if (!coId) {
		return (
			<Alert severity="info" sx={{ m: 3 }}>
				Select a company from the sidebar to see pending price checks.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
				<Box>
					<Typography variant="h5" fontWeight={700}>
						Price Checks
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Pricing consults from Design &amp; Costing — confirm current purchase prices for enquiry costing.
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
							<TableCell>Enquiry</TableCell>
							<TableCell>Customer</TableCell>
							<TableCell>Requested</TableCell>
							<TableCell>Note from Costing</TableCell>
							<TableCell>Status</TableCell>
							<TableCell align="right">Action</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
									<CircularProgress size={28} />
								</TableCell>
							</TableRow>
						) : null}
						{!loading && rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
									<Typography variant="body2" color="text.secondary">
										No pending price checks.
									</Typography>
								</TableCell>
							</TableRow>
						) : null}
						{rows.map((row) => (
							<TableRow key={row.price_check_id} hover>
								<TableCell>
									<Typography variant="body2" color="primary" fontWeight={600}>
										{row.enquiry_no || `Enquiry #${row.sales_enquiry_id}`}
									</Typography>
								</TableCell>
								<TableCell>{row.party_name || "—"}</TableCell>
								<TableCell>
									{row.requested_by_name || "-"}
									<Typography variant="caption" color="text.secondary" display="block">
										{row.requested_date_time ?? ""}
									</Typography>
								</TableCell>
								<TableCell sx={{ maxWidth: 280 }}>
									<Typography variant="body2" noWrap title={row.request_note ?? ""}>
										{row.request_note || "—"}
									</Typography>
								</TableCell>
								<TableCell>
									<Chip size="small" color="warning" label={row.pc_status} />
								</TableCell>
								<TableCell align="right">
									<Button size="small" variant="contained" onClick={() => openRespond(row)}>
										Respond
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Paper>

			<Dialog open={Boolean(respondingTo)} onClose={() => setRespondingTo(null)} maxWidth="md" fullWidth>
				<DialogTitle>Confirm Prices — {respondingTo?.enquiry_no || `Enquiry #${respondingTo?.sales_enquiry_id}`}</DialogTitle>
				<DialogContent sx={{ pt: "12px !important" }}>
					{dialogLoading ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress size={28} />
						</Box>
					) : (
						<Stack spacing={2}>
							{respondingTo?.request_note ? <Alert severity="info">{respondingTo.request_note}</Alert> : null}
							<Box sx={{ overflowX: "auto" }}>
								<Table size="small" sx={{ minWidth: 760 }}>
									<TableHead>
										<TableRow>
											<TableCell>Item</TableCell>
											<TableCell>Last PO Rate</TableCell>
											<TableCell sx={{ width: 140 }}>Confirmed Rate</TableCell>
											<TableCell sx={{ width: 160 }}>Source</TableCell>
											<TableCell sx={{ minWidth: 160 }}>Remarks</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{responseLines.map((line, index) => (
											<TableRow key={line.price_check_dtl_id}>
												<TableCell>
													{line.item_code ? `${line.item_code} — ` : ""}
													{line.item_name}
												</TableCell>
												<TableCell>
													{line.last_po_rate != null ? `₹${Number(line.last_po_rate).toLocaleString("en-IN")}` : "—"}
													{line.last_supplier_name ? (
														<Typography variant="caption" color="text.secondary" display="block">
															{line.last_supplier_name}
															{line.last_po_date ? ` · ${line.last_po_date}` : ""}
														</Typography>
													) : null}
												</TableCell>
												<TableCell>
													<TextField
														size="small"
														type="number"
														value={line.confirmed_rate_input}
														onChange={(e) =>
															setResponseLines((prev) =>
																prev.map((l, i) => (i === index ? { ...l, confirmed_rate_input: e.target.value } : l))
															)
														}
													/>
												</TableCell>
												<TableCell>
													<TextField
														select
														size="small"
														fullWidth
														value={line.rate_source_input}
														onChange={(e) =>
															setResponseLines((prev) =>
																prev.map((l, i) => (i === index ? { ...l, rate_source_input: e.target.value } : l))
															)
														}
													>
														{RATE_SOURCES.map((source) => (
															<MenuItem key={source.value} value={source.value}>
																{source.label}
															</MenuItem>
														))}
													</TextField>
												</TableCell>
												<TableCell>
													<TextField
														size="small"
														fullWidth
														value={line.remarks_input}
														onChange={(e) =>
															setResponseLines((prev) =>
																prev.map((l, i) => (i === index ? { ...l, remarks_input: e.target.value } : l))
															)
														}
													/>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</Box>
							<TextField
								label="Response note to costing"
								size="small"
								multiline
								minRows={2}
								value={responseNote}
								onChange={(e) => setResponseNote(e.target.value)}
								placeholder="e.g. plate rates up 4% since the last PO — confirmed with two suppliers"
							/>
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setRespondingTo(null)}>Cancel</Button>
					<Button variant="contained" onClick={handleSubmit} disabled={submitting || dialogLoading}>
						{submitting ? "Sending…" : "Confirm & Return to Costing"}
					</Button>
				</DialogActions>
			</Dialog>

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
