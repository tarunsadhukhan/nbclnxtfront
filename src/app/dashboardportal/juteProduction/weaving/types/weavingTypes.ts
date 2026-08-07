// TypeScript response/request shapes for the Weaving Production Entry feature.
// Field names/types mirror the backend SPEC §3 (all responses are { data: ... }).
// Structure mirrors the Spinning feature's spinningTypes.ts; quality is MAPPED on the
// Loom → Quality tab (like spinning's frame → quality), NEVER selected inline on the
// production grid.

export type WeavingMachineOption = {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	branch_id: number | null;
	line_no: number | null;
};

export type WeavingSpellOption = {
	spell_code: string;
	spell_name: string;
	spell_id: number;
	working_hours: number;
};

// Weaving quality belonging to an item — used in the Loom → Quality map dropdown.
// `jpc` (jugar per cut), `fl` (full length), `ozs_yds` etc. are quality-linked
// standards resolved server-side; the FE only needs id + labels for the picker.
export type WeavingQualityOption = {
	weaving_quality_id: number;
	item_id: number | null;
	weaving_quality_code: string;
	weaving_quality_name: string | null;
};

export type WeavingSetup = {
	machines: WeavingMachineOption[];
	spells: WeavingSpellOption[];
	qualities: WeavingQualityOption[];
};

// --- Loom → Quality map (WEAVING_QUALITY_MAP_GET) ---
// One row per loom (machine). Mirrors spinning's FrameMapRow. Prior-date mapping is
// surfaced as an unsaved-draft suggestion (carry-forward) via prev_quality_*.
export type LoomQualityMapRow = {
	machine_id: number;
	mech_code: string | null;
	mech_posting_code: number | null; // machine posting code for quick-search
	machine_name: string | null;
	line_no: number | null; // shed line — grids group rows by line ("Line 3" / "No line")
	// Today's SAVED mapping (null = nothing saved yet for this loom).
	weaving_quality_id: number | null;
	weaving_quality_code: string | null;
	weaving_quality_name: string | null;
	// Mapped quality's jugars-per-cut — feeds the entry grid's Tot.Jugar preview
	// for looms with no saved entry yet.
	no_of_jugar_per_cut?: number | null;
	// Prior date's mapping, surfaced as an unsaved-draft suggestion for prefill.
	prev_quality_id: number | null;
	prev_quality_code: string | null;
	prev_quality_name: string | null;
	prev_date: string | null;
};

// A raw day-entry row (WEAVING_ENTRIES_BY_DATE) — operator inputs (cuts + jugar) plus
// the loom's MAPPED quality (read-only, inherited from the Loom → Quality map) and the
// server-computed production/efficiency outputs. The operator NEVER picks quality here.
export type WeavingEntryRow = {
	weaving_daily_id: number;
	tran_date: string;
	spell_id: number;
	spell_code: string | null;
	machine_id: number;
	mech_code: string | null;
	machine_name: string | null;
	// Inherited from the Loom → Quality map — READ-ONLY on the production grid.
	weaving_quality_id: number | null;
	weaving_quality_code: string | null;
	weaving_quality_name: string | null;
	item_id: number | null;
	item_code: string | null;
	// Physical beam holding the warp (beam change tab); read-only display here.
	beam_no: string | null;
	// Operator inputs.
	cuts: number;
	// The CLOSING jugar reading entered by the operator (cj; 0 ≤ cj ≤ jpc).
	close_jugar: number;
	// DERIVED (read-only, from vw_weaving_daily): open_jugar = last available close
	// for this loom+quality before this (date, spell); jugar = jugars PRODUCED this
	// spell. Optional — present on saved rows returned by entries_by_date.
	open_jugar?: number | null;
	jugar?: number | null;
	// Adjustment jugar deduction (Adjustment tab) — optional, feeds the live Tot.Jugar preview.
	less_production?: number | null;
	// Resolved standards (server-side) — read-only display.
	fl: number | null;
	jpc: number | null;
	open: number | null;
	ozs_yds: number | null;
	// Computed snapshot outputs (server authoritative).
	production_yds: number | null;
	production_kg: number | null;
	std_prod_yds: number | null;
	efficiency: number | null;
};

// Body for WEAVING_ENTRY_CREATE — quality is NOT sent (inherited from the loom map).
// The operator sends the CLOSING jugar reading as `close_jugar` (cj); open_jugar and
// the produced `jugar` are derived server-side (vw_weaving_daily).
export type WeavingEntryCreateBody = {
	co_id: number;
	branch_id: number;
	tran_date: string;
	spell_id: number;
	machine_id: number;
	cuts: number;
	close_jugar: number;
};

