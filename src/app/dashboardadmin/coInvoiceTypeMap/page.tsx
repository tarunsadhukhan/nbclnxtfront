"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiRoutesconsole } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { CoInvoiceTypeMapModal, type InvoiceType } from "./_components/CoInvoiceTypeMapModal";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";

type Company = {
  id?: number;
  co_id: number;
  co_name: string;
  co_email_id?: string;
  co_prefix?: string;
};

type SetupData = {
  companies: Array<{ co_id: number; co_name: string }>;
  invoice_types: InvoiceType[];
  mappings: Array<{ co_id: number; invoice_type_id: number }>;
};

export default function CoInvoiceTypeMapPage() {
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCoId, setSelectedCoId] = useState<number | null>(null);
  const [selectedCoName, setSelectedCoName] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });

  const fetchSetupData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fetchError } = await fetchWithCookie(
        apiRoutesconsole.CO_INVOICE_TYPE_MAP_SETUP,
        "GET"
      );

      if (fetchError || !data) {
        throw new Error(fetchError || "Failed to fetch setup data");
      }

      setSetupData(data);
      const companiesWithId = (data.companies || []).map((c: any) => ({
        ...c,
        id: c.co_id,
      }));
      setCompanies(companiesWithId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSetupData();
  }, [fetchSetupData]);

  const getMappedInvoiceTypeIds = useCallback(
    (coId: number): number[] => {
      if (!setupData) return [];
      return setupData.mappings
        .filter((m) => m.co_id === coId)
        .map((m) => m.invoice_type_id);
    },
    [setupData]
  );

  const handleOpenModal = (company: Company) => {
    setSelectedCoId(company.co_id);
    setSelectedCoName(company.co_name);
    setModalOpen(true);
    setModalError("");
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCoId(null);
    setSelectedCoName("");
    setModalError("");
  };

  const handleSaveMapping = async (coId: number, invoiceTypeIds: number[]) => {
    setModalLoading(true);
    setModalError("");
    try {
      const { error: saveError } = await fetchWithCookie(
        apiRoutesconsole.CO_INVOICE_TYPE_MAP_SAVE,
        "POST",
        { co_id: coId, invoice_type_ids: invoiceTypeIds }
      );

      if (saveError) {
        throw new Error(saveError);
      }

      // Refresh setup data to reflect changes
      await fetchSetupData();
      setModalLoading(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to save mappings");
      setModalLoading(false);
      throw err;
    }
  };

  const getMappingCountDisplay = useCallback(
    (coId: number): string => {
      if (!setupData) return "0";
      const count = setupData.mappings.filter((m) => m.co_id === coId).length;
      return `${count} type${count !== 1 ? "s" : ""}`;
    },
    [setupData]
  );

  const columns: GridColDef<Company>[] = useMemo(
    () => [
      {
        field: "co_name",
        headerName: "Company",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "co_prefix",
        headerName: "Prefix",
        flex: 0.5,
        minWidth: 100,
      },
      {
        field: "mapping_count",
        headerName: "Mapped Invoice Types",
        flex: 1,
        minWidth: 180,
        sortable: false,
        filterable: false,
        renderCell: (params) => getMappingCountDisplay(params.row.co_id),
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Button
            size="sm"
            onClick={() => handleOpenModal(params.row)}
          >
            Map Types
          </Button>
        ),
      },
    ],
    [getMappingCountDisplay]
  );

  if (error && !setupData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <IndexWrapper
        title="Invoice Type Mapping"
        subtitle="Assign invoice types to companies"
        rows={companies}
        columns={columns}
        rowCount={companies.length}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={loading}
        showLoadingUntilLoaded
      />

      {selectedCoId && setupData && (
        <CoInvoiceTypeMapModal
          open={modalOpen}
          coId={selectedCoId}
          coName={selectedCoName}
          invoiceTypes={setupData.invoice_types}
          currentMappedIds={getMappedInvoiceTypeIds(selectedCoId)}
          onClose={handleCloseModal}
          onSave={handleSaveMapping}
          loading={modalLoading}
          error={modalError}
        />
      )}
    </>
  );
}
