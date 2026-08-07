'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import IndexWrapper from '@/components/ui/IndexWrapper';
import { fetchWithCookie } from '@/utils/apiClient2';
import { apiRoutesconsole } from '@/utils/api';

interface PortalAdminUser {
    id: number;
    con_user_id: number;
    con_user_name: string;
    con_user_login_email_id: string;
    con_org_id: number;
    con_org_shortname: string;
    con_org_name: string;
    active: number;
    con_role_id: number | null;
    con_role_name: string | null;
}

const columns: GridColDef<PortalAdminUser>[] = [
    { field: 'con_user_id', headerName: 'ID', width: 70 },
    { field: 'con_org_shortname', headerName: 'Organisation', width: 150 },
    { field: 'con_user_name', headerName: 'Name', width: 180 },
    { field: 'con_user_login_email_id', headerName: 'Email', width: 250 },
    { field: 'con_role_name', headerName: 'Role', width: 140 },
    {
        field: 'active',
        headerName: 'Status',
        width: 100,
        renderCell: (params) => (
            <span className={params.value === 1 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                {params.value === 1 ? 'Active' : 'Inactive'}
            </span>
        ),
    },
];

export default function TenantAdminUserMgmtPage() {
    const router = useRouter();
    const [rows, setRows] = useState<PortalAdminUser[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 10,
    });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(paginationModel.page + 1),
                limit: String(paginationModel.pageSize),
            });
            if (searchValue) params.append('search', searchValue);

            const response = await fetchWithCookie(
                `${apiRoutesconsole.GET_PORTAL_ADMIN_USERS}?${params.toString()}`,
                'GET'
            );

            if (response.error) {
                console.error('Error fetching portal admin users:', response.error);
                return;
            }

            const data = response.data as { data: PortalAdminUser[]; total: number } | null;
            if (data) {
                setRows(
                    data.data.map((u) => ({
                        ...u,
                        id: u.con_user_id,
                    }))
                );
                setTotalRows(data.total ?? 0);
            }
        } catch (err) {
            console.error('Failed to fetch portal admin users:', err);
        } finally {
            setLoading(false);
        }
    }, [paginationModel, searchValue]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return (
        <IndexWrapper<PortalAdminUser>
            title="Portal Admin Users"
            subtitle="Manage full-access admin users for organisation portals"
            rows={rows}
            columns={columns}
            rowCount={totalRows}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            loading={loading}
            search={{
                value: searchValue,
                onChange: (e) => setSearchValue(e.target.value),
                placeholder: 'Search by name, email or organisation...',
            }}
            createAction={{
                label: 'Create Portal User',
                onClick: () => router.push('/dashboardctrldesk/tenantAdminUserMgmt/createPortalUser'),
            }}
        />
    );
}
