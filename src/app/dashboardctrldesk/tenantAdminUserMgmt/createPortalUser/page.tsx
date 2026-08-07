'use client';

import React, { Suspense } from 'react';
import PortalUserForm from './portalUserForm';

function LoadingFallback() {
    return <div className="p-6">Loading...</div>;
}

export default function CreatePortalUserPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <PortalUserForm />
        </Suspense>
    );
}
