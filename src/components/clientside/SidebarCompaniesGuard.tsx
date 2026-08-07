"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
// no UI needed while initializing; allow flicker

function normalize(p?: string) {
  return (p ?? '').replace(/^\/+|\/+$/g, '').toLowerCase();
}

export default function SidebarCompaniesGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);
  const [menuPaths, setMenuPaths] = React.useState<string[]>([]);

  React.useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem('sidebar_companies');
        if (!raw) {
          setMenuPaths([]);
          setReady(true);
          return;
        }
        const companies = JSON.parse(raw);
        const paths: string[] = [];
        if (Array.isArray(companies)) {
          for (const co of companies) {
            if (!co || !Array.isArray(co.branches)) continue;
            for (const br of co.branches) {
              if (!br || !Array.isArray(br.menus)) continue;
              for (const m of br.menus) {
                if (m && typeof m.menu_path === 'string') paths.push(normalize(m.menu_path));
              }
            }
          }
        }
        setMenuPaths(Array.from(new Set(paths)));
      } catch (e) {
        setMenuPaths([]);
      } finally {
        setReady(true);
      }
    };

    sync();
    const onStorage = (e: StorageEvent) => { if (e.key === 'sidebar_companies') sync(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    if (!pathname?.startsWith('/dashboardportal/')) return;
    const sub = normalize(pathname.replace(/^\/dashboardportal\//, ''));
    if (!sub) return; // root dashboard -> allow

    // Fail-closed: if we have no menuPaths, redirect to dashboard root
    if (!menuPaths || menuPaths.length === 0) {
      router.replace('/dashboardportal/');
      return;
    }

    const allowed = menuPaths.some((p) => {
      if (p === sub) return true;
      if (!p) return false;
      return sub.startsWith(`${p}/`);
    });

    if (!allowed) {
      router.replace('/dashboardportal/');
    }
  }, [ready, pathname, menuPaths, router]);

  // while initializing, return null (allow a brief flicker)
  if (!ready) return null;

  return null;
}
