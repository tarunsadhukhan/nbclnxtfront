// Fixed stoppage reasons (NOT a master table). The stored value is the lowercase
// `code`; the dropdown binds value-to-code (never value-to-label) so the persisted
// reason_code is guaranteed to be one of these four strings (SPEC §9).
export const STOPPAGE_REASONS = ["mechanical", "electrical", "labor", "other"] as const;

export type StoppageReasonCode = (typeof STOPPAGE_REASONS)[number];

// Display labels for the FE dropdown (visible text only — SPEC §9).
export const STOPPAGE_REASON_LABELS: Record<StoppageReasonCode, string> = {
	mechanical: "Mechanical",
	electrical: "Electrical",
	labor: "Labor",
	other: "Other",
};

export type StoppageMachine = {
	machine_id: number;
	machine_name: string;
	mech_code: string;
	machine_type_id: number;
	machine_type_name: string;
	dept_id: number;
	dept_name: string;
	branch_id: number | null;
};

export type StoppageSpellOption = {
	spell_id: number;
	spell_code: string;
	spell_name: string;
	working_hours: number;
};

export type StoppageReasonOption = {
	code: string;
	label: string;
};

export type StoppageSetup = {
	machines: StoppageMachine[];
	spells: StoppageSpellOption[];
	reasons: StoppageReasonOption[];
};

export type StoppageEntryRow = {
	stoppage_hours_id: number;
	tran_date: string;
	spell_id: number;
	spell_code: string;
	machine_id: number;
	machine_name: string;
	dept_id: number;
	dept_name: string;
	stoppage_hours: number;
	reason_code: string;
	remarks: string | null;
};
