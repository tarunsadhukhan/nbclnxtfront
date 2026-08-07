"use client";



import { apiRoutes } from "@/utils/api";

import useDataWithCookie from "@/utils/apiClient2";

export function useCompanyConsoleMenu() {
  const queryParams = new URLSearchParams({}).toString();
  const { data, loading, error } = useDataWithCookie(
    `${apiRoutes.GET_TENANT_ADMIN_MENU_ROLE}?${queryParams}`
  );

  const menuItems = (error || !data?.data) ? [] : data.data;

  return {
    menuItems,
    loading,
  };
}

