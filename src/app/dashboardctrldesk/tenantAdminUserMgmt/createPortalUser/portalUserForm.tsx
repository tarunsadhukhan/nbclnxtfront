'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithCookie } from '@/utils/apiClient2';
import { apiRoutesconsole } from '@/utils/api';
import FormFieldWrapper from '@/components/ui/FormFieldWrapper';

interface Organisation {
    con_org_id: number;
    con_org_shortname: string;
    con_org_name: string;
}

interface FormValues {
    org_id: string;
    name: string;
    email: string;
    password: string;
}

const DEFAULT_PASSWORD = 'vowjute@1234';

export default function PortalUserForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [orgs, setOrgs] = useState<Organisation[]>([]);

    const form = useForm<FormValues>({
        defaultValues: {
            org_id: '',
            name: '',
            email: '',
            password: DEFAULT_PASSWORD,
        },
    });

    // Fetch organisations on mount
    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const response = await fetchWithCookie(
                    apiRoutesconsole.GET_ORGS_DROPDOWN_PORTAL_USER,
                    'GET'
                );
                if (response.error) {
                    throw new Error(response.error);
                }
                const data = response.data as { data: Organisation[] } | null;
                if (data?.data) {
                    setOrgs(data.data);
                }
            } catch (err) {
                console.error('Error fetching organisations:', err);
                setError('Failed to load organisations. Please refresh the page.');
            }
        };

        fetchOrgs();
    }, []);

    const onSubmit = async (data: FormValues) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (!data.org_id) {
                setError('Please select an organisation');
                setLoading(false);
                return;
            }

            if (!data.email || !data.email.includes('@')) {
                setError('Please enter a valid email address');
                setLoading(false);
                return;
            }

            const payload = {
                org_id: parseInt(data.org_id, 10),
                name: data.name,
                email: data.email,
                password: data.password || DEFAULT_PASSWORD,
            };

            const response = await fetchWithCookie(
                apiRoutesconsole.CREATE_PORTAL_ADMIN_USER,
                'POST',
                payload
            );

            if (response.error) {
                throw new Error(response.error);
            }

            setSuccess('Portal admin user created successfully!');

            // Navigate back to list after brief delay
            setTimeout(() => {
                router.push('/dashboardctrldesk/tenantAdminUserMgmt');
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const orgOptions = orgs.map((org) => ({
        value: org.con_org_id.toString(),
        label: org.con_org_shortname,
    }));

    return (
        <Card className="p-6 max-w-md mx-auto mt-10">
            <h2 className="text-lg font-semibold mb-4">Create Portal Admin User</h2>
            <p className="text-sm text-gray-500 mb-6">
                This will create a full-access admin user for the selected organisation&apos;s portal.
                A &quot;superadmin&quot; role with all menu access will be assigned automatically.
            </p>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                    {success}
                </div>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormFieldWrapper
                        name="org_id"
                        control={form.control}
                        label="Organisation"
                        placeholder="Select Organisation"
                        type="select"
                        options={orgOptions}
                        required
                    />

                    <FormFieldWrapper
                        name="name"
                        control={form.control}
                        label="Name"
                        placeholder="Enter user name"
                        required
                    />

                    <FormFieldWrapper
                        name="email"
                        control={form.control}
                        label="Username (Email)"
                        placeholder="Enter email address"
                        type="email"
                        required
                    />

                    <FormFieldWrapper
                        name="password"
                        control={form.control}
                        label="Password"
                        placeholder="Enter password"
                        type="password"
                        required
                    />

                    <p className="text-xs text-gray-400">
                        Default password: <code className="bg-gray-100 px-1 rounded">{DEFAULT_PASSWORD}</code>
                    </p>

                    <div className="flex justify-end space-x-4 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push('/dashboardctrldesk/tenantAdminUserMgmt')}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[#9BC837] hover:bg-[#8BB72E] text-white"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </Form>
        </Card>
    );
}
