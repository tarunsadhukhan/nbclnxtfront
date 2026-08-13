"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import { normalisePortalPath } from "@/utils/portalPermissions";
import { useSidebarContext, type MenuItem } from "@/components/dashboard/sidebarContext";
import useCompanyLogo from "@/hooks/useCompanyLogo";
import { resolveMenuIcon } from "@/components/dashboard/menuIcon";
import InfoSkyMark from "@/components/ui/InfoSkyMark";
import { brand } from "@/styles/brand";

/** Navigation rail surface colours, drawn from the InfoSky brand palette. */
const rail = {
  bg: brand.navy800,
  bgHeader: brand.navy900,
  divider: brand.navy700,
  itemActive: brand.navy700,
  itemHover: "rgba(255,255,255,0.06)",
  accent: brand.green,
  text: brand.onNavy,
  textStrong: "#ffffff",
  textMuted: brand.onNavyMuted,
} as const;

const WIDTH = 232;
const STRIP_W = 18;
const CHEVRON_W = 16;
const ICON_W = 20;
const COLLAPSE_KEY = "sidebar_collapsed";

/**
 * A Material Symbols glyph. `menu_mst.menu_icon` stores ligature names for this
 * set, so the name is rendered as the element's text and the font substitutes
 * the glyph. Unknown names render nothing rather than leaking the raw word,
 * because the font is loaded with display=block.
 */
function MenuGlyph({ name, color }: { name: string; color: string }) {
  return (
    <Box
      component="span"
      aria-hidden
      className="material-symbols-outlined"
      sx={{
        width: ICON_W, flex: `0 0 ${ICON_W}px`,
        fontSize: 15, lineHeight: 1, color,
        userSelect: "none",
      }}
    >
      {name}
    </Box>
  );
}

interface TreeNodeProps {
  menu: MenuItem;
  depth: number;
  childrenOf: (parentId: number) => MenuItem[];
  expanded: number[];
  onToggle: (menuId: number) => void;
  activePath: string;
}

function TreeNode({ menu, depth, childrenOf, expanded, onToggle, activePath }: TreeNodeProps) {
  const kids = childrenOf(menu.menu_id);
  const isOpen = expanded.includes(menu.menu_id);
  const isActive = Boolean(menu.menu_path) && normalisePortalPath(menu.menu_path) === activePath;
  const isSection = depth === 0;
  const router = useRouter();

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 26,
          pr: "8px",
          pl: `${6 + depth * 12}px`,
          position: "relative",
          background: isActive ? rail.itemActive : "transparent",
          "&:hover": { background: isActive ? rail.itemActive : rail.itemHover },
          // Accent bar marks the current page
          ...(isActive && {
            "&::before": {
              content: '""',
              position: "absolute",
              left: 0, top: 0, bottom: 0,
              width: "3px",
              background: rail.accent,
            },
          }),
        }}
      >
        {kids.length > 0 ? (
          <Box
            component="button"
            type="button"
            aria-label={isOpen ? `Collapse ${menu.menu_name}` : `Expand ${menu.menu_name}`}
            aria-expanded={isOpen}
            onClick={() => onToggle(menu.menu_id)}
            sx={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: CHEVRON_W, flex: `0 0 ${CHEVRON_W}px`,
              p: 0, border: "none", background: "transparent",
              color: rail.textMuted, cursor: "pointer",
              "&:hover": { color: rail.textStrong },
            }}
          >
            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </Box>
        ) : (
          <Box sx={{ width: CHEVRON_W, flex: `0 0 ${CHEVRON_W}px` }} aria-hidden />
        )}

        <MenuGlyph
          name={resolveMenuIcon(menu)}
          color={isActive ? rail.accent : rail.textMuted}
        />

        {/* Branch nodes are both navigable and expandable: the label navigates,
            the chevron only opens. Nodes with no path just toggle. */}
        <Box
          component="button"
          type="button"
          onClick={() =>
            menu.menu_path
              ? router.push(`/dashboardportal/${menu.menu_path}`)
              : kids.length > 0 && onToggle(menu.menu_id)
          }
          title={menu.menu_name}
          sx={{
            flex: 1, textAlign: "left",
            px: "4px", py: "3px",
            fontSize: isSection ? 10.5 : 12,
            lineHeight: 1.35,
            letterSpacing: isSection ? "0.06em" : 0,
            textTransform: isSection ? "uppercase" : "none",
            fontWeight: isSection ? 700 : isActive ? 600 : 400,
            color: isActive ? rail.textStrong : isSection ? rail.textMuted : rail.text,
            background: "transparent", border: "none", cursor: "pointer",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            "&:hover": { color: rail.textStrong },
          }}
        >
          {menu.menu_name}
        </Box>
      </Box>

      {isOpen
        ? kids.map((child) => (
            <TreeNode
              key={child.menu_id}
              menu={child}
              depth={depth + 1}
              childrenOf={childrenOf}
              expanded={expanded}
              onToggle={onToggle}
              activePath={activePath}
            />
          ))
        : null}
    </>
  );
}

