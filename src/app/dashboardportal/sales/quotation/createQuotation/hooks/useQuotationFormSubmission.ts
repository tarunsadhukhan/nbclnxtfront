import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { createQuotation, updateQuotation, type CreateQuotationRequest } from "@/utils/quotationService";
import type { BranchAddressRecord, EditableLineItem } from "../types/quotationTypes";

type UseQuotationFormSubmissionParams = {
	mode: "create" | "edit" | "view";
	pageError: string | null;
	setupError: string | null;
	branchAddresses: ReadonlyArray<BranchAddressRecord>;
	filledLineItems: ReadonlyArray<EditableLineItem>;
	isLineItemsReady: boolean;
	requestedId: string;
	/** Source enquiry id (AMCL enquiry flow) — persisted on the quotation header when set. */
	salesEnquiryId?: string | null;
};

/**
 * Encapsulates submit/save logic for the quotation forms.
 */
export const useQuotationFormSubmission = ({
	mode,
	pageError,
	setupError,
	branchAddresses,
	filledLineItems,
	isLineItemsReady,
	requestedId,
	salesEnquiryId,
}: UseQuotationFormSubmissionParams) => {
	const [saving, setSaving] = React.useState(false);
	const router = useRouter();

	const handleFormSubmit = React.useCallback(
		async (values: Record<string, unknown>) => {
			if (mode === "view" || pageError || setupError) return;

			if (!isLineItemsReady) {
				toast({ variant: "destructive", title: "Line items incomplete", description: "Add at least one item with valid quantity and rate." });
				return;
			}

			const hasCustomer = Boolean(values.customer);
			const hasBroker = Boolean(values.broker);
			if (!hasCustomer && !hasBroker) {
				toast({ variant: "destructive", title: "Missing party", description: "At least one of Customer or Broker is required." });
				return;
			}

			const itemsPayload: CreateQuotationRequest["items"] = filledLineItems.map((item) => ({
				item_id: item.item || "",
				item_make_id: item.itemMake || undefined,
				hsn_code: item.hsnCode || undefined,
				quantity: item.quantity || "0",
				uom_id: item.uom || "",
				rate: item.rate || "0",
				discount_type: item.discountMode,
				discounted_rate: item.discountAmount != null
					? Math.max(0, (Number(item.rate) || 0) - (item.discountAmount / (Number(item.quantity) || 1)))
					: undefined,
				discount_amount: item.discountAmount,
				net_amount: item.netAmount,
				total_amount: item.totalAmount,
				remarks: item.remarks || undefined,
				enquiry_dtl_id: item.enquiryDtlId || undefined,
				cost_snapshot_id: item.costSnapshotId || undefined,
				base_cost: item.baseCost ?? undefined,
				overhead_pct: item.overheadPct ?? undefined,
				margin_pct: item.marginPct ?? undefined,
				gst: {
					igst_amount: item.igstAmount,
					igst_percent: item.taxPercentage && item.igstAmount ? item.taxPercentage : undefined,
					cgst_amount: item.cgstAmount,
					cgst_percent: item.taxPercentage && item.cgstAmount ? item.taxPercentage / 2 : undefined,
					sgst_amount: item.sgstAmount,
					sgst_percent: item.taxPercentage && item.sgstAmount ? item.taxPercentage / 2 : undefined,
					gst_total: item.taxAmount,
				},
			}));

			const payload: CreateQuotationRequest = {
				branch_id: String(values.branch ?? ""),
				quotation_date: String(values.quotation_date ?? ""),
				party_id: values.customer ? String(values.customer) : undefined,
				sales_broker_id: values.broker ? String(values.broker) : undefined,
				billing_address_id: values.billing_address ? String(values.billing_address) : undefined,
				shipping_address_id: values.shipping_address ? String(values.shipping_address) : undefined,
				brokerage_percentage: values.brokerage_percentage ? Number(values.brokerage_percentage) : undefined,
				payment_terms: values.payment_terms ? String(values.payment_terms) : undefined,
				delivery_terms: values.delivery_terms ? String(values.delivery_terms) : undefined,
				delivery_days: values.delivery_days ? Number(values.delivery_days) : undefined,
				quotation_expiry_date: values.quotation_expiry_date ? String(values.quotation_expiry_date) : undefined,
				footer_notes: values.footer_notes ? String(values.footer_notes) : undefined,
				internal_note: values.internal_note ? String(values.internal_note) : undefined,
				terms_condition: values.terms_condition ? String(values.terms_condition) : undefined,
				sales_enquiry_id: salesEnquiryId || undefined,
				items: itemsPayload,
			};

			setSaving(true);
			try {
				if (mode === "edit" && requestedId) {
					const result = await updateQuotation({ ...payload, sales_quotation_id: requestedId });
					const quotationId = result?.sales_quotation_id ?? requestedId;
					toast({ title: result?.message ?? "Quotation updated" });

					if (quotationId) {
						router.replace(`/dashboardportal/sales/quotation/createQuotation?mode=view&id=${encodeURIComponent(String(quotationId))}`);
					}
				} else {
					const result = await createQuotation(payload);
					const quotationId = result?.sales_quotation_id;
					toast({ title: result?.message ?? "Quotation created" });

					if (quotationId) {
						router.replace(`/dashboardportal/sales/quotation/createQuotation?mode=view&id=${encodeURIComponent(String(quotationId))}`);
					}
				}
			} catch (error) {
				toast({ variant: "destructive", title: "Unable to save quotation", description: error instanceof Error ? error.message : "Please try again." });
			} finally {
				setSaving(false);
			}
		},
		[
			mode,
			pageError,
			setupError,
			branchAddresses,
			filledLineItems,
			isLineItemsReady,
			requestedId,
			salesEnquiryId,
			router,
		],
	);

	return { saving, handleFormSubmit };
};
