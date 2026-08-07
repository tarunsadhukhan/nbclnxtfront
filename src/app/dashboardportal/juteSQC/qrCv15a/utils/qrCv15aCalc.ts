// Client-side live preview for R-08-15A Yarn QR% & CV% (Special Purpose).
// The server recomputes and persists every stat on save and is AUTHORITATIVE;
// this only reproduces the math so the inspector sees the numbers before saving.
// Reuses sampleStdDev + todayISO from the spinning production calc (single source).

import { sampleStdDev, todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";

export { todayISO };

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

export type QrCv15aPreview = {
	avgBs: number | null;
	max: number | null;
	min: number | null;
	stdDev: number | null;
	qrPct: number | null;
	cvPct: number | null;
	qrAtMin: number | null;
	n: number;
};

// Compute the live preview from the reading strings + operator-entered obs count.
// Blank/non-numeric readings are dropped (server stores NULL for them).
//   QR%       = avg_bs / obs_count * 100
//   CV%       = std_dev / QR% * 100
//   QR%@min   = min / obs_count * 100
export function computePreview(
	readingStrings: string[],
	observedCount: number | null,
): QrCv15aPreview {
	const nums = readingStrings
		.filter((r) => r !== "")
		.map((r) => Number(r))
		.filter((n) => Number.isFinite(n));

	const n = nums.length;
	const avgBs = n > 0 ? nums.reduce((a, v) => a + v, 0) / n : null;
	const max = n > 0 ? Math.max(...nums) : null;
	const min = n > 0 ? Math.min(...nums) : null;
	const stdDev = sampleStdDev(nums);

	const obsUsable = observedCount != null && observedCount !== 0 ? observedCount : null;
	const qrPct = avgBs != null && obsUsable != null ? (avgBs / obsUsable) * 100 : null;
	const cvPct = stdDev != null && qrPct != null && qrPct !== 0 ? (stdDev / qrPct) * 100 : null;
	const qrAtMin = min != null && obsUsable != null ? (min / obsUsable) * 100 : null;

	return {
		avgBs: avgBs != null ? round2(avgBs) : null,
		max: max != null ? round2(max) : null,
		min: min != null ? round2(min) : null,
		stdDev: stdDev != null ? round2(stdDev) : null,
		qrPct: qrPct != null ? round2(qrPct) : null,
		cvPct: cvPct != null ? round2(cvPct) : null,
		qrAtMin: qrAtMin != null ? round2(qrAtMin) : null,
		n,
	};
}
