import * as React from "react";
import { useRouter } from "next/navigation";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import type { SRHeader, SRLineItem, SRAdditionalCharge } from "../types/srTypes";
import type { EditableSRHeader } from "./useSRFormState";
import { SR_STATUS_IDS } from "../utils/srConstants";

type UseSRApprovalParams = {
	inwardId: string;
	header: SRHeader | null;
	srDate: string;
	srRemarks: string;
	editableHeader: EditableSRHeader;
	lineItems: SRLineItem[];
	additionalCharges?: SRAdditionalCharge[];
	getChargesToSave?: () => SRAdditionalCharge[];
	onRefresh: () => Promise<void>;
};

type UseSRApprovalReturn = {
	saving: boolean;
	canEdit: boolean;
	isDraft: boolean;
	isDraftSaved: boolean;
	isUnsaved: boolean;
	isOpen: boolean;
	handleSave: () => Promise<void>;
	handleOpen: () => Promise<void>;
	handleApprove: () => Promise<void>;
	handleReject: () => Promise<void>;
};

/**
 * Manages SR approval workflow actions.
 */
export const useSRApproval = ({
	inwardId,
	header,
	srDate,
	srRemarks,
	editableHeader,
	lineItems,
	additionalCharges,
	getChargesToSave,
	onRefresh,
}: UseSRApprovalParams): UseSRApprovalReturn => {
	const router = useRouter();
	const [saving, setSaving] = React.useState(false);

	const statusId = header?.sr_status ?? 0;
	const isUnsaved = statusId === 0;
	const isDraftSaved = statusId === SR_STATUS_IDS.DRAFT;
	const isDraft = isUnsaved || isDraftSaved;
	const isOpen = statusId === SR_STATUS_IDS.OPEN;
	const isApproved = statusId === SR_STATUS_IDS.APPROVED;
	const isRejected = statusId === SR_STATUS_IDS.REJECTED;
	const canEdit = !isApproved && !isRejected;

	/**
	 * Save SR as draft.
	 */
	const handleSave = React.useCallback(async () => {
		if (!inwardId) return;

		// Validate warehouse_id is set for all line items
		const missingWarehouse = lineItems.filter((item) => item.warehouse_id === null || item.warehouse_id === undefined);
		if (missingWarehouse.length > 0) {
			toast({
				title: "Validation Error",
				description: `Warehouse is required for all line items. ${missingWarehouse.length} item(s) missing warehouse.`,
				variant: "destructive",
			});
			return;
		}

		setSaving(true);
		try {
			const lineItemsPayload = lineItems.map((item) => ({
				inward_dtl_id: item.inward_dtl_id,
				accepted_rate: item.accepted_rate,
				amount: item.amount,
				discount_mode: item.discount_mode,
				discount_value: item.discount_value,
				discount_amount: item.discount_amount,
				warehouse_id: item.warehouse_id,
				hsn_code: item.hsn_code,
				// GST fields
				tax_percentage: item.tax_percentage,
				igst_amount: item.igst_amount,
				cgst_amount: item.cgst_amount,
				sgst_amount: item.sgst_amount,
				tax_amount: item.tax_amount,
			}));

			// Prepare additional charges payload
			const chargesToSave = getChargesToSave ? getChargesToSave() : [];
			const additionalChargesPayload = chargesToSave.map((charge) => ({
				inward_additional_id: charge.inward_additional_id,
				additional_charges_id: charge.additional_charges_id,
				qty: charge.qty,
				rate: charge.rate,
				net_amount: charge.net_amount,
				remarks: charge.remarks,
				apply_tax: charge.apply_tax,
				tax_pct: charge.tax_pct,
				igst_amount: charge.igst_amount,
				sgst_amount: charge.sgst_amount,
				cgst_amount: charge.cgst_amount,
				tax_amount: charge.tax_amount,
			}));

			// Normalize editable inward-level header fields: empty string → null
			// so the server stores NULL rather than an empty string, and parse the
			// numeric invoice amount.
			const emptyToNull = (value: string): string | null => {
				const trimmed = value.trim();
				return trimmed === "" ? null : trimmed;
			};
			const invoiceAmountStr = editableHeader.invoice_amount.trim();
			const invoiceAmount =
				invoiceAmountStr === "" ? null : Number(invoiceAmountStr);

			const headerPayload = {
				invoice_no: emptyToNull(editableHeader.invoice_no),
				invoice_date: emptyToNull(editableHeader.invoice_date),
				invoice_amount: Number.isFinite(invoiceAmount as number) ? invoiceAmount : null,
				invoice_recvd_date: emptyToNull(editableHeader.invoice_recvd_date),
				challan_no: emptyToNull(editableHeader.challan_no),
				challan_date: emptyToNull(editableHeader.challan_date),
				vehicle_number: emptyToNull(editableHeader.vehicle_number),
				driver_name: emptyToNull(editableHeader.driver_name),
				driver_contact_no: emptyToNull(editableHeader.driver_contact_no),
				inspection_date: emptyToNull(editableHeader.inspection_date),
				consignment_no: emptyToNull(editableHeader.consignment_no),
				consignment_date: emptyToNull(editableHeader.consignment_date),
				ewaybillno: emptyToNull(editableHeader.ewaybillno),
				ewaybill_date: emptyToNull(editableHeader.ewaybill_date),
				despatch_remarks: emptyToNull(editableHeader.despatch_remarks),
				receipts_remarks: emptyToNull(editableHeader.receipts_remarks),
			};

			const url = apiRoutesPortalMasters.SR_SAVE;
			const { error } = await fetchWithCookie(url, "POST", {
				inward_id: Number(inwardId),
				sr_date: srDate,
				sr_remarks: srRemarks,
				supplier_branch_id: header?.supplier_branch_id ?? null,
				...headerPayload,
				line_items: lineItemsPayload,
				additional_charges: additionalChargesPayload,
			});

			if (error) {
				throw new Error(error);
			}

			toast({
				title: "Success",
				description: "Stores Receipt saved successfully",
				variant: "default",
			});

			await onRefresh();
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to save SR";
			toast({
				title: "Error",
				description: message,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}, [inwardId, header, srDate, srRemarks, editableHeader, lineItems, getChargesToSave, onRefresh]);

	/**
	 * Open SR for approval.
	 */
	const handleOpen = React.useCallback(async () => {
		if (!inwardId) return;

		setSaving(true);
		try {
			const url = apiRoutesPortalMasters.SR_OPEN;
			const { error } = await fetchWithCookie(url, "POST", {
				inward_id: Number(inwardId),
			});

			if (error) {
				throw new Error(error);
			}

			toast({
				title: "Success",
				description: "SR opened for approval",
				variant: "default",
			});

			await onRefresh();
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to open SR";
			toast({
				title: "Error",
				description: message,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}, [inwardId, onRefresh]);

	/**
	 * Approve SR.
	 */
	const handleApprove = React.useCallback(async () => {
		if (!inwardId) return;

		setSaving(true);
		try {
			const url = apiRoutesPortalMasters.SR_APPROVE;
			const { data, error } = await fetchWithCookie(url, "POST", {
				inward_id: Number(inwardId),
			});

			if (error) {
				throw new Error(error);
			}

			const result = data as { drcr_created?: boolean };
			let message = "SR approved successfully";
			if (result.drcr_created) {
				message += ". DRCR Note(s) auto-created.";
			}

			toast({
				title: "Success",
				description: message,
				variant: "default",
			});

			router.push("/dashboardportal/procurement/sr");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to approve SR";
			toast({
				title: "Error",
				description: message,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}, [inwardId, router]);

	/**
	 * Reject SR.
	 */
	const handleReject = React.useCallback(async () => {
		if (!inwardId) return;

		setSaving(true);
		try {
			const url = apiRoutesPortalMasters.SR_REJECT;
			const { error } = await fetchWithCookie(url, "POST", {
				inward_id: Number(inwardId),
			});

			if (error) {
				throw new Error(error);
			}

			toast({
				title: "Success",
				description: "SR rejected",
				variant: "default",
			});

			router.push("/dashboardportal/procurement/sr");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to reject SR";
			toast({
				title: "Error",
				description: message,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}, [inwardId, router]);

	return {
		saving,
		canEdit,
		isDraft,
		isDraftSaved,
		isUnsaved,
		isOpen,
		handleSave,
		handleOpen,
		handleApprove,
		handleReject,
	};
};
