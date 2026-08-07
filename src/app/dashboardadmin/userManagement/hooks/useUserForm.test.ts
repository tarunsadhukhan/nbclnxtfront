
import "@testing-library/jest-dom";
import { vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useUserForm } from "./useUserForm";

// Mock fetchWithCookie
vi.mock("@/utils/apiClient2", () => ({
  fetchWithCookie: vi.fn(),
}));

// Mock apiRoutes
vi.mock("@/utils/api", () => ({
  apiRoutes: {
    PORTAL_USER_CREATE_FULL: "/api/admin/PortalData/get_user_create_setup_data",
    CREATE_PORTAL_USER: "/api/admin/PortalData/create_user_portal",
    EDIT_PORTAL_USER: "/api/admin/PortalData/edit_user_portal",
    PORTAL_USER_EDIT_BY_USERID: "/api/admin/PortalData/get_user_edit_setup_data",
  },
}));

// Mock useSearchParams and useRouter
const mockPush = vi.fn();
const mockGet = vi.fn<(key: string) => string | null>(() => null);

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

import { fetchWithCookie } from "@/utils/apiClient2";

const mockFetchWithCookie = vi.mocked(fetchWithCookie);

// Helper to create mock API response
const createMockResponse = <T>(data: T, error: string | null = null) => ({
  data,
  error,
  status: error ? 500 : 200,
});

describe("useUserForm", () => {
  const mockSetupData = {
    companies: [
      {
        company_id: 1,
        company_name: "Company 1",
        branches: [
          { branch_id: 10, branch_name: "Branch 1", company_id: 1, role_id: null },
          { branch_id: 11, branch_name: "Branch 2", company_id: 1, role_id: null },
        ],
      },
    ],
    roles: [
      { role_id: "1", role_name: "Admin" },
      { role_id: "2", role_name: "User" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null); // Default to create mode
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize in create mode when no userId in URL", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockSetupData));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isEditMode).toBe(false);
    expect(result.current.userId).toBeNull();
  });

  it("should fetch setup data on mount", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockSetupData));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetchWithCookie).toHaveBeenCalledWith(
      "/api/admin/PortalData/get_user_create_setup_data"
    );
  });

  it("should prepare menu items from companies and branches", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockSetupData));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.menuItems).toHaveLength(1);
    expect(result.current.menuItems[0].label).toBe("Company 1");
    expect(result.current.menuItems[0].children).toHaveLength(2);
  });

  it("should filter out companies without branches", async () => {
    const dataWithEmptyCompany = {
      companies: [
        {
          company_id: 1,
          company_name: "Company With Branches",
          branches: [
            { branch_id: 10, branch_name: "Branch 1", company_id: 1, role_id: null },
          ],
        },
        {
          company_id: 2,
          company_name: "Company Without Branches",
          branches: [], // Empty branches
        },
        {
          company_id: 3,
          company_name: "Company With Null Branches",
          // branches is undefined
        },
      ],
      roles: [{ role_id: "1", role_name: "Admin" }],
    };

    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(dataWithEmptyCompany));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Only the company with branches should be shown
    expect(result.current.menuItems).toHaveLength(1);
    expect(result.current.menuItems[0].label).toBe("Company With Branches");
  });

  it("should prepare assignment options from roles", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockSetupData));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have "Not Assigned" + 2 roles
    expect(result.current.assignmentOptions).toHaveLength(3);
    expect(result.current.assignmentOptions[0].label).toBe("Not Assigned");
    expect(result.current.assignmentOptions[0].value).toBeNull();
    expect(result.current.assignmentOptions[1].label).toBe("Admin");
    expect(result.current.assignmentOptions[2].label).toBe("User");
  });

  it("should update form state values", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockSetupData));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setUserName("test@example.com");
      result.current.setPassword("password123");
      result.current.setName("Test User");
    });

    expect(result.current.userName).toBe("test@example.com");
    expect(result.current.password).toBe("password123");
    expect(result.current.name).toBe("Test User");
  });

  it("should handle assignment change correctly", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockSetupData));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handleAssignmentChange("company_branch_id_10", "1");
    });

    expect(result.current.branchRoleAssignments[10]).toBe("1");
  });

  it("should handle API errors gracefully", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(null, "API Error"));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("API Error");
  });

  it("should toggle isActive state", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockSetupData));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.setIsActive(false);
    });

    expect(result.current.isActive).toBe(false);
  });

  it("should validate required fields on submit in create mode", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockSetupData));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Try to submit without username/password
    let submitResult: { success: boolean; message?: string } | undefined;
    await act(async () => {
      submitResult = await result.current.handleSubmit();
    });

    expect(submitResult?.success).toBe(false);
    expect(submitResult?.message).toBe("Username and password are required");
  });

  it("should submit form successfully with valid data", async () => {
    mockFetchWithCookie
      .mockResolvedValueOnce(createMockResponse(mockSetupData))
      .mockResolvedValueOnce(createMockResponse({ success: true }));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Set required values
    act(() => {
      result.current.setUserName("test@example.com");
      result.current.setPassword("password123");
      result.current.setName("Test User");
    });

    let submitResult: { success: boolean; message?: string } | undefined;
    await act(async () => {
      submitResult = await result.current.handleSubmit();
    });

    expect(submitResult?.success).toBe(true);
    expect(mockPush).toHaveBeenCalledWith("/dashboardadmin/userManagement");
  });
});

describe("useUserForm in edit mode", () => {
  const mockSetupData = {
    companies: [
      {
        company_id: 1,
        company_name: "Company 1",
        branches: [
          { branch_id: 10, branch_name: "Branch 1", company_id: 1, role_id: null },
        ],
      },
    ],
    roles: [
      { role_id: "1", role_name: "Admin" },
    ],
  };

  const mockUserData = {
    user: {
      user_id: "123",
      user_name: "existing@example.com",
      is_active: true,
      name: "Existing User",
    },
    companies: [
      {
        company_id: 1,
        company_name: "Company 1",
        branches: [
          { branch_id: 10, branch_name: "Branch 1", company_id: 1, role_id: "1" },
        ],
      },
    ],
    roles: [
      { role_id: "1", role_name: "Admin" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue("123"); // Edit mode with userId=123
  });

  it("should initialize in edit mode when userId is in URL", async () => {
    mockFetchWithCookie
      .mockResolvedValueOnce(createMockResponse(mockSetupData))
      .mockResolvedValueOnce(createMockResponse(mockUserData));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isEditMode).toBe(true);
    expect(result.current.userId).toBe("123");
  });

  it("should fetch user data in edit mode", async () => {
    mockFetchWithCookie
      .mockResolvedValueOnce(createMockResponse(mockSetupData))
      .mockResolvedValueOnce(createMockResponse(mockUserData));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userName).toBe("existing@example.com");
    expect(result.current.name).toBe("Existing User");
    expect(result.current.isActive).toBe(true);
  });

  it("should populate branch role assignments from user data", async () => {
    mockFetchWithCookie
      .mockResolvedValueOnce(createMockResponse(mockSetupData))
      .mockResolvedValueOnce(createMockResponse(mockUserData));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.branchRoleAssignments[10]).toBe("1");
  });
});

