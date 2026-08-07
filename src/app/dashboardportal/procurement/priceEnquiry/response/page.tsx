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
	Autocomplete,
	TextField,
} from "@mui/material";
import { ArrowLeft as ArrowBackIcon, Save as SaveIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
	getEnquiryById,
	getResponseById,
	addEnquiryResponse,
	updateEnquiryResponse,
} from "@/utils/priceEnquiryService";
import type {
	EnquiryDetails,
	EnquiryDetailItem,
	EnquirySupplierInfo,
	ResponseLineItem,
} from "../createEnquiry/types/enquiryTypes";
import type { ResponseDetail } from "../createEnquiry/utils/enquirySchemas";
import {
	DISCOUNT_MODE,
} from "../createEnquiry/utils/enquiryConstants";
import { hubUrl, indexUrl } from "../createEnquiry/utils/enquiryRoutes";
import ResponseHeaderForm from "./_components/ResponseHeaderForm";
import type { HeaderField, ResponseHeaderValues } from "./_components/ResponseHeaderForm";
import ResponseLineItemsTable from "./_components/ResponseLineItemsTable";
import type { EditableLineField } from "./_components/ResponseLineItemsTable";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PageMode = "create" | "edit" | "view";

/** Supplier option used in create mode for supplier selection. */
interface SupplierOption {
	supplier_id: number;
	supp_name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let lineIdSeed = 0;
const generateLineId = () => {
	lineIdSeed += 1;
	return `resp-line-${lineIdSeed}`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Compute discount amount from mode and value for a given gross amount.
 */
const computeDiscountAmount = (
	grossAmount: number,
	discountMode: number | null,
	discountValue: number | null,
): number => {
	if (!discountMode || discountMode === 0 || discountValue == null || discountValue === 0) {
		return 0;
	}
	if (discountMode === DISCOUNT_MODE.PERCENTAGE) {
		return Math.round(((grossAmount * discountValue) / 100) * 100) / 100;
	}
	if (discountMode === DISCOUNT_MODE.AMOUNT) {
		return discountValue;
	}
	return 0;
};

/**
 * Recalculate derived fields for a single line item.
 */
const recalcLine = (line: ResponseLineItem): ResponseLineItem => {
	const rate = line.rate ?? 0;
	const qty = line.qty ?? 0;
	const grossAmount = Math.round(qty * rate * 100) / 100;
	const discountAmount = computeDiscountAmount(grossAmount, line.discountMode, line.discountValue);
	const netAmount = Math.round((grossAmount - discountAmount) * 100) / 100;
	return {
		...line,
		grossAmount,
		discountAmount,
		netAmount,
	};
};

/**
 * Map enquiry detail items to response line items (blank rate/discount).
 * uom/make identity is carried over so the saved quote rows keep the same
 * unit and make as the enquiry line (PO prefill depends on them).
 */
const mapEnquiryItemsToLines = (items: EnquiryDetailItem[]): ResponseLineItem[] =>
	items.map((item) =>
		recalcLine({
			id: generateLineId(),
			enquiryDtlId: item.enquiry_dtl_id,
			itemId: item.item_id,
			itemCode: item.item_code,
			itemName: item.item_name,
			itemMakeId: item.item_make_id ?? null,
			uomId: item.uom_id ?? null,
			uomName: item.uom_name,
			qty: item.qty,
			rate: null,
			discountMode: null,
			discountValue: null,
			discountAmount: null,
			grossAmount: null,
			netAmount: null,
		}),
	);

/**
 * Map an existing API response to line items.
 */
const mapResponseAPIToLines = (resp: ResponseDetail): ResponseLineItem[] =>
	(resp.items ?? []).map((item) =>
		recalcLine({
			id: generateLineId(),
			enquiryDtlId: item.enquiry_dtl_id ?? 0,
			itemId: item.item_id,
			itemCode: item.item_code ?? "",
			itemName: item.item_name ?? "",
			itemMakeId: item.item_make_id ?? null,
			uomId: item.uom_id ?? null,
			uomName: item.uom_name ?? "",
			qty: item.qty ?? 0,
			rate: item.rate ?? null,
			discountMode: item.discount_mode ?? null,
			discountValue: item.discount_value ?? null,
			discountAmount: item.discount_amount ?? null,
			grossAmount: item.gross_amount ?? null,
			netAmount: item.net_amount ?? null,
		}),
	);

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

export default function ResponseRecordingPage() {
	return (
		<Suspense fallback={<PageLoading />}>
			<ResponseRecordingContent />
		</Suspense>
	);
}

function ResponseRecordingContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const enquiryId = searchParams?.get("enquiry_id") ?? "";
	const supplierIdParam = searchParams?.get("supplier_id") ?? "";
	const responseIdParam = searchParams?.get("response_id") ?? "";
	const menuIdParam = searchParams?.get("menu_id") ?? "";
	const modeParam = (searchParams?.get("mode") ?? "create").toLowerCase();
	const mode: PageMode = modeParam === "edit" ? "edit" : modeParam === "view" ? "view" : "create";

	// -----------------------------------------------------------------------
	// State
	// -----------------------------------------------------------------------

	const [loading, setLoading] = React.useState(true);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	// Enquiry details (for context display and item pre-population)
	const [enquiryDetails, setEnquiryDetails] = React.useState<EnquiryDetails | null>(null);

	// Supplier selection (create mode)
	const [selectedSupplier, setSelectedSupplier] = React.useState<SupplierOption | null>(null);
	const [supplierOptions, setSupplierOptions] = React.useState<SupplierOption[]>([]);

	// Response ID (populated after save or in edit/view mode)
	const [responseId, setResponseId] = React.useState<number | null>(
		responseIdParam ? Number(responseIdParam) : null,
	);

	// Header values
	const [headerValues, setHeaderValues] = React.useState<ResponseHeaderValues>({
		supplierName: "",
		responseDate: todayISO(),
		deliveryDays: null,
		creditDays: null,
		paymentTerms: "",
		termsConditions: "",
		remarks: "",
	});

	// Line items
	const [lineItems, setLineItems] = React.useState<ResponseLineItem[]>([]);

	// -----------------------------------------------------------------------
	// Derived
	// -----------------------------------------------------------------------

	const pageTitle = React.useMemo(() => {
		if (mode === "view") return "View Supplier Response";
		if (mode === "edit") return "Edit Supplier Response";
		return "Record Supplier Response";
	}, [mode]);

	const enquiryLabel = React.useMemo(() => {
		if (!enquiryDetails) return "";
		return `Enquiry: ${enquiryDetails.price_enquiry_squence_no || enquiryDetails.enquiry_no}`;
	}, [enquiryDetails]);

	// -----------------------------------------------------------------------
	// Fetch data on mount
	// -----------------------------------------------------------------------

	React.useEffect(() => {
		let cancelled = false;

		const loadData = async () => {
			setLoading(true);
			setError(null);

			try {
				// Always fetch enquiry details for context
				if (!enquiryId) {
					throw new Error("Missing enquiry_id parameter.");
				}

				const rawEnquiry = await getEnquiryById(enquiryId);

				if (!rawEnquiry) {
					throw new Error("Enquiry not found.");
				}

				if (!cancelled) {
					setEnquiryDetails(rawEnquiry);

					// Build supplier options from enquiry suppliers
					const suppliers: SupplierOption[] = (rawEnquiry.suppliers ?? []).map((s: EnquirySupplierInfo) => ({
						supplier_id: s.supplier_id,
						supp_name: s.supp_name,
					}));
					setSupplierOptions(suppliers);
				}

				if (mode === "create") {
					// Pre-populate line items from enquiry items
					if (!cancelled) {
						setLineItems(mapEnquiryItemsToLines(rawEnquiry.items ?? []));

						// If supplier_id is provided in URL, pre-select it
						if (supplierIdParam) {
							const matchedSupplier = (rawEnquiry.suppliers ?? []).find(
								(s: EnquirySupplierInfo) => String(s.supplier_id) === supplierIdParam,
							);
							if (matchedSupplier) {
								setSelectedSupplier({
									supplier_id: matchedSupplier.supplier_id,
									supp_name: matchedSupplier.supp_name,
								});
								setHeaderValues((prev) => ({
									...prev,
									supplierName: matchedSupplier.supp_name,
								}));
							}
						}
					}
				} else {
					// Edit or View: Fetch existing response
					if (!responseIdParam) {
						throw new Error("Missing response_id parameter for edit/view mode.");
					}

					const rawResponse = await getResponseById(responseIdParam);

					if (!rawResponse) {
						throw new Error("Response not found.");
					}

					if (!cancelled) {
						setResponseId(rawResponse.proc_price_enquiry_response_id);
						setHeaderValues({
							supplierName: rawResponse.supp_name ?? "",
							responseDate: rawResponse.response_date
								? rawResponse.response_date.slice(0, 10)
								: todayISO(),
							deliveryDays: rawResponse.delivery_days ?? null,
							creditDays: rawResponse.credit_days ?? null,
							paymentTerms: rawResponse.payment_terms ?? "",
							termsConditions: rawResponse.terms_conditions ?? "",
							remarks: rawResponse.remarks ?? "",
						});
						setLineItems(mapResponseAPIToLines(rawResponse));
						setSelectedSupplier({
							supplier_id: rawResponse.supplier_id,
							supp_name: rawResponse.supp_name ?? "",
						});
					}
				}
			} catch (err) {
				if (!cancelled) {
					const message = err instanceof Error ? err.message : "Failed to load data.";
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
	}, [enquiryId, supplierIdParam, responseIdParam, mode]);

	// -----------------------------------------------------------------------
	// Handlers
	// -----------------------------------------------------------------------

	const handleHeaderChange = React.useCallback(
		(field: HeaderField, value: string | number | null) => {
			setHeaderValues((prev) => ({ ...prev, [field]: value }));
		},
		[],
	);

	const handleSupplierChange = React.useCallback(
		(_event: React.SyntheticEvent, value: SupplierOption | null) => {
			setSelectedSupplier(value);
			setHeaderValues((prev) => ({
				...prev,
				supplierName: value?.supp_name ?? "",
			}));
		},
		[],
	);

	const handleItemChange = React.useCallback(
		(index: number, field: EditableLineField, value: number | null) => {
			setLineItems((prev) => {
				const updated = [...prev];
				const current = { ...updated[index] };

				if (field === "rate") {
					current.rate = value;
				} else if (field === "discountMode") {
					current.discountMode = value;
					// Reset discount value when mode changes to None
					if (value === 0 || value == null) {
						current.discountMode = null;
						current.discountValue = null;
					}
				} else if (field === "discountValue") {
					current.discountValue = value;
				}

				updated[index] = recalcLine(current);
				return updated;
			});
		},
		[],
	);

	const handleGoBack = React.useCallback(() => {
		if (enquiryId) {
			router.push(hubUrl(enquiryId, menuIdParam || null));
		} else {
			router.push(indexUrl(menuIdParam || null));
		}
	}, [router, enquiryId, menuIdParam]);

	// -----------------------------------------------------------------------
	// Save
	// -----------------------------------------------------------------------

	const handleSave = React.useCallback(async () => {
		if (!selectedSupplier) {
			toast({
				variant: "destructive",
				title: "Validation Error",
				description: "Please select a supplier.",
			});
			return;
		}

		if (!headerValues.responseDate) {
			toast({
				variant: "destructive",
				title: "Validation Error",
				description: "Please enter a response date.",
			});
			return;
		}

		// Only lines the supplier actually quoted are saved; a partial quote is
		// valid, but there must be at least one quoted line.
		const quotedItems = lineItems.filter((item) => item.rate != null && item.rate !== 0);
		if (quotedItems.length === 0) {
			toast({
				variant: "destructive",
				title: "Validation Error",
				description: "Please enter a rate for at least one item.",
			});
			return;
		}

		const negativeLine = quotedItems.find(
			(item) => (item.rate ?? 0) < 0 || (item.discountValue ?? 0) < 0,
		);
		if (negativeLine) {
			toast({
				variant: "destructive",
				title: "Validation Error",
				description: `Rate and discount cannot be negative (${negativeLine.itemName || negativeLine.itemCode}).`,
			});
			return;
		}

		const overDiscounted = quotedItems.find(
			(item) => (item.discountAmount ?? 0) > (item.grossAmount ?? 0),
		);
		if (overDiscounted) {
			toast({
				variant: "destructive",
				title: "Validation Error",
				description: `Discount exceeds the line amount (${overDiscounted.itemName || overDiscounted.itemCode}).`,
			});
			return;
		}

		setSaving(true);

		try {
			const payload: Record<string, unknown> = {
				enquiry_id: Number(enquiryId),
				supplier_id: selectedSupplier.supplier_id,
				response_date: headerValues.responseDate,
				delivery_days: headerValues.deliveryDays,
				credit_days: headerValues.creditDays,
				payment_terms: headerValues.paymentTerms || null,
				terms_conditions: headerValues.termsConditions || null,
				remarks: headerValues.remarks || null,
				items: quotedItems.map((item) => ({
					enquiry_dtl_id: item.enquiryDtlId,
					item_id: item.itemId,
					item_make_id: item.itemMakeId,
					uom_id: item.uomId,
					qty: item.qty,
					rate: item.rate ?? 0,
					discount_mode: item.discountMode ?? 0,
					discount_value: item.discountValue ?? 0,
					discount_amount: item.discountAmount ?? 0,
					gross_amount: item.grossAmount ?? 0,
					net_amount: item.netAmount ?? 0,
				})),
			};

			if (mode === "edit" && responseId) {
				payload.response_id = responseId;
				await updateEnquiryResponse(payload);
			} else {
				await addEnquiryResponse(payload);
			}

			toast({
				title: "Success",
				description: mode === "edit"
					? "Response updated successfully."
					: "Response recorded successfully.",
			});

			// Return to the enquiry hub so the user can record more responses or compare
			router.push(hubUrl(enquiryId, menuIdParam || null));
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to save response.";
			toast({
				variant: "destructive",
				title: "Error",
				description: message,
			});
		} finally {
			setSaving(false);
		}
	}, [
		selectedSupplier,
		headerValues,
		lineItems,
		enquiryId,
		mode,
		responseId,
		menuIdParam,
		router,
	]);

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
		<Box p={{ xs: 2, md: 3 }} maxWidth={1400} mx="auto">
			{/* Title bar */}
			<Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
				<Box display="flex" alignItems="center" gap={1}>
					<Button variant="text" size="small" startIcon={<ArrowBackIcon />} onClick={handleGoBack}>
						Back
					</Button>
					<Box>
						<Typography variant="h5" fontWeight={700}>
							{pageTitle}
						</Typography>
						{enquiryLabel && (
							<Typography variant="body2" color="text.secondary">
								{enquiryLabel}
							</Typography>
						)}
					</Box>
				</Box>
				{mode !== "view" && (
					<Button
						variant="contained"
						startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
						onClick={handleSave}
						disabled={saving}
					>
						{saving ? "Saving..." : "Save Response"}
					</Button>
				)}
			</Box>

			<Divider sx={{ mb: 3 }} />

			{/* Supplier selection (create mode only, when no supplier_id in URL) */}
			{mode === "create" && !supplierIdParam && (
				<Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
					<Typography variant="subtitle2" gutterBottom fontWeight={600}>
						Select Supplier
					</Typography>
					<Autocomplete
						options={supplierOptions}
						getOptionLabel={(opt) => opt.supp_name}
						value={selectedSupplier}
						onChange={handleSupplierChange}
						isOptionEqualToValue={(option, value) => option.supplier_id === value.supplier_id}
						renderInput={(params) => (
							<TextField
								{...params}
								label="Supplier"
								size="small"
								placeholder="Search and select a supplier..."
							/>
						)}
						sx={{ maxWidth: 400 }}
					/>
				</Paper>
			)}

			{/* Header form */}
			<Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
				<Typography variant="subtitle2" gutterBottom fontWeight={600}>
					Response Details
				</Typography>
				<ResponseHeaderForm
					values={headerValues}
					onChange={handleHeaderChange}
					mode={mode}
				/>
			</Paper>

			{/* Line items table */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" gutterBottom fontWeight={600}>
					Line Items
				</Typography>
				<ResponseLineItemsTable
					items={lineItems}
					onItemChange={handleItemChange}
					mode={mode}
				/>
			</Paper>
		</Box>
	);
}
