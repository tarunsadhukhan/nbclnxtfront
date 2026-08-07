// TypeScript response/request shapes for the Beaming Production Entry feature.
// Field names/types mirror SPEC §C (all responses are { data: ... }).
// Mirrors the Spinning feature's spinningTypes.ts structure.

export type BeamingMachineOption = {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	branch_id: number | null;
};

export type BeamingSpellOption = {
	spell_code: string;
	spell_name: string;
	spell_id: number;
	working_hours: number;
};

export type BeamingEbOption = {
	eb_id: number;
	eb_name: string;
};

// Jute-cloth item (item_grp_mst.item_type_id = 5) — SPEC §C.4 setup `items`.
export type BeamingItemOption = {
	item_id: number;
	item_code: string;
	item_name: string;
};

// bm_quality belonging to an item — SPEC §C.4 setup `qualities`.
// `ends` + `std_count` are quality-linked (master columns, SPEC §A.2 / §2).
export type BeamingQualityOption = {
	bm_quality_id: number;
	item_id: number;
	bm_quality_code: string;
	bm_quality_name: string | null;
	ends: number;
	std_count: number;
	// 1 ⇒ multi-component warp; production entry is blocked server-side (SPEC §C.5).
	is_composite: number;
};

export type BeamingSetup = {
	machines: BeamingMachineOption[];
	spells: BeamingSpellOption[];
	eb_list: BeamingEbOption[];
	items: BeamingItemOption[];
	qualities: BeamingQualityOption[];
};

// A raw day-entry row (BEAMING_ENTRIES_BY_DATE) — the operator-entered inputs
// plus resolved labels for display in DailyBeamingGrid.
export type BeamingEntryRow = {
	beaming_daily_id: number;
	tran_date: string;
	spell_id: number;
	spell_code: string | null;
	machine_id: number;
	mech_code: string | null;
	machine_name: string | null;
	eb_id: number | null;
	item_id: number;
	item_code: string | null;
	item_name: string | null;
	bm_quality_id: number;
	bm_quality_code: string | null;
	bm_quality_name: string | null;
	// Physical beam number holding the warp material (like a trolley no — NOT an
	// auto doc-number). Q10.
	beam_no: string | null;
	act_cuts: number;
	no_of_beam: number;
	// rpm_roller and act_speed are READ-ONLY here — NOT entered on this production
	// page. They are captured later on a future Beaming SQC tab (like Spinning SQC)
	// and resolved server-side; the API returns them for display (0/blank until SQC
	// exists, which is expected).
	rpm_roller: number | null;
	// dia_roller is RESOLVED server-side from the machine standard (Q7) — it is
	// NOT a user input. Stored in the daily snapshot and shown read-only.
	dia_roller: number | null;
	// Computed snapshot outputs (server authoritative).
	act_speed: number | null;
	kg_per_beam: number | null;
	act_prod_kg: number | null;
	act_prod_yards: number | null;
	act_eff: number | null;
};

// Body for BEAMING_ENTRY_CREATE (SPEC §C.4 BeamingEntryCreate).
export type BeamingEntryCreateBody = {
	co_id: number;
	branch_id: number;
	tran_date: string;
	spell_id: number;
	machine_id: number;
	eb_id: number | null;
	item_id: number;
	bm_quality_id: number;
	// Physical beam number (Q10).
	beam_no: string | null;
	act_cuts: number;
	no_of_beam: number;
	// rpm_roller is NO LONGER sent from production entry — it will be captured on a
	// future Beaming SQC tab (like Spinning SQC). dia_roller is resolved server-side
	// from the standard (Q7). act_speed is computed server-side once SQC supplies rpm.
};

// Body for BEAMING_ENTRY_EDIT — editable inputs only (server recomputes).
export type BeamingEntryEditBody = {
	eb_id: number | null;
	// Physical beam number (Q10).
	beam_no: string | null;
	act_cuts: number;
	no_of_beam: number;
	// rpm_roller is NO LONGER sent from production entry — captured on the future
	// Beaming SQC tab (like Spinning SQC). dia_roller resolved server-side (Q7).
};

// --- Planning Grid (BEAMING_PLANNING_GRID) — SPEC §C.1 columns ---
// One row per machine per quality per spell. All numeric columns are computed
// server-side and rendered read-only; the client only previews/saves them.
// Unit-labelled: yards columns vs kg columns (SPEC §3 — never compare kg to the
// yards p100prod).
export type BeamingPlanningGridRow = {
	beaming_daily_id: number;
	tran_date: string;
	spell_id: number;
	spell_code: string | null;
	machine_id: number;
	mech_code: string | null;
	item_id: number;
	item_code: string | null;
	bm_quality_id: number;
	bm_quality_code: string | null;
	eb_id: number | null;
	// Physical beam number (Q10).
	beam_no: string | null;
	ends: number;
	std_count: number;
	act_count: number;
	laid_length: number;
	std_cuts_per_beam: number;
	act_cuts: number;
	no_of_beam: number;
	// rpm_roller and act_speed are READ-ONLY display columns sourced from the server.
	// They will be filled by the future Beaming SQC tab (like Spinning SQC); they read
	// 0/blank until that SQC page is built — expected, NOT entered here.
	rpm_roller: number | null;
	// dia_roller is server-resolved from the machine standard (Q7) — read-only display.
	dia_roller: number | null;
	std_speed: number;
	target_speed: number;
	act_speed: number;
	std_eff: number;
	target_eff: number;
	working_hours: number;
	yards_per_beam: number;
	kg_per_cut: number;
	kg_per_beam: number;
	// LENGTH basis (yards).
	p100prod: number;
	std_prod: number;
	target_prod: number;
	act_prod_yards: number;
	// WEIGHT basis (kg) — reported only, never divided by the yards p100prod.
	act_prod_kg: number;
	// Efficiency = act_prod_yards / p100prod × 100 (yards ÷ yards).
	act_eff: number;
};

// Per machine+quality+shift rollup returned alongside the planning grid rows
// (SPEC §12 Q9 — included for parity with Spinning). Keys mirror the backend
// shift_rollup serializer (SUM numerator / SUM denominator, never avg of effs).
export type BeamingShiftRollupRow = {
	machine_id: number;
	mech_code: string | null;
	machine_name: string | null;
	item_id: number;
	item_code: string | null;
	bm_quality_id: number;
	bm_quality_code: string | null;
	shift_bucket: string;
	act_prod_yards: number;
	act_prod_kg: number;
	act_eff: number;
};

export type BeamingPlanningGridData = {
	rows: BeamingPlanningGridRow[];
	shift_rollup: BeamingShiftRollupRow[];
};
