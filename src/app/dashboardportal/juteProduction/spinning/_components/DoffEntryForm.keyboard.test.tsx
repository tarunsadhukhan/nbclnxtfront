/**
 * @vitest-environment jsdom
 *
 * Keyboard-only doff entry: Enter accepts an option ONLY when the filter left a
 * single match, then jumps to the next field. With 2+ matches Enter stays a
 * no-op (unchanged behaviour).
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import DoffEntryForm from "./DoffEntryForm";
import type { SpinningSetup } from "../types/spinningTypes";

vi.mock("@/utils/apiClient2", () => ({
	fetchWithCookie: vi.fn(async () => ({
		data: { data: { daily_doff_tbl_id: 1, net_weight: 20, tare_weight: 5 } },
		error: null,
	})),
}));
vi.mock("../hooks/useDoffMachinePrevState", () => ({
	useDoffMachinePrevState: () => ({
		state: { running_total_net: 0, next_doff_no: 1, tare: 5, mapped_item_id: null },
		loading: false,
	}),
}));

afterEach(cleanup);

const setup: SpinningSetup = {
	machines: [
		{ machine_id: 1, machine_name: "FRAME 48", mech_code: "48", branch_id: 2, bobbin_weight: 1 },
		{ machine_id: 2, machine_name: "FRAME 12", mech_code: "12", branch_id: 2, bobbin_weight: 1 },
		{ machine_id: 3, machine_name: "FRAME 13", mech_code: "13", branch_id: 2, bobbin_weight: 1 },
	],
	spells: [{ spell_id: 1, spell_code: "A", spell_name: "A", working_hours: 8 }],
	trollies: [
		{ trolly_id: 7, trolly_name: "T7", trolly_weight: 3, bucket_weight: 1 },
		{ trolly_id: 8, trolly_name: "T8", trolly_weight: 3, bucket_weight: 1 },
	],
	yarn_items: [
		{ item_id: 90, item_code: "Y1", item_name: "YARN ONE", std_count: null, std_mr_pct: null },
	],
};

function renderForm() {
	render(
		<DoffEntryForm
			coId="1"
			branchId={2}
			setup={setup}
			date="2026-08-01"
			spellId={1}
			editingEntry={null}
			onSaved={() => {}}
			onCancelEdit={() => {}}
		/>
	);
	return {
		machine: screen.getByLabelText("Machine") as HTMLInputElement,
		trolly: screen.getByLabelText("Trolly") as HTMLInputElement,
	};
}

describe("DoffEntryForm keyboard flow", () => {
	it("Enter accepts the only match and moves focus to the next field", () => {
		const { machine, trolly } = renderForm();
		machine.focus();
		fireEvent.change(machine, { target: { value: "48" } });
		fireEvent.keyDown(machine, { key: "Enter" });

		expect(machine.value).toContain("FRAME 48");
		expect(document.activeElement).toBe(trolly);
	});

	it("Enter does nothing while 2+ options still match", () => {
		const { machine } = renderForm();
		machine.focus();
		fireEvent.change(machine, { target: { value: "1" } }); // FRAME 12 + FRAME 13
		fireEvent.keyDown(machine, { key: "Enter" });

		expect(machine.value).toBe("1");
		expect(document.activeElement).toBe(machine);
	});
});
