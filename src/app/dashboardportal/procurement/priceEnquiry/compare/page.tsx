"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Box,
	Paper,
	Typography,
	Button,
	CircularProgress,
	Alert,
	Divider,
	Chip,
} from "@mui/material";
import {
	ArrowLeft as ArrowBackIcon,
	CheckCircle as CheckCircleIcon,
	ShoppingCart as ShoppingCartIcon,
} from "lucide-react";
import {
	getEnquiryById,
	getResponsesForComparison,
	selectEnquiryResponse,
} from "@/utils/priceEnquiryService";
import { toast } from "@/hooks/use-toast";
import type {
	EnquiryDetails,
	ComparisonResponseDetail,
} from "../createEnquiry/types/enquiryTypes";
import {
	createPoFromResponseUrl,
	hubUrl,
	indexUrl,
} from "../createEnquiry/utils/enquiryRoutes";
import ComparisonTable from "./_components/ComparisonTable";
import ComparisonSummary from "./_components/ComparisonSummary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (value?: string | null): string => {
	if (!value) return "-";
	const trimmed = value.trim();
	let date: Date | null = null;
	const ymdMatch = trimmed.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
	if (ymdMatch) {
		const [, year, month, day] = ymdMatch;
		date = new Date(Number(year), Number(month) - 1, Number(day));
	} else {
		const parsed = new Date(trimmed);
		if (!Number.isNaN(parsed.getTime())) {
			date = parsed;
		}
	}
	if (!date || Number.isNaN(date.getTime())) {
		return trimmed;
	}
	return new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
};

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------

