/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

vi.mock("@/utils/apiClient2", () => ({ fetchWithCookie: vi.fn() }));

import { fetchWithCookie } from "@/utils/apiClient2";
import CreateSubDepartmentPage from "./CreateSubDepartmentPage";

const mockFetchWithCookie = vi.mocked(fetchWithCookie);

const setup = {
  branchs: [{ branch_id: 5, branch_name: "FACTORY" }],
  departments: [{ dept_id: 7, dept_name: "BATCHING(LC)", branch_id: 5 }],
};

// The row being edited plus a legacy row that already shares its code in the same dept.
const editRow = { id: 100, subdept_name: "BATCHING B", subdept_code: "002", branch_id: 5, dept_id: 7, order_by: 2 };
const rows = [
  editRow,
  { id: 101, subdept_name: "BATCHING A", subdept_code: "002", branch_id: 5, dept_id: 7, order_by: 1 },
  { id: 102, subdept_name: "BATCHING C", subdept_code: "003", branch_id: 5, dept_id: 7, order_by: 3 },
];

describe("CreateSubDepartmentPage duplicate validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key: string) =>
      key === "sidebar_selectedCompany" ? JSON.stringify({ co_id: "1" }) : null
    );
    mockFetchWithCookie.mockResolvedValue({ data: setup, error: null, status: 200 } as never);
  });

  it("does not flag an unchanged code on edit even when the data already has a collision", async () => {
    render(<CreateSubDepartmentPage open onClose={vi.fn()} editRow={editRow} existingRows={rows} />);

    const code = await screen.findByLabelText(/Subdepartment Code/i);
    fireEvent.blur(code);

    await waitFor(() => expect(screen.getByRole("button", { name: /Update/i })).toBeEnabled());
    expect(screen.queryByText(/code already exists/i)).not.toBeInTheDocument();
  });

  it("still flags a code changed into an existing one", async () => {
    render(<CreateSubDepartmentPage open onClose={vi.fn()} editRow={editRow} existingRows={rows} />);

    const code = await screen.findByLabelText(/Subdepartment Code/i);
    fireEvent.change(code, { target: { name: "subdept_code", value: "003" } });
    fireEvent.blur(code);

    expect(await screen.findByText(/code already exists/i)).toBeInTheDocument();
  });
});
