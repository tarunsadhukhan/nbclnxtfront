import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";


import { apiRoutes } from "@/utils/api";

import { fetchWithCookie } from "@/utils/apiClient2";
import FormFieldWrapper from "@/components/ui/FormFieldWrapper";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface UserAdminProps {
    userId: string | null;
    roleId: string | null;
    userName: string | null;
    userEmail: string | null;
    roleName: string | null;
    active: string | null;
}

interface Role {
    con_role_id: number;
    con_role_name: string;
}

const UserAdmin = ({
    userId,
    roleId,
    userName,
    userEmail,
    roleName,
    active
}: UserAdminProps) => {
    console.log("UserAdmin received props:", { userId, roleId, userName, userEmail, roleName, active });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [isActive, setIsActive] = useState(true);
    const router = useRouter();
    
    // Track the original values for comparison
    const [originalActive, setOriginalActive] = useState<boolean | null>(null);
    const [originalRoleId, setOriginalRoleId] = useState<number | null>(null);
    const [initialized, setInitialized] = useState(false);
    
    // Initialize form with default values
    const form = useForm({
        defaultValues: {
            name: "",
            email: "",
            password: "",
            roleId: "",
            active: true
        },
    });

    console.log("Component render - Current state:", { 
        selectedRoleId, 
        originalRoleId, 
        roleIdValue: form.getValues("roleId"),
        isActive, 
        originalActive 
    });
    
    // Initialize form values from props - runs only once after roles are loaded
    useEffect(() => {
        if (roles.length > 0 && !initialized) {
            console.log("Initializing form with props:", { userName, userEmail, roleId, active });
            
            // Set form values
            form.reset({
                name: userName || "",
                email: userEmail || "",
                password: "",
                roleId: roleId || (roles.length > 0 ? roles[0].con_role_id.toString() : ""),
                active: active === "1" || active === null || active === undefined
            });
            
            // Set state values
            const activeValue = active === "1" || active === null || active === undefined;
            setIsActive(activeValue);
            setOriginalActive(activeValue);
            
            // Set role ID
            if (roleId) {
                const parsedRoleId = parseInt(roleId);
                setSelectedRoleId(parsedRoleId);
                setOriginalRoleId(parsedRoleId);
            } else if (roles.length > 0) {
                setSelectedRoleId(roles[0].con_role_id);
                setOriginalRoleId(roles[0].con_role_id);
            }
            
            setInitialized(true);
        }
    }, [userName, userEmail, roleId, active, form, roles, initialized]);
    
    // Fetch available roles on component mount
    useEffect(() => {
        const fetchAvailableRoles = async () => {
            try {
                // Use the correct roles dropdown endpoint
                const response = await fetchWithCookie(apiRoutes.ROLES_DROPDOWN_TENANT_ADMIN, "GET");
                if (response.error) {
                    throw new Error(response.error);
                }
                
                // Save the fetched roles
                const fetchedRoles = response.data || [];
                console.log("Fetched roles:", fetchedRoles);
                setRoles(Array.isArray(fetchedRoles) ? fetchedRoles : []);
            } catch (err) {
                console.error("Error fetching roles:", err);
                setError("Failed to fetch roles. Please try again.");
            }
        };

        fetchAvailableRoles();
    }, []);
    
    const onSubmit = async (data: any) => {
        setLoading(true);
        setError(null);
    
        try {
            console.log("Submitting with values:", {
                isActive,
                originalActive,
                selectedRoleId,
                originalRoleId,
                formRoleId: form.getValues("roleId")
            });
            
            // Check if values have changed from original
            const activeChanged = originalActive !== null && isActive !== originalActive;
            
            // For roleId, make sure we're comparing numbers to numbers
            const parsedOriginalRoleId = originalRoleId;
            const parsedSelectedRoleId = selectedRoleId;
            const roleIdChanged = parsedOriginalRoleId !== null && parsedSelectedRoleId !== parsedOriginalRoleId;
            
            console.log("Change detection:", {
                activeChanged,
                roleIdChanged,
                parsedOriginalRoleId,
                parsedSelectedRoleId
            });
            
            // Create a submission data JSON with changed values or null
            const submissionData = {
                userId: userId || null,
                roleId: roleIdChanged ? parsedSelectedRoleId : null,
                active: activeChanged ? (isActive ? 1 : 0) : null,
                timestamp: new Date().toISOString()
            };

            // Log the submission data
            console.log("SUBMIT_DATA:", JSON.stringify(submissionData, null, 2));
            
            // Save the submission data to localStorage for reference
            try {
                const submissionHistory = localStorage.getItem('userSubmissions') || '[]';
                const parsedHistory = JSON.parse(submissionHistory);
                parsedHistory.push(submissionData);
                localStorage.setItem('userSubmissions', JSON.stringify(parsedHistory));
            } catch (logError) {
                console.error("Error saving submission log:", logError);
            }

            // Define payload types properly
            interface CreateUserPayload {
                name: string;
                email: string;
                roleId: number | null;
                active: number;
                password?: string;
                timestamp?: string;
            }
            
            interface EditUserPayload {
                userId?: string | null;
                roleId?: number | null;
                active?: number | null;
                timestamp?: string;
            }
            
            // Replace payload with the submission data structure for API calls
            let payload: CreateUserPayload | EditUserPayload;
            
            if (!userId) {
                // For new user creation, include all required fields
                payload = {
                    name: data.name,
                    email: data.email,
                    roleId: selectedRoleId,
                    active: isActive ? 1 : 0
                };
                
                if (data.password) {
                    payload.password = data.password;
                }
                
                // Log the data being submitted for create operations
                console.log("Creating new user with data:", payload);
                
                // Save to localStorage as JSON (for development purposes)
                try {
                    const existingData = localStorage.getItem('createdUsers') || '[]';
                    const parsedData = JSON.parse(existingData);
                    
                    // Add timestamp for tracking
                    const userWithTimestamp = {
                        ...payload,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Add to existing data
                    parsedData.push(userWithTimestamp);
                    
                    // Save back to localStorage
                    localStorage.setItem('createdUsers', JSON.stringify(parsedData));
                    
                    console.log("User data saved to localStorage");
                } catch (storageError) {
                    console.error("Error saving user data to localStorage:", storageError);
                }
            } else {
                // For editing users, use the submissionData object directly
                // This ensures we only send values that have changed
                payload = submissionData;
                console.log("Using change tracking payload for edit:", payload);
            }

            // Choose API endpoint based on whether we're creating or editing
            const apiUrl = userId
                ? apiRoutes.EDIT_USER_TENANT_MENU  // Add userId to URL
                : apiRoutes.CREATE_USER_TENANT_ADMIN;
            
            const method = "POST";  // Fix method for editing (PUT)
            
            // Ensure payload always has necessary values for the API
            if (userId) {
                // Always include roleId and active in edit payload, regardless of changes
                if (!payload.hasOwnProperty('roleId')) {
                    (payload as EditUserPayload).roleId = selectedRoleId;
                }
                if (!payload.hasOwnProperty('active')) {
                    (payload as EditUserPayload).active = isActive ? 1 : 0;
                }
            }
            
            console.log(`Sending ${method} request to ${apiUrl} with payload:`, payload);
            const response = await fetchWithCookie(apiUrl, method, payload);
            if (response.error) {
                throw new Error(response.error);
            }
            router.push("/dashboardadmin/userManagementAdmin");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    // Handler for role selection change
    const handleRoleChange = (selectedValue: string) => {
        // Convert selected value to number
        const parsedRoleId = parseInt(selectedValue);
        console.log("Role changed:", { 
            newRoleId: parsedRoleId, 
            originalRoleId, 
            selectedValue 
        });
        
        setSelectedRoleId(parsedRoleId);
        
        // Update form value
        form.setValue("roleId", selectedValue);
    };

    // Ensure the form's roleId field change updates the selectedRoleId
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'roleId' && value.roleId) {
                const newRoleId = parseInt(value.roleId);
                if (newRoleId !== selectedRoleId) {
                    console.log("Form roleId changed:", { 
                        newRoleId, 
                        currentSelectedRoleId: selectedRoleId 
                    });
                    setSelectedRoleId(newRoleId);
                }
            }
        });
        
        return () => subscription.unsubscribe();
    }, [form, selectedRoleId]);

    // For debugging: log current form values and state
    console.log("Current form values:", form.getValues());
    console.log("Current state:", { 
        selectedRoleId, 
        originalRoleId, 
        isActive, 
        originalActive,
        initialized
    });

    return (
        <Card className="p-6 max-w-md mx-auto mt-10">
            <h2 className="text-lg font-semibold mb-4">{userId ? "Edit User" : "Create User"}</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Display User ID for reference if editing */}
                    {userId && (
                        <p className="text-sm text-gray-500">User ID: {userId}</p>
                    )}
                    
                    {/* Always disable name and email fields for editing, enable for creation */}
                    <FormFieldWrapper
                        name="name"
                        control={form.control}
                        label="Name"
                        placeholder="Enter Name"
                        disabled={userId !== null}
                        required={!userId}
                    />
                    
                    <FormFieldWrapper
                        name="email"
                        control={form.control}
                        label="Username"
                        placeholder="Enter Email ID"
                        type="email"
                        disabled={userId !== null}
                        required={!userId}
                    />

                    {/* Only show password field when creating a new user */}
                    {!userId && (
                        <FormFieldWrapper
                            name="password"
                            control={form.control}
                            label="Password"
                            placeholder="Enter password"
                            type="password"
                            required
                        />
                    )}
                    
                    {/* Role dropdown is always editable */}
                    <FormFieldWrapper
                        name="roleId"
                        control={form.control}
                        label="Role"
                        placeholder="Select Role"
                        type="select"
                        options={roles.map(role => ({
                            value: role.con_role_id.toString(),
                            label: role.con_role_name
                        }))}
                        required
                    />
                    
                    {/* Active checkbox is always editable */}
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="active" 
                            checked={isActive} 
                            onCheckedChange={(checked) => setIsActive(checked === true)}
                        />
                        <Label htmlFor="active">Active</Label>
                    </div>
                    
                    <div className="flex justify-end space-x-4 pt-4">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => router.push("/dashboardadmin/userManagementAdmin")}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-[#9BC837] hover:bg-[#8BB72E] text-white"
                            disabled={loading || !selectedRoleId}
                        >
                            {loading ? "Processing..." : userId ? "Update User" : "Create User"}
                        </Button>
                    </div>
                </form>
            </Form>
        </Card>
    );
}

export default UserAdmin;



