/**
 * Zod schemas for Price Enquiry API responses.
 *
 * Per the project mandate (CLAUDE.md), Zod is the single source of truth for
 * runtime-validated API contracts. These schemas are parsed inside
 * `enquiryService.ts` so that backend shape drift fails loudly at the service
 * boundary instead of surfacing as `undefined` access deep in the UI.
 *
 * Schemas are intentionally lenient about extra/unknown keys (the backend
 * returns many derived columns) but strict about the fields the UI relies on.
 */
import { z } from "zod";

// A flexible numeric that tolerates string-encoded numbers from the API.
const numericNullable = z
	.union([z.number(), z.string(), z.null()])
	.transform((v) => {
		if (v === null || v === "") return null;
		const n = typeof v === "string" ? Number(v) : v;
		return Number.isFinite(n) ? n : null;
	});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export const enquirySetupSchema = z.object({
	branches: z
		.array(z.object({ branch_id: z.number(), branch_name: z.string() }))
		.default([]),
	suppliers: z
		.array(
			z.object({
				party_id: z.number(),
				supp_name: z.string().nullable().optional(),
				supp_code: z.string().nullable().optional(),
			}),
		)
		.default([]),
	expense_types: z
		.array(
			z.object({
				expense_type_id: z.number(),
				expense_type_name: z.string().nullable().optional(),
			}),
		)
		.default([]),
	projects: z
		.array(
			z.object({
				project_id: z.number(),
				prj_name: z.string().nullable().optional(),
			}),
		)
		.default([]),
});

// ---------------------------------------------------------------------------
// Comparison response (and its items)
// ---------------------------------------------------------------------------

export const comparisonItemSchema = z.object({
	enquiry_dtl_id: z.number().nullable().optional(),
	item_id: z.number().nullable().optional(),
	item_code: z.string().nullable().optional(),
	item_name: z.string().nullable().optional(),
	uom_name: z.string().nullable().optional(),
	qty: numericNullable.optional(),
	rate: numericNullable.optional(),
	discount_mode: z.number().nullable().optional(),
	discount_value: numericNullable.optional(),
	discount_amount: numericNullable.optional(),
	gross_amount: numericNullable.optional(),
	net_amount: numericNullable.optional(),
});

export const comparisonResponseDetailSchema = z.object({
	proc_price_enquiry_response_id: z.number(),
	supplier_id: z.number().nullable().optional(),
	supp_name: z.string().nullable().optional(),
	supp_code: z.string().nullable().optional(),
	response_date: z.string().nullable().optional(),
	credit_days: z.number().nullable().optional(),
	delivery_days: z.number().nullable().optional(),
	payment_terms: z.string().nullable().optional(),
	terms_conditions: z.string().nullable().optional(),
	gross_amount: numericNullable.optional(),
	net_amount: numericNullable.optional(),
	is_selected: z.number().default(0),
	items: z.array(comparisonItemSchema).default([]),
});

export const comparisonResponseSchema = z.object({
	data: z.array(comparisonResponseDetailSchema).default([]),
});

// ---------------------------------------------------------------------------
// Single response (view/edit page)
// ---------------------------------------------------------------------------

export const responseDetailItemSchema = z.object({
	enquiry_dtl_id: z.number().nullable().optional(),
	item_id: z.number(),
	item_code: z.string().nullable().optional(),
	item_name: z.string().nullable().optional(),
	item_make_id: z.number().nullable().optional(),
	item_make_name: z.string().nullable().optional(),
	uom_id: z.number().nullable().optional(),
	uom_name: z.string().nullable().optional(),
	qty: numericNullable.optional(),
	rate: numericNullable.optional(),
	discount_mode: z.number().nullable().optional(),
	discount_value: numericNullable.optional(),
	discount_amount: numericNullable.optional(),
	gross_amount: numericNullable.optional(),
	net_amount: numericNullable.optional(),
	remarks: z.string().nullable().optional(),
});

export const responseDetailSchema = z.object({
	proc_price_enquiry_response_id: z.number(),
	enquiry_id: z.number().nullable().optional(),
	supplier_id: z.number(),
	supplier_branch_id: z.number().nullable().optional(),
	supp_name: z.string().nullable().optional(),
	supp_code: z.string().nullable().optional(),
	response_date: z.string().nullable().optional(),
	credit_days: z.number().nullable().optional(),
	delivery_days: z.number().nullable().optional(),
	payment_terms: z.string().nullable().optional(),
	terms_conditions: z.string().nullable().optional(),
	remarks: z.string().nullable().optional(),
	is_selected: z.number().default(0),
	gross_amount: numericNullable.optional(),
	net_amount: numericNullable.optional(),
	items: z.array(responseDetailItemSchema).default([]),
});

export type ResponseDetail = z.infer<typeof responseDetailSchema>;

// ---------------------------------------------------------------------------
// PO prefill
// ---------------------------------------------------------------------------

export const poPrefillItemSchema = z.object({
	item_id: z.number(),
	item_code: z.string().nullable().optional(),
	item_name: z.string().nullable().optional(),
	item_grp_id: z.number().nullable().optional(),
	hsn_code: z.string().nullable().optional(),
	item_make_id: z.number().nullable().optional(),
	item_make_name: z.string().nullable().optional(),
	uom_id: z.number().nullable().optional(),
	uom_name: z.string().nullable().optional(),
	qty: numericNullable.optional(),
	rate: numericNullable.optional(),
	discount_mode: z.number().nullable().optional(),
	discount_value: numericNullable.optional(),
	discount_amount: numericNullable.optional(),
	indent_dtl_id: z.number().nullable().optional(),
});

export const poPrefillSchema = z.object({
	supplier_id: z.number().nullable().optional(),
	supplier_branch_id: z.number().nullable().optional(),
	credit_days: z.number().nullable().optional(),
	delivery_days: z.number().nullable().optional(),
	terms_conditions: z.string().nullable().optional(),
	payment_terms: z.string().nullable().optional(),
	branch_id: z.number().nullable().optional(),
	expense_type_id: z.number().nullable().optional(),
	project_id: z.number().nullable().optional(),
	enquiry_id: z.number().nullable().optional(),
	items: z.array(poPrefillItemSchema).default([]),
});

/**
 * Unwrap a `{ data: ... }` envelope when present, then validate with the
 * provided schema. Returns the parsed value or throws a descriptive error.
 */
export function parseEnvelope<T>(schema: z.ZodType<T>, raw: unknown, label: string): T {
	const unwrapped =
		raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)
			? (raw as Record<string, unknown>).data
			: raw;
	const result = schema.safeParse(unwrapped);
	if (!result.success) {
		throw new Error(`Invalid ${label} response shape: ${result.error.message}`);
	}
	return result.data;
}
