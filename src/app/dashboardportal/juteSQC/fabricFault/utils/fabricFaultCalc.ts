// Client-side helpers for R-08-28 Fabric Fault (weaving woven-cloth defect tally).
// The server recomputes everything on save/read and is AUTHORITATIVE; these only
// reproduce the math for live display (piece total preview + day matrix sanity).
//
// piece_total  = sum of the 15 fault counts
// DAY roll-up over N pieces (by_date):
//   fault_total[i] = sum over pieces of fault_counts[i]
//   fault_score[i] = fault_total[i] / N
//   grand_total    = sum of all fault_totals (= sum of piece_totals)
//   grand_score    = grand_total / N
// (NO std, NO CV%, NO correction — counting/scoring only.)

import { FAULT_COUNT } from "../types/fabricFaultTypes";

// Sum of one piece's 15 counts. Non-finite entries count as 0.
export function pieceTotal(counts: number[]): number {
	return counts.reduce((a, b) => a + (Number.isFinite(b) ? Number(b) : 0), 0);
}

export type DayRollup = {
	fault_totals: number[]; // length 15
	fault_scores: number[]; // length 15
	grand_total: number;
	grand_score: number;
	pieces_inspected: number;
};

// Roll up the day's pieces (each a 15-length count array) into per-fault totals +
// scores and a grand total/score. Mirrors the server so the grid can fall back to
// a client compute and the self-check below can lock the verified example.
export function dayRollup(pieceCounts: number[][]): DayRollup {
	const n = pieceCounts.length;
	const fault_totals = Array(FAULT_COUNT).fill(0);
	for (const counts of pieceCounts) {
		for (let i = 0; i < FAULT_COUNT; i++) {
			fault_totals[i] += Number.isFinite(counts[i]) ? Number(counts[i]) : 0;
		}
	}
	const fault_scores = fault_totals.map((t) => (n > 0 ? t / n : 0));
	const grand_total = fault_totals.reduce((a, b) => a + b, 0);
	const grand_score = n > 0 ? grand_total / n : 0;
	return { fault_totals, fault_scores, grand_total, grand_score, pieces_inspected: n };
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}

// ponytail: tiny self-check guards the only non-trivial logic (piece total + day
// roll-up). Runs once on import in dev; a no-op in production. Locks the verified
// example. console.assert flags (does not throw) if the math drifts.
if (process.env.NODE_ENV !== "production") {
	// Piece: Minor Gaw(idx1)=13, Major Float(idx6)=1, Minor Float(idx5)=3, rest 0 -> 17.
	const piece = Array(FAULT_COUNT).fill(0);
	piece[1] = 13;
	piece[6] = 1;
	piece[5] = 3;
	console.assert(pieceTotal(piece) === 17, `fabricFaultCalc piece total self-check failed: ${pieceTotal(piece)}`);

	// Day Minor-Gaw row (16 pieces, only idx1 populated) -> fault_total 93, score 5.8125;
	// grand_total 118, grand_score 7.375. Build 16 pieces with idx1 set; spread the
	// remaining 25 (=118-93) onto idx0 so the grand totals also hit the locked numbers.
	const minorGawRow = [3, 13, 5, 5, 4, 7, 8, 4, 11, 3, 9, 3, 3, 8, 3, 4];
	const pieces16: number[][] = minorGawRow.map((v) => {
		const p = Array(FAULT_COUNT).fill(0);
		p[1] = v;
		return p;
	});
	pieces16[0][0] = 25;
	const roll = dayRollup(pieces16);
	console.assert(
		roll.fault_totals[1] === 93 && roll.fault_scores[1] === 5.8125,
		`fabricFaultCalc Minor-Gaw row self-check failed: total ${roll.fault_totals[1]} score ${roll.fault_scores[1]}`,
	);
	console.assert(
		roll.grand_total === 118 && roll.grand_score === 7.375 && roll.pieces_inspected === 16,
		`fabricFaultCalc grand self-check failed: total ${roll.grand_total} score ${roll.grand_score} n ${roll.pieces_inspected}`,
	);
}
