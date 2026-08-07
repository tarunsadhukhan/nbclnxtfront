"use client";

import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { useEffect, useState } from "react";
import { getUser, urlcheck } from "@/utils/auth";
import { normalisePortalPath } from "@/utils/portalPermissions";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function useCompany() {
  const {
    companies, setCompanies,
    selectedCompany,
    menuItems, setMenuItems,
    setMenuPermissions,
    handleCompanyChange,
  } = useSidebarContext();
  const [loading, setLoading] = useState<boolean>(false);
  const { compshow, currentHost } = urlcheck();

  // Fetch companies after the component is mounted
  useEffect(() => {
  const fetchCompanies = async (userId: string) => {
      try {
    setLoading(true);
        const response = await fetch(
          `${API_URL}/api/companyRoutes/companies?userId=${userId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userId}`,
            },
            credentials: "include",
          }
        );
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to fetch companies");
        }
        const data = await response.json();
        setCompanies(data);
        // Only set first company if none selected
        if (!selectedCompany && data.length > 0) {
          handleCompanyChange(data[0].co_id);
        }
      } catch (error) {
        setCompanies([]);
      }
      finally {
        setLoading(false);
      }
    };
    const user = getUser();
    if (user?.id) {
      fetchCompanies(user.id);
    }
  }, [setCompanies, selectedCompany, handleCompanyChange]);

  // Fetch menus for selected company
  useEffect(() => {
    const fetchMenus = async () => {
      if (!selectedCompany) return;
      const user = getUser();
      if (!user) return;
      try {
        const response = await fetch(
          `${API_URL}/api/admin/PortalData/portal_menu_items?company_id=${selectedCompany.co_id}&user_id=${user.id}&currentHost=${currentHost}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );
        if (!response.ok) {
          setMenuItems([]);
          setMenuPermissions({});
          return;
        }
        const data = await response.json();
        setMenuItems(data);
        try {
          const permissionsResponse = await fetch(
            `${API_URL}/api/admin/PortalData/portal_menu_permissions`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            }
          );
          if (!permissionsResponse.ok) {
            setMenuPermissions({});
          } else {
            const permissionsData = await permissionsResponse.json();
            const rawPermissions = permissionsData?.permissions ?? {};
            const normalisedPermissions: Record<string, number> = {};
            Object.entries(rawPermissions).forEach(([key, value]) => {
              const cleaned = normalisePortalPath(key);
              if (!cleaned) return;
              const numericValue = typeof value === "number" ? value : Number(value);
              if (Number.isFinite(numericValue)) {
                normalisedPermissions[cleaned] = numericValue;
              }
            });
            setMenuPermissions(normalisedPermissions);
          }
        } catch {
          setMenuPermissions({});
        }
      } catch {
        setMenuItems([]);
        setMenuPermissions({});
      }
    };
    fetchMenus();
  }, [selectedCompany, setMenuItems, currentHost, setMenuPermissions]);

  return {
    companies,
    selectedCompany,
    menuItems,
    handleCompanyChange,
  loading,
  };
}
