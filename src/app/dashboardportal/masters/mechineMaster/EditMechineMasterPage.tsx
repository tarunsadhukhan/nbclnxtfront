
"use client";

import CreateMechineMasterPage from "./CreateMechineMasterPage";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import React, { useEffect, useState } from "react";

interface Props { open?: boolean; onClose?: (saved?: boolean)=>void; mechine_master_id: string | number; existingRows?: any[] }

export default function EditMechineMasterPage({ open = false, onClose, mechine_master_id, existingRows = [] }: Props) {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);

  useEffect(()=>{
    if (!open) return;
    setLoading(true);
    (async ()=>{
      try {
        const selectedCompany = localStorage.getItem('sidebar_selectedCompany'); const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : '';
        const params = new URLSearchParams({ mechine_master_id: String(mechine_master_id), co_id });
        const { data } = await fetchWithCookie(`${apiRoutesPortalMasters.MECHINE_MASTER_VIEW}?${params}`, 'GET') as any;
        const candidate = data?.data ?? data ?? {};
        const rec = candidate?.mechine_master || candidate?.mechine || candidate || {};
        setRecord(rec);
      } catch(err:any){ console.error(err); }
      finally { setLoading(false); }
    })();
  }, [open, mechine_master_id]);

  return (
    <CreateMechineMasterPage open={open} onClose={onClose ?? (() => {})} editId={mechine_master_id} initialMode="edit" />
  );
}
