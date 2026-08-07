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
vi.mock("./CreateCategoryPage", () => ({
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
import CategoryMasterPage from "./page";

const mockFetchWithCookie = vi.mocked(fetchWithCookie);

function createMockResponse(data: unknown, error: string | null = null) {
	return { data, error, status: error ? 500 : 200 };
}

describe("CategoryMasterPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

		render(<CategoryMasterPage />);

		expect(screen.getByText("Worker Category Master")).toBeInTheDocument();
	});

	it("should show rows after fetch", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse({
				data: [
					{
						cata_id: 1,
						cata_code: "CAT01",
						cata_desc: "Skilled",
						branch_name: "Main",
					},
					{
						cata_id: 2,
						cata_code: "CAT02",
						cata_desc: "Unskilled",
						branch_name: "Factory",
					},
				],
				total: 2,
			})
		);

		render(<CategoryMasterPage />);

		await waitFor(() => {
			expect(screen.getByTestId("row-count")).toHaveTextContent("2");
		});
	});

	it("should show 0 rows on empty response", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse({ data: [], total: 0 })
		);

		render(<CategoryMasterPage />);

		await waitFor(() => {
			expect(screen.getByTestId("row-count")).toHaveTextContent("0");
		});
	});

	it("should show create button", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse({ data: [], total: 0 })
		);

		render(<CategoryMasterPage />);

		expect(screen.getByTestId("create-btn")).toHaveTextContent("Create Category");
	});
});