/**
 * Portal navigation tree — dark rail, chevron-expand, unlimited depth
 * (menu → sub-menu → sub-sub-menu → …), rebuilt from the flat menu list's
 * `menu_parent_id` links.
 *
 * Render-only for menu data: `ClassicTopBar` owns the menu/permission fetch and
 * expand state lives in `SidebarContext` (already persisted to localStorage).
 * The company logo comes from the existing `useCompanyLogo` hook.
 */
export default function ClassicSidebar() {
  const pathname = usePathname();
  const {
    availableMenus, parentMenus, expandedMenus, setExpandedMenus,
    selectedCompany, selectedBranches,
  } = useSidebarContext();

  // Menus reach the context from localStorage via its lazy initialiser, so they
  // don't exist during SSR — hold the rail's body back until mount or the first
  // client render won't match the server's.
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setMounted(true);
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1"); } catch { /* ignore */ }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const logo = useCompanyLogo(selectedCompany?.co_id);

  const childrenOf = useCallback(
    (parentId: number) => (availableMenus ?? []).filter((m) => m.menu_parent_id === parentId),
    [availableMenus],
  );

  const onToggle = useCallback(
    (menuId: number) =>
      setExpandedMenus((prev) =>
        prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId],
      ),
    [setExpandedMenus],
  );

  const activePath = useMemo(() => normalisePortalPath(pathname), [pathname]);

  const branchLabel = useMemo(() => {
    const picked = (selectedCompany?.branches ?? []).filter((b) => selectedBranches.includes(b.branch_id));
    if (picked.length === 0) return "";
    return picked.length === 1 ? picked[0].branch_name : `${picked.length} branches`;
  }, [selectedCompany, selectedBranches]);

  // Company/branch come from localStorage via the context's lazy initialiser, so
  // they are absent on the server and present on the client's very first render.
  // Gate them ONCE here — gating each JSX expression separately is how the title
  // attribute previously slipped through and broke hydration.
  const coName = mounted ? selectedCompany?.co_name ?? "" : "";
  const branchText = mounted ? branchLabel : "";

  if (mounted && collapsed) {
    return (
      <Box
        component="nav"
        aria-label="Portal menu"
        sx={{
          width: STRIP_W, flex: `0 0 ${STRIP_W}px`,
          background: rail.bg,
          borderRight: `1px solid ${rail.divider}`,
          display: "flex", justifyContent: "center", pt: "6px",
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={toggleCollapsed}
          aria-label="Show menu"
          aria-expanded={false}
          title="Show menu"
          sx={{
            width: "100%", height: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
            p: 0, border: "none", background: "transparent",
            color: rail.textMuted, cursor: "pointer",
            "&:hover": { color: rail.textStrong, background: rail.itemHover },
          }}
        >
          <Menu size={14} />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      component="nav"
      aria-label="Portal menu"
      sx={{
        width: WIDTH, flex: `0 0 ${WIDTH}px`,
        display: "flex", flexDirection: "column",
        background: rail.bg,
        borderRight: `1px solid ${rail.divider}`,
        fontFamily: "'Segoe UI', Tahoma, sans-serif",
        color: rail.text,
      }}
    >
      {/* ── Company header ───────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex", alignItems: "center", gap: "8px",
          px: "10px", py: "8px",
          background: rail.bgHeader,
          borderBottom: `1px solid ${rail.divider}`,
        }}
      >
        {/* A company that has uploaded a co_logo (base64 data URI) shows it;
            everyone else gets the InfoSky mark rather than a blank box. */}
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            style={{ width: 30, height: 30, objectFit: "contain", flex: "0 0 30px", borderRadius: 3, background: "#fff" }}
          />
        ) : (
          <InfoSkyMark size={30} navy={rail.textStrong} green={brand.greenLight} />
        )}

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              fontSize: 12, fontWeight: 600, color: rail.textStrong,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
            title={coName}
          >
            {coName || " "}
          </Box>
          <Box
            sx={{
              fontSize: 10, color: rail.textMuted,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {branchText || " "}
          </Box>
        </Box>

        <Box
          component="button"
          type="button"
          onClick={toggleCollapsed}
          aria-label="Hide menu"
          aria-expanded
          title="Hide menu"
          sx={{
            display: "flex", alignItems: "center", justifyContent: "center",
            flex: "0 0 auto", p: "3px",
            border: "none", background: "transparent",
            color: rail.textMuted, cursor: "pointer",
            "&:hover": { color: rail.textStrong, background: rail.itemHover },
          }}
        >
          <Menu size={14} />
        </Box>
      </Box>

      {/* ── Menu tree ────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", py: "4px" }}>
        {!mounted ? null : parentMenus.length === 0 ? (
          <Box sx={{ px: "10px", py: "6px", fontSize: 12, color: rail.textMuted }}>(no menus)</Box>
        ) : (
          parentMenus.map((menu) => (
            <TreeNode
              key={menu.menu_id}
              menu={menu}
              depth={0}
              childrenOf={childrenOf}
              expanded={expandedMenus ?? []}
              onToggle={onToggle}
              activePath={activePath}
            />
          ))
        )}
      </Box>
    </Box>
  );
}
