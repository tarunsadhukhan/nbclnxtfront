'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSearchParams, useRouter } from 'next/navigation';

import { apiRoutes } from "@/utils/api";


import { fetchWithCookie } from '@/utils/apiClient2';
import MenuTableDropdown from "@/components/ui/expandableMenuDropdown";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type MenuItem = {
    menu_id: number;
    menu_name: string;
    menu_parent_id: number | null;
    role_id: number | null;
    access_type_id?: number | string | null; // Add optional access level field
};

// Define the field mapping for portal menu structure
const PORTAL_FIELD_MAPPING = {
  idField: "menu_id",
  nameField: "menu_name",
  parentIdField: "menu_parent_id",
  roleIdField: "role_id",
  accessLevelField: "access_type_id" // Access level field mapping
};

// Options for the access level dropdown, matching the expected format
const PORTAL_DROPDOWN_OPTIONS = [
  { value: "0", label: "Not Accessible" }, // Use string "0" for null/not accessible
  { value: "1", label: "Read" },
  { value: "2", label: "Print" },
  { value: "3", label: "Write" },
  { value: "4", label: "Edit" }
];

const fetchMenu = async (roleId: string | null): Promise<{ data: MenuItem[]; roleName?: string }> => {
    const apiUrl = roleId ? `${apiRoutes.GET_PORTAL_MENU_BY_ROLEID}/${roleId}` : apiRoutes.PORTAL_MENU_FULL;

    const { data, error } = await fetchWithCookie(apiUrl);

    if (error || !data) throw new Error(error || "Failed to fetch menu");

    return data as { data: MenuItem[]; roleName?: string };
};

// Loading component for Suspense fallback
function LoadingFallback() {
    return <div className="p-6">Loading role data...</div>;
}

// Component with useSearchParams hook
function CreateRoleContent() {
    const searchParams = useSearchParams();
    const roleId = searchParams.get('roleId');
    const router = useRouter();
    const [menuData, setMenuData] = useState<MenuItem[]>([]);
    const [roleName, setRoleName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);
    const [menuAccessLevels, setMenuAccessLevels] = useState<Record<number, string>>({}); // State for access levels

    useEffect(() => {
        const fetchMenuData = async () => {
            setLoading(true);
            setFetchError(null);
            try {
                const response = await fetchMenu(roleId);
                setMenuData(Array.isArray(response.data) ? response.data : []);
                setRoleName(response.roleName ?? (roleId ? "" : ""));
            } catch (err) {
                setFetchError(err instanceof Error ? err.message : "An unknown error occurred");
                setMenuData([]);
                setRoleName("");
            } finally {
                setLoading(false);
            }
        };

        fetchMenuData();
    }, [roleId]);

    const form = useForm({
        defaultValues: {
            name: '',
        },
        values: {
            name: roleName
        }
    });

    const onSubmit = async () => {
        console.log("selected Menus", { name: roleName });
        console.log("role ID:", roleId);
        console.log("role Name", roleName);
        console.log("Selected menu IDs for submission:", selectedMenuIds);
        console.log("Access Levels for submission:", menuAccessLevels);
        
        // Create the payload with access levels
        const menuWithAccess = selectedMenuIds.map(menuId => ({
            menuId,
            accessTypeId: menuAccessLevels[menuId] || "1" // Default to "Read" if missing
        }));
        
        const payload = roleId 
            ? { 
                roleId: Number(roleId),
                menuAccessList: menuWithAccess 
              }
            : {
                roleName: roleName.trim(),
                menuAccessList: menuWithAccess
              };

        console.log("Payload being sent:", payload);
        
        try {
            setLoading(true);
            
            let apiUrl, method;
            
            if (roleId) {
                // Edit mode - use EDIT_PORTAL_ROLE API
                apiUrl = apiRoutes.EDIT_PORTAL_ROLE;
                method = "PUT";
            } else {
                // Create mode - use CREATE_PORTAL_ROLE API
                apiUrl = apiRoutes.CREATE_PORTAL_ROLE;
                method = "POST";
            }
            
            const response = await fetchWithCookie(
                apiUrl,
                method,
                payload
            );
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            console.log(`Role ${roleId ? 'updated' : 'created'} successfully:`, response.data);
            router.push("/dashboardadmin/roleManagement");
        } catch (error) {
            console.error(`Failed to ${roleId ? 'update' : 'create'} role:`, error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="p-6">
            <h1 className="text-xl font-bold mb-4">
                {roleId ? 'Edit Role' : 'Create Role'}
            </h1>
            <div className="mb-4">
                <Card className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter role name" {...field} value={roleName} onChange={(e) => setRoleName(e.target.value)} readOnly={!!roleId} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end space-x-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/dashboardadmin/roleManagement")}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#22a05a] hover:bg-[#1b8049] text-white"
                                    disabled={loading}
                                >
                                    {loading ? (roleId ? "Updating..." : "Creating...") : (roleId ? "Update Role" : "Create Role")}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </Card>
            </div>
            {loading && <p>Loading menu...</p>}
            {fetchError && <p className="text-red-500">Error loading menu: {fetchError}</p>}
            {!loading && !fetchError && (
                <MenuTableDropdown
                    menuData={menuData}
                    onSelectionChange={(selectedIds, accessLevels) => {
                        console.log("Selected menu IDs:", selectedIds);
                        console.log("Access Levels:", accessLevels);
                        setSelectedMenuIds(selectedIds);
                        // Store access levels in state
                        if (accessLevels) {
                            setMenuAccessLevels(accessLevels);
                        }
                    }}
                    fieldMapping={PORTAL_FIELD_MAPPING}
                    dropdownOptions={PORTAL_DROPDOWN_OPTIONS}
                />
            )}
        </main>
    );
}

// Main export that wraps the content with Suspense
export default function HandleCreateEditRole() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <CreateRoleContent />
        </Suspense>
    );
}
