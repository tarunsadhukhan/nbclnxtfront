"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Alert,
	Box,
	Button,
	Card,
	CardActionArea,
	CardContent,
	Chip,
	CircularProgress,
	Stack,
	Typography,
} from "@mui/material";
import { List, RefreshCw } from "lucide-react";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchEnquiryBoard, type EnquiryBoardStage } from "@/utils/enquiryService";

/**
 * Enquiry Flow Board — every open enquiry grouped by stage, with aging,
 * hold badges, latest feedback and linked-document counts (design §7).
 */
export default function EnquiryBoardPage() {
	return (
		<Suspense
			fallback={
				<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
					<CircularProgress />
				</Box>
			}
		>
			<EnquiryBoardContent />
		</Suspense>
	);
}

function EnquiryBoardContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const menuId = searchParams?.get("menu_id") || "";
	const { selectedCompany, selectedBranches } = useSidebarContext();
	const coId = selectedCompany?.co_id ?? null;

	// Sidebar context hydrates from localStorage on the client only — defer
	// rendering until mounted to avoid an SSR/client hydration mismatch.
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const [stages, setStages] = React.useState<EnquiryBoardStage[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const load = React.useCallback(async () => {
		if (!coId) return;
		setLoading(true);
		setErrorMessage(null);
		try {
			const { data, error } = await fetchEnquiryBoard(coId, selectedBranches.length === 1 ? selectedBranches[0] : null);
			if (error) throw new Error(error);
			setStages(data?.data?.stages ?? []);
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to load the board");
		} finally {
			setLoading(false);
		}
	}, [coId, selectedBranches]);

	React.useEffect(() => {
		load();
	}, [load]);

	const openEnquiry = React.useCallback(
		(salesEnquiryId: number) => {
			const menuSuffix = menuId ? `&menu_id=${encodeURIComponent(menuId)}` : "";
			router.push(`/dashboardportal/sales/enquiry/createEnquiry?mode=view&id=${salesEnquiryId}${menuSuffix}`);
		},
		[router, menuId]
	);

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
				Select a company from the sidebar to see the enquiry board.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
				<Box>
					<Typography variant="h5" fontWeight={700}>
						Enquiry Flow Board
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Where every enquiry stands, and which department it is waiting on.
					</Typography>
				</Box>
				<Stack direction="row" spacing={1}>
					<Button
						size="small"
						variant="outlined"
						startIcon={<List size={16} />}
						onClick={() =>
							router.push(`/dashboardportal/sales/enquiry${menuId ? `?menu_id=${encodeURIComponent(menuId)}` : ""}`)
						}
					>
						List View
					</Button>
					<Button size="small" variant="outlined" startIcon={<RefreshCw size={16} />} onClick={load} disabled={loading}>
						Refresh
					</Button>
				</Stack>
			</Stack>

			{errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
					<CircularProgress />
				</Box>
			) : (
				<Box sx={{ overflowX: "auto", pb: 2 }}>
					<Stack direction="row" spacing={2} sx={{ minWidth: "max-content", alignItems: "flex-start" }}>
						{stages.map((stage) => (
							<Box
								key={stage.stage_id}
								sx={{
									width: 280,
									flexShrink: 0,
									bgcolor: "background.default",
									border: 1,
									borderColor: "divider",
									borderRadius: 2,
									p: 1.5,
								}}
							>
								<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
									<Box>
										<Typography variant="subtitle2" fontWeight={700}>
											{stage.stage_name}
										</Typography>
										{stage.dept_hint ? (
											<Typography variant="caption" color="text.secondary">
												{stage.dept_hint}
											</Typography>
										) : null}
									</Box>
									<Chip size="small" label={stage.enquiries?.length ?? 0} />
								</Stack>
								<Stack spacing={1}>
									{(stage.enquiries ?? []).map((card) => (
										<Card key={card.sales_enquiry_id} variant="outlined">
											<CardActionArea onClick={() => openEnquiry(card.sales_enquiry_id)}>
												<CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
													<Stack direction="row" justifyContent="space-between" alignItems="center">
														<Typography variant="body2" fontWeight={700} color="primary">
															{card.enquiry_no || "Draft"}
														</Typography>
														{Number(card.hold_flag) === 1 ? <Chip size="small" color="warning" label="Hold" /> : null}
													</Stack>
													<Typography variant="body2" noWrap>
														{card.party_name || "—"}
													</Typography>
													<Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
														<Chip size="small" variant="outlined" label={`${card.days_in_stage ?? 0}d in stage`} />
														{Number(card.quotation_count) > 0 ? (
															<Chip size="small" variant="outlined" label={`SQ ×${card.quotation_count}`} />
														) : null}
														{Number(card.sales_order_count) > 0 ? (
															<Chip size="small" variant="outlined" label={`SO ×${card.sales_order_count}`} />
														) : null}
														{Number(card.line_count) > 0 ? (
															<Chip size="small"
																color={Number(card.costed_line_count) >= Number(card.line_count) ? "success" : "default"}
																variant="outlined"
																label={Number(card.costed_line_count) >= Number(card.line_count)
																	? "Costing ✓"
																	: `Costed ${card.costed_line_count ?? 0}/${card.line_count}`} />
														) : null}
													</Stack>
													{card.latest_feedback ? (
														<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }} noWrap>
															“{card.latest_feedback}”
														</Typography>
													) : null}
												</CardContent>
											</CardActionArea>
										</Card>
									))}
									{!stage.enquiries?.length ? (
										<Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", py: 1 }}>
											Nothing here
										</Typography>
									) : null}
								</Stack>
							</Box>
						))}
					</Stack>
				</Box>
			)}
		</Box>
	);
}
