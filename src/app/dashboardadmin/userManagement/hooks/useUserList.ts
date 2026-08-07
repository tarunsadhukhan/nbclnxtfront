import { useState, useEffect, useCallback } from "react";
import { GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutes } from "@/utils/api";
import { handleAuthError } from "@/utils/auth";
import type { User } from "../types";

interface UseUserListReturn {
  // Data state
  rows: User[];
  totalRows: number;
  loading: boolean;
  error: string | null;

  // Pagination
  paginationModel: GridPaginationModel;
  handlePaginationModelChange: (model: GridPaginationModel) => void;

  // Search
  searchValue: string;
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;

  // Actions
  refreshList: () => void;
}

export function useUserList(): UseUserListReturn {
  const [rows, setRows] = useState<User[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 20,
    page: 0,
  });
  const [searchValue, setSearchValue] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = localStorage.getItem("user_id") || "";
      const queryParams = new URLSearchParams({
        page: (paginationModel.page + 1).toString(),
        limit: paginationModel.pageSize.toString(),
        user_id: userId,
      });

      const trimmedSearch = searchValue.trim();
      if (trimmedSearch) {
        queryParams.append("search", trimmedSearch);
      }

      const url = `${apiRoutes.USERS_PORTAL}?${queryParams}`;
      const { data, error: apiError, status } = await fetchWithCookie(url, "GET");

      // Handle auth errors
      if (handleAuthError(status)) return;

      if (apiError || !data) {
        throw new Error(apiError || "Failed to fetch users");
      }

      // Parse API response - handle both array and object responses
      const usersData = Array.isArray(data) ? data : data.data || [];
      const total = data.total ?? usersData.length;

      // Map API response to grid rows with 'id' field required by MUI DataGrid
      const mappedRows: User[] = usersData.map((row: any) => ({
        id: row.user_id,
        user_id: row.user_id,
        email_id: row.email_id ?? "",
        name: row.name ?? "",
        active: row.active ?? 0,
      }));

      setRows(mappedRows);
      setTotalRows(total);
    } catch (err: any) {
      setError(err.message || "Error fetching users");
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchValue]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handlePaginationModelChange = useCallback((newModel: GridPaginationModel) => {
    setPaginationModel(newModel);
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setSearchValue(value);
  }, []);

  const refreshList = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    rows,
    totalRows,
    loading,
    error,
    paginationModel,
    handlePaginationModelChange,
    searchValue,
    handleSearchChange,
    refreshList,
  };
}

