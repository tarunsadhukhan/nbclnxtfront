// TypeScript response/request shapes for the Finishing Production Entry feature.
// Field names/types mirror the backend contract EXACTLY
// (../vowerp3be/src/juteProduction/finishing_entry.py). All responses are
// { data: ... }. One type file per feature to avoid circular dependencies.

// The nine finishing sub-processes. LOCKED CONTRACT — token order is fixed and
// keys the `process` column and the spec-sheet param matrix
// (constants.FINISHING_PARAMS). Machine linking is intentionally unused.
export const FINISHING_PROCESSES = [
	"damping",
	"calendering",
	"lapping",
	"rolling",
	"cutting",
	"hemming",
	"herackle",
	"sacksewing",
	"balepress",
] as const;

export type FinishingProcess = (typeof FINISHING_PROCESSES)[number];

// finishing_quality.quality_type — hessian qualities = 1, sacking qualities = 2.
export const FINISHING_QUALITY_TYPE_HESSIAN = 1;
export const FINISHING_QUALITY_TYPE_SACKING = 2;

// Hessian-only (type 1) cloth processes. The sacking processes
// (cutting/hemming/herackle/sacksewing) are bag processes; balepress accepts both.
export const FINISHING_CLOTH_PROCESSES: readonly FinishingProcess[] = [
	"damping",
	"calendering",
	"lapping",
	"rolling",
];

// --- Setup lookups (GET /finishingProd/entry_setup) ------------------------

export type FinishingMachineOption = {
	machine_id: number;
	mech_code: string;
	machine_name: string;
};

export type FinishingQualityOption = {
	finishing_quality_id: number;
	fin_quality_code: string;
	fin_quality_name: string;
	// 1 = Hessian, 2 = Sacking.
	quality_type: number;
};

export type FinishingSpellOption = {
	spell_id: number;
	spell_code: string;
	spell_name: string | null;
	working_hours: number;
};

// GET /finishingProd/entry_setup -> { data: FinishingSetup }
export type FinishingSetup = {
	process: string;
	machines: FinishingMachineOption[];
	qualities: FinishingQualityOption[];
	spells: FinishingSpellOption[];
	// Day's existing rows when tran_date was supplied to entry_setup.
	entries: FinishingEntryRow[];
};

// --- Day-grid entry row (GET /finishingProd/entry_by_date) -----------------
// Header columns plus resolved labels and the production figure. Simplified
// entry: no input/wastage/EAV params and no resolved standards snapshot.
export type FinishingEntryRow = {
	finishing_daily_id: number;
	co_id: number;
	branch_id: number | null;
	tran_date: string;
	spell_id: number;
	spell_code: string | null;
	process: string;
	// machine_id is NULL for labour processes (sacksewing); eb_id keys the row instead.
	machine_id: number | null;
	mech_code: string | null;
	machine_name: string | null;
	// Worker (labour processes — sacksewing). emp_code/emp_name resolved for the day grid.
	eb_id: number | null;
	emp_code: string | null;
	emp_name: string | null;
	finishing_quality_id: number;
	fin_quality_code: string | null;
	fin_quality_name: string | null;
	quality_type: number | null;
	prod_qty: number | null;
	prod_uom: string | null;
};

// --- Save body (POST /finishingProd/entry_save) ----------------------------
// User enters only: tran_date, spell, machine|employee, quality, and the production figure.
// Labour processes (sacksewing) send eb_id (no machine_id); all others send machine_id.
export type FinishingEntrySaveBody = {
	co_id: number;
	branch_id: number | null;
	tran_date: string;
	spell_id: number;
	process: string;
	machine_id?: number | null;
	eb_id?: number | null;
	finishing_quality_id: number;
	prod_qty: number;
	prod_uom: string;
};

export type FinishingSaveResult = {
	finishing_daily_id: number;
};

// --- Employee lookup (GET /finishingProd/employee_lookup) -------------------
// Labour processes (sacksewing): resolve an emp_code to its worker, branch-scoped.
export type FinishingEmployeeLookupResult = {
	eb_id: number;
	emp_code: string;
	// Display name = emp_code + first/middle/last name.
	employee_name: string;
};
