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
      backgroundColor: state.isSelected ? "#005580" : "white",
      "&:hover": { backgroundColor: "#f0f0f0" },
    }),
    control: (provided) => ({
      ...provided,
      backgroundColor: "transparent",
      borderColor: "#005580",
      color: "white",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "white",
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "white",
    }),
    input: (provided) => ({
      ...provided,
      color: "white",
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "white",
    }),
  };

  return (
    <div className="px-4 py-3 border-b border-[#005580]">
      {loading ? (
        <Skeleton className="h-10 w-full bg-[#005580]" />
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
