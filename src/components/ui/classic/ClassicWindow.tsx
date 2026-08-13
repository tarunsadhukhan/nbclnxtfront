"use client";

import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useSidebarContextSafe } from "@/components/dashboard/sidebarContext";
import { getUser } from "@/utils/auth";
import { brand, classic } from "@/styles/brand";
import InfoSkyMark from "@/components/ui/InfoSkyMark";

/**
 * Classic Win32 desktop-ERP chrome (title bar → menu bar → tab strip → toolbar
 * → filter bar → grid → status bar), tinted to the InfoSky navy/green brand.
 * Palette lives in `@/styles/brand`; re-exported here so the classic screens
 * keep importing it from one place.
 */
export { classic };

export interface ClassicAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Draw a vertical rule before this button */
  separatorBefore?: boolean;
  /** Toggle buttons render pressed-in when active */
  active?: boolean;
}

interface ClassicWindowProps {
  /** Shown in the title bar and on the active document tab */
  title: string;
  actions: ClassicAction[];
  /** Filter / search strip rendered under the toolbar */
  filterBar?: React.ReactNode;
  /** Extra right-aligned status-bar text (e.g. record count) */
  statusRight?: React.ReactNode;
  children: React.ReactNode;
}

/** Sunken 3D panel, the classic "inset" look. */
const inset = {
  borderTop: `1px solid ${classic.border}`,
  borderLeft: `1px solid ${classic.border}`,
  borderRight: `1px solid ${classic.highlight}`,
  borderBottom: `1px solid ${classic.highlight}`,
};

function ToolbarButton({ action }: { action: ClassicAction }) {
  return (
    <>
      {action.separatorBefore ? (
        <Box sx={{ width: "2px", alignSelf: "stretch", my: "4px", borderLeft: `1px solid ${classic.border}`, borderRight: `1px solid ${classic.highlight}` }} />
      ) : null}
      <Box
        component="button"
        type="button"
        title={action.label}
        disabled={action.disabled}
        onClick={action.onClick}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2px",
          minWidth: 54,
          px: "8px",
          py: "4px",
          fontSize: 11,
          lineHeight: 1.1,
          color: classic.text,
          cursor: "pointer",
          background: action.active ? classic.faceEdge : "transparent",
          border: `1px solid ${action.active ? classic.border : "transparent"}`,
          borderRadius: "2px",
          "&:hover:not(:disabled)": {
            background: classic.hoverFrom,
            border: `1px solid ${classic.hoverBorder}`,
          },
          "&:disabled": { color: "#a0a0a0", cursor: "default", opacity: 0.6 },
        }}
      >
        {action.icon}
        <span>{action.label}</span>
      </Box>
    </>
  );
}

