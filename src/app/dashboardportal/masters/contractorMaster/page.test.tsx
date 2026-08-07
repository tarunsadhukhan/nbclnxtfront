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
vi.mock("./CreateContractorPage", () => ({
	default: ({ open }: { open: boolean }) =>
		open ? <div data-testid="create-dialog">Create Dialog</div> : null,
}));

import { fetchWithCookie } from "@/utils/apiClient2";
import ContractorMasterPage from "./page";

const mockFetchWithCookie = vi.mocked(fetchWithCookie);

function createMockResponse(data: unknown, error: string | null = null) {
	return { data, error, status: error ? 500 : 200 };
}

describe("ContractorMasterPage", () => {
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

		render(<ContractorMasterPage />);

		expect(screen.getByText("Contractor Master")).toBeInTheDocument();
	});

	it("should show loading state initially", () => {
		mockFetchWithCookie.mockReturnValue(new Promise(() => {}));
		render(<ContractorMasterPage />);

		expect(screen.getByTestId("loading")).toBeInTheDocument();
	});

	it("should render rows after fetch", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse({
				data: [
					{
						cont_id: 1,
						contractor_name: "ABC Contractors",
						phone_no: "1234567890",
						email_id: "abc@test.com",
						pan_no: "ABCDE1234F",
						branch_name: "Main",
					},
					{
						cont_id: 2,
						contractor_name: "XYZ Services",
						phone_no: "9876543210",
						email_id: "xyz@test.com",
						pan_no: "XYZAB5678G",
						branch_name: "Branch2",
					},
				],
				total: 2,
			})
		);

		render(<ContractorMasterPage />);

		await waitFor(() => {
			expect(screen.getByTestId("row-count").textContent).toBe("2");
		});
	});

	it("should show create button", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse({ data: [], total: 0 })
		);

		render(<ContractorMasterPage />);

		expect(screen.getByTestId("create-btn")).toBeInTheDocument();
		expect(screen.getByText("Create Contractor")).toBeInTheDocument();
	});

	it("should handle API error gracefully", async () => {
		mockFetchWithCookie.mockResolvedValueOnce(
			createMockResponse(null, "Network error")
		);

		render(<ContractorMasterPage />);

		await waitFor(() => {
			expect(screen.getByTestId("row-count").textContent).toBe("0");
		});
	});
});
