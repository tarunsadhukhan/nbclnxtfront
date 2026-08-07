import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { createDO, updateDO, type SaveDORequest } from "@/utils/deliveryOrderService";
import { roundAmount, roundAmountOrUndefined, roundRateOrUndefined } from "@/utils/numberRounding";
import type { EditableLineItem } from "../types/deliveryOrderTypes";

type Params = {
	mode: "create" | "edit" | "view";
	pageError: string | null;
	setupError: string | null;
	filledLineItems: ReadonlyArray<EditableLineItem>;
	isLineItemsReady: boolean;
	requestedId: string;
	formValues: Record<string, unknown>;
};

export const useDeliveryOrderFormSubmission = ({
	mode, pageError, setupError, filledLineItems, isLineItemsReady, requestedId, formValues,
}: Params) => {
	const [saving, setSaving] = React.useState(false);
	const router = useRouter();

	const handleFormSubmit = React.useCallback(
		async (values: Record<string, unknown>) => {
			if (mode === "view" || pageError || setupError) return;

			if (!isLineItemsReady) {
				toast({ variant: "destructive", title: "Line items incomplete", description: "Add at least one item with valid quantity." });
				return;
			}

			const itemsPayload = filledLineItems.map((item) => {
				const rateNum = item.rate ? Number(item.rate) : undefined;
				const roundedRate = rateNum != null && Number.isFinite(rateNum)
					? roundRateOrUndefined(rateNum, item.rateRounding) : undefined;
				return {
					item: item.item || "",
					item_make: item.itemMake || undefined,
					sales_order_dtl_id: item.salesOrderDtlId,
					hsn_code: item.hsnCode || undefined,
					quantity: item.quantity || "0",
					uom: item.uom || "",
					rate: roundedRate != null ? String(roundedRate) : (item.rate || undefined),
					discount_type: item.discountType,
					discounted_rate: roundRateOrUndefined(item.discountedRate, item.rateRounding),
					discount_amount: roundAmountOrUndefined(item.discountAmount),
					net_amount: roundAmountOrUndefined(item.netAmount),
					total_amount: roundAmountOrUndefined(item.totalAmount),
					remarks: item.remarks || undefined,
					gst: {
						igst_amount: roundAmount(item.igstAmount || 0),
						igst_percent: item.igstPercent || 0,
						cgst_amount: roundAmount(item.cgstAmount || 0),
						cgst_percent: item.cgstPercent || 0,
						sgst_amount: roundAmount(item.sgstAmount || 0),
						sgst_percent: item.sgstPercent || 0,
						gst_total: roundAmount(item.gstTotal || 0),
					},
				};
			});

			const freightCharges = roundAmount(Number(values.freight_charges ?? formValues.freight_charges) || 0);
			const roundOffValue = roundAmount(Number(values.round_off_value ?? formValues.round_off_value) || 0);
			const grossAmount = roundAmount(filledLineItems.reduce((sum, l) => sum + (l.netAmount || 0), 0));
			const totalGST = roundAmount(filledLineItems.reduce((sum, l) => sum + (l.gstTotal || 0), 0));
			const netAmount = roundAmount(grossAmount + totalGST + freightCharges + roundOffValue);

			const payload: SaveDORequest = {
				branch: String(values.branch ?? formValues.branch ?? ""),
				date: String(values.date ?? formValues.date ?? ""),
				party: String(values.party ?? formValues.party ?? ""),
				party_branch: String(values.party_branch ?? formValues.party_branch ?? "") || undefined,
				sales_order: String(values.sales_order ?? formValues.sales_order ?? "") || undefined,
				invoice_type: String(values.invoice_type ?? formValues.invoice_type ?? "") || undefined,
				billing_to: String(values.billing_to ?? formValues.billing_to ?? "") || undefined,
				shipping_to: String(values.shipping_to ?? formValues.shipping_to ?? "") || undefined,
				transporter: String(values.transporter ?? formValues.transporter ?? "") || undefined,
				vehicle_no: String(values.vehicle_no ?? formValues.vehicle_no ?? "") || undefined,
				driver_name: String(values.driver_name ?? formValues.driver_name ?? "") || undefined,
				driver_contact: String(values.driver_contact ?? formValues.driver_contact ?? "") || undefined,
				eway_bill_no: String(values.eway_bill_no ?? formValues.eway_bill_no ?? "") || undefined,
				eway_bill_date: String(values.eway_bill_date ?? formValues.eway_bill_date ?? "") || undefined,
				expected_delivery_date: String(values.expected_delivery_date ?? formValues.expected_delivery_date ?? "") || undefined,
				footer_note: String(values.footer_note ?? formValues.footer_note ?? "") || undefined,
				internal_note: String(values.internal_note ?? formValues.internal_note ?? "") || undefined,
				gross_amount: grossAmount,
				net_amount: netAmount,
				freight_charges: freightCharges || undefined,
				round_off_value: roundOffValue || undefined,
				items: itemsPayload,
			};

			setSaving(true);
			try {
				if (mode === "edit" && requestedId) payload.id = requestedId;
				const fn = mode === "edit" && requestedId ? updateDO : createDO;
				const result = await fn(payload);
				const doId = result?.sales_delivery_order_id ?? requestedId;
				toast({ title: result?.message ?? (mode === "edit" ? "Delivery order updated" : "Delivery order created") });
				if (doId) {
					router.replace(`/dashboardportal/sales/deliveryOrder/createDeliveryOrder?mode=view&id=${encodeURIComponent(String(doId))}`);
				}
			} catch (error) {
				toast({ variant: "destructive", title: "Unable to save delivery order", description: error instanceof Error ? error.message : "Please try again." });
			} finally {
				setSaving(false);
			}
		},
		[mode, pageError, setupError, filledLineItems, isLineItemsReady, requestedId, router, formValues],
	);

	return { saving, handleFormSubmit };
};
