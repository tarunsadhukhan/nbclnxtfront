/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock fetchWithCookie
vi.mock("@/utils/apiClient2", () => ({
	fetchWithCookie: vi.fn(),
}));

// Mock MuiForm
vi.mock("@/components/ui/muiform", () => ({
	MuiForm: ({
		schema,
		mode,
		initialValues,
	}: {
		schema: { fields: Array<{ name: string; label: string }> };
		mode: string;
		initialValues: Record<string, unknown>;
	}) => (
		<div data-testid="mui-form">
			<span data-testid="form-mode">{mode}</span>
			<span data-testid="form-title">{schema.fields.length} fields</span>
			{Object.entries(initialValues).map(([k, v]) => (
				<span key={k} data-testid={`field-${k}`}>
					{String(v)}
				</span>
			))}
		</div>
	),
}));

// Mock sidebarContext — stable reference to avoid infinite useCallback/useEffect re-runs
const { stableSelectedBranches } = vi.hoisted(() => ({
	stableSelectedBranches: [10] as number[],
}));
vi.mock("@/components/dashboard/sidebarContext", () => ({
	useSidebarContext: () => ({
		selectedBranches: stableSelectedBranches,
	}),
}));

import { fetchWithCookie } from "@/utils/apiClient2";
import CreateDesignationPage from "./CreateDesignationPage";

const mockFetchWithCookie = vi.mocked(fetchWithCookie);

function createMockResponse(data: unknown, error: string | null = null) {
	return { data, error, status: error ? 500 : 200 };
}

const mockSetup = {
	sub_departments: [
		{ sub_dept_id: 1, sub_dept_desc: "Production", sub_dept_display: "Production (Manufacturing)" },
		{ sub_dept_id: 2, sub_dept_desc: "Engineering", sub_dept_display: "Engineering (Technical)" },
	],
	branches: [
		{ branch_id: 10, branch_name: "Main" },
		{ branch_id: 20, branch_name: "Factory" },
	],
	machine_types: [
		{ machine_type_id: 3, machine_type_name: "Spreader" },
		{ machine_type_id: 5, machine_type_name: "Spinning" },
	],
};

const mockRecord = {
	data: {
		designation_id: 1,
		desig: "Manager",
		dept_id: 1,
		branch_id: 10,
		norms: "8h",
		time_piece: "Time",
		direct_indirect: "D",
		on_machine: "No",
		machine_type: "",
		no_of_machines: "",
		cost_code: "CC01",
		cost_description: "Cost Center 01",
		piece_rate_type: "",
	},
};

describe("CreateDesignationPage", () => {
	const defaultProps = {
		open: true,
		onClose: vi.fn(),
		onSaved: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		const mockStorage: Record<string, string> = {
			sidebar_selectedCompany: JSON.stringify({ co_id: "1" }),
		};
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(
			(key: string) => mockStorage[key] ?? null
		);
	});

	it("should render in create mode with empty fields", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockSetup));

		render(<CreateDesignationPage {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByTestId("mui-form")).toBeInTheDocument();
		});

		expect(screen.getByTestId("form-mode")).toHaveTextContent("create");
		expect(screen.getByTestId("field-desig")).toHaveTextContent("");
	});

	it("should render in edit mode with pre-populated fields", async () => {
		mockFetchWithCookie
			.mockResolvedValueOnce(createMockResponse(mockSetup))
			.mockResolvedValueOnce(createMockResponse(mockRecord));

		render(
			<CreateDesignationPage
				{...defaultProps}
				editId={1}
			/>
		);

		await waitFor(() => {
			expect(screen.getByTestId("mui-form")).toBeInTheDocument();
		});

		expect(screen.getByTestId("form-mode")).toHaveTextContent("edit");
		expect(screen.getByTestId("field-desig")).toHaveTextContent("Manager");
		expect(screen.getByTestId("field-dept_id")).toHaveTextContent("1");
		expect(screen.getByTestId("field-branch_id")).toHaveTextContent("10");
	});

	it("should render in edit mode when editId is provided", async () => {
		mockFetchWithCookie
			.mockResolvedValueOnce(createMockResponse(mockSetup))
			.mockResolvedValueOnce(createMockResponse(mockRecord));

		render(
			<CreateDesignationPage
				{...defaultProps}
				editId={1}
			/>
		);

		await waitFor(() => {
			expect(screen.getByTestId("mui-form")).toBeInTheDocument();
		});

		expect(screen.getByTestId("form-mode")).toHaveTextContent("edit");
	});

	it("should show loading spinner while setup is loading", () => {
		mockFetchWithCookie.mockReturnValueOnce(new Promise(() => {}));

		render(<CreateDesignationPage {...defaultProps} />);

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should show error snackbar on setup failure", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse(null, "Setup failed")
		);

		render(<CreateDesignationPage {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText("Setup failed")).toBeInTheDocument();
		});
	});

	it("should not render dialog when open is false", () => {
		render(<CreateDesignationPage {...defaultProps} open={false} />);

		expect(screen.queryByTestId("mui-form")).not.toBeInTheDocument();
	});

	it("should have 12 form fields in schema", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockSetup));

		render(<CreateDesignationPage {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByTestId("form-title")).toHaveTextContent("12 fields");
		});
	});
});
