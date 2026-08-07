import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { savePO, type SavePORequest } from "@/utils/poService";
import type { BranchAddressRecord, EditableLineItem, POAdditionalCharge } from "../types/poTypes";

 type UsePOFormSubmissionParams = {
  mode: "create" | "edit" | "view";
  pageError: string | null;
  setupError: string | null;
  branchAddresses: ReadonlyArray<BranchAddressRecord>;
  filledLineItems: ReadonlyArray<EditableLineItem>;
  isLineItemsReady: boolean;
  requestedId: string;
  /** Function to get charges to save (filters incomplete charges) */
  getChargesToSave?: () => POAdditionalCharge[];
  /** Shared form values from both header and footer forms */
  formValues: Record<string, unknown>;
};

/**
 * Encapsulates submit/save logic for the PO forms.
 */
export const usePOFormSubmission = ({
  mode,
  pageError,
  setupError,
  branchAddresses,
  filledLineItems,
  isLineItemsReady,
  requestedId,
  getChargesToSave,
  formValues,
}: UsePOFormSubmissionParams) => {
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();

  const handleFormSubmit = React.useCallback(
    async (values: Record<string, unknown>) => {
      if (mode === "view" || pageError || setupError) return;

      // Merge footer form values with header form values.
      // Header values (from the submitted form) take priority for overlapping fields.
      const merged = { ...formValues, ...values };

      const billingId = String(merged.billing_address ?? "");
      const shippingId = String(merged.shipping_address ?? "");
      const billingAddr = branchAddresses.find((a) => a.id === billingId);
      const shippingAddr = branchAddresses.find((a) => a.id === shippingId);

      // NOTE: Billing and shipping addresses CAN be in different states.
      // GST type (IGST vs CGST/SGST) is determined by supplier state vs
      // shipping state, which is already handled in calculateLineTax().

      if (!isLineItemsReady) {
        toast({ variant: "destructive", title: "Line items incomplete", description: "Add at least one item with valid quantity and rate." });
        return;
      }

      const itemsPayload = filledLineItems.map((item) => ({
        po_dtl_id: item.poDtlId ?? undefined,
        indent_dtl_id: item.indentDtlId,
        item: item.item || undefined,
        hsn_code: item.hsnCode || undefined,
        quantity: item.quantity || undefined,
        rate: item.rate || undefined,
        uom: item.uom || undefined,
        make: item.itemMake || undefined,
        discount_mode: item.discountMode,
        discount_value: item.discountValue || undefined,
        remarks: item.remarks || undefined,
        tax_pct:
          item.taxPercentage != null && String(item.taxPercentage) !== ""
            ? Number(item.taxPercentage)
            : undefined,
        igst_amount: item.igstAmount,
        cgst_amount: item.cgstAmount,
        sgst_amount: item.sgstAmount,
        tax_amount: item.taxAmount,
      }));

      // Map additional charges
      const chargesPayload = getChargesToSave
        ? getChargesToSave().map((charge) => ({
            additional_charges_id: String(charge.additional_charges_id),
            qty: charge.qty,
            rate: charge.rate,
            net_amount: charge.net_amount,
            remarks: charge.remarks || undefined,
            apply_tax: charge.apply_tax,
            tax_pct: charge.tax_pct,
            igst_amount: charge.igst_amount,
            cgst_amount: charge.cgst_amount,
            sgst_amount: charge.sgst_amount,
            tax_amount: charge.tax_amount,
          }))
        : undefined;

      const createPayload: SavePORequest = {
        branch: String(merged.branch ?? ""),
        date: String(merged.date ?? ""),
        supplier: String(merged.supplier ?? ""),
        supplier_branch: String(merged.supplier_branch ?? ""),
        billing_address: String(merged.billing_address ?? ""),
        shipping_address: String(merged.shipping_address ?? ""),
        tax_payable: String(merged.tax_payable ?? "Yes"),
        credit_term: merged.credit_term ? Number(merged.credit_term) : undefined,
        delivery_timeline: Number(merged.delivery_timeline ?? 0),
        project: String(merged.project ?? ""),
        expense_type: String(merged.expense_type ?? ""),
        price_enquiry_id: merged.price_enquiry_id ? String(merged.price_enquiry_id) : undefined,
        po_type: merged.po_type ? String(merged.po_type) : undefined,
        contact_person: merged.contact_person ? String(merged.contact_person) : undefined,
        contact_no: merged.contact_no ? String(merged.contact_no) : undefined,
        footer_note: merged.footer_note ? String(merged.footer_note) : undefined,
        internal_note: merged.internal_note ? String(merged.internal_note) : undefined,
        terms_conditions: merged.terms_conditions ? String(merged.terms_conditions) : undefined,
        advance_percentage: merged.advance_percentage ? Number(merged.advance_percentage) : undefined,
        items: itemsPayload,
        additional_charges: chargesPayload && chargesPayload.length > 0 ? chargesPayload : undefined,
      };

      setSaving(true);
      try {
        if (mode === "edit" && requestedId) {
          createPayload.id = requestedId;
        }

        const result = await savePO(createPayload);
        const poId = result?.po_id ?? result?.poId ?? requestedId;
        toast({ title: result?.message ?? (mode === "edit" ? "PO updated" : "PO created") });

        if (poId) {
          router.replace(`/dashboardportal/procurement/purchaseOrder/createPO?mode=view&id=${encodeURIComponent(String(poId))}`);
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Unable to save PO", description: error instanceof Error ? error.message : "Please try again." });
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
      router,
      getChargesToSave,
      formValues,
    ],
  );

  return { saving, handleFormSubmit };
};
