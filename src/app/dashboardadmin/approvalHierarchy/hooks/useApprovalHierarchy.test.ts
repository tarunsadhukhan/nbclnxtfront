
import "@testing-library/jest-dom";
import { vi, type Mock } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useApprovalHierarchy } from "./useApprovalHierarchy";

// Mock fetchWithCookie
vi.mock("@/utils/apiClient2", () => ({
  fetchWithCookie: vi.fn(),
}));

// Mock apiRoutes
vi.mock("@/utils/api", () => ({
  apiRoutes: {
    PORTAL_CO_BRANCH_SUBMENU: "/api/admin/PortalData/co_branch_submenu",
    PORTAL_APPROVAL_LEVELS_DATA: "/api/admin/PortalData/approval_level_data_setup",
    PORTAL_APPROVAL_LEVELS_DATA_SUBMIT: "/api/admin/PortalData/approval_level_data_setup_submit",
  },
}));

import { fetchWithCookie } from "@/utils/apiClient2";

const mockFetchWithCookie = vi.mocked(fetchWithCookie);

// Helper to create mock API response matching FetchResult type
const createMockResponse = <T>(data: T, error: string | null = null) => ({
  data,
  error,
  status: error ? 500 : 200,
});

describe("useApprovalHierarchy", () => {
  const mockDropdownResponse = [
    {
      id: "company",
      label: "Company",
      items: [{ id: "1", name: "Company 1" }],
    },
    {
      id: "branch",
      label: "Branch",
      dependsOn: "company",
      items: { "1": [{ id: "10", name: "Branch 1" }] },
    },
    {
      id: "menu",
      label: "Menu",
      dependsOn: "branch",
      items: { "10": [{ id: "100", name: "Menu 1" }] },
    },
  ];

  const mockApprovalLevelsResponse = {
    "100": {
      maxLevel: 2,
      userOptions: [
        { id: "1", name: "user1@test.com" },
        { id: "2", name: "user2@test.com" },
      ],
      data: [
        { level: 1, users: ["1"], maxSingle: "1000", maxDay: "5000", maxMonth: "20000" },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize with loading state", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockDropdownResponse));

    const { result } = renderHook(() => useApprovalHierarchy());

    // Initial state should have loading true
    expect(result.current.isDropdownLoading).toBe(true);
    expect(result.current.selections).toEqual({
      company: "",
      branch: "",
      menu: "",
    });

    await waitFor(() => {
      expect(result.current.isDropdownLoading).toBe(false);
    });
  });

  it("should fetch dropdown data on mount", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockDropdownResponse));

    const { result } = renderHook(() => useApprovalHierarchy());

    await waitFor(() => {
      expect(result.current.isDropdownLoading).toBe(false);
    });

    expect(mockFetchWithCookie).toHaveBeenCalledWith(
      "/api/admin/PortalData/co_branch_submenu",
      "GET"
    );
    expect(result.current.dropdownFields).toEqual(mockDropdownResponse);
  });

  it("should handle selection change and reset dependent fields", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockDropdownResponse));

    const { result } = renderHook(() => useApprovalHierarchy());

    await waitFor(() => {
      expect(result.current.isDropdownLoading).toBe(false);
    });

    // Select company
    act(() => {
      result.current.handleSelectionChange("company", "1");
    });

    expect(result.current.selections.company).toBe("1");
    expect(result.current.selections.branch).toBe("");
    expect(result.current.selections.menu).toBe("");

    // Select branch
    act(() => {
      result.current.handleSelectionChange("branch", "10");
    });

    expect(result.current.selections.branch).toBe("10");
    expect(result.current.selections.menu).toBe("");

    // Change company should reset branch and menu
    act(() => {
      result.current.handleSelectionChange("company", "2");
    });

    expect(result.current.selections.company).toBe("2");
    expect(result.current.selections.branch).toBe("");
    expect(result.current.selections.menu).toBe("");
  });

  it("should fetch approval levels when menu and branch are selected", async () => {
    mockFetchWithCookie
      .mockResolvedValueOnce(createMockResponse(mockDropdownResponse))
      .mockResolvedValueOnce(createMockResponse(mockApprovalLevelsResponse));

    const { result } = renderHook(() => useApprovalHierarchy());

    await waitFor(() => {
      expect(result.current.isDropdownLoading).toBe(false);
    });

    // Select company, branch, and menu
    act(() => {
      result.current.handleSelectionChange("company", "1");
    });
    act(() => {
      result.current.handleSelectionChange("branch", "10");
    });
    act(() => {
      result.current.handleSelectionChange("menu", "100");
    });

    await waitFor(() => {
      expect(result.current.approvalLevelsData).toBeDefined();
    });

    expect(mockFetchWithCookie).toHaveBeenCalledWith(
      "/api/admin/PortalData/approval_level_data_setup",
      "POST",
      { menuId: "100", branchId: "10" }
    );

    expect(result.current.approvalLevelsData?.maxLevel).toBe(2);
    expect(result.current.approvalLevelsData?.userOptions).toHaveLength(2);
    expect(result.current.approvalLevelsData?.data).toHaveLength(1);
  });

  it("should update approval rows correctly", async () => {
    mockFetchWithCookie
      .mockResolvedValueOnce(createMockResponse(mockDropdownResponse))
      .mockResolvedValueOnce(createMockResponse(mockApprovalLevelsResponse));

    const { result } = renderHook(() => useApprovalHierarchy());

    await waitFor(() => {
      expect(result.current.isDropdownLoading).toBe(false);
    });

    act(() => {
      result.current.handleSelectionChange("company", "1");
    });
    act(() => {
      result.current.handleSelectionChange("branch", "10");
    });
    act(() => {
      result.current.handleSelectionChange("menu", "100");
    });

    await waitFor(() => {
      expect(result.current.approvalLevelsData).toBeDefined();
    });

    const newRows = [
      { level: 1, users: ["1", "2"], maxSingle: "2000", maxDay: "10000", maxMonth: "40000" },
      { level: 2, users: [], maxSingle: "", maxDay: "", maxMonth: "" },
    ];

    act(() => {
      result.current.updateApprovalRows(newRows);
    });

    expect(result.current.approvalLevelsData?.data).toEqual(newRows);
  });

  it("should handle API errors gracefully", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(null, "API Error"));

    const { result } = renderHook(() => useApprovalHierarchy());

    await waitFor(() => {
      expect(result.current.isDropdownLoading).toBe(false);
    });

    // Should have empty dropdown fields on error
    expect(result.current.dropdownFields[0].items).toEqual([]);
  });

  it("should compute canShowTable correctly", async () => {
    mockFetchWithCookie
      .mockResolvedValueOnce(createMockResponse(mockDropdownResponse))
      .mockResolvedValueOnce(createMockResponse(mockApprovalLevelsResponse));

    const { result } = renderHook(() => useApprovalHierarchy());

    await waitFor(() => {
      expect(result.current.isDropdownLoading).toBe(false);
    });

    // Initially canShowTable should be false
    expect(result.current.canShowTable).toBe(false);

    act(() => {
      result.current.handleSelectionChange("company", "1");
    });
    act(() => {
      result.current.handleSelectionChange("branch", "10");
    });
    act(() => {
      result.current.handleSelectionChange("menu", "100");
    });

    await waitFor(() => {
      expect(result.current.canShowTable).toBe(true);
    });
  });

  it("should handle submit correctly", async () => {
    mockFetchWithCookie
      .mockResolvedValueOnce(createMockResponse(mockDropdownResponse))
      .mockResolvedValueOnce(createMockResponse(mockApprovalLevelsResponse))
      .mockResolvedValueOnce(createMockResponse({ success: true }));

    const { result } = renderHook(() => useApprovalHierarchy());

    await waitFor(() => {
      expect(result.current.isDropdownLoading).toBe(false);
    });

    act(() => {
      result.current.handleSelectionChange("company", "1");
    });
    act(() => {
      result.current.handleSelectionChange("branch", "10");
    });
    act(() => {
      result.current.handleSelectionChange("menu", "100");
    });

    await waitFor(() => {
      expect(result.current.approvalLevelsData).toBeDefined();
    });

    let submitResult: { success: boolean; message?: string } | undefined;
    await act(async () => {
      submitResult = await result.current.handleSubmit();
    });

    expect(submitResult?.success).toBe(true);
    expect(mockFetchWithCookie).toHaveBeenLastCalledWith(
      "/api/admin/PortalData/approval_level_data_setup_submit",
      "POST",
      {
        branchId: "10",
        menuId: "100",
        data: [{ level: 1, users: ["1"], maxSingle: "1000", maxDay: "5000", maxMonth: "20000" }],
      }
    );
  });
});

