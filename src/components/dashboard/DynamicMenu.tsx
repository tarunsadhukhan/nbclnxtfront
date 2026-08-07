'use client';

import Link from "next/link";
import { ChevronDown } from "lucide-react";
//import { cn } from "@/lib/utils";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { useState } from "react";

export function DynamicMenu({ isCollapsed }: { isCollapsed: boolean }) {
  const { menuItems } = useSidebarContext();
  const [openMenus, setOpenMenus] = useState<number[]>([]);

  const toggleSubmenu = (menu_id: number) => {
    setOpenMenus(prev =>
      prev.includes(menu_id) ? prev.filter(id => id !== menu_id) : [...prev, menu_id]
    );
  };

  const renderMenuItem = (item: any) => {
    const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
    const isOpen = openMenus.includes(item.menu_id);
    return (
      <div key={item.menu_id}>
        <Link
          href={item.menu_path || "#"}
          className="flex items-center px-4 py-2 text-sm text-white hover:bg-[#005580] transition-colors"
          onClick={e => {
            if (hasSubmenu) {
              e.preventDefault();
              toggleSubmenu(item.menu_id);
            }
          }}
        >
          {/* You can add an icon here if your menu data supports it */}
          {!isCollapsed && (
            <>
              <span className="flex-1">{item.menu_name}</span>
              {hasSubmenu && <span><ChevronDown size={16} className={isOpen ? "rotate-180" : ""} /></span>}
            </>
          )}
        </Link>
        {hasSubmenu && isOpen && !isCollapsed && (
          <div className="ml-4 border-l border-[#005580]">
            {item.submenu?.map((subItem: any) => renderMenuItem(subItem))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto mt-4">
      {menuItems.map(item => renderMenuItem(item))}
    </nav>
  );
}
