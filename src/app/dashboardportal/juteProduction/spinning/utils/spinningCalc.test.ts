import { describe, expect, it } from "vitest";
import { groupFrameWise, prevShiftRef } from "./spinningCalc";
import type { DoffEntryRow } from "../types/spinningTypes";

function doff(p: Partial<DoffEntryRow>): DoffEntryRow {
	return {
		daily_doff_tbl_id: 1,
		doff_date: "2026-08-01",
		spell_id: 1,
		spell_code: "A",
		mc_id: 11,
		mech_code: "F-01",
		machine_name: "FRAME 1",
		trolly_id: 1,
		trolly_name: "T1",
		item_id: 5,
		item_source: "mapper",
		item_code: "Y-8LB",
		item_name: "Yarn 8LB",
		eb_id: 10,
		eb_source: "sync",
		eb_name: "02413 - LAXMI DEBI",
		gross_weight: 0,
		tare_weight: 0,
		net_weight: 0,
		...p,
	};
}

describe("groupFrameWise", () => {
	it("groups by frame+quality, lists nets, averages them", () => {
		const rows = groupFrameWise([
			doff({ net_weight: 34 }),
			doff({ net_weight: 45, eb_name: "02901 - SITA DEVI" }),
			doff({ mc_id: 12, mech_code: "F-02", item_id: 6, item_code: "Y-10LB", net_weight: 40 }),
		]);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			frame: "F-01",
			item_code: "Y-8LB",
			operators: "02413 - LAXMI DEBI, 02901 - SITA DEVI",
			doffs: 2,
			weights: "34 + 45",
			total: 79,
			avg_doff: 39.5,
			prev_avg_doff: null,
		});
		expect(rows[1]).toMatchObject({ frame: "F-02", doffs: 1, avg_doff: 40 });
	});

	it("carries the previous shift average for the same frame+quality only", () => {
		const rows = groupFrameWise(
			[doff({ net_weight: 40 })],
			[doff({ net_weight: 30 }), doff({ net_weight: 36 }), doff({ mc_id: 99, net_weight: 5 })],
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].prev_avg_doff).toBe(33);
	});
});

describe("prevShiftRef", () => {
	const spells = [{ spell_id: 1 }, { spell_id: 2 }, { spell_id: 3 }];

	it("returns the preceding spell on the same date", () => {
		expect(prevShiftRef(spells, 2, "2026-08-01")).toEqual({ spellId: 1, date: "2026-08-01" });
	});

	it("rolls back to the previous date's last spell on the first spell", () => {
		expect(prevShiftRef(spells, 1, "2026-08-01")).toEqual({ spellId: 3, date: "2026-07-31" });
	});

	it("returns null for an unknown or missing spell", () => {
		expect(prevShiftRef(spells, 99, "2026-08-01")).toBeNull();
		expect(prevShiftRef(spells, null, "2026-08-01")).toBeNull();
	});
});
