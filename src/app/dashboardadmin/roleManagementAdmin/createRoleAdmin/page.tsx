'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchWithCookie } from '@/utils/apiClient2';

import { apiRoutes } from '@/utils/api';
import FormFieldWrapper from '@/components/ui/FormFieldWrapper';
import MenuTable from '@/components/ui/expandableMenu';



// Loading component for Suspense fallback
function LoadingFallback() {
    return <div className="p-6">Loading role data...</div>;
}

// Component with useSearchParams hook
function CreateRoleAdminContent() {
    const searchParams = useSearchParams();
    const roleId = searchParams.get('roleId');
    const router = useRouter();
    
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [roleName, setRoleName] = useState<string>('');


    const [menuData, setMenuData] = useState<any[]>([]);
    const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);
    const [menuAccessLevels, setMenuAccessLevels] = useState<Record<number, string>>({});

    
    // Initialize form with the role name
    const form = useForm({
        defaultValues: {
            roleName: "",
        },
    });
    
    // Watch for changes in the roleName field
    const watchedRoleName = form.watch("roleName");
    
    // Update the roleName state when the form value changes
    useEffect(() => {
        setRoleName(watchedRoleName);
    }, [watchedRoleName]);

    // Fetch role and menu data if editing
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (roleId) {
                    // Fetch role data for editing

                    const response = await fetchWithCookie(`${apiRoutes.ADMIN_TENANT_MENU_BY_ROLEID}/${roleId}`, 'GET');
                    if (response.error) {
                        throw new Error(response.error);
                    }

                    // Use response.data.data for menu items and response.data.roleName for role name
                    setRoleName(response.data.roleName || '');
                    form.setValue('roleName', response.data.roleName || '');
                    setMenuData(Array.isArray(response.data.data) ? response.data.data : []);

                    // Set selected menus and access levels from response
                    const selectedIds: number[] = [];
                    const accessLevels: Record<number, string> = {};
                    (Array.isArray(response.data.data) ? response.data.data : []).forEach((item: any) => {
                        if (item.role_id) {
                            selectedIds.push(item.menu_id);
                            accessLevels[item.menu_id] = item.access_type_id?.toString() || "1";
                        }
                    });
                    setSelectedMenuIds(selectedIds);
                    setMenuAccessLevels(accessLevels);
                } else {
                    // Fetch menu structure for new role
                    const response = await fetchWithCookie(apiRoutes.TENANT_ALL_MENUS, 'GET');
                    if (response.error) {
                        throw new Error(response.error);
                    }
                    // Always set menuData as an array from response.data.data
                    setMenuData(Array.isArray(response.data?.data) ? response.data.data : []);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();


    }, [roleId, form]);

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError(null);
        
        try {

            // Prepare menu access list
            const menuAccessList = selectedMenuIds.map(menuId => ({
                menuId,
                accessTypeId: menuAccessLevels[menuId] || "1" // Default to "Read Only" if not specified
            }));

            // Prepare payload based on create or update
            const payload = {
                roleName: data.roleName,
                selectedMenuIds,
                menuAccessList,
                ...(roleId ? { roleId: Number(roleId) } : {}) // Include roleId in payload for edit flow

            };
            
            let response;
            if (roleId) {
                // Update existing role

                response = await fetchWithCookie(apiRoutes.EDIT_ROLE_TENANT_MENU, 'PUT', payload);
            } else {
                // Create new role
                response = await fetchWithCookie(apiRoutes.CREATE_ROLE_TENANT_ADMIN, 'PUT', payload);

            }
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Redirect back to role management page on success
            router.push('/dashboardadmin/roleManagementAdmin');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold mb-4">
                {roleId ? 'Edit Role' : 'Create Role'}
            </h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}


            <Card className="p-6 max-w-full">


                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormFieldWrapper
                            control={form.control}
                            name="roleName"
                            label="Role Name"
                            placeholder="Enter Role Name"
                            type="text"
                            required={true}
                        />

                        {/* Menu selection using MenuTable (expandableMenu) */}
                        <div className="mt-6">
                            <h2 className="text-lg font-semibold mb-4">Menu Permissions</h2>
                            <MenuTable
                                menuData={menuData}
                                onSelectionChange={setSelectedMenuIds}
                                fieldMapping={{
                                    idField: "con_menu_id",
                                    nameField: "con_menu_name",
                                    parentIdField: "con_menu_parent_id",
                                    roleIdField: roleId ? "con_role_id" : undefined
                                }}
                            />
                        </div>
                        {loading && (
                            <div className="text-center">Loading menu structure...</div>
                        )}

                        <div className="flex justify-end space-x-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => router.push('/dashboardadmin/roleManagementAdmin')}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-[#9BC837] hover:bg-[#8BB72E] text-white"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : roleId ? 'Update Role' : 'Create Role'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </Card>
        </div>
    );
}

// Main export that wraps the content with Suspense
export default function CreateRoleAdminPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <CreateRoleAdminContent />
        </Suspense>
    );
}

