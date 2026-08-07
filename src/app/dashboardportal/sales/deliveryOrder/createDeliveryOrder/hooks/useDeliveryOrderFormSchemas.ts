import React from "react";
import type { Schema, Field } from "@/components/ui/muiform";
import type { Option } from "../types/deliveryOrderTypes";

export type UseHeaderSchemaParams = {
	branchOptions: Option[];
	customerOptions: Option[];
	customerBranchOptions: Option[];
	transporterOptions: Option[];
	brokerOptions: Option[];
	salesOrderOptions: Option[];
	invoiceTypeOptions: Option[];
	mode: "create" | "edit" | "view";
	headerFieldsDisabled: boolean;
	/** True when line items were manually entered without an SO — disables the SO dropdown */
	hasManualLines?: boolean;
};

export type UseFooterSchemaParams = {
	mode: "create" | "edit" | "view";
};

export const useDeliveryOrderHeaderSchema = ({
	branchOptions, customerOptions, customerBranchOptions,
	transporterOptions, brokerOptions, salesOrderOptions, invoiceTypeOptions, mode, headerFieldsDisabled,
	hasManualLines,
}: UseHeaderSchemaParams): Schema =>
	React.useMemo(() => {
		// SO dropdown disabled when manual lines exist (mutual exclusivity)
		const soDisabled = headerFieldsDisabled || Boolean(hasManualLines);

		const fields: Field[] = [
			{ name: "branch", label: "Branch", type: "select", options: branchOptions, required: true, disabled: mode !== "create", grid: { xs: 12, md: 4 } },
			{ name: "date", label: "DO Date", type: "date", required: true, disabled: mode === "view", grid: { xs: 12, md: 4 } },
			{ name: "invoice_type", label: "Invoice Type", type: "select", options: invoiceTypeOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "expected_delivery_date", label: "Expected Delivery Date", type: "date", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "party", label: "Customer", type: "select", options: customerOptions, required: true, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "broker", label: "Broker", type: "select", options: brokerOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "sales_order", label: "Sales Order", type: "select", options: salesOrderOptions, disabled: soDisabled, grid: { xs: 12, md: 4 } },
			{ name: "billing_to", label: "Billing To", type: "select", options: customerBranchOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "shipping_to", label: "Shipping To", type: "select", options: customerBranchOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "transporter", label: "Transporter", type: "select", options: transporterOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "vehicle_no", label: "Vehicle No.", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "driver_name", label: "Driver Name", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "driver_contact", label: "Driver Contact", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "eway_bill_no", label: "E-Way Bill No.", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "eway_bill_date", label: "E-Way Bill Date", type: "date", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
		];
		return { fields } satisfies Schema;
	}, [branchOptions, customerOptions, customerBranchOptions, transporterOptions, brokerOptions, salesOrderOptions, invoiceTypeOptions, mode, headerFieldsDisabled, hasManualLines]);

export const useDeliveryOrderFooterSchema = ({ mode }: UseFooterSchemaParams): Schema =>
	React.useMemo(() => {
		const disabled = mode === "view";
		const fields: Field[] = [
			{ name: "freight_charges", label: "Freight Charges", type: "text", disabled, grid: { xs: 12, md: 4 } },
			{ name: "round_off_value", label: "Round Off", type: "text", disabled, grid: { xs: 12, md: 4 } },
			{ name: "footer_note", label: "Footer Note", type: "textarea", disabled, grid: { xs: 12 } },
			{ name: "internal_note", label: "Internal Note", type: "textarea", disabled, grid: { xs: 12 } },
		];
		return { fields } satisfies Schema;
	}, [mode]);
