"use client";

import Selects from "react-select";
import { useCompany } from "@/hooks/use-org"; // ✅ Fetch company list from API
import { Skeleton } from "@/components/ui/skeleton"; // ✅ Show loading effect
import { StylesConfig } from "react-select";

interface CompanySelectionProps {
  isCollapsed: boolean;
}

export function CompanySelection({ isCollapsed }: CompanySelectionProps) {
  const { companies, selectedCompany, handleCompanyChange, loading } = useCompany();

  // ✅ Transform API data into dropdown options using SidebarContext Company shape
  const companyOptions = companies.map((company) => ({
  value: String(company.co_id),
    label: `${company.co_name}`,
  }));

  // ✅ Custom Styles for react-select
  const customStyles: StylesConfig<{ value: string; label: string }, false> = {
    option: (provided, state) => ({
      ...provided,
      color: state.isSelected ? "white" : "black",
      backgroundColor: state.isSelected ? "hsl(var(--brand-primary))" : "white",
      "&:hover": { backgroundColor: "#f0f0f0" },
    }),
    control: (provided) => ({
      ...provided,
      backgroundColor: "transparent",
      borderColor: "hsl(var(--sidebar-accent))",
      color: "hsl(var(--sidebar-fg))",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "hsl(var(--sidebar-fg))",
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "white",
    }),
    input: (provided) => ({
      ...provided,
      color: "hsl(var(--sidebar-fg))",
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "hsl(var(--sidebar-fg))",
    }),
  };

  return (
    <div className="px-4 py-3 border-b border-[hsl(var(--sidebar-accent))]">
      {loading ? (
        <Skeleton className="h-10 w-full bg-[hsl(var(--sidebar-accent))]" />
      ) : isCollapsed ? (
        <></>
      ) : (
        <div className="react-dropdown-select">
          <Selects
            options={companyOptions}
            value={companyOptions.find((option) => option.value === String(selectedCompany?.co_id))}
            onChange={(selectedOption) => {
              const companyIdStr = selectedOption?.value as string | undefined;
              if (typeof companyIdStr !== "undefined") handleCompanyChange(Number(companyIdStr));
            }}
            isSearchable
            styles={customStyles}
            placeholder="Select Company"
          />
        </div>
      )}
    </div>
  );
}