function StatusCell({ children, grow }: { children: React.ReactNode; grow?: boolean }) {
  return (
    <Box sx={{ ...inset, px: "8px", py: "1px", flex: grow ? 1 : "0 0 auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {children}
    </Box>
  );
}

export default function ClassicWindow({ title, actions, filterBar, statusRight, children }: ClassicWindowProps) {
  const sidebar = useSidebarContextSafe();
  const companyName = sidebar?.selectedCompany?.co_name ?? "—";
  const branchName =
    sidebar?.selectedCompany?.branches?.find((b) => b.branch_id === sidebar?.selectedBranches?.[0])?.branch_name ?? "All";

  // Everything in the status bar is client-only — the clock, and the user /
  // tenant / company / branch that come from localStorage (directly or via the
  // sidebar context's lazy initialiser). Hold them all back until after mount
  // so the server render and the first client render agree.
  const [mounted, setMounted] = useState(false);
  const [clock, setClock] = useState({ date: "", time: "" });
  const [userName, setUserName] = useState("");
  const [tenant, setTenant] = useState("");

  useEffect(() => {
    setMounted(true);
    setUserName(getUser()?.name || getUser()?.email || "user");
    setTenant(document.cookie.match(/(?:^|;\s*)subdomain=([^;]*)/)?.[1] ?? "");
    const tick = () => {
      const d = new Date();
      setClock({ date: d.toLocaleDateString("en-GB"), time: d.toLocaleTimeString("en-GB") });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Box
      sx={{
        m: "8px",
        border: `1px solid ${classic.border}`,
        background: classic.face,
        color: classic.text,
        fontFamily: "'Segoe UI', Tahoma, sans-serif",
        display: "flex",
        flexDirection: "column",
        // Fill the portal <main> (which owns the scrollbar) rather than the viewport.
        height: "calc(100% - 16px)",
        minHeight: 480,
        // Field styling (square, compact) now comes from the app theme, so
        // dialogs portalled outside this window match too.
      }}
    >
      {/* ── Title bar ─────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          px: "6px",
          height: 26,
          background: `linear-gradient(${classic.titleFrom}, ${classic.titleTo})`,
          borderBottom: `1px solid ${classic.titleBorder}`,
          fontSize: 12,
          fontWeight: 600,
          color: classic.titleText,
        }}
      >
        <InfoSkyMark size={14} navy={classic.titleText} green={brand.greenLight} />
        <span>InfoSky Global - [{title}]</span>
        {/* Window buttons are chrome only — real actions live on the toolbar. */}
        <Box sx={{ ml: "auto", display: "flex", gap: "2px" }} aria-hidden>
          {["–", "▫", "✕"].map((glyph, i) => (
            <Box
              key={glyph}
              sx={{
                width: 20, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, lineHeight: 1,
                border: `1px solid ${classic.titleBorder}`,
                background: i === 2 ? classic.danger : classic.face,
                color: i === 2 ? "#fff" : classic.text,
              }}
            >
              {glyph}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Menu strip lives in the portal top bar (ClassicTopBar), not per-window */}

      {/* ── Document tab strip ────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: "2px", px: "4px", pt: "3px", background: classic.faceEdge, borderBottom: `1px solid ${classic.border}` }}>
        <Box sx={{ px: "10px", py: "3px", fontSize: 12, color: classic.textMuted, borderTop: `1px solid ${classic.border}`, borderLeft: `1px solid ${classic.border}`, borderRight: `1px solid ${classic.border}`, background: classic.face }}>
          Dashboard
        </Box>
        <Box sx={{ px: "10px", py: "3px", fontSize: 12, fontWeight: 600, borderTop: `1px solid ${classic.border}`, borderLeft: `1px solid ${classic.border}`, borderRight: `1px solid ${classic.border}`, background: classic.surface, position: "relative", top: "1px" }}>
          {title} <span style={{ color: classic.textMuted }}>✕</span>
        </Box>
      </Box>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "stretch", gap: "2px", p: "4px", borderBottom: `1px solid ${classic.border}`, background: classic.face, flexWrap: "wrap" }}>
        {actions.map((a) => (
          <ToolbarButton key={a.label} action={a} />
        ))}
      </Box>

      {/* ── Filter bar ────────────────────────────────────────── */}
      {filterBar ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px", px: "8px", py: "5px", background: classic.face, borderBottom: `1px solid ${classic.border}`, flexWrap: "wrap", fontSize: 12 }}>
          {filterBar}
        </Box>
      ) : null}

      {/* ── Client area ───────────────────────────────────────── */}
      {/* Client area scrolls inside the frame — otherwise tall content (the
          employee wizard, long forms) paints straight over the status bar. */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: "6px", background: classic.face, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>

      {/* ── Status bar ────────────────────────────────────────── */}
      <Box sx={{ display: "flex", gap: "3px", px: "3px", py: "2px", fontSize: 11, background: classic.face, borderTop: `1px solid ${classic.highlight}` }}>
        <StatusCell>User: {userName || "—"}</StatusCell>
        <StatusCell>Company: {mounted ? companyName : "—"}</StatusCell>
        <StatusCell>Branch: {mounted ? branchName : "—"}</StatusCell>
        <StatusCell>{clock.date}</StatusCell>
        <StatusCell>{clock.time}</StatusCell>
        <StatusCell grow>{statusRight}</StatusCell>
        <StatusCell>Tenant: {tenant || "—"}</StatusCell>
      </Box>
    </Box>
  );
}

/** Classic flat button used in filter bars and pagers. */
export function ClassicButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Box
      component="button"
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        px: "8px",
        py: "3px",
        fontSize: 12,
        lineHeight: 1.2,
        color: classic.text,
        background: `linear-gradient(${classic.highlight}, ${classic.faceEdge})`,
        border: `1px solid ${classic.border}`,
        borderRadius: "2px",
        cursor: "pointer",
        "&:hover:not(:disabled)": { background: `linear-gradient(${classic.hoverFrom}, ${classic.hoverTo})` },
        "&:disabled": { color: "#a0a0a0", cursor: "default", opacity: 0.6 },
      }}
    >
      {children}
    </Box>
  );
}

/** Classic first/prev/next/last pager with page-size picker and record count. */
export function ClassicPager({
  page,
  pageSize,
  rowCount,
  onChange,
  pageSizeOptions = [10, 20, 50, 100],
}: {
  page: number;
  pageSize: number;
  rowCount: number;
  onChange: (model: { page: number; pageSize: number }) => void;
  pageSizeOptions?: number[];
}) {
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  const goTo = (next: number) => onChange({ page: Math.min(Math.max(next, 0), pageCount - 1), pageSize });
  const first = page === 0;
  const last = page >= pageCount - 1;

  return (
    <Box
      sx={{
        display: "flex", alignItems: "center", gap: "6px", fontSize: 12,
        px: "6px", py: "3px", mt: "-1px",
        background: classic.face, border: `1px solid ${classic.border}`,
      }}
    >
      <ClassicButton title="First page" onClick={() => goTo(0)} disabled={first}>«</ClassicButton>
      <ClassicButton title="Previous page" onClick={() => goTo(page - 1)} disabled={first}>‹</ClassicButton>
      <ClassicButton title="Next page" onClick={() => goTo(page + 1)} disabled={last}>›</ClassicButton>
      <ClassicButton title="Last page" onClick={() => goTo(pageCount - 1)} disabled={last}>»</ClassicButton>

      <span style={{ marginLeft: 8 }}>Page Size:</span>
      <Box
        component="select"
        value={pageSize}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ page: 0, pageSize: Number(e.target.value) })}
        sx={{ fontSize: 12, px: "4px", py: "2px", border: `1px solid ${classic.border}`, background: classic.surface }}
      >
        {pageSizeOptions.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </Box>

      <span style={{ marginLeft: "auto" }}>
        Page {page + 1} of {pageCount} ({rowCount} Records)
      </span>
    </Box>
  );
}

