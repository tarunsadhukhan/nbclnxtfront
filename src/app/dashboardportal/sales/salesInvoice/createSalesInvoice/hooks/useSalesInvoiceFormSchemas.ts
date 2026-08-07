import React from "react";
import type { Schema, Field } from "@/components/ui/muiform";
import type { Option } from "../types/salesInvoiceTypes";
import { isRawJuteInvoice, isGovtSkgInvoice } from "../utils/salesInvoiceConstants";

export type UseHeaderSchemaParams = {
	branchOptions: Option[];
	customerOptions: Option[];
	customerBranchOptions: Option[];
	transporterOptions: Option[];
	brokerOptions: Option[];
	deliveryOrderOptions: Option[];
	salesOrderOptions: Option[];
	invoiceTypeOptions: Option[];
	bankDetailOptions: Option[];
	mode: "create" | "edit" | "view";
	headerFieldsDisabled: boolean;
	salesOrderDisabled?: boolean;
	deliveryOrderDisabled?: boolean;
};

export type UseFooterSchemaParams = {
	mode: "create" | "edit" | "view";
};

export const useSalesInvoiceHeaderSchema = ({
	branchOptions, customerOptions, customerBranchOptions,
	transporterOptions, brokerOptions, deliveryOrderOptions, salesOrderOptions, invoiceTypeOptions, bankDetailOptions, mode, headerFieldsDisabled, salesOrderDisabled, deliveryOrderDisabled,
}: UseHeaderSchemaParams): Schema =>
	React.useMemo(() => {
		const isView = mode === "view";
		const fields: Field[] = [
			{ name: "branch", label: "Branch", type: "select", options: branchOptions, required: true, disabled: mode !== "create", grid: { xs: 12, md: 4 } },
			{ name: "date", label: "Invoice Date", type: "date", required: true, disabled: mode === "view", grid: { xs: 12, md: 4 } },
			{ name: "invoice_type", label: "Invoice Type", type: "select", options: invoiceTypeOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "party", label: "Customer", type: "select", options: customerOptions, required: true, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "broker", label: "Broker", type: "select", options: brokerOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "delivery_order", label: "Delivery Order", type: "select", options: deliveryOrderOptions, disabled: headerFieldsDisabled || deliveryOrderDisabled, grid: { xs: 12, md: 4 } },
			{ name: "sales_order_id", label: "Sales Order", type: "select", options: salesOrderOptions, disabled: headerFieldsDisabled || salesOrderDisabled, grid: { xs: 12, md: 4 } },
			{ name: "sales_order_date", label: "Sales Order Date", type: "date", disabled: true, grid: { xs: 12, md: 4 } },
			{ name: "payment_terms", label: "Payment Terms (Days)", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "billing_to", label: "Billing To", type: "select", options: customerBranchOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "shipping_to", label: "Shipping To", type: "select", options: customerBranchOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "transporter", label: "Transporter", type: "select", options: transporterOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "vehicle_no", label: "Vehicle No.", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "challan_no", label: "Challan No.", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "challan_date", label: "Challan Date", type: "date", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "eway_bill_no", label: "E-Way Bill No.", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "eway_bill_date", label: "E-Way Bill Date", type: "date", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "type_of_sale", label: "Transaction Type", type: "select", options: [
				{ label: "Type 1", value: "Type 1" },
				{ label: "Type 2", value: "Type 2" },
				{ label: "Type 3", value: "Type 3" },
				{ label: "Combination of Type 2 and 3", value: "Combination of Type 2 and 3" },
			], required: true, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "container_no", label: "Container No.", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "contract_no", label: "Contract No.", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "contract_date", label: "Contract Date", type: "date", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "consignment_no", label: "Consignment No.", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "consignment_date", label: "Consignment Date", type: "date", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "bank_detail_id", label: "Bank Account", type: "select", options: bankDetailOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
		];
		return { fields } satisfies Schema;
	}, [branchOptions, customerOptions, customerBranchOptions, transporterOptions, brokerOptions, deliveryOrderOptions, salesOrderOptions, invoiceTypeOptions, bankDetailOptions, mode, headerFieldsDisabled, salesOrderDisabled, deliveryOrderDisabled]);

export type UseJuteHeaderSchemaParams = {
	mode: "create" | "edit" | "view";
	headerFieldsDisabled: boolean;
	mukamOptions?: Option[];
	invoiceTypeId?: string;
};

export const useSalesInvoiceTypeSpecificHeaderSchema = ({
	mode, headerFieldsDisabled, mukamOptions, invoiceTypeId,
}: UseJuteHeaderSchemaParams): Schema | null =>
	React.useMemo(() => {
		const disabled = headerFieldsDisabled || mode === "view";

		if (isRawJuteInvoice(invoiceTypeId)) {
			const claimDisabled = disabled || true; // claim amount auto-summed for raw jute
			const fields: Field[] = [
				{ name: "jute_mr_no", label: "MR No.", type: "text", disabled, grid: { xs: 12, md: 3 } },
				{ name: "jute_mukam_id", label: "Mukam", type: "select", options: mukamOptions ?? [], disabled, grid: { xs: 12, md: 3 } },
				{ name: "jute_claim_amount", label: "Claim Amount", type: "text", disabled: claimDisabled, grid: { xs: 12, md: 3 } },
				{ name: "jute_claim_description", label: "Claim Description", type: "textarea", disabled, grid: { xs: 12, md: 3 } },
			];
			return { fields } satisfies Schema;
		}

		if (isGovtSkgInvoice(invoiceTypeId)) {
			const viewOnly = mode === "view";
			const fields: Field[] = [
				{ name: "govtskg_pcso_no", label: "PCSO No.", type: "text", disabled: viewOnly, grid: { xs: 12, md: 3 } },
				{ name: "govtskg_pcso_date", label: "PCSO Date", type: "date", disabled: viewOnly, grid: { xs: 12, md: 3 } },
				{ name: "govtskg_mode_of_transport", label: "Mode of Transport", type: "select", disabled: viewOnly, grid: { xs: 12, md: 3 }, options: [
					{ value: "CONCOR", label: "CONCOR" },
					{ value: "RAIL", label: "RAIL" },
					{ value: "ROAD", label: "ROAD" },
				] },
				{ name: "govtskg_admin_office_address", label: "Destination", type: "text", disabled: viewOnly, grid: { xs: 12, md: 3 } },
				{ name: "govtskg_destination_rail_head", label: "Destination Rail Head", type: "text", disabled: viewOnly, grid: { xs: 12, md: 3 } },
				{ name: "govtskg_loading_point", label: "Loading Point", type: "text", disabled: viewOnly, grid: { xs: 12, md: 3 } },
				{ name: "govtskg_pack_sheet", label: "Pack Sheet", type: "text", disabled: viewOnly, grid: { xs: 12, md: 2 } },
				{ name: "govtskg_net_weight", label: "Net Weight", type: "text", disabled: viewOnly, grid: { xs: 12, md: 2 } },
				{ name: "govtskg_total_weight", label: "Total Weight", type: "text", disabled: viewOnly, grid: { xs: 12, md: 2 } },
			];
			return { fields } satisfies Schema;
		}

		return null;
	}, [mode, headerFieldsDisabled, mukamOptions, invoiceTypeId]);

export const useSalesInvoiceFooterSchema = ({ mode }: UseFooterSchemaParams): Schema =>
	React.useMemo(() => {
		const disabled = mode === "view";
		const fields: Field[] = [
			{ name: "freight_charges", label: "Freight Charges", type: "text", disabled, grid: { xs: 12, md: 4 } },
			{ name: "footer_note", label: "Footer Note", type: "textarea", disabled, grid: { xs: 12 } },
			{ name: "internal_note", label: "Internal Note", type: "textarea", disabled, grid: { xs: 12 } },
			{ name: "terms_conditions", label: "Terms & Conditions", type: "textarea", disabled, grid: { xs: 12 } },
		];
		return { fields } satisfies Schema;
	}, [mode]);
