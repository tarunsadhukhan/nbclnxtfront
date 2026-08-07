'use client';
import Link from "next/link";
import { Users, LogOut, Key } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function FixedMenu({ isCollapsed }: { isCollapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  let compshow = 1;
  const currentHost = typeof window !== "undefined" ? window.location.host : "";
  // console.log("Detected Host:", currentHost, typeof window !== "undefined" ? window.location.href : "");
  if (currentHost === "admin.vwxxx.co.in" || currentHost === "localhost:3001") {
    compshow = 1;
  } else {
    compshow = 2;
  }

  const handleLogout = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Remove access_token from cookies if needed
    localStorage.removeItem("user");
    localStorage.clear();
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
