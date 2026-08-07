export type MaturityReportRow = {
	spreader_roll_issue_id: number;
	entry_id_grp: number;
	issue_date: string;
	issue_time: number;
	issue_spell: string;
	issue_rolls: number;
	wt_per_roll: number;
	issue_dt: string;
	bin_id: number | null;
	bin_code: string | null;
	item_id: number | null;
	item_name: string | null;
	prod_entry_date: string | null;
	prod_entry_time: number | null;
	prod_entry_dt: string | null;
	prod_rolls: number | null;
	maturity_hrs: number | null;
	target_maturity_hrs: number;
};

export type PivotRow = {
	entity_id: number;
	entity_name: string;
	A1: number;
	A2: number;
	B1: number;
	B2: number;
	C: number;
	A: number;
	B: number;
	Total: number;
};

export type SpreaderProductionRow = {
	spreader_prod_entry_id: number;
	entry_date: string;
	entry_time: number;
	entry_dt: string;
	spell: string;
	machine_id: number;
	machine_name: string;
	mech_code: string;
	item_id: number;
	item_name: string;
	no_of_rolls: number;
	wt_per_roll: number;
	weight_kg: number;
	shift: string;
};

export type ProductionSummaryResponse = {
	rows: SpreaderProductionRow[];
	spreader_pivot: PivotRow[];
	quality_pivot: PivotRow[];
	totals: {
		rolls: number;
		weight_kg: number;
		weight_mt: number;
		unique_spreaders: number;
		unique_items: number;
	};
};
