"use client";

import React, { useEffect, useState } from "react";
import { Dialog } from "@mui/material";
import CreateProjectPage from "./CreateProjectPage";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

interface Props { open?: boolean; onClose?: (saved?: boolean) => void; project_id?: string | number }

export default function EditProjectPage({ open = false, onClose, project_id }: Props) {
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);

  useEffect(()=>{ if (!open || !project_id) return; (async ()=>{
    setLoading(true); setRecord(null); setRawResponse(null);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const params = new URLSearchParams({ project_id: String(project_id), co_id });
      const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.PROJECT_MASTER_VIEW}?${params}`, 'GET') as any;
      if (error || !data) throw new Error(error || 'Failed to load project');
      const candidate = data?.data ?? data;
      const rec = candidate?.project || candidate?.project_master || candidate;
      setRawResponse(candidate);
      setRecord(rec);
    } catch(err:any){ console.warn('EditProjectPage failed to load', err?.message || err); setRawResponse(null); setRecord(null); }
    finally{ setLoading(false); }
  })(); }, [open, project_id]);

  return (
    <Dialog open={open} onClose={() => onClose && onClose()} maxWidth="sm" fullWidth>
      {record ? <CreateProjectPage open={true} onClose={onClose} readOnly={false} initialValues={record} isEdit={true} project_id={project_id} /> : <div style={{ padding: 16 }}>{loading ? 'Loading...' : (rawResponse ? <pre>{JSON.stringify(rawResponse, null, 2)}</pre> : 'No details')}</div>}
    </Dialog>
  );
}
