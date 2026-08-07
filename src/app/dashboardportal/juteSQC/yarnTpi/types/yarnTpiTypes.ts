// Types for R-08-17 Yarn TPI & TPI CV% (Spinning SQC). A test = a header
// (Spinning Frame / Yarn quality / Count / STD.TPI / TP / Prepared by) plus a
// 20-cell TPI reading grid. Mirrors backend /api/juteSQC yarn_tpi_* endpoints.
// Backend returns floats already; dates are 'YYYY-MM-DD' strings.

export type YarnTpiMachine = {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	branch_id?: number | null;
};

// A yarn item (item_mst) — the yarn identity for a TPI test.
export type YarnTpiItem = {
	item_id: number;
	item_code: string;
	item_name: string;
};

// A jute quality/group option (header "Yarn quality" grouping fallback).
export type YarnTpiGroupOption = {
	id: number;
	name: string;
};

export type YarnTpiSetup = {
	machines: YarnTpiMachine[];
	yarn_items: YarnTpiItem[];
	groups: YarnTpiGroupOption[];
};

// Server-computed stats for one saved test. Server is authoritative; the form
// shows a live preview of the same numbers before save.
export type YarnTpiStats = {
	avg_tpi: number | null;
	std_dev: number | null;
	cv_pct: number | null;
	min_tpi: number | null;
	max_tpi: number | null;
	n: number;
	std_tpi: number | null;
	tpi_diff: number | null; // avg_tpi - std_tpi
};

// One saved test (header + readings + stats) as returned by yarn_tpi_by_date.
export type YarnTpiGroup = {
	yarn_tpi_id?: number;
	entry_date: string;
	mc_id?: number | null;
	machine_name?: string | null;
	mech_code?: string | null;
	item_id: number;
	item_code?: string | null;
	item_name?: string | null;
	count_lbs?: number | null;
	std_tpi?: number | null;
	tp_value?: number | null;
	prepared_by?: string | null;
	readings: (number | null)[]; // up to 20, trailing-blank allowed
	stats?: YarnTpiStats | null;
};

// One row in the YARN_TPI_SQC_SAVE payload (a single test).
export type YarnTpiSavePayloadRow = {
	mc_id: number;
	item_id: number;
	count_lbs: number | null;
	std_tpi: number | null;
	tp_value: number | null;
	prepared_by: string | null;
	readings: (number | null)[]; // 20 cells, blanks sent as null
};

export type YarnTpiByDateResponse = { groups: YarnTpiGroup[] };
