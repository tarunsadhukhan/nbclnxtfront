"use client";

import { SearchablePaginatedTable } from "@/components/ui/searchablePaginatedTable";
import { Column } from "@/components/ui/datatablewithedit";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";


import { apiRoutes } from "@/utils/api";


import { fetchWithCookie } from "@/utils/apiClient2";

// Sample Role type
type User = {
  con_user_id: number;
  con_user_name: string;
  con_user_login_email_id: string;
  con_role_id: number;
  con_role_name: string;
  active: number;
};

// Real API fetch function with pagination and search
const fetchUsers = async (page: number, search?: string) => {
  const limit = 20;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    user_id: localStorage.getItem('user_id') || '', // Ensure user_id is not null
  });
  if (search) {
    queryParams.append('search', search);
  }

  const { data, error } = await fetchWithCookie(
    `${apiRoutes.GET_USER_TENANT_ADMIN}?${queryParams}`,
    "GET"
  );

  if (error || !data) {
    throw new Error(error || 'Failed to fetch roles');
  }
  return data;
};

// Helper function to create URL with all user data as parameters
const createEditUrl = (user: User) => {
  // Encode values to handle special characters in user names or emails
  const params = new URLSearchParams({
    userId: user.con_user_id.toString(),
    userName: encodeURIComponent(user.con_user_name),
    userEmail: encodeURIComponent(user.con_user_login_email_id),
    roleId: user.con_role_id.toString(),
    roleName: encodeURIComponent(user.con_role_name),
    active: user.active.toString()
  });
  
  console.log("Creating edit URL with params:", Object.fromEntries(params.entries()));
  return `/dashboardadmin/userManagementAdmin/createUserAdmin?${params.toString()}`;
};

// Table columns
const columns: Column<User>[] = [
  {
    key: "con_user_name",
    label: "Name",
    className: "bg-[#3ea6da] text-white font-medium",
  },
  {
    key: "con_user_login_email_id",
    label: "Username",
    className: "bg-[#3ea6da] text-white font-medium",
  },
  {
    key: "con_role_name",
    label: "Role",
    className: "bg-[#3ea6da] text-white font-medium",
  },
  {
    key: "active",
    label: "Active",
    className: "bg-[#3ea6da] text-white",
    render: (val) => (val === 1 ? "Yes" : "No"),
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
          <h1 className="text-2xl font-bold text-[#0C3C60]">User Management Admin</h1>
            <Button
            className="bg-[#95C11F] hover:bg-[#85ad1b] text-white"
            onClick={() => {
              window.location.href = "/dashboardadmin/userManagementAdmin/createUserAdmin";
            }}
            >
            + Create User
            </Button>
        </div>

        <SearchablePaginatedTable columns={columns} fetchFn={fetchUsers} />
      </div>
    </div>
  );
}
