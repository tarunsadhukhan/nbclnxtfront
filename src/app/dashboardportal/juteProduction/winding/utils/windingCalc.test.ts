import { describe, expect, it } from "vitest";
import { groupWinderWise } from "./windingCalc";
import type { WindingDoffRow } from "../types/windingTypes";

function doff(p: Partial<WindingDoffRow>): WindingDoffRow {
	return {
		winding_doff_id: 1,
		weighing_id: 1,
		co_id: 1,
		branch_id: 2,
		tran_date: "2026-08-01",
		spell_id: 1,
		spell_code: "A",
		eb_id: 10,
		emp_code: "02413",
		worker_name: "LAXMI",
		item_id: 5,
		item_code: "Y-8LB",
		trolly_id: 1,
		trolly_name: "T1",
		trolly_wt: 0,
		spool_id: 1,
		spool_name: "S1",
		spool_wt: 0,
		gross_input_wt: 0,
		production_qty: 0,
		row_gross_wt: 0,
		...p,
	};
}

describe("groupWinderWise", () => {
	it("groups by winder + quality, lists each entry and sums", () => {
		const out = groupWinderWise([
			doff({ winding_doff_id: 1, production_qty: 34 }),
			doff({ winding_doff_id: 2, production_qty: 45 }),
			doff({ winding_doff_id: 3, production_qty: 30 }),
			// same winder, different quality -> separate row
			doff({ winding_doff_id: 4, item_id: 6, item_code: "Y-10LB", production_qty: 12.5 }),
			// different winder
			doff({
				winding_doff_id: 5,
				eb_id: 11,
				emp_code: "02500",
				worker_name: "RAM",
				production_qty: 20,
			}),
		]);

		expect(out).toHaveLength(3);
		const laxmi = out.find((r) => r.winder === "02413 - LAXMI" && r.item_code === "Y-8LB")!;
		expect(laxmi.weights).toBe("34 + 45 + 30");
		expect(laxmi.total).toBe(109);
		expect(out.find((r) => r.item_code === "Y-10LB")!.total).toBe(12.5);
		expect(out.find((r) => r.winder === "02500 - RAM")!.weights).toBe("20");
	});

	it("keeps rows whose worker did not resolve", () => {
		const out = groupWinderWise([
			doff({ eb_id: null, emp_code: null, worker_name: null, item_code: null, production_qty: 7 }),
		]);
		expect(out[0]).toMatchObject({ winder: "—", item_code: "—", weights: "7", total: 7 });
	});
});
