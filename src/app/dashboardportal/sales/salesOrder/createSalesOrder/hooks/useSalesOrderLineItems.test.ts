import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";

import { useSalesOrderLineItems } from "./useSalesOrderLineItems";
import type { SalesOrderLine } from "@/utils/salesOrderService";

const emptyHookParams = {
	mode: "edit" as const,
	coConfig: { india_gst: 1 },
	billingToState: "WB",
	shippingToState: "WB",
	itemGroupCache: {},
	itemGroupLoading: {},
	ensureItemGroupData: () => {},
	itemGroups: [],
	invoiceTypeCode: "",
};

const makeBackendLine = (overrides: Partial<SalesOrderLine> = {}): SalesOrderLine => ({
	id: "1",
	itemGroup: "10",
	item: "100",
	quantity: "5",
	rate: "20",
	uom: "1",
	...overrides,
});

describe("useSalesOrderLineItems → mapLineToEditable", () => {
	// Regression: previously mapped to line.totalAmount which is POST-tax —
	// the totals card then double-counted GST (once inside `amount`, once in
	// `taxAmount`). The contract is that `amount` must always be pre-tax so
	// the totals formula `gross + totalTax + freight + addl = net` is valid.
	it("maps backend pre-tax netAmount to editable `amount` (regression guard)", () => {
		const { result } = renderHook(() => useSalesOrderLineItems(emptyHookParams));

		const mapped = result.current.mapLineToEditable(
			makeBackendLine({
				netAmount: 100,
				totalAmount: 118,
				gst: {
					igstAmount: 0,
					igstPercent: 0,
					cgstAmount: 9,
					cgstPercent: 9,
					sgstAmount: 9,
					sgstPercent: 9,
					gstTotal: 18,
				},
			}),
		);

		expect(mapped.amount).toBe(100);
		expect(mapped.taxAmount).toBe(18);
	});

	it("never reuses totalAmount for `amount` even when netAmount is missing", () => {
		const { result } = renderHook(() => useSalesOrderLineItems(emptyHookParams));

		const mapped = result.current.mapLineToEditable(
			makeBackendLine({ netAmount: null, totalAmount: 118 }),
		);

		// With no pre-tax net, amount must be undefined — not the post-tax total.
		expect(mapped.amount).toBeUndefined();
	});

	it("keeps amount and taxAmount consistent with create-mode math (amount = qty*rate, tax on top)", () => {
		const { result } = renderHook(() => useSalesOrderLineItems(emptyHookParams));

		const mapped = result.current.mapLineToEditable(
			makeBackendLine({
				quantity: "10",
				rate: "50",
				netAmount: 500,
				totalAmount: 590,
				gst: {
					igstAmount: 90,
					igstPercent: 18,
					cgstAmount: 0,
					cgstPercent: 0,
					sgstAmount: 0,
					sgstPercent: 0,
					gstTotal: 90,
				},
			}),
		);

		// Amount is qty*rate (pre-tax), not qty*rate + GST.
		expect(mapped.amount).toBe(500);
		expect(mapped.taxAmount).toBe(90);
		// The sum `amount + taxAmount` should equal totalAmount, which is the
		// invariant the totals card relies on.
		expect((mapped.amount ?? 0) + (mapped.taxAmount ?? 0)).toBe(590);
	});
});
