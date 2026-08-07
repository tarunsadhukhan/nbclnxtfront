
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InventorySearchTable } from "../InventorySearchTable";
import * as issueService from "@/utils/issueService";

// Mock the issueService
vi.mock("@/utils/issueService", () => ({
	fetchInventoryList: vi.fn(),
}));

const mockInventoryData: issueService.InventoryListItem[] = [
	{
		inward_dtl_id: 1,
		inward_id: 100,
		inward_sequence_no: 1,
		sr_no: "XX/F/SR/2025-2026/1",
		inward_date: "2025-01-01",
		branch_id: 10,
		branch_name: "Branch 1",
		item_id: 10,
		item_code: "ITEM001",
		item_name: "Test Item 1",
		item_grp_id: 1,
		item_grp_name: "Group A",
		uom_id: 1,
		uom_name: "KG",
		approved_qty: 100.0,
		issue_qty: 50.0,
		available_qty: 50.0,
		rate: 100.0,
		warehouse_id: 1,
		warehouse_name: "Warehouse 1",
	},
	{
		inward_dtl_id: 2,
		inward_id: 100,
		inward_sequence_no: 2,
		sr_no: "XX/F/SR/2025-2026/1",
		inward_date: "2025-01-01",
		branch_id: 10,
		branch_name: "Branch 1",
		item_id: 11,
		item_code: "ITEM002",
		item_name: "Test Item 2",
		item_grp_id: 2,
		item_grp_name: "Group B",
		uom_id: 2,
		uom_name: "PCS",
		approved_qty: 150.0,
		issue_qty: 50.0,
		available_qty: 100.0,
		rate: 50.0,
		warehouse_id: 1,
		warehouse_name: "Warehouse 1",
	},
];

const SEARCH_PLACEHOLDER = "Search by item, group, or SR no...";

