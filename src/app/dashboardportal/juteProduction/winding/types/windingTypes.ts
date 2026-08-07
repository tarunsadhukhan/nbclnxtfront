// TypeScript response/request shapes for the Winding production portal feature.
// Field names/types mirror the backend (src/juteProduction/winding_entry.py +
// winding_query.py). All responses are double-unwrapped: { data: ... }.
//
// Entry is PERSON-keyed (eb_id), not machine-keyed — see the backend spec
// docs/winding-person-keyed-entry-spec.md. The worker columns on a row type are
// nullable because the worker may not resolve: the backend reads every row with a
// LEFT JOIN to HRMS, so a row whose employee was deleted or deactivated still comes
// back (kept in the grid) with emp_code / worker_name null.

// A winder from HRMS masters (hrms_ed_official_details + _personal_details).
// `label` is concatenated server-side ("02413 - LAXMI DEBI") so every screen
// shows the identical string. `designation` is display-only — it is never a
// filter (winding designations share no common prefix).
export type WindingWorkerOption = {
	eb_id: number;
	emp_code: string | null;
	worker_name: string | null;
	designation: string | null;
	label: string;
};

export type WindingSpellOption = {
	spell_code: string;
	spell_name: string;
	spell_id: number;
	working_hours: number;
};

// Trolly (type 'T') and Spool (type 'S') share this shape — busket_weight is
// aliased to bucket_weight by the backend (production typo kept on the table).
export type WindingTrollyOption = {
	trolly_id: number;
	trolly_name: string;
	trolly_weight: number;
	bucket_weight: number;
};

// A yarn item (item_mst, item_type_id=4) — the single yarn identity.
export type YarnItemOption = {
	item_id: number;
	item_code: string;
	item_name: string | null;
};

// A winding machine (machine_mst). Entry stays PERSON-keyed — the machine is
// only recorded alongside the winder on the quality map, never a key.
export type WindingMachineOption = {
	machine_id: number;
	machine_name: string | null;
	mech_code: string | null;
	dept_id: number | null;
	dept_name: string | null;
	branch_id: number | null;
};

// Response of WINDING_DOFF_SETUP (data.{...}).
export type WindingDoffSetup = {
	workers: WindingWorkerOption[];
	yarn_items: YarnItemOption[];
	trollies: WindingTrollyOption[];
	spools: WindingTrollyOption[];
	spells: WindingSpellOption[];
};

// Response of WINDING_JUGAR_SETUP.
export type WindingJugarSetup = {
	workers: WindingWorkerOption[];
	spells: WindingSpellOption[];
};

// Response of WINDING_DOFF_PREV_STATE (data may be null).
export type WindingDoffPrevState = {
	winding_doff_id: number;
	eb_id: number | null;
	item_id: number | null;
	trolly_id: number | null;
	trolly_wt: number;
	spool_id: number | null;
	spool_wt: number;
	gross_input_wt: number;
	production_qty: number;
	tran_date?: string;
};

// One row from WINDING_DOFF_BY_DATE (one weighing by one winder).
export type WindingDoffRow = {
	winding_doff_id: number;
	// Shared-weighing group key. Rows of one weighing share it; the backend
	// COALESCEs it to the row's own id, so a solo row is its own group.
	weighing_id: number;
	co_id: number;
	branch_id: number | null;
	tran_date: string;
	spell_id: number;
	spell_code: string | null;
	eb_id: number | null;
	emp_code: string | null;
	worker_name: string | null;
	item_id: number | null;
	item_code: string | null;
	trolly_id: number;
	trolly_name: string | null;
	trolly_wt: number;
	spool_id: number;
	spool_name: string | null;
	spool_wt: number;
	gross_input_wt: number;
	production_qty: number;
	row_gross_wt: number;
};

// One side (opening / closing) of WINDING_JUGAR_STATE. `source` says where the
// weight came from: "saved" (a row already stored for this date/spell/winder —
// a manual entry always wins), "carry" (the previous spell's closing leftover),
// "carry_open" (the winder's previous opening, opening side only) or "none" (0).
// winding_jugar_id is non-null only for "saved".
export type WindingJugarSide = {
	weight: number;
	winding_jugar_id: number | null;
	source: "saved" | "carry" | "carry_open" | "none";
};

// Response of WINDING_JUGAR_STATE — both ends of the spell in one call.
export type WindingJugarState = {
	spell_id: number | null;
	opening: WindingJugarSide;
	closing: WindingJugarSide;
};

// One row from WINDING_JUGAR_BY_DATE.
export type WindingJugarRow = {
	winding_jugar_id: number;
	co_id: number;
	branch_id: number | null;
	tran_date: string;
	spell_id: number;
	spell_code: string | null;
	eb_id: number | null;
	emp_code: string | null;
	worker_name: string | null;
	weight: number;
	open_close: "O" | "C";
};

// One row of the person -> quality map (WINDING_QUALITY_SETUP / _BY_DATE).
export type WindingQualityRow = {
	winding_daily_qlty_id: number;
	co_id: number;
	branch_id: number | null;
	tran_date: string;
	spell_id: number;
	spell_code: string | null;
	eb_id: number | null;
	emp_code: string | null;
	worker_name: string | null;
	item_id: number | null;
	item_code: string | null;
	machine_id: number | null;
	machine_name: string | null;
	mech_code: string | null;
	no_of_spindle: number;
};

// Response of WINDING_QUALITY_SETUP (data.{...}). `rows` is the day's map (one
// row per person carried forward from the previous spell — empty when there is
// no prior spell); `workers` feeds the "Add winder" picker and `machines` the
// per-row machine picker.
export type WindingQualitySetup = {
	rows: WindingQualityRow[];
	yarn_items: YarnItemOption[];
	workers: WindingWorkerOption[];
	machines: WindingMachineOption[];
};
