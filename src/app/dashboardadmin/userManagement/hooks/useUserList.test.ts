
import "@testing-library/jest-dom";
import { vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useUserList } from "./useUserList";

// Mock fetchWithCookie
vi.mock("@/utils/apiClient2", () => ({
  fetchWithCookie: vi.fn(),
}));

// Mock apiRoutes
vi.mock("@/utils/api", () => ({
  apiRoutes: {
    USERS_PORTAL: "/api/admin/PortalData/get_users_portal",
  },
}));

// Mock handleAuthError
vi.mock("@/utils/auth", () => ({
  handleAuthError: vi.fn(() => false),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => "1"),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

import { fetchWithCookie } from "@/utils/apiClient2";

const mockFetchWithCookie = vi.mocked(fetchWithCookie);

// Helper to create mock API response
const createMockResponse = <T>(data: T, error: string | null = null) => ({
  data,
  error,
  status: error ? 500 : 200,
});

describe("useUserList", () => {
  const mockUsersResponse = [
    { user_id: 1, email_id: "user1@test.com", name: "User 1", active: 1 },
    { user_id: 2, email_id: "user2@test.com", name: "User 2", active: 0 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize with loading state and fetch users on mount", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockUsersResponse));

    const { result } = renderHook(() => useUserList());

    // Initial state should have loading true
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[0].name).toBe("User 1");
    expect(result.current.rows[1].name).toBe("User 2");
  });

  it("should map API response correctly to User type", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockUsersResponse));

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const user = result.current.rows[0];
    expect(user.id).toBe(1);
    expect(user.user_id).toBe(1);
    expect(user.email_id).toBe("user1@test.com");
    expect(user.name).toBe("User 1");
    expect(user.active).toBe(1);
  });

  it("should handle search value changes", async () => {
    mockFetchWithCookie.mockResolvedValue(createMockResponse(mockUsersResponse));

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate search change
    act(() => {
      result.current.handleSearchChange({
        target: { value: "test search" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.searchValue).toBe("test search");
    // Should reset pagination to page 0
    expect(result.current.paginationModel.page).toBe(0);
  });

  it("should handle pagination model changes", async () => {
    mockFetchWithCookie.mockResolvedValue(createMockResponse(mockUsersResponse));

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Change pagination
    act(() => {
      result.current.handlePaginationModelChange({ page: 2, pageSize: 10 });
    });

    expect(result.current.paginationModel.page).toBe(2);
    expect(result.current.paginationModel.pageSize).toBe(10);
  });

  it("should handle API errors gracefully", async () => {
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(null, "API Error"));

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("API Error");
    expect(result.current.rows).toHaveLength(0);
  });

  it("should handle object response format with data property", async () => {
    const objectResponse = {
      data: mockUsersResponse,
      total: 100,
    };
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(objectResponse));

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.totalRows).toBe(100);
  });

  it("should call refreshList to fetch data again", async () => {
    mockFetchWithCookie.mockResolvedValue(createMockResponse(mockUsersResponse));

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mock to track new calls
    mockFetchWithCookie.mockClear();
    mockFetchWithCookie.mockResolvedValueOnce(createMockResponse(mockUsersResponse));

    act(() => {
      result.current.refreshList();
    });

    await waitFor(() => {
      expect(mockFetchWithCookie).toHaveBeenCalled();
    });
  });
});

