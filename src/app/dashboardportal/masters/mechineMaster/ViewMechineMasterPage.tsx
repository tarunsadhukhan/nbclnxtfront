"use client";

import React, { useEffect, useState } from "react";
// Dialog is not used in this view component; keep out to reduce lint noise
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import CreateMechineMasterPage from "./CreateMechineMasterPage";

interface Props { open?: boolean; onClose?: () => void; mechine_master_id: string | number }

export default function ViewMechineMasterPage({ open = false, onClose, mechine_master_id }: Props) {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const co = typeof window !== "undefined" ? localStorage.getItem("sidebar_selectedCompany") : null;
  const co_id = co ? (JSON.parse(co)?.co_id ?? "") : "";

  useEffect(()=>{
    if (!open) return;
    setLoading(true);
    (async ()=>{
      try {
        const { data } = await fetchWithCookie(`${apiRoutesPortalMasters.MECHINE_MASTER_VIEW}?mechine_master_id=${mechine_master_id}&co_id=${co_id}`, 'GET') as any;
  const candidate = data?.data ?? data ?? null;
  setRawResponse(candidate);
  const rec = candidate ? (candidate?.mechine_master || candidate?.mechine || candidate) : null;
  setRecord(rec);
  } catch(err:any){ void 0; }
      finally { setLoading(false); }
    })();
  }, [open, mechine_master_id]);
  // If still loading, show a small Dialog
  if (loading) {
    return (
      <dialog />
    );
  }

  // If we got no record, show debug JSON so caller can inspect the response
  if (!record) {
    return (
      <div>
        <dialog />
        <pre style={{ maxHeight: 300, overflow: 'auto' }}>{JSON.stringify(rawResponse ?? { message: 'no data' }, null, 2)}</pre>
      </div>
    );
  }
  void 0;

  // Render the shared form component directly. It renders its own Dialog when `open` is boolean.
  return <CreateMechineMasterPage open={open} onClose={onClose ?? (() => {})} editId={mechine_master_id} initialMode="view" />;
}
