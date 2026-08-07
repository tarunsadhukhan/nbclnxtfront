import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { createSalesOrder, updateSalesOrder, type CreateSalesOrderRequest } from "@/utils/salesOrderService";
import { roundAmount, roundAmountOrUndefined, roundRateOrUndefined } from "@/utils/numberRounding";
import type { EditableLineItem } from "../types/salesOrderTypes";
import { isHessianOrder, isJuteOrder, isGovtSkgOrder, isJuteYarnOrder } from "../utils/salesOrderConstants";

type UseSalesOrderFormSubmissionParams = {
	mode: "create" | "edit" | "view";
	pageError: string | null;
	setupError: string | null;
	filledLineItems: ReadonlyArray<EditableLineItem>;
	isLineItemsReady: boolean;
	requestedId: string;
	formValues: Record<string, unknown>;
	invoiceTypeCode: string;
	/** Source enquiry id (AMCL enquiry flow) — persisted on the order header when set (tender path). */
	salesEnquiryId?: string | null;
};

export const useSalesOrderFormSubmission = ({
	mode,
	pageError,
	setupError,
	filledLineItems,
	isLineItemsReady,
	requestedId,
	formValues,
	invoiceTypeCode,
	salesEnquiryId,
}: UseSalesOrderFormSubmissionParams) => {
	const [saving, setSaving] = React.useState(false);
	const router = useRouter();

	const handleFormSubmit = React.useCallback(
		async (values: Record<string, unknown>) => {
			if (mode === "view") return;
			if (pageError) {
				toast({ variant: "destructive", title: "Cannot save", description: pageError });
				return;
			}
			if (setupError) {
				toast({ variant: "destructive", title: "Setup data failed to load", description: setupError });
				return;
			}

			if (!isLineItemsReady) {
				toast({ variant: "destructive", title: "Line items incomplete", description: "Add at least one item with valid quantity and rate." });
				return;
			}

			const isHessian = isHessianOrder(invoiceTypeCode);

			const itemsPayload: CreateSalesOrderRequest["items"] = filledLineItems.map((item) => {
				const rateNum = item.rate ? Number(item.rate) : undefined;
				const roundedRate = rateNum != null && Number.isFinite(rateNum)
					? roundRateOrUndefined(rateNum, item.rateRounding) : undefined;
				const roundedDiscountedRate = roundRateOrUndefined(item.discountAmount, item.rateRounding);
				const lineNet = roundAmountOrUndefined(item.amount);
				const lineTotalRaw = (item.amount ?? 0) + (item.taxAmount ?? 0);
				const lineTotal = lineTotalRaw ? roundAmount(lineTotalRaw) : undefined;
				return {
				item: item.item || undefined,
				item_make: item.itemMake || undefined,
				quotation_lineitem_id: item.quotationLineitemId ?? undefined,
				hsn_code: item.hsnCode || undefined,
				quantity: item.quantity || undefined,
				qty_uom: item.uom || undefined,
				rate: roundedRate != null ? String(roundedRate) : (item.rate || undefined),
				discount_type: item.discountType ?? undefined,
				discounted_rate: roundedDiscountedRate,
				discount_amount: roundAmountOrUndefined(item.discountAmount),
				net_amount: lineNet,
				total_amount: lineTotal,
				remarks: item.remarks || undefined,
				gst: {
					igst_amount: roundAmount(item.igstAmount ?? 0),
					igst_percent: item.taxPercentage && item.igstAmount ? item.taxPercentage : 0,
					cgst_amount: roundAmount(item.cgstAmount ?? 0),
					cgst_percent: item.taxPercentage && item.cgstAmount ? item.taxPercentage / 2 : 0,
					sgst_amount: roundAmount(item.sgstAmount ?? 0),
					sgst_percent: item.taxPercentage && item.sgstAmount ? item.taxPercentage / 2 : 0,
					gst_total: roundAmount(item.taxAmount ?? 0),
				},
				hessian: isHessian && item.qtyBales ? {
					qty_bales: Number(item.qtyBales) || null,
					rate_per_bale: item.ratePerBale ?? null,
					billing_rate_mt: item.billingRateMt ?? null,
					billing_rate_bale: item.billingRateBale ?? null,
				} : undefined,
				jute_dtl: isJuteOrder(invoiceTypeCode) && item.juteClaimRate ? {
					claim_amount_dtl: Number(item.juteClaimAmountDtl) || null,
					claim_desc: item.juteClaimDesc || null,
					claim_rate: Number(item.juteClaimRate) || null,
					unit_conversion: item.juteUnitConversion || null,
					qty_untit_conversion: Number(item.juteQtyUnitConversion) || null,
				} : undefined,
				govtskg_dtl: isGovtSkgOrder(invoiceTypeCode) ? {
					// The pre-submit validator above guarantees these are parseable,
					// so we use a safe coercion that preserves 0 (unlike `|| null`).
					pack_sheet: item.govtskgPackSheet != null && item.govtskgPackSheet !== "" ? Number(item.govtskgPackSheet) : null,
					net_weight: item.govtskgNetWeight != null && item.govtskgNetWeight !== "" ? Number(item.govtskgNetWeight) : null,
					total_weight: item.govtskgTotalWeight != null && item.govtskgTotalWeight !== "" ? Number(item.govtskgTotalWeight) : null,
				} : undefined,
				};
			});

			// Round any additional_charges already in `values` to 2 decimals before they
			// flow into the payload and into total computations below.
			const roundedAdditionalCharges = Array.isArray(values.additional_charges)
				? (values.additional_charges as Array<{
					qty?: number; rate?: number; net_amount?: number;
					gst?: {
						igst_amount?: number; cgst_amount?: number; sgst_amount?: number; gst_total?: number;
						igst_percent?: number; cgst_percent?: number; sgst_percent?: number;
					};
					[k: string]: unknown;
				}>).map((c) => ({
					...c,
					qty: c.qty != null ? roundAmount(Number(c.qty)) : c.qty,
					rate: c.rate != null ? roundAmount(Number(c.rate)) : c.rate,
					net_amount: c.net_amount != null ? roundAmount(Number(c.net_amount)) : c.net_amount,
					gst: c.gst ? {
						...c.gst,
						igst_amount: c.gst.igst_amount != null ? roundAmount(Number(c.gst.igst_amount)) : c.gst.igst_amount,
						cgst_amount: c.gst.cgst_amount != null ? roundAmount(Number(c.gst.cgst_amount)) : c.gst.cgst_amount,
						sgst_amount: c.gst.sgst_amount != null ? roundAmount(Number(c.gst.sgst_amount)) : c.gst.sgst_amount,
						gst_total: c.gst.gst_total != null ? roundAmount(Number(c.gst.gst_total)) : c.gst.gst_total,
					} : c.gst,
				}))
				: undefined;

			// Calculate totals (rounded to 2 decimals)
			const grossAmount = roundAmount(filledLineItems.reduce((sum, li) => sum + (li.amount ?? 0), 0));
			const totalTax = roundAmount(filledLineItems.reduce((sum, li) => sum + (li.taxAmount ?? 0), 0));
			const freightCharges = values.freight_charges ? roundAmount(Number(values.freight_charges)) : 0;
			const additionalChargesTotal = roundedAdditionalCharges
				? roundAmount(roundedAdditionalCharges.reduce(
					(sum, c) => sum + (Number(c.net_amount) || 0) + (Number(c.gst?.gst_total) || 0), 0))
				: 0;
			const netAmount = roundAmount(grossAmount + totalTax + freightCharges + additionalChargesTotal);

			// Build header-level extension data conditionally
			const juteHeader = isJuteOrder(invoiceTypeCode) ? {
				mr_no: String(values.jute_mr_no ?? formValues.jute_mr_no ?? "") || undefined,
				mukam_id: String(values.jute_mukam_id ?? formValues.jute_mukam_id ?? "") || undefined,
				claim_amount: Number(values.jute_claim_amount ?? formValues.jute_claim_amount) || undefined,
				claim_description: String(values.jute_claim_description ?? formValues.jute_claim_description ?? "") || undefined,
			} : undefined;

			// Always send all 5 keys (even if empty) so the backend validator can
			// name the specific missing field rather than complaining the whole
			// object is missing.
			const govtskgHeader = isGovtSkgOrder(invoiceTypeCode) ? {
				pcso_no: String(values.govtskg_pcso_no ?? formValues.govtskg_pcso_no ?? ""),
				pcso_date: String(values.govtskg_pcso_date ?? formValues.govtskg_pcso_date ?? ""),
				administrative_office_address: String(values.govtskg_admin_office ?? formValues.govtskg_admin_office ?? ""),
				destination_rail_head: String(values.govtskg_rail_head ?? formValues.govtskg_rail_head ?? ""),
				loading_point: String(values.govtskg_loading_point ?? formValues.govtskg_loading_point ?? ""),
				mode_of_transport: String(values.govtskg_mode_of_transport ?? formValues.govtskg_mode_of_transport ?? "") || undefined,
			} : undefined;

			const juteyarnHeader = isJuteYarnOrder(invoiceTypeCode) ? {
				pcso_no: String(values.juteyarn_pcso_no ?? formValues.juteyarn_pcso_no ?? "") || undefined,
				container_no: String(values.juteyarn_container_no ?? formValues.juteyarn_container_no ?? "") || undefined,
				customer_ref_no: String(values.juteyarn_customer_ref_no ?? formValues.juteyarn_customer_ref_no ?? "") || undefined,
			} : undefined;

			setSaving(true);
			try {
				if (mode === "edit" && requestedId) {
					const updatePayload: Parameters<typeof updateSalesOrder>[0] = {
						id: requestedId,
						branch: String(values.branch ?? ""),
						party: values.party ? String(values.party) : undefined,
						partyBranch: values.party_branch ? String(values.party_branch) : undefined,
						salesOrderDate: String(values.date ?? ""),
						salesOrderExpiryDate: values.expiry_date ? String(values.expiry_date) : undefined,
						quotation: values.quotation ? String(values.quotation) : undefined,
						invoiceType: values.invoice_type ? Number(values.invoice_type) : undefined,
						broker: values.broker ? String(values.broker) : undefined,
						brokerCommissionPercent: values.broker_commission_percent ? Number(values.broker_commission_percent) : undefined,
						billingTo: values.billing_to ? String(values.billing_to) : undefined,
						shippingTo: values.shipping_to ? String(values.shipping_to) : undefined,
						transporter: values.transporter ? String(values.transporter) : undefined,
						deliveryTerms: values.delivery_terms ? String(values.delivery_terms) : undefined,
						paymentTerms: values.payment_terms ? String(values.payment_terms) : undefined,
						buyerOrderNo: values.buyer_order_no ? String(values.buyer_order_no) : undefined,
						buyerOrderDate: values.buyer_order_date ? String(values.buyer_order_date) : undefined,
						deliveryDays: values.delivery_days ? Number(values.delivery_days) : undefined,
						committedDeliveryDate: values.committed_delivery_date ? String(values.committed_delivery_date) : undefined,
						advanceAmount: values.advance_amount ? Number(values.advance_amount) : undefined,
						advanceNote: values.advance_note ? String(values.advance_note) : undefined,
						salesEnquiryId: salesEnquiryId || undefined,
						freightCharges: freightCharges || undefined,
						footerNote: values.footer_note ? String(values.footer_note) : undefined,
						internalNote: values.internal_note ? String(values.internal_note) : undefined,
						termsConditions: values.terms_conditions ? String(values.terms_conditions) : undefined,
						grossAmount,
						netAmount,
						items: itemsPayload,
						jute: juteHeader,
						govtskg: govtskgHeader,
						juteyarn: juteyarnHeader,
						additional_charges: roundedAdditionalCharges as CreateSalesOrderRequest["additional_charges"],
					};
					await updateSalesOrder(updatePayload);
					toast({ title: "Sales order updated" });
					router.replace(`/dashboardportal/sales/salesOrder/createSalesOrder?mode=view&id=${requestedId}`);
				} else {
					const payload: CreateSalesOrderRequest = {
						branch: String(values.branch ?? ""),
						date: String(values.date ?? ""),
						party: values.party ? String(values.party) : undefined,
						party_branch: values.party_branch ? String(values.party_branch) : undefined,
						quotation: values.quotation ? String(values.quotation) : undefined,
						invoice_type: values.invoice_type ? Number(values.invoice_type) : undefined,
						broker: values.broker ? String(values.broker) : undefined,
						broker_commission_percent: values.broker_commission_percent ? Number(values.broker_commission_percent) : undefined,
						billing_to: values.billing_to ? String(values.billing_to) : undefined,
						shipping_to: values.shipping_to ? String(values.shipping_to) : undefined,
						transporter: values.transporter ? String(values.transporter) : undefined,
						expiry_date: values.expiry_date ? String(values.expiry_date) : undefined,
						delivery_terms: values.delivery_terms ? String(values.delivery_terms) : undefined,
						payment_terms: values.payment_terms ? String(values.payment_terms) : undefined,
						buyer_order_no: values.buyer_order_no ? String(values.buyer_order_no) : undefined,
						buyer_order_date: values.buyer_order_date ? String(values.buyer_order_date) : undefined,
						delivery_days: values.delivery_days ? Number(values.delivery_days) : undefined,
						committed_delivery_date: values.committed_delivery_date ? String(values.committed_delivery_date) : undefined,
						advance_amount: values.advance_amount ? Number(values.advance_amount) : undefined,
						advance_note: values.advance_note ? String(values.advance_note) : undefined,
						sales_enquiry_id: salesEnquiryId || undefined,
						freight_charges: freightCharges || undefined,
						footer_note: values.footer_note ? String(values.footer_note) : undefined,
						internal_note: values.internal_note ? String(values.internal_note) : undefined,
						terms_conditions: values.terms_conditions ? String(values.terms_conditions) : undefined,
						gross_amount: grossAmount,
						net_amount: netAmount,
						items: itemsPayload,
					};
					if (juteHeader) payload.jute = juteHeader;
					if (govtskgHeader) payload.govtskg = govtskgHeader;
					if (juteyarnHeader) payload.juteyarn = juteyarnHeader;
					if (roundedAdditionalCharges) payload.additional_charges = roundedAdditionalCharges as CreateSalesOrderRequest["additional_charges"];
					const result = await createSalesOrder(payload);
					toast({ title: result?.message ?? "Sales order created" });
					const newId = result?.sales_order_id;
					if (newId) {
						router.replace(`/dashboardportal/sales/salesOrder/createSalesOrder?mode=view&id=${newId}`);
					}
				}
			} catch (error) {
				toast({ variant: "destructive", title: "Unable to save sales order", description: error instanceof Error ? error.message : "Please try again." });
			} finally {
				setSaving(false);
			}
		},
		[mode, pageError, setupError, filledLineItems, isLineItemsReady, requestedId, formValues, invoiceTypeCode, salesEnquiryId, router],
	);

	return { saving, handleFormSubmit };
};
