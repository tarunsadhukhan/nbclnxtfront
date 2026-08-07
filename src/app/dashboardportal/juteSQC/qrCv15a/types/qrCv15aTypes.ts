// Types for R-08-15A Yarn QR% & CV% (Special Purpose) SQC.
// Header + flat 12-reading group, mirrors backend /api/juteSQC qr_cv_15a_* endpoints.
// Backend returns floats already; entry_date is a 'YYYY-MM-DD' string.

// READING_COUNT readings per group; the grid is flat (not spindle-blocked).
export const READING_COUNT = 12;

// A machine option (3rd Drawing Frame / Spinning Frame both come from setup.machines).
export type QrCv15aMachine = {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	branch_id?: number | null;
};

// A yarn item (item_mst) — the yarn quality identity.
export type QrCv15aYarnItem = {
	item_id: number;
	item_code: string;
	item_name: string;
};

export type QrCv15aStats = {
	avg_bs: number | null;
	max: number | null;
	min: number | null;
	std_dev: number | null;
	qr_pct: number | null;
	cv_pct: number | null;
	qr_at_min: number | null;
	n: number;
};

export type QrCv15aGroup = {
	qr_cv_15a_id?: number;
	entry_date: string;
	drawing_mc_id?: number | null;
	drawing_mech_code?: string | null;
	drawing_machine_name?: string | null;
	mc_id?: number | null;
	mech_code?: string | null;
	machine_name?: string | null;
	item_id: number;
	item_code?: string | null;
	item_name?: string | null;
	observed_count?: number | null; // operator-entered header field
	mr_pct?: number | null;         // operator-entered header field
	readings: (number | null)[];    // flat, length READING_COUNT
	stats?: QrCv15aStats | null;
};

export type QrCv15aSetup = {
	machines: QrCv15aMachine[];
	yarn_items: QrCv15aYarnItem[];
	groups: QrCv15aGroup[];
};

// One row in the QR_CV_15A_SQC_SAVE payload (server recomputes all stats).
export type QrCv15aSavePayloadRow = {
	drawing_mc_id: number;
	mc_id: number;
	item_id: number;
	observed_count: number;
	mr_pct: number | null;
	readings: (number | null)[]; // length READING_COUNT
};

export type QrCv15aByDateResponse = { groups: QrCv15aGroup[] };
