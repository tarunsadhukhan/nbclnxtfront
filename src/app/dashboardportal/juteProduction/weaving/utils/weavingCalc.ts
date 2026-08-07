// Client-side jugar preview mirrors the backend weaving rules (SPEC §3, revised 2026-06-30).
// The server / Process step recomputes all derived values and is AUTHORITATIVE — this is a
// display-only preview. Only totalJugar lives here: the old productionYds / productionKg /
// stdProdYds / efficiency previews were DELETED because they drifted from the BE (stdProdYds
// divided by eff_picks while the BE uses std_picks) — do not resurrect them; read the
// server-computed planning grid instead.

// totalJugar(cuts, jc, oj, cj, adj) = cuts·jc + cj − oj − adj (SPEC §3, revised).
// jc = no_of_jugar_per_cut, oj = open_jugar (last available close), cj = closing jugar
// (operator input), adj = adjustment jugar (less_production, 0 when not applicable).
// Straight count — no wrap, no clamp; may go NEGATIVE (closing < opening with no beam
// change). Returns 0 when jc is falsy/non-positive.
export function totalJugar(cuts: number, jc: number, oj: number, cj: number, adj = 0): number {
	const j = Number(jc);
	if (!j || j <= 0) return 0;
	return Number(cuts) * j + (Number(cj) || 0) - (Number(oj) || 0) - (Number(adj) || 0);
}

export function todayISO(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}
