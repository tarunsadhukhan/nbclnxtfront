// Per-process display config for the Finishing Production pages.
// Drives the friendly titles, the input/prod UoM defaults sent to the backend,
// and the human labels for the captured params (qid standards/targets only).
//
// UoM defaults match the backend contract (finishing_entry.py):
//   damping     m    -> m
//   calendering m    -> m
//   lapping     m    -> roll
//   rolling     roll -> roll
//   cutting     m    -> pcs
//   hemming     pcs  -> bag
//   herackle    m    -> pcs
//   sacksewing  pcs  -> bag
//   balepress   bag  -> bale

import type { FinishingProcess } from "../types/finishingTypes";

export type FinishingProcessConfig = {
	process: FinishingProcess;
	title: string;
	subtitle: string;
	inputUom: string;
	prodUom: string;
	// Labour-based process: keyed by a worker (emp_code -> eb_id), NOT a machine.
	usesEmployee?: boolean;
};

export const FINISHING_PROCESS_CONFIG: Record<FinishingProcess, FinishingProcessConfig> = {
	damping: {
		process: "damping",
		title: "Damping Production",
		subtitle: "Moisten grey cloth before calendering — metres in, metres out.",
		inputUom: "m",
		prodUom: "m",
	},
	calendering: {
		process: "calendering",
		title: "Calendering Production",
		subtitle: "Finish hessian cloth (metres).",
		inputUom: "m",
		prodUom: "m",
	},
	lapping: {
		process: "lapping",
		title: "Lapping Production",
		subtitle: "Wind finished cloth into rolls — metres in, rolls out.",
		inputUom: "m",
		prodUom: "roll",
	},
	rolling: {
		process: "rolling",
		title: "Rolling Production",
		subtitle: "Roll finished hessian cloth.",
		inputUom: "roll",
		prodUom: "roll",
	},
	cutting: {
		process: "cutting",
		title: "Cutting Production",
		subtitle: "Cut calendered cloth into bag pieces — metres in, pieces out.",
		inputUom: "m",
		prodUom: "pcs",
	},
	hemming: {
		process: "hemming",
		title: "Hemming Production",
		subtitle: "Stitch pieces into finished bags — pieces in, bags out.",
		inputUom: "pcs",
		prodUom: "bag",
	},
	herackle: {
		process: "herackle",
		title: "Herackle Production",
		subtitle: "Herackle sacking cloth into pieces.",
		inputUom: "m",
		prodUom: "pcs",
	},
	sacksewing: {
		process: "sacksewing",
		title: "Sack Sewing Production",
		subtitle: "Sew pieces into finished bags — entered per worker (emp code), no machine.",
		inputUom: "pcs",
		prodUom: "bag",
		usesEmployee: true,
	},
	balepress: {
		process: "balepress",
		title: "Bale Press Production",
		subtitle: "Press finished bags into bales — bags in, bales out.",
		inputUom: "bag",
		prodUom: "bale",
	},
};

// Human labels for the captured qid params (standard/target roles only;
// BE contract constants.FINISHING_PARAMS). Unknown tokens fall back to the
// raw token, so this stays robust if the matrix gains a param.
export const PARAM_LABELS: Record<string, string> = {
	std_prod_yds: "Std Production (yds)",
	target_pcs: "Target Pcs",
	pcs_per_bundle: "Pcs / Bundle",
	bundles: "No. of Bundles",
	no_of_bales: "No. of Bales",
};

export function paramLabel(token: string): string {
	return PARAM_LABELS[token] ?? token;
}

// Local ISO-date helper (YYYY-MM-DD) — avoids the UTC shift of toISOString().
export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}
