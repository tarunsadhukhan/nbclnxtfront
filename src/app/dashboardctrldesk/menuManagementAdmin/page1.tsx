"use client";

import { SearchablePaginatedTable } from "@/components/ui/searchablePaginatedTable";
import { Column } from "@/components/ui/datatablewithedit";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import { apiRoutes, apiRoutesconsole } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";


type Company = {
    co_id: number;
    co_name: string;
    co_email_id: string;
    co_prefix: string;
}
;

// Real API fetch function with pagination and search
const fetchCompanies = async (page: number, search?: string, filters?: { key: string; value: string }[]) => {
  const limit = 20;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (search) {
    queryParams.append('search', search);
  }
  
  // Add filter parameters
//   if (filters && filters.length > 0) {
//     filters.forEach(filter => {
//       if (filter.key === 'active') {
//         // Convert "Yes"/"No" to 1/0 for the backend
//         const activeValue = filter.value.toLowerCase() === 'yes' ? '1' : 
//                            filter.value.toLowerCase() === 'no' ? '0' : filter.value;
//         queryParams.append('active', activeValue);
//       }
//       else if (filter.key === 'con_org_email_id') {
//         queryParams.append('email', filter.value);
//       }
//     });
//   }

  const { data, error } = await fetchWithCookie(
    `${apiRoutesconsole.GET_CO_ALL}?${queryParams}`,
    "GET"
  );

  if (error || !data) {
    throw new Error(error || 'Failed to fetch roles');
  }
  return data;
};

// Helper function to create URL with all user data as parameters
const createEditUrl = (company: Company) => {
  // Encode values to handle specia characters in organization names or emails
  const params = new URLSearchParams({
    coId: company.co_id.toString(),
    coName: encodeURIComponent(company.co_name),
    coEmail: encodeURIComponent(company.co_email_id),
    coPrefix: encodeURIComponent(company.co_prefix),
    
  });
  
  console.log("Creating edit URL with params:", Object.fromEntries(params.entries()));
  return `/dashboardadmin/companyManagement/createCompany?${params.toString()}`;
};

// Table columns
const columns: Column<Company>[] = [
  {
    key: "co_name",
    label: "Name",
    className: "bg-[#3ea6da] text-white font-medium",
    sortable: true,
  },
  {
    key: "co_email_id",
    label: "Email",
    className: "bg-[#3ea6da] text-white font-medium",
    sortable: true,
  },
  {
    key: "co_prefix",
    label: "Short Name",
    className: "bg-[#3ea6da] text-white font-medium",
    sortable: true,
  },
  {
    key: "actions",
    label: "Actions",
    className: "bg-[#3ea6da] text-white",
    render: (_val, row) => (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          window.location.href = createEditUrl(row);
        }}
      >
        <PencilIcon className="h-4 w-4" />
      </Button>
    ),
  },
];

export default function UserTenantAdmin() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0C3C60]">Company Setup</h1>
            <Button
            className="bg-[#95C11F] hover:bg-[#85ad1b] text-white"
            onClick={() => {
              window.location.href = "/dashboardadmin/companyManagement/createCompany";
            }}
            >
                + Create Company
            </Button>


        </div>

        <SearchablePaginatedTable columns={columns} fetchFn={fetchCompanies} />
      </div>
    </div>
  );
}
