'use client';

import Link from "next/link";
import { ChevronDown } from "lucide-react";
//import { cn } from "@/lib/utils";
import { useCompanyConsoleMenu } from "@/hooks/use-org-console_menu";
import {  useState } from "react"

interface MenuItem {
  title: string;
  path?: string;
  icon: React.ReactNode;
  submenu?: MenuItem[];
}

export function DynamicMenuCompanyConsole({ isCollapsed }: { isCollapsed: boolean }) {
  const { menuItems } = useCompanyConsoleMenu();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  console.log(menuItems)

  // const userid = localStorage.getItem("user_id");
  // console.log('userid from dynamic menu console',userid)

  const toggleSubmenu = (title: string) => {
    setOpenMenus(prev =>
      prev.includes(title) ? prev.filter(item => item !== title) : [...prev, title]
    );
  };

  const renderMenuItem = (item: MenuItem) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isOpen = openMenus.includes(item.title);

    return (
      <div key={item.title}>
        <Link
          href={item.path || "#"}
          className="sidebar-menu-link"
          onClick={(e) => {
            if (hasSubmenu) {
              e.preventDefault();
              toggleSubmenu(item.title);
            } 
          }}
        >
          <span className="sidebar-menu-icon">{item.icon}</span>
          {!isCollapsed && (
            <>
              <span className="sidebar-menu-title">{item.title}</span>
              {hasSubmenu && <ChevronDown size={16} className={`sidebar-menu-chevron ${isOpen ? "rotate-180" : ""}`} />}
            </>
          )}
        </Link>
        {hasSubmenu && isOpen && !isCollapsed && (
          <div className="sidebar-submenu">
            {item.submenu?.map(subItem => renderMenuItem(subItem))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto mt-4">
      {menuItems.map((item: MenuItem) => renderMenuItem(item))}
    </nav>
  );
}
