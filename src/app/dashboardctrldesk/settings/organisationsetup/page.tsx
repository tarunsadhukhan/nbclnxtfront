"use client";

import { SearchablePaginatedTable } from "@/components/ui/searchablePaginatedTable";
import { Column } from "@/components/ui/datatablewithedit";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import { apiRoutes, apiRoutesconsole } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";

// Sample Role type
// type User = {
//   con_user_id: number;
//   con_user_name: string;
//   con_user_login_email_id: string;
//   con_role_id: number;
//   con_role_name: string;
//   active: number;
// };
type Orgs = {
    con_org_id: number;
    con_org_name: string;
    con_org_email: string;
    active: number;
    con_status_name: string;
}
;

// Real API fetch function with pagination and search
const fetchOrgs = async (page: number, search?: string, filters?: { key: string; value: string }[]) => {
  const limit = 20;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    // user_id: localStorage.getItem('user_id') || '', // Ensure user_id is not null
    // org_id: localStorage.getItem('org_id') || '',
  });
  
  if (search) {
    queryParams.append('search', search);
  }
  
  // Add filter parameters
  if (filters && filters.length > 0) {
    filters.forEach(filter => {
      if (filter.key === 'active') {
        // Convert "Yes"/"No" to 1/0 for the backend
        const activeValue = filter.value.toLowerCase() === 'yes' ? '1' : 
                           filter.value.toLowerCase() === 'no' ? '0' : filter.value;
        queryParams.append('active', activeValue);
      }
      else if (filter.key === 'con_org_email_id') {
        queryParams.append('email', filter.value);
      }
    });
  }

  const { data, error } = await fetchWithCookie(
    `${apiRoutesconsole.GET_ORG_ALL}?${queryParams}`,
    "GET"
  );

  if (error || !data) {
    throw new Error(error || 'Failed to fetch roles');
  }
  return data;
};

// Helper function to create URL with all user data as parameters
const createEditUrl = (org: Orgs) => {
  // Encode values to handle special characters in organization names or emails
  const params = new URLSearchParams({
    orgId: org.con_org_id.toString(),
    orgName: encodeURIComponent(org.con_org_name),
    orgEmail: encodeURIComponent(org.con_org_email),
    active: org.active.toString(),
    statusName: encodeURIComponent(org.con_status_name)
    
  });
  
  console.log("Creating edit URL with params:", Object.fromEntries(params.entries()));
  return `/dashboardctrldesk/settings/organisationsetup/createOrg?${params.toString()}`;
};

// Table columns
const columns: Column<Orgs>[] = [
  {
    key: "con_org_name",
    label: "Name",
    className: "bg-[#3ea6da] text-white font-medium",
    sortable: true,
  },
  {
    key: "con_org_email_id",
    label: "Email",
    className: "bg-[#3ea6da] text-white font-medium",
    sortable: true,
  },
  {
    key: "con_org_shortname",
    label: "Short Name",
    className: "bg-[#3ea6da] text-white font-medium",
    sortable: true,
  },
  {
    key: "con_status_name",
    label: "Status",
    className: "bg-[#3ea6da] text-white",
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
          <h1 className="text-2xl font-bold text-[#0C3C60]">Organisation Setup</h1>
            <Button
            className="bg-[#95C11F] hover:bg-[#85ad1b] text-white"
            onClick={() => {
              window.location.href = "/dashboardctrldesk/settings/organisationsetup/createOrg";
            }}
            >
                + Create Organisation
            </Button>


        </div>

        <SearchablePaginatedTable columns={columns} fetchFn={fetchOrgs} />
      </div>
    </div>
  );
}
