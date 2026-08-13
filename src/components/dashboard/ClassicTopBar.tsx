"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Menu, MenuItem, Divider } from "@mui/material";
import { useRouter } from "next/navigation";
import { LogOut, Key, User, ChevronDown } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutes } from "@/utils/api";
import { normalisePortalPath } from "@/utils/portalPermissions";
import { useSidebarContext, type MenuItem as PortalMenu } from "@/components/dashboard/sidebarContext";
import { classic } from "@/components/ui/classic/ClassicWindow";
import { brand } from "@/styles/brand";

/** classic.danger is tuned for light surfaces and goes muddy on navy. */
const ERROR_ON_NAVY = "#ff9a9a";

/**
 * The portal's single horizontal menu bar — it replaces the old sidebar, so it
 * also inherits the sidebar's job of loading the menu tree and the action
 * permissions (nothing else fetches them).
 *
 * Company/branch are chosen at login and shown here read-only; switching means
 * signing out and back in.
 */
export default function ClassicTopBar() {
  const router = useRouter();
  const {
    companies, setCompanies,
    selectedCompany, selectedBranches,
    availableMenus, parentMenus,
    setMenuPermissions,
  } = useSidebarContext();

  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<{ el: HTMLElement; menuId: number } | null>(null);
  const [openUser, setOpenUser] = useState<HTMLElement | null>(null);
  // Company/branch reach us from localStorage (via the context's lazy
  // initialiser), so they don't exist during SSR — hold the scope back until
  // after mount or the first client render won't match the server's.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ─── Menu tree + permissions (moved here from the sidebar) ───────
  useEffect(() => {
    let cancelled = false;

    // Prefer the cache the login step wrote, so we don't refetch on every nav.
    try {
      const cached = localStorage.getItem("sidebar_companies");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCompanies(parsed);
        }
      }
    } catch (err) {
      console.warn("Failed to parse cached sidebar_companies", err);
    }

    const load = async () => {
      try {
        const result = await fetchWithCookie(apiRoutes.PORTAL_MENU_ITEMS, "GET");
        if (cancelled) return;

        if (result.status === 401 || result.status === 403) {
          try { localStorage.clear(); } catch { /* ignore */ }
          window.location.href = "/";
          return;
        }
        if (result.error) { setError(result.error); return; }
        if (!Array.isArray(result.data)) { setError("Failed to load menu data"); return; }

        setCompanies(result.data);

        const permissionResult = await fetchWithCookie(apiRoutes.PORTAL_MENU_PERMISSIONS, "GET");
        if (cancelled) return;
        if (permissionResult.status >= 200 && permissionResult.status < 300 && permissionResult.data) {
          const payload = permissionResult.data as { permissions?: Record<string, unknown> };
          const normalised: Record<string, number> = {};
          Object.entries(payload.permissions ?? {}).forEach(([key, value]) => {
            const cleaned = normalisePortalPath(key);
            if (!cleaned) return;
            const numeric = typeof value === "number" ? value : Number(value);
            if (Number.isFinite(numeric)) normalised[cleaned] = numeric;
          });
          setMenuPermissions(normalised);
        } else {
          setMenuPermissions({});
        }
      } catch {
        if (!cancelled) setError("Error loading menu data");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [setCompanies, setMenuPermissions]);

  /** Flatten a menu's descendants depth-first, keeping depth for indentation. */
  const descendants = useMemo(() => {
    const walk = (parentId: number, depth: number): { menu: PortalMenu; depth: number }[] =>
      (availableMenus ?? [])
        .filter((m) => m.menu_parent_id === parentId)
        .flatMap((menu) => [{ menu, depth }, ...walk(menu.menu_id, depth + 1)]);
    return walk;
  }, [availableMenus]);

  const branchLabel = useMemo(() => {
    const branches = selectedCompany?.branches ?? [];
    const picked = branches.filter((b) => selectedBranches.includes(b.branch_id));
    if (picked.length === 0) return "—";
    if (picked.length === 1) return picked[0].branch_name;
    return `${picked.length} branches`;
  }, [selectedCompany, selectedBranches]);

  const handleLogout = () => {
    try { localStorage.clear(); } catch { /* ignore */ }
    router.push("/");
  };

  const items = openMenu ? descendants(openMenu.menuId, 0) : [];

  return (
    <Box
      sx={{
        display: "flex", alignItems: "center", gap: "2px",
        px: "6px", minHeight: 26,
        background: `linear-gradient(${classic.titleFrom}, ${classic.titleTo})`,
        borderBottom: `1px solid ${classic.border}`,
        fontFamily: "'Segoe UI', Tahoma, sans-serif",
        fontSize: 12,
        color: classic.titleText,
        flexWrap: "wrap",
      }}
    >
      {parentMenus.map((menu) => (
        <Box
          key={menu.menu_id}
          component="button"
          type="button"
          onClick={(e: React.MouseEvent<HTMLElement>) => setOpenMenu({ el: e.currentTarget, menuId: menu.menu_id })}
          sx={{
            px: "8px", py: "3px", fontSize: 12, cursor: "pointer", border: "none",
            color: "inherit",
            background: openMenu?.menuId === menu.menu_id ? brand.navy700 : "transparent",
            "&:hover": { background: brand.navy700 },
          }}
        >
          {menu.menu_name}
        </Box>
      ))}

      {error ? <Box sx={{ px: "8px", color: ERROR_ON_NAVY }}>{error}</Box> : null}

      {/* ── Right side: company/branch (read-only) + user settings ── */}
      <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: "8px", pr: "2px" }}>
        {!mounted ? (
          <Box sx={{ px: "6px", color: brand.onNavyMuted }}>&nbsp;</Box>
        ) : companies.length > 0 && !selectedCompany ? (
          // Scope is picked at login and never defaulted, so say so loudly
          // rather than showing data under the wrong company name.
          <Box
            component="a"
            href="/"
            sx={{ px: "6px", color: ERROR_ON_NAVY, fontWeight: 600, textDecoration: "underline" }}
          >
            No company selected — sign in again
          </Box>
        ) : (
          <Box sx={{ px: "6px", color: brand.onNavyMuted }}>
            {selectedCompany?.co_name ?? "—"} · {branchLabel}
          </Box>
        )}
        <Box
          component="button"
          type="button"
          onClick={(e: React.MouseEvent<HTMLElement>) => setOpenUser(e.currentTarget)}
          sx={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            px: "8px", py: "3px", fontSize: 12, cursor: "pointer",
            color: "inherit", background: "transparent", border: "none",
            "&:hover": { background: brand.navy700 },
          }}
        >
          <User size={13} /> User Settings <ChevronDown size={12} />
        </Box>
      </Box>

      {/* ── Menu dropdown ─────────────────────────────────────────── */}
      <Menu
        open={Boolean(openMenu)}
        anchorEl={openMenu?.el ?? null}
        onClose={() => setOpenMenu(null)}
        slotProps={{ paper: { sx: { borderRadius: 0, border: `1px solid ${classic.border}`, background: classic.face } } }}
        MenuListProps={{ dense: true, sx: { py: "2px" } }}
      >
        {items.length === 0 ? (
          <MenuItem disabled sx={{ fontSize: 12 }}>(no sub-menus)</MenuItem>
        ) : (
          items.map(({ menu, depth }) => (
            <MenuItem
              key={menu.menu_id}
              sx={{ fontSize: 12, pl: `${12 + depth * 14}px`, minHeight: 24 }}
              onClick={() => { setOpenMenu(null); router.push(`/dashboardportal/${menu.menu_path}`); }}
            >
              {menu.menu_name}
            </MenuItem>
          ))
        )}
      </Menu>

      {/* ── User settings dropdown ────────────────────────────────── */}
      <Menu
        open={Boolean(openUser)}
        anchorEl={openUser}
        onClose={() => setOpenUser(null)}
        slotProps={{ paper: { sx: { borderRadius: 0, border: `1px solid ${classic.border}`, background: classic.face } } }}
        MenuListProps={{ dense: true, sx: { py: "2px" } }}
      >
        <MenuItem disabled sx={{ fontSize: 11, opacity: 0.8 }}>
          {companies.length > 0 ? "Sign out to change company/branch" : "Not signed in"}
        </MenuItem>
        <Divider sx={{ my: "2px" }} />
        <MenuItem sx={{ fontSize: 12, minHeight: 24 }} onClick={() => { setOpenUser(null); router.push("/reset-password"); }}>
          <Key size={13} style={{ marginRight: 6 }} /> Change Password
        </MenuItem>
        <MenuItem sx={{ fontSize: 12, minHeight: 24 }} onClick={handleLogout}>
          <LogOut size={13} style={{ marginRight: 6 }} /> Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}
