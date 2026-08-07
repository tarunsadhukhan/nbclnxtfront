export type SpreaderMachine = {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	dept_id: number;
	dept_name?: string;
	branch_id?: number | null;
	wt_per_roll: number;
	spreader_machine_attr_id?: number | null;
};

export type SpreaderBin = {
	bin_id: number;
	bin_code: string;
	bin_no?: number | null;
	description?: string | null;
	branch_id?: number | null;
};

export type JuteItem = {
	item_id: number;
	item_code: string;
	item_name: string;
	item_grp_id: number;
	item_grp_name: string;
	item_type_id: number;
};

export type SpellOption = {
	code: string;
	label: string;
};

export type SpreaderSetup = {
	machines: SpreaderMachine[];
	bins: SpreaderBin[];
	items: JuteItem[];
	maturity_map: Record<string, number>;
	spells: SpellOption[];
};

export type BinStateWindow = {
	allowed: boolean;
	base_dt: string | null;
	allowed_end_dt: string | null;
	candidate_dt: string;
	reason: string;
} | null;

export type BinState = {
	active_grp: number | null;
	locked_item_id: number | null;
	window: BinStateWindow;
};

export type SpreaderEntryRow = {
	spreader_prod_entry_id: number;
	entry_id_grp: number;
	bin_id: number;
	bin_code: string;
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
	produced_kg: number;
	trolley_no: number | null;
	remarks: string | null;
};

export type SpreaderIssueRow = {
	spreader_roll_issue_id: number;
	entry_id_grp: number;
	issue_date: string;
	issue_time: number;
	issue_dt: string;
	spell: string;
	no_of_rolls: number;
	wt_per_roll: number;
	issued_kg: number;
	breaker_inter_no: string | null;
	remarks: string | null;
	bin_id: number | null;
	bin_code: string | null;
	item_id: number | null;
	item_name: string | null;
};

export type AvailableWeight = {
	wt_per_roll: number;
	produced_rolls: number;
	issued_rolls: number;
	available_rolls: number;
};

export type IssueAvailableWeightsResponse = {
	weights: AvailableWeight[];
	group: {
		item_id?: number;
		bin_id?: number;
		bin_code?: string;
		item_name?: string;
		first_entry_dt?: string;
	};
};

export type IssueBinOption = {
	bin_id: number;
	bin_code: string;
	entry_id_grp: number;
	item_id: number;
	item_name: string;
	current_rolls: number;
};

export type IssueSetup = {
	bins_with_stock: IssueBinOption[];
	spells: SpellOption[];
};

export type RollStockRow = {
	bin_id: number;
	bin_code: string;
	entry_id_grp: number;
	item_id: number;
	item_name: string;
	produced_rolls: number;
	issued_rolls: number;
	current_rolls: number;
	produced_kg: number;
	issued_kg: number;
	current_kg: number;
	current_mt: number;
	avg_entry_dt: string | null;
	maturity_hrs: number;
	target_maturity_hrs: number;
};

export type QualitySummaryRow = {
	item_id: number;
	item_name: string;
	closing_rolls: number;
	closing_kg: number;
	closing_mt: number;
};
