export type DrawingMachineOption = {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	dept_id: number;
	dept_name: string | null;
	branch_id: number | null;
	const_meter: number;
	meter_wrap_limit: number;
	mc_group: string | null;
	drawing_machine_attr_id: number | null;
};

export type DrawingSpellOption = {
	spell_code: string;
	spell_name: string;
	working_hours: number;
	starting_time: string;
	is_overnight: number;
};

export type DrawingSetup = {
	machines: DrawingMachineOption[];
	spells: DrawingSpellOption[];
};

export type DrawingEntryRow = {
	drawing_entry_id: number;
	co_id: number;
	branch_id: number | null;
	tran_date: string;
	spell: string;
	machine_id: number;
	mech_code: string | null;
	machine_name: string | null;
	const_meter: number;
	open_meter: number;
	close_meter: number;
	diff_meter: number;
	actual_eff: number;
	wrk_hours: number;
	remarks: string | null;
};

export type MachinePrevState = {
	already_entered: boolean;
	const_meter: number;
	open_meter: number;
	meter_wrap_limit: number;
	attr_configured: boolean;
};