describe("InventorySearchTable", () => {
	const mockOnInsertItems = vi.fn();
	const defaultProps = {
		coId: "1",
		branchId: "10",
		disabled: false,
		onInsertItems: mockOnInsertItems,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(issueService.fetchInventoryList as Mock).mockResolvedValue({
			data: mockInventoryData,
			total: 2,
		});
	});

	// Helpers: open the dialog, type a search term, submit via the Search button
	const openDialog = () => {
		fireEvent.click(screen.getByRole("button", { name: /Add from Inventory/ }));
	};
	const typeSearch = (value: string) => {
		fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), {
			target: { value },
		});
	};
	const submitSearch = (value: string) => {
		typeSearch(value);
		fireEvent.click(screen.getByRole("button", { name: "Search" }));
	};

	describe("Trigger", () => {
		it("should render the 'Add from Inventory' trigger button", () => {
			render(<InventorySearchTable {...defaultProps} />);
			expect(
				screen.getByRole("button", { name: /Add from Inventory/ })
			).toBeInTheDocument();
		});

		it("should disable the trigger when branchId is empty", () => {
			render(<InventorySearchTable {...defaultProps} branchId="" />);
			expect(
				screen.getByRole("button", { name: /Add from Inventory/ })
			).toBeDisabled();
		});

		it("should disable the trigger when disabled", () => {
			render(<InventorySearchTable {...defaultProps} disabled />);
			expect(
				screen.getByRole("button", { name: /Add from Inventory/ })
			).toBeDisabled();
		});

		it("should not show the dialog until the trigger is clicked", () => {
			render(<InventorySearchTable {...defaultProps} />);
			expect(screen.queryByText("Available Inventory")).not.toBeInTheDocument();

			openDialog();
			expect(screen.getByText("Available Inventory")).toBeInTheDocument();
			expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
		});
	});

	describe("Search-only fetching", () => {
		it("should NOT fetch when the dialog opens with no search term", async () => {
			render(<InventorySearchTable {...defaultProps} />);
			openDialog();

			// Give time for any async operations
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(issueService.fetchInventoryList).not.toHaveBeenCalled();
			expect(
				screen.getByText("Type a search term and press Search.")
			).toBeInTheDocument();
		});

		it("should NOT fetch while the user is typing (only on Search click)", async () => {
			render(<InventorySearchTable {...defaultProps} />);
			openDialog();
			typeSearch("test");

			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(issueService.fetchInventoryList).not.toHaveBeenCalled();
		});

		it("should fetch with the search term when Search is clicked", async () => {
			render(<InventorySearchTable {...defaultProps} />);
			openDialog();
			submitSearch("test");

			await waitFor(() => {
				expect(issueService.fetchInventoryList).toHaveBeenCalledWith("1", {
					branchId: "10",
					page: 1,
					limit: 10,
					search: "test",
				});
			});
		});

		it("should fetch when Enter is pressed in the search field", async () => {
			render(<InventorySearchTable {...defaultProps} />);
			openDialog();
			typeSearch("test");
			fireEvent.keyDown(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), {
				key: "Enter",
			});

			await waitFor(() => {
				expect(issueService.fetchInventoryList).toHaveBeenCalledWith("1", {
					branchId: "10",
					page: 1,
					limit: 10,
					search: "test",
				});
			});
		});

		it("should render inventory rows after a search", async () => {
			render(<InventorySearchTable {...defaultProps} />);
			openDialog();
			submitSearch("item");

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});
			expect(screen.getByText("Test Item 2")).toBeInTheDocument();
			expect(screen.getByText("ITEM001")).toBeInTheDocument();
			expect(screen.getByText("Group A")).toBeInTheDocument();
		});

		it("should show the no-match message when a search returns nothing", async () => {
			(issueService.fetchInventoryList as Mock).mockResolvedValue({
				data: [],
				total: 0,
			});

			render(<InventorySearchTable {...defaultProps} />);
			openDialog();
			submitSearch("nonexistent");

			await waitFor(() => {
				expect(
					screen.getByText("No items match your search.")
				).toBeInTheDocument();
			});
		});

		it("should show an error message on fetch failure", async () => {
			(issueService.fetchInventoryList as Mock).mockRejectedValue(
				new Error("Network error")
			);

			render(<InventorySearchTable {...defaultProps} />);
			openDialog();
			submitSearch("item");

			await waitFor(() => {
				expect(screen.getByText("Network error")).toBeInTheDocument();
			});
		});
	});

	describe("Add action", () => {
		it("should call onInsertItems with the single row when its Add button is clicked", async () => {
			render(<InventorySearchTable {...defaultProps} />);
			openDialog();
			submitSearch("item");

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			// Each row's Add button has a per-row accessible name "Add <item> to issue"
			const addButtons = screen.getAllByRole("button", { name: /to issue$/ });
			expect(addButtons).toHaveLength(2);

			fireEvent.click(addButtons[0]);
			expect(mockOnInsertItems).toHaveBeenCalledWith([mockInventoryData[0]]);

			fireEvent.click(addButtons[1]);
			expect(mockOnInsertItems).toHaveBeenCalledWith([mockInventoryData[1]]);
		});

		it("should show already-added rows as a disabled 'Added' button", async () => {
			render(
				<InventorySearchTable
					{...defaultProps}
					addedInwardDtlIds={new Set(["1"])}
				/>
			);
			openDialog();
			submitSearch("item");

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			// Row 1 (inward_dtl_id 1) is already on the issue → disabled "Added"
			const added = screen.getByRole("button", { name: /already added/ });
			expect(added).toBeDisabled();

			// Row 2 is still addable
			expect(
				screen.getByRole("button", { name: /Test Item 2 to issue/ })
			).toBeEnabled();
		});
	});

	describe("Disabled state", () => {
		it("should keep the trigger disabled so the dialog cannot open", () => {
			render(<InventorySearchTable {...defaultProps} disabled />);
			expect(
				screen.getByRole("button", { name: /Add from Inventory/ })
			).toBeDisabled();
			expect(screen.queryByText("Available Inventory")).not.toBeInTheDocument();
		});
	});

	describe("Pagination", () => {
		it("should not show pagination when total is within one page", async () => {
			render(<InventorySearchTable {...defaultProps} />);
			openDialog();
			submitSearch("item");

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});
			expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
		});

		it("should show pagination when total exceeds the page size", async () => {
			(issueService.fetchInventoryList as Mock).mockResolvedValue({
				data: mockInventoryData,
				total: 25,
			});

			render(<InventorySearchTable {...defaultProps} />);
			openDialog();
			submitSearch("item");

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});
			expect(screen.getByRole("navigation")).toBeInTheDocument();
			expect(
				screen.getByText(/Showing 1 to 10 of 25 items/)
			).toBeInTheDocument();
		});
	});

	describe("Null handling", () => {
		it("should render '-' for null values", async () => {
			const mockDataWithNulls = [
				{
					inward_dtl_id: 1,
					inward_id: 100,
					inward_sequence_no: 1,
					sr_no: null,
					inward_date: null,
					branch_id: 10,
					branch_name: null,
					item_id: 10,
					item_code: null,
					item_name: null,
					item_grp_id: 1,
					item_grp_name: null,
					uom_id: 1,
					uom_name: null,
					approved_qty: null,
					issue_qty: null,
					available_qty: null,
					rate: null,
					warehouse_id: 1,
					warehouse_name: null,
				} as unknown as issueService.InventoryListItem,
			];

			(issueService.fetchInventoryList as Mock).mockResolvedValue({
				data: mockDataWithNulls,
				total: 1,
			});

			render(<InventorySearchTable {...defaultProps} />);
			openDialog();
			submitSearch("x");

			await waitFor(() => {
				const dashes = screen.getAllByText("-");
				expect(dashes.length).toBeGreaterThan(0);
			});
		});
	});
});
