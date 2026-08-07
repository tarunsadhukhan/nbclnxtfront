'use client';
import Link from "next/link";
import { Users, LogOut,  Key } from "lucide-react";
import {  useState } from "react"
import { useRouter } from "next/navigation"
 

export function FixedMenuConsole({ isCollapsed }: { isCollapsed: boolean }) {
 
  const [open, setOpen] = useState(false);
  const router = useRouter()
   

const handleLogout = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault(); // Prevent default navigation behavior
  console.log("Logging out...");
  localStorage.removeItem("user");  // Remove user data
  localStorage.removeItem("jwtToken"); 
  // Clear localStorage
  localStorage.removeItem("user");
  localStorage.removeItem("jwtToken");
  localStorage.clear();
  console.log(localStorage.user,'for user')
  // Redirect to login page manually
  router.push("/");
};

  return (
    <div className="sidebar-section-border">
      <div
        className="sidebar-user-settings"
        onClick={() => setOpen(!open)}
      >
        <Users size={20} className="sidebar-menu-icon" />
        {!isCollapsed && <span className="sidebar-menu-title">User Settings</span>}
      </div>

      {open && !isCollapsed && (
        <div className="sidebar-submenu">
          <Link href="/" className="sidebar-submenu-link" onClick={handleLogout}>
            <LogOut size={16} className="mr-2 inline" /> Logout
          </Link>
          <Link href="/reset-password" className="sidebar-submenu-link">
            <Key size={16} className="mr-2 inline" /> Change Password
          </Link>
        </div>
      )}
    </div>
  );
}
