"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutes } from "@/utils/api";

/**
 * Tenant Admin > User Management Portal > Mobile Menu Permissions.
 * Per portal role, which mobile app menus are allowed and with which actions.
 * Groups have no flags of their own: the mobile app shows a group when any child is visible.
 */

const FLAGS = ["can_view", "can_add", "can_modify", "can_delete", "can_print"] as const;
type Flag = (typeof FLAGS)[number];
const FLAG_LABELS: Record<Flag, string> = {
  can_view: "View",
  can_add: "Add",
  can_modify: "Modify",
  can_delete: "Delete",
  can_print: "Print",
};

const flag = z.coerce.number().transform((n) => n === 1);
const menuSchema = z.object({
  menu_id: z.number(),
  menu_name: z.string(),
  parent_id: z.number().nullable(),
  is_group: flag,
  can_view: flag,
  can_add: flag,
  can_modify: flag,
  can_delete: flag,
  can_print: flag,
});
const responseSchema = z.object({
  roles: z.array(z.object({ role_id: z.number(), role_name: z.string() })),
  menus: z.array(menuSchema),
});
type MobileMenu = z.infer<typeof menuSchema>;
type Role = z.infer<typeof responseSchema>["roles"][number];

/** Depth-first order so children render under their group, with indent depth. */
function toTree(menus: MobileMenu[]): { menu: MobileMenu; depth: number }[] {
  const ids = new Set(menus.map((m) => m.menu_id));
  const children = new Map<number | null, MobileMenu[]>();
  for (const m of menus) {
    const key = m.parent_id !== null && ids.has(m.parent_id) ? m.parent_id : null;
    children.set(key, [...(children.get(key) ?? []), m]);
  }
  const out: { menu: MobileMenu; depth: number }[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const m of children.get(parent) ?? []) {
      out.push({ menu: m, depth });
      walk(m.menu_id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export default function MobileAppMenuPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<string>("");
  const [menus, setMenus] = useState<MobileMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);

  const load = useCallback(async (role: string) => {
    setLoading(true);
    const url = role
      ? `${apiRoutes.PORTAL_MOBILE_MENU_PERMISSIONS}?role_id=${encodeURIComponent(role)}`
      : apiRoutes.PORTAL_MOBILE_MENU_PERMISSIONS;
    const result = await fetchWithCookie<unknown>(url, "GET");
    const parsed = responseSchema.safeParse(result.data);
    if (result.error || !parsed.success) {
      setSnackbar({ message: result.error || "Unexpected response from server", severity: "error" });
    } else {
      setRoles(parsed.data.roles);
      setMenus(parsed.data.menus);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(roleId);
  }, [load, roleId]);

  const rows = useMemo(() => toTree(menus), [menus]);

  const setFlag = useCallback((menuId: number, f: Flag, value: boolean) => {
    setMenus((prev) =>
      prev.map((m) => {
        if (m.menu_id !== menuId) return m;
        const next = { ...m, [f]: value };
        // Any action implies view; removing view removes everything.
        if (f !== "can_view" && value) next.can_view = true;
        if (f === "can_view" && !value) FLAGS.forEach((k) => (next[k] = false));
        return next;
      }),
    );
  }, []);

  const setAll = useCallback((menuId: number, value: boolean) => {
    setMenus((prev) =>
      prev.map((m) => (m.menu_id === menuId ? { ...m, ...Object.fromEntries(FLAGS.map((f) => [f, value])) } : m)),
    );
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload = {
      role_id: Number(roleId),
      data: menus
        .filter((m) => !m.is_group)
        .map((m) => ({ menu_id: m.menu_id, ...Object.fromEntries(FLAGS.map((f) => [f, m[f]])) })),
    };
    const result = await fetchWithCookie(apiRoutes.PORTAL_MOBILE_MENU_PERMISSIONS_SUBMIT, "POST", payload);
    setSnackbar(
      result.error
        ? { message: result.error, severity: "error" }
        : { message: "Mobile menu permissions saved", severity: "success" },
    );
    setSaving(false);
  }, [menus, roleId]);

  return (
    <Box className="min-h-screen p-8">
      <Box className="mx-auto max-w-5xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, color: "primary.main" }}>
            Mobile Menu Permissions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Choose which mobile app menus each portal role can use, and what it can do in them
          </Typography>
        </Box>

        <Paper sx={{ p: 3, mb: 3 }}>
          <TextField
            select
            label="Role"
            size="small"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            sx={{ minWidth: 320 }}
          >
            {roles.map((r) => (
              <MenuItem key={r.role_id} value={String(r.role_id)}>
                {r.role_name}
              </MenuItem>
            ))}
          </TextField>
        </Paper>

        {loading ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <CircularProgress size={24} />
          </Paper>
        ) : !roleId ? (
          <Alert severity="info">Select a role to set its mobile menu permissions.</Alert>
        ) : menus.length === 0 ? (
          <Alert severity="warning">No mobile menus are set up for this tenant.</Alert>
        ) : (
          <Paper sx={{ p: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Menu</TableCell>
                  <TableCell align="center">All</TableCell>
                  {FLAGS.map((f) => (
                    <TableCell key={f} align="center">
                      {FLAG_LABELS[f]}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(({ menu, depth }) => {
                  const all = FLAGS.every((f) => menu[f]);
                  const some = FLAGS.some((f) => menu[f]);
                  return (
                    <TableRow key={menu.menu_id} hover={!menu.is_group}>
                      <TableCell sx={{ pl: 2 + depth * 3, fontWeight: menu.is_group ? 600 : 400 }}>
                        {menu.menu_name}
                      </TableCell>
                      {menu.is_group ? (
                        <TableCell colSpan={FLAGS.length + 1} />
                      ) : (
                        <>
                          <TableCell align="center">
                            <Checkbox
                              size="small"
                              checked={all}
                              indeterminate={some && !all}
                              onChange={(e) => setAll(menu.menu_id, e.target.checked)}
                              inputProps={{ "aria-label": `All actions for ${menu.menu_name}` }}
                            />
                          </TableCell>
                          {FLAGS.map((f) => (
                            <TableCell key={f} align="center">
                              <Checkbox
                                size="small"
                                checked={menu[f]}
                                onChange={(e) => setFlag(menu.menu_id, f, e.target.checked)}
                                inputProps={{ "aria-label": `${FLAG_LABELS[f]} for ${menu.menu_name}` }}
                              />
                            </TableCell>
                          ))}
                        </>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Permissions"}
              </Button>
            </Box>
          </Paper>
        )}

        <Snackbar
          open={snackbar !== null}
          autoHideDuration={4000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity ?? "success"} sx={{ width: "100%" }}>
            {snackbar?.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
