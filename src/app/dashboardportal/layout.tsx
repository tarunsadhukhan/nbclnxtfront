"use client"

import { ReactNode, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import ClassicTopBar from "@/components/dashboard/ClassicTopBar"
import ClassicSidebar from "@/components/dashboard/ClassicSidebar"
import { SidebarProvider, useSidebarContext } from "@/components/dashboard/sidebarContext"
import { determinePortalAction } from "@/utils/portalPermissions"
import SupportTicketWidget from "@/components/support/SupportTicketWidget"

function PortalPermissionBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasMenuAccess, menuPermissions } = useSidebarContext();

  useEffect(() => {
    if (!pathname.startsWith('/dashboardportal')) {
      return;
    }
    if (pathname === '/dashboardportal') {
      return;
    }
    const action = determinePortalAction(pathname);
    if (!menuPermissions || Object.keys(menuPermissions).length === 0) {
      // permissions not loaded yet; wait for middleware to handle redirect if token invalid
      return;
    }
    if (!hasMenuAccess(pathname, action)) {
      router.replace('/dashboardportal');
    }
  }, [hasMenuAccess, menuPermissions, pathname, router]);

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    // <ProtectedRoute>
    <SidebarProvider>
      <PortalPermissionBoundary>
        {/* classic-portal scopes the desktop-ERP palette to this dashboard only */}
        <div className="classic-portal flex flex-col h-screen bg-gray-100">
          {/* Single horizontal menu bar — replaces the sidebar and owns the
              menu/permission fetch it used to do */}
          <ClassicTopBar />

          <div className="flex-1 flex flex-row overflow-hidden">
            {/* Multi-level menu tree — same menus the top bar shows, both fed
                from SidebarContext */}
            <ClassicSidebar />

            {/* pb-24 keeps the floating support Fab (bottom-right) from covering
                page-bottom controls such as DataGrid pagination arrows */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white pb-24">
              {children}
            </main>
          </div>

          {/* Floating "raise a support ticket" widget — present on every portal page */}
          <SupportTicketWidget variant="portal" />
        </div>
      </PortalPermissionBoundary>
    </SidebarProvider>
    // </ProtectedRoute>
  )
}