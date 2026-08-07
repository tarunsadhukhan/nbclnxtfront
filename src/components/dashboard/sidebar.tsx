'use client';
import { useEffect, useState } from 'react';
import LogoSection from "./LogoSection";
import { FixedMenu } from "./FixedMenu";
import { urlcheck } from "@/utils/auth";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutes } from "@/utils/api";
import MuiSelect from "@/components/ui/muiSelect";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { normalisePortalPath } from "@/utils/portalPermissions";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isCollapsed, onToggle, onMouseEnter, onMouseLeave, isMobile, onClose }: SidebarProps) {
  const { compshow } = urlcheck();
  const {
    companies, setCompanies,
    selectedCompany,
    selectedBranches, setSelectedBranches,
    expandedMenus, setExpandedMenus,
    availableMenus, parentMenus,
    handleCompanyChange, handleBranchChange,
    setMenuPermissions
  } = useSidebarContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!isClient || compshow !== 2) return;

    // First try to reuse cached companies from localStorage to avoid
    // calling the portal menu API on every navigation/redirect.
    try {
      const cached = localStorage.getItem('sidebar_companies');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCompanies(parsed);
          return; // cached data present, skip network request
        }
      }
    } catch (err) {
      // fall through to fetching from API if parsing fails
      console.warn('Failed to parse cached sidebar_companies', err);
    }

    // No valid cache found - fetch once and let SidebarProvider persist it to localStorage
    const fetchCompanyData = async () => {
      setIsLoading(true);
      try {
        const result = await fetchWithCookie(apiRoutes.PORTAL_MENU_ITEMS, "GET");
        if (result.status === 401 || result.status === 403) {
          console.warn("Access token expired or unauthorized – redirecting to login");
          try {
            localStorage.removeItem('sidebar_companies');
            localStorage.removeItem('sidebar_selectedCompany');
            localStorage.removeItem('sidebar_selectedBranches');
            localStorage.removeItem('sidebar_expandedMenus');
            localStorage.removeItem('sidebar_menuItems');
          } catch (storageErr) {
            console.warn('Failed to clear cached sidebar data', storageErr);
          }
          window.location.href = "/";
          return;
        }

        if (result.error) {
          setError(result.error);
          return;
        }

        if (Array.isArray(result.data)) {
          setCompanies(result.data);
          const permissionResult = await fetchWithCookie(apiRoutes.PORTAL_MENU_PERMISSIONS, "GET");
          if (permissionResult.status >= 200 && permissionResult.status < 300 && permissionResult.data) {
            const payload = permissionResult.data as { permissions?: Record<string, unknown> };
            const rawPermissions = payload.permissions ?? {};
            const normalised: Record<string, number> = {};
            Object.entries(rawPermissions).forEach(([key, value]) => {
              const cleaned = normalisePortalPath(key);
              if (!cleaned) return;
              const numeric = typeof value === 'number' ? value : Number(value);
              if (Number.isFinite(numeric)) {
                normalised[cleaned] = numeric;
              }
            });
            setMenuPermissions(normalised);
          } else {
            setMenuPermissions({});
          }
        } else {
          setError("Failed to load company data");
        }
      } catch (error) {
        setError("Error loading company data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanyData();
  }, [compshow, isClient, setCompanies, setMenuPermissions]);

  // Toggle menu expansion
  const toggleMenu = (menuId: number) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const getChildMenus = (parentId: number) => Array.isArray(availableMenus) ? availableMenus.filter(menu => menu.menu_parent_id === parentId) : [];

  const renderMenuItem = (menu: any, level = 0) => {
    const isParent = Array.isArray(availableMenus) && availableMenus.some(m => m.menu_parent_id === menu.menu_id);
    const isExpanded = Array.isArray(expandedMenus) && expandedMenus.includes(menu.menu_id);
    const childMenus = getChildMenus(menu.menu_id);
    return (
      <div key={menu.menu_id} className="menu-item">
        <div className={`flex items-center py-2 px-2 hover:bg-[#00557a] rounded-md transition-colors ${level > 0 ? 'ml-6' : ''}`}
          style={{ paddingLeft: `${level * 8}px` }}>
          {isParent && (
            <div className="flex items-center cursor-pointer mr-2 sidebar-menu-chevron hover:text-gray-200 transition-colors"
              onClick={() => toggleMenu(menu.menu_id)}>
              {isExpanded ? <ChevronDown className="h-4 w-4 transition-transform duration-200" /> : <ChevronRight className="h-4 w-4 transition-transform duration-200" />}
            </div>
          )}
          <a href={`/dashboardportal/${menu.menu_path}`} className="text-sm flex-1 sidebar-menu-title hover:text-gray-200" onClick={isMobile ? onClose : undefined}>{menu.menu_name}</a>
        </div>
        {isParent && isExpanded && (
          <div className="overflow-hidden transition-all duration-300 ease-in-out">
            {Array.isArray(childMenus) ? childMenus.map((childMenu: any) => renderMenuItem(childMenu, level + 1)) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`sidebar-container ${isMobile ? "w-full" : isCollapsed ? "w-20" : "w-56"}`}
      onMouseEnter={isMobile ? undefined : onMouseEnter}
      onMouseLeave={isMobile ? undefined : onMouseLeave}
    >
      <div className="sidebar-container">
        <LogoSection isCollapsed={isCollapsed} onToggle={onToggle} logoSrc="path/to/logo.png" title="Your Title" isMobile={isMobile} onClose={onClose} />
        <div className="px-4 py-3 sidebar-section-border">
          {isClient && compshow === 2 && !isCollapsed ? (
            <>
              <div className="mb-2">
                <MuiSelect
                  label="Company"
                  options={Array.isArray(companies) ? companies.map(company => ({ value: company.co_id, label: company.co_name })) : []}
                  value={selectedCompany?.co_id ?? ''}
                  onChange={val => handleCompanyChange(Number(Array.isArray(val) ? val[0] : val))}
                  placeholder="Select Company"
                  disabled={!Array.isArray(companies) || companies.length === 0}
                  minWidth={180}
                  sx={{ '& .MuiSelect-select, & .MuiInputBase-input': { color: 'white' }, '& .MuiInputLabel-root': { color: 'white' } }}
                />
              </div>
              <div className="mb-2">
                <MuiSelect
                  label="Branches"
                  options={selectedCompany?.branches.map(branch => ({ value: branch.branch_id, label: branch.branch_name })) || []}
                  value={selectedBranches}
                  onChange={val => handleBranchChange(Array.isArray(val) ? val.map(Number) : [Number(val)])}
                  multiple
                  placeholder="Select Branches"
                  disabled={!selectedCompany}
                  minWidth={180}
                  sx={{ '& .MuiSelect-select, & .MuiInputBase-input': { color: 'white' }, '& .MuiInputLabel-root': { color: 'white' } }}
                />
              </div>
            </>
          ) : (
            <div className="mb-2">
              {isClient && compshow === 1 && (
                <p className="text-sm">Console View</p>
              )}
              {(!isClient || isCollapsed) && (
                <p className="text-sm">&#8203;</p>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto pt-2">
          {isClient && compshow === 2 ? (
            <>
              {isLoading ? (
                <div className="px-4 py-2 text-center">
                  <span className="text-sm">Loading menu...</span>
                </div>
              ) : error ? (
                <div className="px-4 py-2 text-center">
                  <span className="text-sm text-red-300">{error}</span>
                </div>
              ) : (
                <>
                  {parentMenus.length > 0 ? (
                    <div className="px-2">
                      {parentMenus.map(menu => renderMenuItem(menu))}
                    </div>
                  ) : selectedBranches.length === 0 ? (
                    <div className="px-4 py-2 text-center">
                      <span className="text-sm">Please select at least one branch</span>
                    </div>
                  ) : (
                    <div className="px-4 py-2 text-center">
                      <span className="text-sm">No menus available</span>
                    </div>
                  )}
                </>
              )}
            </>
          ) : null}
        </div>
        <FixedMenu isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