// Body for WEAVING_ENTRY_EDIT — editable inputs only (server recomputes).
export type WeavingEntryEditBody = {
	cuts: number;
	close_jugar: number;
};

// --- Beam Change map (WEAVING_BEAM_MAP_GET) ---
// One row per loom per date/spell: the physical beam number currently mounted.
export type WeavingBeamMapRow = {
	machine_id: number;
	mech_code: string | null;
	machine_name: string | null;
	// Today's SAVED beam number (null = nothing saved yet for this loom).
	beam_no: string | null;
	// Prior date's beam, surfaced as an unsaved-draft suggestion for prefill.
	prev_beam_no: string | null;
	prev_date: string | null;
};

// --- Planning Grid (WEAVING_PLANNING_GRID) ---
// One row per loom (machine) per quality per spell. All numeric columns are computed
// server-side and rendered read-only; the client only previews/saves them.
export type WeavingPlanningGridRow = {
	weaving_daily_id: number;
	tran_date: string;
	spell_id: number;
	spell_code: string | null;
	machine_id: number;
	mech_code: string | null;
	item_id: number | null;
	item_code: string | null;
	weaving_quality_id: number | null;
	weaving_quality_code: string | null;
	beam_no: string | null;
	// Field names MUST match the planning_grid serializer keys (weaving_entry.py) — the
	// hook binds the raw JSON, so an abbreviated name renders a blank column.
	finished_length: number;
	no_of_jugar_per_cut: number;
	open_jugar: number;
	close_jugar: number;
	less_production: number; // adjustment jugar
	ozs_yds: number;
	cuts: number;
	jugar: number; // = total_jugar (cuts·jc + cj − oj − adj)
	std_speed: number;
	target_speed: number; // NOTE: BE does not yet serialize a target speed — always blank
	act_speed: number;
	std_picks: number;
	eff_picks: number;
	std_eff: number;
	target_eff: number;
	working_hours: number;
	// LENGTH basis (yards).
	std_prod_yds: number; // "100prod" — 100% efficiency theoretical (denominator of actual eff)
	target_prod_yds: number;
	std_prod_eff: number; // "std prod" = std_prod_yds × std_eff / 100
	production_yds: number;
	// WEIGHT basis (kg) — reported only, never divided by the yards std_prod_yds.
	production_kg: number;
	// Efficiency = production_yds / std_prod_yds × 100 (yards ÷ yards).
	efficiency: number;
};

// Per machine+quality+shift rollup returned alongside the planning grid rows.
// Keys mirror the backend shift_rollup serializer (SUM numerator / SUM denominator,
// never avg of effs).
export type WeavingShiftRollupRow = {
	machine_id: number;
	mech_code: string | null;
	machine_name: string | null;
	weaving_quality_id: number | null;
	weaving_quality_code: string | null;
	shift_bucket: string;
	production_yds: number;
	production_kg: number;
	efficiency: number;
};

export type WeavingPlanningGridData = {
	rows: WeavingPlanningGridRow[];
	shift_rollup: WeavingShiftRollupRow[];
};

// --- Target Map (Weaving Standards / Targets) ---
// QUALITY-ONLY: there is NO id_type selector in the editor (always qid). PARAM_LABELS
// and VALUE_ROLE_OPTIONS are surfaced here for the target-map editor; 'actual' is
// entered on the Weaving SQC page, not here, so only standard + target are offered.
export const PARAM_LABELS: Record<string, string> = {
	speed: "Speed (picks/min)",
	picks: "Picks (PPI)",
	eff: "Efficiency %",
};

export const VALUE_ROLE_OPTIONS = ["standard", "target"] as const;
export type WeavingValueRole = (typeof VALUE_ROLE_OPTIONS)[number];

// target params = speed + eff (NOT picks — picks is a standard-only param).
export const TARGET_PARAMS = ["speed", "eff"] as const;

// --- Reduce-Jugar Adjustment grid (WEAVING_ADJUSTMENT_GET / _SAVE) ---
// One row per loom for a (tran_date, spell): the loom's MAPPED quality plus the current
// less_production deduction. Editing less_production reduces the row's production_yds in
// vw_weaving_daily (does not touch open/close jugar carry-forward).
export type WeavingAdjustmentRow = {
	machine_id: number;
	mech_code: string | null;
	mech_posting_code: number | null;
	machine_name: string | null;
	line_no: number | null;
	weaving_quality_id: number | null;
	weaving_quality_code: string | null;
	weaving_quality_name: string | null;
	weaving_daily_id: number | null;
	less_production: number; // reduce-jugar deduction (0 = none)
};
