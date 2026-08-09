'use client';
import Image from "next/image";
import { X } from "lucide-react"

interface LogoSectionProps {
  isCollapsed: boolean;
  onToggle: () => void;
  logoSrc: string;
  title: string;
  isMobile?: boolean;
  onClose?: () => void;
}

const LogoSection = ({ isCollapsed, onToggle, isMobile, onClose }: LogoSectionProps) => {
  const handleChangeDashboard = () => {
    window.location.href = "/dashboard";
  };

  return (
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--sidebar-accent))]">
        {!isCollapsed && (
          <div className="logoBlock flex items-center gap-2 cursor-pointer" onClick={handleChangeDashboard}>
                <Image src="/app-icons/android-192.png"
                height={28}
                width={28}
                alt="Logo"
                className="h-7 w-auto"
                unoptimized
                loading="eager"
                priority />
                <span className="text-[hsl(var(--sidebar-fg))] font-semibold text-sm leading-tight whitespace-nowrap">
                  Global Erp Solutions
                </span>
              </div>
        )}
        {isCollapsed && (
          <div className="logoBlock mx-auto">
                <Image src="/app-icons/android-192.png"
                height={24}
                width={24}
                alt="Logo"
                className="h-6 w-6"
                unoptimized
                loading="eager"
                priority
                onClick={handleChangeDashboard} />
              </div>
        )}
        {isMobile && (
          <button
            onClick={onClose}
            className="text-[hsl(var(--sidebar-fg))] p-1 hover:bg-[hsl(var(--sidebar-accent))] rounded"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
        </div>
  );
};

export default LogoSection; // ✅ Ensure Default Export
