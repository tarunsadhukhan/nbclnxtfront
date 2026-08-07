// Types for the Spinning SQC screens (Speed/TPI Entry + Count Observations).
// Mirrors backend /api/juteSQC SQC endpoints. Backend returns floats already;
// dates are 'YYYY-MM-DD' strings.

export type SqcMachine = {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	branch_id?: number | null;
};

// A yarn item (item_mst, item_type_id=4) — the single yarn identity.
export type YarnItemOption = {
	item_id: number;
	item_code: string;
	item_name: string;
	// Standard count (jute_yarn_mst.jute_yarn_count).
	std_count?: number | null;
	// Standard moisture regain % (jute_yarn_mst.std_mr_pct) — feeds corrected count.
	std_mr_pct?: number | null;
};

export type SqcSpell = {
	spell_id: number;
	spell_code: string;
	spell_name: string;
};

// ─── Count Observations (Tab 2) ─────────────────────────────────────────────

export type SqcCountSetup = {
	machines: SqcMachine[];
	yarn_items: YarnItemOption[];
	spells: SqcSpell[];
	entries: SqcCountReadingRow[];
};

export type SqcCountReadingRow = {
	// Each row is a single observation/reading (multi-observation, not upsert).
	jute_sqc_spinning_count_id?: number;
	sqc_spinning_count_id?: number;
	id?: number;
	entry_date: string;
	spell_id?: number | null;
	spell_code?: string | null;
	spell_name?: string | null;
	mc_id?: number | null;
	machine_id?: number | null;
	machine_name?: string | null;
	mech_code?: string | null;
	item_id: number;
	item_code?: string | null;
	item_name?: string | null;
	std_mr_pct?: number | null;
	// R-08-16 raw inputs (DP/TP store-only; WT/450 + MR% feed the count calc).
	dp?: number | null;
	tp?: number | null;
	wt_450_gms?: number | null;
	mr_pct?: number | null;
	observed_count: number;
	corrected_count?: number | null;
};

export type SqcCountAverageRow = {
	item_id: number;
	item_code?: string | null;
	item_name?: string | null;
	avg_count: number;
	avg_corrected?: number | null;
};

export type SqcCountByDateResponse = {
	readings: SqcCountReadingRow[];
	averages: SqcCountAverageRow[];
};

// One row in the SPINNING_SQC_COUNT_SAVE payload.
// observed_count / corrected_count are sent as a preview; the server recomputes them.
export type SqcCountSavePayloadRow = {
	spell_id?: number | null;
	mc_id?: number | null;
	item_id: number;
	dp?: number | null;
	tp?: number | null;
	wt_450_gms?: number | null;
	mr_pct?: number | null;
	observed_count?: number | null;
	corrected_count?: number | null;
};

// ─── RHMR — Temperature / Humidity per date + spell (Tab 3) ──────────────────

export type SqcRhmrRow = {
	spinning_sqc_rhmr_id?: number;
	co_id?: number;
	branch_id?: number | null;
	entry_date: string; // 'YYYY-MM-DD'
	spell_id: number;
	spell_code?: string | null;
	spell_name?: string | null;
	temperature: number | null;
	humidity: number | null;
};

export type SqcRhmrSetup = {
	spells: SqcSpell[];
};

// POST SPINNING_SQC_RHMR_SAVE body. confirm=true overwrites an existing
// (date, spell) row; the first save without confirm returns SqcRhmrSaveResult.exists.
export type SqcRhmrSavePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	spell_id: number;
	temperature: number | null;
	humidity: number | null;
	confirm?: boolean;
};

export type SqcRhmrSaveResult = {
	saved?: number;
	mode?: "insert" | "update";
	exists?: boolean;
	existing?: {
		spinning_sqc_rhmr_id: number;
		temperature: number | null;
		humidity: number | null;
	};
};

// ─── R-08-15 Yarn QR & CV % (Tab 4) ─────────────────────────────────────────

// Per-yarn R-08-16 averages displayed as read-only context (read from saved R-08-16 values).
export type SqcYarnObs = {
	item_id: number;
	item_code?: string | null;
	item_name?: string | null;
	observed_count: number;   // AVG of R-08-16 observed_count
	mr_pct: number | null;    // AVG of R-08-16 mr_pct
	obs_count: number;        // # R-08-16 readings averaged
};

export type SqcQrCvSetup = {
	machines: SqcMachine[];
	yarn_items: YarnItemOption[];
	yarn_obs: SqcYarnObs[];
	groups: SqcQrCvGroup[];
};

export type SqcQrCvReading = { spindle_no: number; reading_no: number; reading_val: number | null };

export type SqcQrCvStats = {
	max: number | null; min: number | null; std_dev: number | null;
	avg_bs: number | null; qr_pct: number | null; cv_pct: number | null; n: number;
};

export type SqcQrCvGroup = {
	spinning_sqc_qr_cv_id?: number;
	entry_date: string;
	mc_id?: number | null;
	mech_code?: string | null;
	machine_name?: string | null;
	item_id: number;
	item_code?: string | null;
	item_name?: string | null;
	observed_count?: number | null;  // AVG of saved R-08-16 values (not stored in QR/CV)
	mr_pct?: number | null;          // AVG of saved R-08-16 values (not stored in QR/CV)
	readings: SqcQrCvReading[];
	stats?: SqcQrCvStats | null;
};

// POST sqc_qr_cv_save payload (no observed_count/mr_pct — server reads them from saved R-08-16)
export type SqcQrCvSpindlePayload = { spindle_no: number; readings: (number | null)[] };
export type SqcQrCvSavePayloadRow = {
	mc_id?: number | null;
	item_id: number;
	spindles: SqcQrCvSpindlePayload[];
};
export type SqcQrCvByDateResponse = { groups: SqcQrCvGroup[] };
