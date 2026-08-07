// Types for the R-08-28 Fabric Fault SQC screen — weaving woven-cloth defect
// tally. Mirrors the backend /api/juteSQC fabric-fault endpoints (single flat
// table, fault counts stored as a JSON-string array of 15 ints — NO detail table).
//
// ONE save = ONE inspected piece (one loom/cloth column): a header (entry_date,
// spell/shift, cloth quality, loom, date_of_weaving, remarks, inspector_name) + a
// FIXED 15-fault checklist of integer counts (most are 0). piece_total = sum(15).
// The DAY roll-up (by_date) is server-computed over all pieces for the date.
//
// quality = JUTE CLOTH items (item_type_id=5). loom = WEAVING machines.
// shift = spells. All three are nullable on the piece. Dates are 'YYYY-MM-DD'.

import { z } from "zod";

// ─── Fixed 15-fault checklist, FIXED ORDER (index 0..14) ──────────────────────
// Constant — there is NO master. The server returns these names in setup/by_date
// (fault_types) but the order/length is locked here so indexing never drifts.
export const FAULT_TYPES = [
	"Single Broken Warp",
	"Minor Gaw",
	"Major Gaw",
	"Minor Multiple Broken Warp",
	"Major Multiple Broken Warp",
	"Minor Float",
	"Major Float",
	"Mildew Stain",
	"Hole/Snarl",
	"Weft Bar Minor",
	"Curled Selvage",
	"Weft Bar Major",
	"Cut Selvage",
	"Loopy Selvage",
	"Smash",
] as const;

export const FAULT_COUNT = FAULT_TYPES.length; // 15

// ─── Master option shapes ─────────────────────────────────────────────────────

// A jute-cloth quality item (item_type_id=5). Reuses the beaming cloth picker.
export type ClothQuality = {
	item_id: number;
	item_code?: string | null;
	item_name: string;
};

// A weaving (Loom) machine option.
export type Loom = {
	machine_id: number;
	machine_name: string;
	mech_code?: string | null;
};

// A spell/shift option (de-duped by spell_code).
export type Spell = {
	spell_id: number;
	spell_code: string;
};

// ─── Setup payload ────────────────────────────────────────────────────────────
// GET fabric_fault_create_setup -> {data: {qualities, looms, spells, fault_types}}.
export type FabricFaultSetup = {
	qualities: ClothQuality[];
	looms: Loom[];
	spells: Spell[];
	fault_types: string[]; // 15 names (server echo; FAULT_TYPES is the locked source)
};

// ─── Saved piece (by-date read) ───────────────────────────────────────────────
export type FabricFaultPiece = {
	fabric_fault_id: number;
	spell_id?: number | null;
	spell_code?: string | null;
	item_id?: number | null;
	item_name?: string | null;
	loom_id?: number | null;
	loom_name?: string | null;
	mech_code?: string | null;
	date_of_weaving?: string | null;
	remarks?: string | null;
	inspector_name?: string | null;
	fault_counts: number[]; // length 15
	piece_total?: number | null;
};

// GET get_fabric_fault_by_date -> {data: {pieces, fault_types, fault_totals,
// fault_scores, grand_total, grand_score, pieces_inspected}}.
export type FabricFaultByDateResponse = {
	pieces: FabricFaultPiece[];
	fault_types: string[];
	fault_totals: number[]; // length 15
	fault_scores: number[]; // length 15
	grand_total: number;
	grand_score: number;
	pieces_inspected: number;
};

// ─── History row (paginated table) ────────────────────────────────────────────
// GET get_fabric_fault_table -> {data, total, page, page_size}.
export type FabricFaultHistoryRow = {
	fabric_fault_id?: number | null;
	entry_date?: string | null;
	item_name?: string | null;
	loom_name?: string | null;
	spell_code?: string | null;
	piece_total?: number | null;
	[key: string]: unknown;
};

export type FabricFaultTableResponse = {
	data: FabricFaultHistoryRow[];
	total: number;
	page: number;
	page_size: number;
};

// ─── Create payload (single inspected piece) ──────────────────────────────────
// POST create_fabric_fault -> {message, fabric_fault_id}.
export type FabricFaultCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	spell_id?: number;
	item_id?: number;
	loom_id?: number;
	date_of_weaving?: string;
	fault_counts: number[]; // exactly 15 ints >= 0
	remarks?: string;
	inspector_name?: string;
};

// ─── Zod schema ───────────────────────────────────────────────────────────────
// fault_counts: exactly 15, each an integer >= 0 (0 is the normal value — blanks
// are mapped to 0 by the form, NOT NaN). quality/loom/shift are nullable on the
// piece but the form normally selects them; the schema only enforces the counts.
export const fabricFaultCreateSchema = z.object({
	co_id: z.number().int().positive("A company must be selected"),
	branch_id: z.number().int().positive("A branch must be selected"),
	entry_date: z.string().min(1, "Entry date is required"),
	spell_id: z.number().int().positive().optional(),
	item_id: z.number().int().positive().optional(),
	loom_id: z.number().int().positive().optional(),
	date_of_weaving: z.string().optional(),
	fault_counts: z
		.array(z.number().int("Each fault count must be a whole number").min(0, "Counts cannot be negative"))
		.length(FAULT_COUNT, `Enter all ${FAULT_COUNT} fault counts`),
	remarks: z.string().optional(),
	inspector_name: z.string().optional(),
});

export type FabricFaultCreateFormValues = z.infer<typeof fabricFaultCreateSchema>;
