"use client";

import { useState, useEffect, useCallback } from "react";
import { apiRoutes } from "@/utils/api";
import axios from "axios";
import { logout } from "@/utils/auth";

interface MenuItem {
  title: string;
  path?: string;
  icon: string;
  submenu?: MenuItem[];
}

export function useCompanyConsole() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  const subdomain = typeof window !== "undefined" ? localStorage.getItem("subdomain") : null;

  const fetchMenusConsole = useCallback(async () => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

    if (!userId) {
      setMenuItems([]);
      return;
    }

    try {
      const queryParams = new URLSearchParams({
        user_id: userId,
        subdomain: subdomain || "",
      }).toString();

      const response = await axios.get(`${apiRoutes.MENU_CTRLDESK}?${queryParams}`, {
        withCredentials: true,
      });

      if (response.status !== 200) {
        throw new Error(response.data.detail || "Failed to fetch menus");
      }

      setMenuItems(response.data.data || []);
    } catch (error) {
      // Handle auth errors (401/403) - log out and redirect
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        logout();
        return;
      }
      setMenuItems([]);
    }
  }, [subdomain]);

  useEffect(() => {
    setLoading(true);
    fetchMenusConsole().finally(() => setLoading(false)); // Ensure loading state is reset even on error
  }, [fetchMenusConsole]);

  return {
    menuItems,
    loading,
  };
}

