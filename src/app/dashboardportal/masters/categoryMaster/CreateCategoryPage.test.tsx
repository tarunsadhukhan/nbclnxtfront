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
import CreateCategoryPage from "./CreateCategoryPage";

const mockFetchWithCookie = vi.mocked(fetchWithCookie);

function createMockResponse(data: unknown, error: string | null = null) {
	return { data, error, status: error ? 500 : 200 };
}

const mockSetup = {
	branches: [
		{ branch_id: 10, branch_name: "Main" },
		{ branch_id: 20, branch_name: "Factory" },
	],
};

const mockRecord = {
	data: {
		cata_id: 1,
		cata_code: "CAT01",
		cata_desc: "Skilled",
		branch_id: 10,
	},
};

describe("CreateCategoryPage", () => {
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

		render(<CreateCategoryPage {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByTestId("form-mode")).toHaveTextContent("create");
		});

		expect(screen.getByTestId("field-cata_code")).toHaveTextContent("");
		expect(screen.getByTestId("field-cata_desc")).toHaveTextContent("");
	});

	it("should render in edit mode with pre-filled values", async () => {
		mockFetchWithCookie
			.mockResolvedValueOnce(createMockResponse(mockSetup))
			.mockResolvedValueOnce(createMockResponse(mockRecord));

		render(
			<CreateCategoryPage {...defaultProps} editId={1} />
		);

		await waitFor(() => {
			expect(screen.getByTestId("field-cata_code")).toHaveTextContent("CAT01");
		});

		expect(screen.getByTestId("form-mode")).toHaveTextContent("edit");
		expect(screen.getByTestId("field-cata_desc")).toHaveTextContent("Skilled");
	});

	it("should always open in edit mode with editId", async () => {
		mockFetchWithCookie
			.mockResolvedValueOnce(createMockResponse(mockSetup))
			.mockResolvedValueOnce(createMockResponse(mockRecord));

		render(
			<CreateCategoryPage {...defaultProps} editId={1} />
		);

		await waitFor(() => {
			expect(screen.getByTestId("form-mode")).toHaveTextContent("edit");
		});
	});

	it("should render 3 form fields", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockSetup));

		render(<CreateCategoryPage {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByTestId("form-title")).toHaveTextContent("3 fields");
		});
	});

	it("should not render form when closed", () => {
		render(<CreateCategoryPage {...defaultProps} open={false} />);
		expect(screen.queryByTestId("mui-form")).not.toBeInTheDocument();
	});
});