function PageLoading() {
	return (
		<Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
			<CircularProgress />
		</Box>
	);
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ComparisonPage() {
	return (
		<Suspense fallback={<PageLoading />}>
			<ComparisonPageContent />
		</Suspense>
	);
}

function ComparisonPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const enquiryId = searchParams?.get("enquiry_id") ?? "";
	const menuIdParam = searchParams?.get("menu_id") ?? "";

	// -----------------------------------------------------------------------
	// State
	// -----------------------------------------------------------------------

	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [enquiryDetails, setEnquiryDetails] = React.useState<EnquiryDetails | null>(null);
	const [responses, setResponses] = React.useState<ComparisonResponseDetail[]>([]);
	const [selectedResponseId, setSelectedResponseId] = React.useState<number | null>(null);
	const [selecting, setSelecting] = React.useState(false);

	// -----------------------------------------------------------------------
	// Fetch data on mount
	// -----------------------------------------------------------------------

	React.useEffect(() => {
		let cancelled = false;

		const loadData = async () => {
			setLoading(true);
			setError(null);

			try {
				if (!enquiryId) {
					throw new Error("Missing enquiry_id parameter.");
				}

				// Fetch enquiry details and comparison data in parallel
				const [rawEnquiry, comparisonResult] = await Promise.all([
					getEnquiryById(enquiryId),
					getResponsesForComparison(enquiryId),
				]);

				if (!rawEnquiry) {
					throw new Error("Enquiry not found.");
				}

				const responseList = comparisonResult.data;

				if (!cancelled) {
					setEnquiryDetails(rawEnquiry);
					setResponses(responseList);

					// Auto-select any already-selected response
					const alreadySelected = responseList.find((r) => r.is_selected === 1);
					if (alreadySelected) {
						setSelectedResponseId(alreadySelected.proc_price_enquiry_response_id);
					}
				}
			} catch (err) {
				if (!cancelled) {
					const message = err instanceof Error ? err.message : "Failed to load comparison data.";
					setError(message);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		};

		loadData();

		return () => {
			cancelled = true;
		};
	}, [enquiryId]);

	// -----------------------------------------------------------------------
	// Handlers
	// -----------------------------------------------------------------------

	const handleGoBack = React.useCallback(() => {
		if (enquiryId) {
			router.push(hubUrl(enquiryId, menuIdParam || null));
		} else {
			router.push(indexUrl(menuIdParam || null));
		}
	}, [router, enquiryId, menuIdParam]);

	const handleSelectResponse = React.useCallback((responseId: number) => {
		setSelectedResponseId(responseId);
	}, []);

	const handleConfirmSelection = React.useCallback(async () => {
		if (!selectedResponseId) {
			toast({
				variant: "destructive",
				title: "Selection Required",
				description: "Please select a supplier response first.",
			});
			return;
		}

		setSelecting(true);

		try {
			await selectEnquiryResponse(selectedResponseId, enquiryId);

			// Update local state to reflect selection
			setResponses((prev) =>
				prev.map((r) => ({
					...r,
					is_selected: r.proc_price_enquiry_response_id === selectedResponseId ? 1 : 0,
				})),
			);

			toast({
				title: "Success",
				description: "Supplier response selected successfully.",
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to select response.";
			toast({
				variant: "destructive",
				title: "Error",
				description: message,
			});
		} finally {
			setSelecting(false);
		}
	}, [selectedResponseId, enquiryId]);

	const handleCreatePO = React.useCallback(() => {
		if (!selectedResponseId || !enquiryId) return;
		router.push(
			createPoFromResponseUrl(enquiryId, selectedResponseId, menuIdParam || null),
		);
	}, [router, selectedResponseId, enquiryId, menuIdParam]);

	// Check if the currently selected response has been confirmed (saved to backend)
	const isSelectionConfirmed = React.useMemo(() => {
		if (!selectedResponseId) return false;
		const match = responses.find(
			(r) => r.proc_price_enquiry_response_id === selectedResponseId,
		);
		return match?.is_selected === 1;
	}, [selectedResponseId, responses]);

	// -----------------------------------------------------------------------
	// Render
	// -----------------------------------------------------------------------

	if (loading) {
		return <PageLoading />;
	}

	if (error) {
		return (
			<Box p={3}>
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
				<Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleGoBack}>
					Go Back
				</Button>
			</Box>
		);
	}

	return (
		<Box p={{ xs: 2, md: 3 }} maxWidth={1600} mx="auto">
			{/* Title bar */}
			<Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
				<Box display="flex" alignItems="center" gap={1}>
					<Button variant="text" size="small" startIcon={<ArrowBackIcon />} onClick={handleGoBack}>
						Back
					</Button>
					<Box>
						<Typography variant="h5" fontWeight={700}>
							Compare Supplier Responses
						</Typography>
						{enquiryDetails && (
							<Typography variant="body2" color="text.secondary">
								Enquiry: {enquiryDetails.price_enquiry_squence_no || enquiryDetails.enquiry_no}
							</Typography>
						)}
					</Box>
				</Box>
				<Box display="flex" gap={1}>
					{!isSelectionConfirmed && (
						<Button
							variant="outlined"
							color="primary"
							startIcon={selecting ? <CircularProgress size={18} /> : <CheckCircleIcon />}
							onClick={handleConfirmSelection}
							disabled={!selectedResponseId || selecting}
						>
							{selecting ? "Saving..." : "Confirm Selection"}
						</Button>
					)}
					<Button
						variant="contained"
						startIcon={<ShoppingCartIcon />}
						onClick={handleCreatePO}
						disabled={!isSelectionConfirmed}
					>
						Create PO
					</Button>
				</Box>
			</Box>

			<Divider sx={{ mb: 3 }} />

			{/* Enquiry info summary */}
			{enquiryDetails && (
				<Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
					<Typography variant="subtitle2" fontWeight={600} gutterBottom>
						Enquiry Information
					</Typography>
					<Box display="flex" flexWrap="wrap" gap={3}>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Enquiry No.
							</Typography>
							<Typography variant="body2" fontWeight={600}>
								{enquiryDetails.price_enquiry_squence_no || enquiryDetails.enquiry_no}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Date
							</Typography>
							<Typography variant="body2">
								{formatDate(enquiryDetails.price_enquiry_date)}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Branch
							</Typography>
							<Typography variant="body2">
								{enquiryDetails.branch_name || "-"}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Status
							</Typography>
							<Chip
								size="small"
								label={enquiryDetails.status_name || "Draft"}
								color={
									enquiryDetails.status_name?.toLowerCase() === "approved"
										? "success"
										: "default"
								}
							/>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Items
							</Typography>
							<Typography variant="body2">
								{enquiryDetails.items?.length ?? 0}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Responses
							</Typography>
							<Typography variant="body2">
								{responses.length}
							</Typography>
						</Box>
					</Box>
				</Paper>
			)}

			{/* Comparison table */}
			<Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
				<Typography variant="subtitle2" fontWeight={600} gutterBottom>
					Price Comparison
				</Typography>
				<ComparisonTable
					items={enquiryDetails?.items ?? []}
					responses={responses}
					selectedResponseId={selectedResponseId}
					onSelectResponse={handleSelectResponse}
				/>
			</Paper>

			{/* Terms comparison summary */}
			<Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
				<Typography variant="subtitle2" fontWeight={600} gutterBottom>
					Terms Comparison
				</Typography>
				<ComparisonSummary
					responses={responses}
					selectedResponseId={selectedResponseId}
				/>
			</Paper>
		</Box>
	);
}
