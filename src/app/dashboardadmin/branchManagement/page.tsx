"use client";

import { Button } from "@/components/ui/button";
import { PencilIcon, Search } from "lucide-react";
import { apiRoutes, apiRoutesconsole } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";
import { 
  DataGrid, 
  GridColDef,
  GridToolbar
} from '@mui/x-data-grid';
import { 
  Box, 
  TextField, 
  InputAdornment, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent 
} from '@mui/material';
import { useState, useEffect, useMemo } from 'react';

type Branch = {
  co_id: number;
  co_name: string;
  branch_id: string;
  branch_name: string;
  active: number;
};

type Company = {
  co_id: number;
  co_name: string;
};

export default function BranchManagement() {
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  // Helper function to create URL for editing
  const createEditUrl = (branch: Branch) => {
    const params = new URLSearchParams({
      branchId: branch.branch_id.toString(),
      companyId: branch.co_id.toString(),
      companyName: branch.co_name
    });
    
    return `/dashboardadmin/branchManagement/createBranch?${params.toString()}`;
  };

  // Fetch all branches from API
  const fetchAllBranches = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await fetchWithCookie(
        `${apiRoutesconsole.GET_BRANCH_ALL}`,
        "GET"
      );

      if (error || !data) {
        throw new Error(error || 'Failed to fetch branches');
      }

      setAllBranches(data.data || []);
      
      // Extract unique companies from the branch data
      const uniqueCompanies = Array.from(
        new Map(
          data.data.map((branch: Branch) => [
            branch.co_id,
            { co_id: branch.co_id, co_name: branch.co_name }
          ])
        ).values()
      ) as Company[];
      
      setCompanies(uniqueCompanies);
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data on component mount
  useEffect(() => {
    fetchAllBranches();
  }, []);

  // Effect to set the first company as default when companies are loaded
  useEffect(() => {
    if (companies.length > 0 && selectedCompanyId === '') {
      setSelectedCompanyId(companies[0].co_id.toString());
    }
  }, [companies, selectedCompanyId]);

  // Handle company selection change
  const handleCompanyChange = (event: SelectChangeEvent<string>) => {
    setSelectedCompanyId(event.target.value);
  };

  // Handle search with debounce
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchValue = event.target.value;
    
    // Clear previous timeout
    if (searchTimeout !== null) {
      window.clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debouncing
    const timeout = window.setTimeout(() => {
      setSearchQuery(newSearchValue);
    }, 300); // 300ms debounce
    
    setSearchTimeout(timeout);
  };

  // Filter branches based on selected company and search query
  const filteredBranches = useMemo(() => {
    return allBranches.filter(branch => {
      // Filter by company if one is selected
      const companyMatch = selectedCompanyId === '' || 
                          branch.co_id.toString() === selectedCompanyId;
      
      // Filter by search query
      const searchMatch = branch.branch_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return companyMatch && searchMatch;
    });
  }, [allBranches, selectedCompanyId, searchQuery]);
  
  // Column definitions for the DataGrid
  const columns: GridColDef[] = [
    { 
      field: 'branch_name', 
      headerName: 'Branch Name', 
      flex: 1,
      minWidth: 200,
      headerClassName: 'bg-[hsl(var(--table-header))] text-white',
    },
    { 
      field: 'active', 
      headerName: 'Active', 
      flex: 0.7,
      minWidth: 120,
      headerClassName: 'bg-[hsl(var(--table-header))] text-white',
      renderCell: (params) => (
        <span className={`font-medium ${params.row.active ? 'text-green-500' : 'text-red-500'}`}>
          {params.row.active ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      headerClassName: 'bg-[hsl(var(--table-header))] text-white',
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            window.location.href = createEditUrl(params.row as Branch);
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
          <h1 className="text-2xl font-bold text-[#0C3C60]">Branch Setup</h1>
          <Button
            className="bg-[#95C11F] hover:bg-[#85ad1b] text-white"
            onClick={() => {
              const selectedCompany = companies.find(
                (c) => c.co_id.toString() === selectedCompanyId
              );
              const params = new URLSearchParams();
              if (selectedCompanyId) params.set("companyId", selectedCompanyId);
              if (selectedCompany?.co_name) params.set("companyName", selectedCompany.co_name);
              const qs = params.toString();
              window.location.href = `/dashboardadmin/branchManagement/createBranch${qs ? `?${qs}` : ""}`;
            }}
          >
            + Create Branch
          </Button>
        </div>
        
        {/* Company selection dropdown */}
        {/* Filters */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,   // space between dropdown and search
            mb: 4,    // space between filters and table
          }}
        >
          {/* Company dropdown */}
          <FormControl fullWidth sx={{ maxWidth: 350 }} size="small">
            <InputLabel id="company-select-label">Select Company</InputLabel>
            <Select
              labelId="company-select-label"
              id="company-select"
              value={selectedCompanyId}
              label="Select Company"
              onChange={handleCompanyChange}
            >
              {companies.map((company) => (
          <MenuItem key={company.co_id} value={company.co_id.toString()}>
            {company.co_name}
          </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Search input */}
          <TextField
            placeholder="Search branches..."
            onChange={handleSearchChange}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ maxWidth: 350 }}
            slotProps={{
              input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search className="h-4 w-4" />
            </InputAdornment>
          ),
              },
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
            rows={filteredBranches}
            columns={columns}
            getRowId={(row) => row.branch_id}
            loading={loading}
            disableRowSelectionOnClick
            slots={{
              toolbar: GridToolbar,
            }}
            initialState={{
              sorting: {
                sortModel: [{ field: 'branch_name', sort: 'asc' }],
              },
            }}
            sx={{
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: 'hsl(var(--table-header))',
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
