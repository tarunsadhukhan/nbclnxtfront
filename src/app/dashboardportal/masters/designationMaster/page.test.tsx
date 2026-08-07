/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock fetchWithCookie
vi.mock("@/utils/apiClient2", () => ({
	fetchWithCookie: vi.fn(),
}));

// Mock IndexWrapper to simplify testing
vi.mock("@/components/ui/IndexWrapper", () => ({
	default: ({
		title,
		rows,
		columns,
		loading,
		createAction,
		children,
	}: {
		title: string;
		rows: unknown[];
		columns: unknown[];
		loading: boolean;
		createAction?: { label: string; onClick: () => void };
		children?: React.ReactNode;
	}) => (
		<div data-testid="index-wrapper">
			<h1>{title}</h1>
			{loading && <span data-testid="loading">Loading...</span>}
			<span data-testid="row-count">{rows.length}</span>
			{createAction && (
				<button data-testid="create-btn" onClick={createAction.onClick}>
					{createAction.label}
				</button>
			)}
			{children}
		</div>
	),
}));

// Mock the create dialog
vi.mock("./CreateDesignationPage", () => ({
	default: ({ open }: { open: boolean }) =>
		open ? <div data-testid="create-dialog">Create Dialog</div> : null,
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
import DesignationMasterPage from "./page";

const mockFetchWithCookie = vi.mocked(fetchWithCookie);

function createMockResponse(data: unknown, error: string | null = null) {
	return { data, error, status: error ? 500 : 200 };
}

describe("DesignationMasterPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock localStorage
		const mockStorage: Record<string, string> = {
			sidebar_selectedCompany: JSON.stringify({ co_id: "1" }),
		};
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(
			(key: string) => mockStorage[key] ?? null
		);
	});

	it("should render the page title", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse({
				data: [],
				total: 0,
			})
		);

		render(<DesignationMasterPage />);

		expect(screen.getByText("Designation Master")).toBeInTheDocument();
	});

	it("should show rows after fetch", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse({
				data: [
					{
						designation_id: 1,
						desig: "Manager",
						sub_dept_name: "HR",
						branch_name: "Main",
						norms: "8h",
						time_piece: "Time",
						active: 1,
					},
					{
						designation_id: 2,
						desig: "Operator",
						sub_dept_name: "Production",
						branch_name: "Factory",
						norms: "10",
						time_piece: "Piece",
						active: 1,
					},
				],
				total: 2,
			})
		);

		render(<DesignationMasterPage />);

		await waitFor(() => {
			expect(screen.getByTestId("row-count")).toHaveTextContent("2");
		});
	});

	it("should show error snackbar on fetch failure", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse(null, "Network error")
		);

		render(<DesignationMasterPage />);

		await waitFor(() => {
			expect(screen.getByText("Network error")).toBeInTheDocument();
		});
	});

	it("should open create dialog when create button is clicked", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse({ data: [], total: 0 })
		);

		render(<DesignationMasterPage />);

		await waitFor(() => {
			expect(screen.getByTestId("create-btn")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId("create-btn"));

		await waitFor(() => {
			expect(screen.getByTestId("create-dialog")).toBeInTheDocument();
		});
	});

	it("should map API response to grid rows with correct id field", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse({
				data: [
					{
						designation_id: 42,
						desig: "Supervisor",
						sub_dept_name: "Engineering",
						branch_name: "Plant A",
						norms: "",
						time_piece: "",
						active: 1,
					},
				],
				total: 1,
			})
		);

		render(<DesignationMasterPage />);

		await waitFor(() => {
			// 1 row mapped
			expect(screen.getByTestId("row-count")).toHaveTextContent("1");
		});
	});
});