/** Compact 3D grid styling — apply to a DataGrid inside a ClassicWindow. */
export const classicGridSx: SxProps<Theme> = {
  border: `1px solid ${classic.border}`,
  borderRadius: 0,
  backgroundColor: classic.surface,
  fontSize: 12,
  "--DataGrid-containerBackground": classic.headerTo,
  "--DataGrid-rowBorderColor": classic.gridLine,
  "& .MuiDataGrid-columnHeader": {
    background: `linear-gradient(${classic.headerFrom}, ${classic.headerTo})`,
    borderRight: `1px solid ${classic.titleBorder}`,
  },
  // The title sits in nested wrappers that don't reliably inherit the header's
  // colour, so every layer is named explicitly — otherwise dark ink lands on
  // the navy and the labels disappear.
  [`& .MuiDataGrid-columnHeader,
    & .MuiDataGrid-columnHeaderTitleContainer,
    & .MuiDataGrid-columnHeaderTitleContainerContent,
    & .MuiDataGrid-columnHeaderTitle,
    & .MuiDataGrid-columnHeaderCheckbox .MuiCheckbox-root`]: {
    color: classic.headerText,
  },
  "& .MuiDataGrid-columnHeaderTitle": { fontSize: 12, fontWeight: 700 },
  // Sort/menu affordances inherit dark ink otherwise and disappear on navy.
  "& .MuiDataGrid-sortIcon, & .MuiDataGrid-menuIconButton, & .MuiDataGrid-filterIcon": {
    color: classic.headerText,
  },
  "& .MuiDataGrid-columnSeparator": { display: "none" },
  "& .MuiDataGrid-cell": {
    borderRight: `1px solid ${classic.gridLine}`,
    fontSize: 12,
    px: "8px",
  },
  "& .MuiDataGrid-row:hover": { backgroundColor: classic.rowHover },
  "& .MuiDataGrid-row.classic-current, & .MuiDataGrid-row.classic-current:hover": {
    backgroundColor: classic.selection,
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
    outline: "none",
  },
};
