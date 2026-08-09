"use client"

import { ReactNode, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Sidebar from "@/components/dashboard/sidebar"
import { SidebarProvider, useSidebarContext } from "@/components/dashboard/sidebarContext"
import { determinePortalAction } from "@/utils/portalPermissions"
import { Menu } from "lucide-react"
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  return (
    // <ProtectedRoute>
    <SidebarProvider>
      <PortalPermissionBoundary>
        <div className="flex flex-col md:flex-row h-screen bg-gray-100">
          {/* Mobile top bar — visible only on small screens */}
          <div className="md:hidden flex items-center justify-end bg-[hsl(var(--sidebar-bg))] px-4 py-3 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="text-[hsl(var(--sidebar-fg))] p-1"
              aria-label="Toggle menu"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Mobile sidebar overlay */}
          {isMobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="fixed top-0 left-0 bottom-0 w-72 z-50 md:hidden">
                <Sidebar
                  isCollapsed={false}
                  onToggle={() => setIsMobileMenuOpen(false)}
                  isMobile
                  onClose={() => setIsMobileMenuOpen(false)}
                />
              </div>
            </>
          )}

          {/* Desktop sidebar — hidden on mobile */}
          <div className="hidden md:block">
            <Sidebar 
              isCollapsed={isSidebarCollapsed} 
              onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onMouseEnter={() => setIsSidebarCollapsed(false)}
              onMouseLeave={() => setIsSidebarCollapsed(true)}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
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