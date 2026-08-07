"use client"

import { useState } from "react"
//import { usePathname } from "next/navigation"
import SidebarConsole from "@/components/dashboard/sidebarCompanyConsole"
import SupportTicketWidget from "@/components/support/SupportTicketWidget"
// import Header from "@/components/dashboard/header"
// import ProtectedRoute from '@/components/auth/protected-route'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
 //const pathname = usePathname()

  return (
    // <ProtectedRoute>
    <div className="flex h-screen bg-gray-100">
      <SidebarConsole 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      /> 
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* <Header /> */}
        {/* pb-24 keeps the floating support Fab (bottom-right) from covering
            page-bottom controls such as DataGrid pagination arrows */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white pb-24">
          {children}
        </main>
      </div>

      {/* Floating "raise a support ticket" widget — present on every tenant-admin page */}
      <SupportTicketWidget variant="admin" />
    </div>
    // </ProtectedRoute>
  )
}