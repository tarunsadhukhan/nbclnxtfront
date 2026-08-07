import React from "react";
import type { Schema, Field } from "@/components/ui/muiform";
import type { Option } from "../types/quotationTypes";

export type UseQuotationHeaderSchemaParams = {
	branchOptions: Option[];
	customerOptions: Option[];
	brokerOptions: Option[];
	/** Customer branch options for billing and shipping address dropdowns. */
	customerBranchOptions: Option[];
	coConfig?: { india_gst?: number };
	billingState?: string;
	shippingState?: string;
	taxType: string;
	mode: "create" | "edit" | "view";
	headerFieldsDisabled: boolean;
};

export type UseQuotationFooterSchemaParams = {
	coConfig?: { india_gst?: number };
	billingState?: string;
	shippingState?: string;
	taxType: string;
};

/**
 * Builds the header form schema for the quotation create/edit page.
 */
export const useQuotationHeaderSchema = ({
	branchOptions,
	customerOptions,
	brokerOptions,
	customerBranchOptions,
	coConfig,
	billingState,
	shippingState,
	taxType,
	mode,
	headerFieldsDisabled,
}: UseQuotationHeaderSchemaParams): Schema =>
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
			{ name: "quotation_date", label: "Quotation Date", type: "date", required: true, disabled: mode === "view", grid: { xs: 12, md: 4 } },
			{ name: "customer", label: "Customer", type: "select", options: customerOptions, required: false, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "broker", label: "Broker", type: "select", options: brokerOptions, required: false, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "billing_address", label: "Billing Address", type: "select", options: customerBranchOptions, required: false, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "shipping_address", label: "Shipping Address", type: "select", options: customerBranchOptions, required: false, disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "brokerage_percentage", label: "Brokerage %", type: "text", placeholder: "%", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "payment_terms", label: "Payment Terms", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "delivery_terms", label: "Delivery Terms", type: "text", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "delivery_days", label: "Delivery Days", type: "text", placeholder: "days", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
			{ name: "quotation_expiry_date", label: "Expiry Date", type: "date", disabled: headerFieldsDisabled, grid: { xs: 12, md: 4 } },
		];

		return { fields } satisfies Schema;
	}, [
		branchOptions,
		customerOptions,
		brokerOptions,
		customerBranchOptions,
		coConfig,
		billingState,
		shippingState,
		taxType,
		mode,
		headerFieldsDisabled,
	]);

/**
 * Builds the schema for footer-only fields rendered below the line items.
 */
export const useQuotationFooterSchema = ({ coConfig, billingState, shippingState, taxType }: UseQuotationFooterSchemaParams): Schema =>
	React.useMemo(() => {
		const fields: Field[] = [
			{ name: "footer_notes", label: "Footer Notes", type: "textarea", grid: { xs: 12 } },
			{ name: "internal_note", label: "Internal Note", type: "textarea", grid: { xs: 12 } },
			{ name: "terms_condition", label: "Terms and Conditions", type: "textarea", grid: { xs: 12 } },
		];

		return { fields } satisfies Schema;
	}, [coConfig, billingState, shippingState, taxType]);
