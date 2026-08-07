'use client';
import LogoSection from "./LogoSection";
import { DynamicMenuConsole } from "./DynamicMenuConsole";
import { FixedMenuConsole } from "./FixedMenuConsole";
// import { cn } from "@/utils/protected"



interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function sidebarConsole({ isCollapsed, onToggle }: SidebarProps) {
  
 
    return (
    <div className={`sidebar-container ${isCollapsed ? "w-20" : "w-56"}`}>

    <div className="sidebar-container">
      <LogoSection isCollapsed={isCollapsed} onToggle={onToggle} logoSrc="path/to/logo.png" title="Your Title" />
        <DynamicMenuConsole isCollapsed={isCollapsed} />  
      <FixedMenuConsole isCollapsed={isCollapsed} /> 
    </div>
        </div>

  );
}
