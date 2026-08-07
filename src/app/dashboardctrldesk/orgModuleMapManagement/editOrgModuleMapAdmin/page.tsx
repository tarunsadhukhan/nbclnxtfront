'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchWithCookie } from '@/utils/apiClient2';
import { apiRoutes, apiRoutesconsole } from '@/utils/api';
import FormFieldWrapper from '@/components/ui/FormFieldWrapper';
import MenuTable from '@/components/ui/expandableModule';


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

    // Define Role type for roles dropdown
    type Role = {
        con_role_id: number;
        con_role_name: string;
    };
    // Add roles state and fetch logic similar to UserAdmin
    const [roles, setRoles] = useState<Role[]>([]);

    
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
                    const response = await fetchWithCookie(`${apiRoutesconsole.ADMIN_CTRLDSK_MODULE_BY_ORGID}/${roleId}`, 'GET');
                    if (response.error) {
                        throw new Error(response.error);
                    }

                    // Use response.data.roleName for default role selection
                    const defaultRoleName = response.data.roleName || '';
                    setRoleName(defaultRoleName);
                    form.setValue('roleName', defaultRoleName);

                    // Populate menu data
                    setMenuData(Array.isArray(response.data.data) ? response.data.data : []);

                    // Set selected menus and access levels from response
                    const selectedIds: number[] = [];
                    const accessLevels: Record<number, string> = {};
                    console.log('Response Data:', response.data);
                    (Array.isArray(response.data.data) ? response.data.data : []).forEach((item: any) => {
                        if (item.con_role_id) {
                            selectedIds.push(item.con_menu_id);
                            accessLevels[item.menu_id] = item.con_role_id?.toString() || "1";
                        }
                    });
                    console.log('Selected IDs:', selectedIds);
                    console.log('Access Levels:', accessLevels);
                    setSelectedMenuIds(selectedIds);
                    setMenuAccessLevels(accessLevels);
                } else {
                    // Fetch menu structure for new role
                    const response = await fetchWithCookie(apiRoutesconsole.CTRLDSK_ALL_MENUS, 'GET');
                    if (response.error) {
                        throw new Error(response.error);
                    }
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

    // Fetch roles for dropdown
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await fetchWithCookie(apiRoutesconsole.ORGS_DROPDOWN_CTRLDSK_ADMIN, 'GET');
                if (response.error) {
                    throw new Error(response.error);
                }

                const fetchedRoles = response.data || [];
                setRoles(Array.isArray(fetchedRoles) ? fetchedRoles : []);

                // Fetch the role data for the given roleId
                if (roleId) {
                    const roleResponse = await fetchWithCookie(`${apiRoutesconsole.ADMIN_CTRLDSK_MODULE_BY_ORGID}/${roleId}`, 'GET');
                    if (roleResponse.error) {
                        throw new Error(roleResponse.error);
                    }

                    // Match the roleId with the fetched roles and set the default value
                    const matchingRole = fetchedRoles.find((role: Role) => role.con_role_id.toString() === roleId);
                    if (matchingRole) {
                        form.setValue('roleName', matchingRole.con_role_id.toString());
                    } else {
                        console.warn('No matching role found for roleId:', roleId);
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch roles.');
            }
        };

        fetchRoles();
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
                selectedMenuIds: selectedMenuIds.map(id => id.toString()), // Convert selectedMenuIds to string array
                menuAccessList,
                ...(roleId ? { roleId: Number(roleId) } : {}) // Include roleId in payload for edit flow
            };
            console.log('Submitting payload:', payload);
      //      alert(`Submitting payload: ${JSON.stringify(payload)}`);
            
            let response;
            if (roleId) {
                // Update existing role
     //       alert(`Submitting payload with roleid: ${JSON.stringify(payload)}`);
                response = await fetchWithCookie(apiRoutesconsole.EDIT_ORG_MODULE_MAP_CTRLDSK, 'PUT', payload);
            } else {
                // Create new role
                response = await fetchWithCookie(apiRoutesconsole.CREATE_ROLE_CTRLDSK_ADMIN, 'PUT', payload);
            }
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Redirect back to role management page on success
            router.push('/dashboardctrldesk/orgModuleMapManagement');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold mb-4">
                {roleId ? 'Edit Org Module Mapping' : 'Create Role'}
            </h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <Card className="p-6 max-w-full">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormFieldWrapper
                            name="roleName"
                            control={form.control}
                            label="Organisation Name"
                            placeholder="Select Organization"
                            type="select"
                            options={roles.map(role => ({
                                value: role.con_role_id.toString(),
                                label: role.con_role_name,
                            }))}
                            required
                            disabled    
            />
                        {/* Menu selection using MenuTable (expandableMenu) */}
                        <div className="mt-6">
                            <h2 className="text-lg font-semibold mb-4">Module Permissions</h2>
                            <MenuTable
                                menuData={menuData}
                                onSelectionChange={setSelectedMenuIds}
                                fieldMapping={{
                                    idField: "con_menu_id",
                                    nameField: "con_menu_name",
                                    parentIdField: "con_menu_parent_id",
                                    roleIdField: roleId ? "con_role_id" : undefined,
                                }}
                            />
                        </div>
                        {loading && (
                            <div className="text-center">Loading m structure...</div>
                        )}
                        <div className="flex justify-end space-x-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => router.push('/dashboardctrldesk/orgModuleMapManagement')}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-[#9BC837] hover:bg-[#8BB72E] text-white"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : roleId ? 'Update Mapping' : 'Create Mapping'}
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

