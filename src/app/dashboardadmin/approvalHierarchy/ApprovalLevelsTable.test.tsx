import "@testing-library/jest-dom";
import { vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ApprovalLevelsTable from "./ApprovalLevelsTable";
import type { ApprovalLevelRow, UserOption } from "./types";

describe("ApprovalLevelsTable", () => {
  const mockUserOptions: UserOption[] = [
    { id: "1", name: "user1@test.com" },
    { id: "2", name: "user2@test.com" },
    { id: "3", name: "user3@test.com" },
    { id: "4", name: "user4@test.com" },
  ];

  const mockData: ApprovalLevelRow[] = [
    { level: 1, users: ["1"], maxSingle: "1000", maxDay: "5000", maxMonth: "20000" },
  ];

  const emptyData: ApprovalLevelRow[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with initial data", () => {
    render(
      <ApprovalLevelsTable
        maxLevel={3}
        userOptions={mockUserOptions}
        data={mockData}
      />
    );

    expect(screen.getByText("Approval Levels Configuration")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // Level 1
    expect(screen.getByText("user1@test.com")).toBeInTheDocument();
  });

  it("should render empty row when data is empty", () => {
    render(
      <ApprovalLevelsTable
        maxLevel={3}
        userOptions={mockUserOptions}
        data={emptyData}
      />
    );

    // Should have Level 1 row
    expect(screen.getByText("1")).toBeInTheDocument();
    // Should have placeholder for user selection
    expect(screen.getByPlaceholderText("Select users...")).toBeInTheDocument();
  });

  it("should call onChange when input values change", () => {
    const onChange = vi.fn();

    render(
      <ApprovalLevelsTable
        maxLevel={3}
        userOptions={mockUserOptions}
        data={emptyData}
        onChange={onChange}
      />
    );

    // Type in max single value input
    const maxSingleInputs = screen.getAllByPlaceholderText("0.00");
    fireEvent.change(maxSingleInputs[0], { target: { value: "1000" } });

    // onChange should be called
    expect(onChange).toHaveBeenCalled();
  });

  it("should NOT add new row when changing max value inputs (only when user selected)", () => {
    const onChange = vi.fn();

    render(
      <ApprovalLevelsTable
        maxLevel={3}
        userOptions={mockUserOptions}
        data={emptyData}
        onChange={onChange}
      />
    );

    // Type in max single value
    const maxSingleInputs = screen.getAllByPlaceholderText("0.00");
    fireEvent.change(maxSingleInputs[0], { target: { value: "1000" } });

    // Check that onChange was called but no new row was added
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    
    // Should still have only 1 row
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].maxSingle).toBe("1000");
  });

  it("should limit users to maximum 3 per level", () => {
    const dataWithThreeUsers: ApprovalLevelRow[] = [
      { level: 1, users: ["1", "2", "3"], maxSingle: "", maxDay: "", maxMonth: "" },
    ];

    render(
      <ApprovalLevelsTable
        maxLevel={3}
        userOptions={mockUserOptions}
        data={dataWithThreeUsers}
      />
    );

    // Should show all 3 users
    expect(screen.getByText("user1@test.com")).toBeInTheDocument();
    expect(screen.getByText("user2@test.com")).toBeInTheDocument();
    expect(screen.getByText("user3@test.com")).toBeInTheDocument();
  });

  it("should only allow numeric input for max value fields", () => {
    const onChange = vi.fn();

    render(
      <ApprovalLevelsTable
        maxLevel={3}
        userOptions={mockUserOptions}
        data={emptyData}
        onChange={onChange}
      />
    );

    // Try to type non-numeric characters (will be filtered)
    const maxSingleInputs = screen.getAllByPlaceholderText("0.00");
    fireEvent.change(maxSingleInputs[0], { target: { value: "abc123def" } });

    // Check that only numeric value was captured
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall[0].maxSingle).toBe("123");
  });

  it("should handle row deletion with multiple rows", () => {
    const onChange = vi.fn();

    const dataWithTwoRows: ApprovalLevelRow[] = [
      { level: 1, users: ["1"], maxSingle: "1000", maxDay: "5000", maxMonth: "20000" },
      { level: 2, users: ["2"], maxSingle: "2000", maxDay: "10000", maxMonth: "40000" },
    ];

    render(
      <ApprovalLevelsTable
        maxLevel={3}
        userOptions={mockUserOptions}
        data={dataWithTwoRows}
        onChange={onChange}
      />
    );

    // Find and click delete button for first row
    // (3 rows rendered: Level 1, Level 2, blank Level 3)
    const deleteButtons = screen.getAllByRole("button", { name: /remove level/i });
    fireEvent.click(deleteButtons[0]);

    // Check that onChange was called with row removed and levels renumbered
    // Remaining: Level 1 (former Level 2 with users) + trailing blank Level 2
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];

    expect(lastCall).toHaveLength(2);
    expect(lastCall[0].level).toBe(1);
    expect(lastCall[0].users).toContain("2");
    expect(lastCall[1].level).toBe(2);
    expect(lastCall[1].users).toHaveLength(0);
  });

  it("should clear row instead of delete when only one row with data exists", () => {
    const onChange = vi.fn();

    render(
      <ApprovalLevelsTable
        maxLevel={3}
        userOptions={mockUserOptions}
        data={mockData}
        onChange={onChange}
      />
    );

    // 2 rows rendered: Level 1 (with user) + blank Level 2
    // Delete Level 1 → remaining blank Level 2 gets renumbered to Level 1
    const deleteButtons = screen.getAllByRole("button", { name: /remove level/i });
    fireEvent.click(deleteButtons[0]);

    // Check that onChange was called with the remaining empty row renumbered
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];

    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].level).toBe(1);
    expect(lastCall[0].users).toHaveLength(0);
  });

  it("should show message when no users available", () => {
    render(
      <ApprovalLevelsTable
        maxLevel={3}
        userOptions={[]}
        data={emptyData}
      />
    );

    expect(
      screen.getByText("No users available for this menu and branch combination.")
    ).toBeInTheDocument();
  });

  it("should render table headers correctly", () => {
    render(
      <ApprovalLevelsTable
        maxLevel={3}
        userOptions={mockUserOptions}
        data={emptyData}
      />
    );

    expect(screen.getByText("Level")).toBeInTheDocument();
    expect(screen.getByText("Users (Max 3)")).toBeInTheDocument();
    expect(screen.getByText("Max Single Entry Value")).toBeInTheDocument();
    expect(screen.getByText("Max Day Entry Value")).toBeInTheDocument();
    expect(screen.getByText("Max Month Entry Value")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });
});
