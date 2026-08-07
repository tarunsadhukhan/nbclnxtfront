'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import UserAdmin from "./userAdmin";


import { apiRoutes } from "@/utils/api";


import { fetchWithCookie } from "@/utils/apiClient2";

// Loading component for Suspense fallback
function LoadingFallback() {
    return <div className="p-6">Loading user data...</div>;
}

// Component with useSearchParams hook
function CreateUserAdminContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const userId = searchParams.get('userId');
    const [userData, setUserData] = useState<{
        userId: string | null;
        roleId: string | null;
        userName: string | null;
        userEmail: string | null;
        roleName: string | null;
        active: string | null;
    }>({
        userId: null,
        roleId: null,
        userName: null,
        userEmail: null,
        roleName: null,
        active: null
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // First check if data is available in URL parameters
        const userNameFromUrl = searchParams.get('userName');
        const userEmailFromUrl = searchParams.get('userEmail');
        const roleIdFromUrl = searchParams.get('roleId');
        const roleNameFromUrl = searchParams.get('roleName');
        const activeFromUrl = searchParams.get('active');

        console.log("URL Parameters received:", {
            userId,
            userName: userNameFromUrl,
            userEmail: userEmailFromUrl,
            roleId: roleIdFromUrl,
            roleName: roleNameFromUrl,
            active: activeFromUrl
        });

        // If all necessary data is available from URL params, use it
        if (userId && userNameFromUrl && userEmailFromUrl && roleIdFromUrl && roleNameFromUrl && activeFromUrl) {
            // Decode URL parameters
            const userData = {
                userId: userId,
                roleId: roleIdFromUrl,
                userName: decodeURIComponent(userNameFromUrl),
                userEmail: decodeURIComponent(userEmailFromUrl),
                roleName: decodeURIComponent(roleNameFromUrl),
                active: activeFromUrl
            };
            
            console.log("Setting user data from URL params:", userData);
            setUserData(userData);
        } 
        // Otherwise, fetch data using the API if userId is available
        else if (userId) {
            console.log("Fetching user data from API for userId:", userId);
            const fetchUserData = async () => {
                setLoading(true);
                try {
                    const response = await fetchWithCookie(`${apiRoutes.EDIT_USER_TENANT_MENU}/${userId}`, "GET");
                    if (response.error) {
                        throw new Error(response.error);
                    }
                    
                    const user = response.data;
                    console.log("API response:", user);
                    
                    if (user) {
                        const userData = {
                            userId: userId,
                            roleId: user.con_role_id?.toString() || null,
                            userName: user.con_user_name || null,
                            userEmail: user.con_user_login_email_id || null,
                            roleName: user.con_role_name || null,
                            active: user.active?.toString() || null
                        };
                        
                        console.log("Setting user data from API:", userData);
                        setUserData(userData);
                    }
                } catch (err) {
                    console.error("Error fetching user data:", err);
                } finally {
                    setLoading(false);
                }
            };

            fetchUserData();
        }
    }, [userId, searchParams]);

    console.log("Current userData state:", userData);

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <main className="p-6">
            <h1 className="text-xl font-bold mb-4">
                {userId ? 'Edit User' : 'Create User'}
            </h1>
            <UserAdmin 
                userId={userData.userId}
                roleId={userData.roleId}
                userName={userData.userName}
                userEmail={userData.userEmail}
                roleName={userData.roleName}
                active={userData.active}
            />
        </main>
    );
}

// Main export that wraps the content with Suspense
export default function CreateUserAdminPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <CreateUserAdminContent />
        </Suspense>
    );
}
