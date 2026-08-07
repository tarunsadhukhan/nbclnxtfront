import React from "react";
import type { Schema, Field } from "@/components/ui/muiform";
import type { Option } from "../types/salesOrderTypes";

export type UseSalesOrderHeaderSchemaParams = {
	branchOptions: Option[];
	customerOptions: Option[];
	customerBranchOptions: Option[];
	brokerOptions: Option[];
	transporterOptions: Option[];
	quotationOptions: Option[];
	invoiceTypeOptions: Option[];
	quotationRequired: boolean;
	mode: "create" | "edit" | "view";
	headerFieldsDisabled: boolean;
	invoiceTypeLocked?: boolean;
};

export const useSalesOrderHeaderSchema = ({
	branchOptions,
	customerOptions,
	customerBranchOptions,
	brokerOptions,
	transporterOptions,
	quotationOptions,
	invoiceTypeOptions,
	quotationRequired,
	mode,
	headerFieldsDisabled,
	invoiceTypeLocked,
}: UseSalesOrderHeaderSchemaParams): Schema =>
	React.useMemo(() => {
		const fields: Field[] = [
			{
				name: "branch",
				label: "Branch",
				type: "select",
				options: branchOptions,
				required: true,
				disabled: mode !== "create",
				grid: { xs: 12, md: 4 },
			},
			{ name: "date", label: "Order Date", type: "date", required: true, disabled: mode === "view", grid: { xs: 12, md: 4 } },
			{ name: "invoice_type", label: "Invoice Type", type: "select", options: invoiceTypeOptions, disabled: headerFieldsDisabled || invoiceTypeLocked, grid: { xs: 12, md: 4 } },
			{ name: "expiry_date", label: "Expiry Date", type: "date", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{
				name: "party",
				label: "Customer",
				type: "select",
				options: customerOptions,
				required: (values) => !values.broker,
				customValidate: (_value, values) => (!values.party && !values.broker) ? "Customer or Broker is required" : null,
				disabled: headerFieldsDisabled,
				grid: { xs: 12, md: 4 },
			},
		];

		if (quotationRequired) {
			fields.push({
				name: "quotation",
				label: "Quotation",
				type: "select",
				options: quotationOptions,
				disabled: headerFieldsDisabled,
				grid: { xs: 12, md: 4 },
			});
		}

		fields.push(
			{
				name: "broker",
				label: "Broker",
				type: "select",
				options: brokerOptions,
				required: (values) => !values.party,
				customValidate: (_value, values) => (!values.party && !values.broker) ? "Customer or Broker is required" : null,
				disabled: headerFieldsDisabled,
				grid: { xs: 12, md: 4 },
			},
			{ name: "broker_commission_percent", label: "Broker Commission %", type: "text", placeholder: "%", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "billing_to", label: "Billing To", type: "select", options: customerBranchOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "shipping_to", label: "Shipping To", type: "select", options: customerBranchOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "transporter", label: "Transporter", type: "select", options: transporterOptions, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "delivery_terms", label: "Delivery Terms", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "payment_terms", label: "Payment Terms", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "buyer_order_no", label: "Buyer's Order No.", type: "text", disabled: headerFieldsDisabled, placeholder: "Customer's PO reference", grid: { xs: 12, md: 4 } },
			{ name: "buyer_order_date", label: "Buyer's Order Date", type: "date", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "delivery_days", label: "Delivery Days", type: "text", placeholder: "days", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "committed_delivery_date", label: "Committed Delivery Date", type: "date", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "advance_amount", label: "Advance Amount", type: "text", placeholder: "0.00", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "advance_note", label: "Advance Note", type: "text", placeholder: "e.g. 30% with order", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "freight_charges", label: "Freight Charges", type: "text", placeholder: "0.00", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
		);

		return { fields } satisfies Schema;
	}, [
		branchOptions, customerOptions, customerBranchOptions,
		brokerOptions, transporterOptions, quotationOptions,
		invoiceTypeOptions, quotationRequired, mode, headerFieldsDisabled, invoiceTypeLocked,
	]);
