"use client";

import { Button } from "@/components/ui/button";
import { PencilIcon, Search } from "lucide-react";
import { apiRoutes, apiRoutesconsole } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { Box, TextField, InputAdornment } from '@mui/material';
import { useState, useEffect } from 'react';

type Company = {
  co_id: number;
  co_name: string;
  co_email_id: string;
  co_prefix: string;
};

export default function CompanyManagement() {
  const [rows, setRows] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);  // Helper function to create URL for editing
  const createEditUrl = (company: Company) => {
    const params = new URLSearchParams({
      companyId: company.co_id.toString(),
      companyName: encodeURIComponent(company.co_name),
    });
    
    return `/dashboardadmin/CompanyConfiguration/editConfiguration?${params.toString()}`;
  };

  // Fetch companies from API with pagination and search
  const fetchCompanies = async () => {
    setLoading(true);
    
    try {
      const queryParams = new URLSearchParams({
        page: (paginationModel.page + 1).toString(), // Convert from 0-based to 1-based indexing
        limit: paginationModel.pageSize.toString(),
      });
      
      if (searchQuery) {
        queryParams.append('search', searchQuery);
      }

      const { data, error } = await fetchWithCookie(
        `${apiRoutesconsole.GET_CO_ALL}?${queryParams}`,
        "GET"
      );

      if (error || !data) {
        throw new Error(error || 'Failed to fetch companies');
      }

      // API returns data in { data: [...], total: number } format
      setRows(data.data || []);
      setTotalRows(data.total || 0);
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data when pagination or search changes
  useEffect(() => {
    fetchCompanies();
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  // Handle pagination model change
  const handlePaginationModelChange = (newPaginationModel: GridPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  // Handle search with debounce
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchValue = event.target.value;
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debouncing
    const timeout = setTimeout(() => {
      setSearchQuery(newSearchValue);
      setPaginationModel(prev => ({
        ...prev,
        page: 0 // Reset to first page on new search
      }));
    }, 500); // 500ms debounce
    
    setSearchTimeout(timeout);
  };

  // Column definitions for the DataGrid
  const columns: GridColDef[] = [
    { 
      field: 'co_name', 
      headerName: 'Name', 
      flex: 1,
      minWidth: 180,
      headerClassName: 'bg-[#3ea6da] text-white',
    },
    { 
      field: 'co_email_id', 
      headerName: 'Email', 
      flex: 1,
      minWidth: 200,
      headerClassName: 'bg-[#3ea6da] text-white',
    },
    { 
      field: 'co_prefix', 
      headerName: 'Short Name', 
      flex: 0.7,
      minWidth: 120,
      headerClassName: 'bg-[#3ea6da] text-white',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      headerClassName: 'bg-[#3ea6da] text-white',
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            window.location.href = createEditUrl(params.row as Company);
          }}
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0C3C60]">Company Configuration</h1>
        </div>
        
        <Box sx={{ width: '100%', mb: 2 }}>
          <TextField
            placeholder="Search companies..."
            onChange={handleSearchChange}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ maxWidth: 350 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search className="h-4 w-4" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        
        <Box sx={{ 
          height: 500, 
          width: '100%',
          '& .MuiDataGrid-root': {
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          },
          '& .MuiDataGrid-cell:focus': {
            outline: 'none'
          }
        }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.co_id}
            paginationModel={paginationModel}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={[10, 20, 50]}
            pagination
            paginationMode="server"
            rowCount={totalRows}
            loading={loading}
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: '#3ea6da',
                color: 'white',
                fontWeight: 'bold',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 'bold',
              }
            }}
          />
        </Box>
      </div>
    </div>
  );
}
