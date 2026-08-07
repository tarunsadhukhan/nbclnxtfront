"use client";

import { Button } from "@/components/ui/button";
import { PencilIcon, Search, TrashIcon } from "lucide-react";
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

type Dept = {
  co_id: number;
  co_name: string;
  branch_id: number;
  branch_name: string;
  dept_id: string;
  dept_desc: string;
  active: number;
};

type Company = {
  co_id: number;
  co_name: string;
};

export default function DeptManagement() {
  const [allBranches, setAllBranches] = useState<Dept[]>([]);
  const [allDepartments, setAllDepartments] = useState<Dept[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  // Helper function to create URL for editing
  const createEditUrl = (dept: Dept) => {
    const params = new URLSearchParams({
      deptId: dept.dept_id.toString(),
      branchId: dept.branch_id.toString(),
      branchName: dept.branch_name,
      companyId: selectedCompanyId,
      companyName: companies.find(c => c.co_id.toString() === selectedCompanyId)?.co_name || ""
    });

    return `/dashboardadmin/deptManagement/createDept?${params.toString()}`;
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
          data.data.map((dept: Dept) => [
            dept.co_id,
            { co_id: dept.co_id, co_name: dept.co_name }
          ])
        ).values()
      ) as Company[];
      // Get co_id and branch_id from localStorage if available
       console.log("Local storage from start deptData check:", localStorage.getItem("deptData"));

      let storedCoId = null;
      let storedBranchId = null;

      if (typeof window !== "undefined") {
        const deptData = localStorage.getItem("deptData");
        if (deptData) {
          try {
            const parsed = JSON.parse(deptData);
            storedCoId = parsed.co_id ? parsed.co_id.toString() : null;
            storedBranchId = parsed.branch_id ? parsed.branch_id.toString() : null;
          } catch (e) {
            console.error("Error parsing deptData from localStorage:", e);
          }
        }
      }

      console.log("Stored Company ID:", storedCoId, "Stored Branch ID:", storedBranchId);
      console.log("Unique Companies:", uniqueCompanies);
      console.log("All Branches:", data.data);

      setCompanies(uniqueCompanies);

      if (storedCoId && uniqueCompanies.some(c => c.co_id.toString() === storedCoId)) {
        console.log("Setting selected company ID to:", storedCoId);
        setSelectedCompanyId(storedCoId);
      } else if (uniqueCompanies.length > 0) {
        console.log("Setting default company ID to:", uniqueCompanies[0].co_id.toString());
        setSelectedCompanyId(uniqueCompanies[0].co_id.toString());
      }

      if (storedBranchId && data.data.some((b: Dept) => b.branch_id.toString() === storedBranchId)) {
        console.log("Setting selected branch ID to:", storedBranchId);
        setSelectedBranchId(storedBranchId);
      } else if (data.data.length > 0) {
        console.log("Setting default branch ID to:", data.data[0].branch_id.toString());
        setSelectedBranchId(data.data[0].branch_id.toString());
      }

    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all departments from API
  const fetchAllDepartments = async () => {
    setLoading(true);

    try {
      const { data, error } = await fetchWithCookie(
        `${apiRoutesconsole.GET_DEPARTMENT_ALL}`,
        "GET"
      );

      if (error || !data) {
        throw new Error(error || 'Failed to fetch departments');
      }

      setAllDepartments(data.data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data on component mount
  useEffect(() => {
    fetchAllBranches();
    fetchAllDepartments();
  }, []);

  // Filter branches based on selected company
  const filteredBranches = useMemo(() => {
    return allBranches.filter(branch => branch.co_id.toString() === selectedCompanyId);
  }, [allBranches, selectedCompanyId]);

  // Effect to set the first company as default when companies are loaded
  useEffect(() => {
    if (companies.length > 0 && selectedCompanyId === '') {
      setSelectedCompanyId(companies[0].co_id.toString());
    }
  }, [companies, selectedCompanyId]);

  // Update effect to reset selectedBranchId when selectedCompanyId changes
  useEffect(() => {
    if (filteredBranches.length > 0) {
      setSelectedBranchId(filteredBranches[0].branch_id.toString());
    } else {
      setSelectedBranchId(''); // Clear branch selection if no branches are available
    }
  }, [filteredBranches]);

  // Handle company selection change
  const handleCompanyChange = (event: SelectChangeEvent<string>) => {
    setSelectedCompanyId(event.target.value);
  };
  const handleBranchChange = (event: SelectChangeEvent<string>) => {
    setSelectedBranchId(event.target.value);
  };

  // Handle search with debounce
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchValue = event.target.value;

    // Clear previous timeout
    if (searchTimeout !== null) {
      window.clearTimeout(searchTimeout);
    }
    // Save the search value to localStorage for persistence (optional)
    // Set new timeout for debouncing
    const timeout = window.setTimeout(() => {
      setSearchQuery(newSearchValue);
    }, 300); // 300ms debounce

    setSearchTimeout(timeout);
  };

  // Filter branches based on selected company and search query
  const filteredDepartments = useMemo(() => {
    return allDepartments.filter(dept => {
      // Filter by branch if one is selected
      const branchMatch =
        selectedBranchId === '' ||
        dept.branch_id.toString() === selectedBranchId;

      // Filter by search query
      const searchMatch = dept.dept_desc.toLowerCase().includes(searchQuery.toLowerCase());

      return branchMatch && searchMatch;
    });
  }, [allDepartments, selectedBranchId, searchQuery]);



  // Column definitions for the DataGrid
  const columns: GridColDef[] = [
    {
      field: 'dept_code',
      headerName: 'Deaprtment Code',
      flex: 1,
      minWidth: 200,
      headerClassName: 'bg-[#3ea6da] text-white',
    },
    {
      field: 'dept_desc',
      headerName: 'Deaprtment Name',
      flex: 1,
      minWidth: 200,
      headerClassName: 'bg-[#3ea6da] text-white',
    },
    {
      field: 'order_id',
      headerName: 'Order By',
      flex: 1,
      minWidth: 200,
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
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const dept = params.row as Dept;
              if (typeof window !== "undefined") {
                
              const locaload: any = {
                co_id: dept.co_id ? dept.co_id : null,
                branch_id: dept.branch_id ? dept.branch_id : null,
            };

              localStorage.setItem("deptData", JSON.stringify(locaload));   
              console.log("Local storage from dpemng set with:", locaload);

              }
              window.location.href = createEditUrl(dept);
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const dept = params.row as Dept;
              if (confirm(`Are you sure you want to delete the department: ${dept.dept_desc}?`)) {
                // Call delete API or perform delete operation here
                console.log("Deleting department:", dept.dept_desc);
                // Example: deleteDepartment(dept.id).then(() => refreshData());
              }
            }}
          >
            <TrashIcon className="h-4 w-4 text-grey-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0C3C60]">Department Setup</h1>
          <Button
            className="bg-[#95C11F] hover:bg-[#85ad1b] text-white"
            onClick={() => {
              window.location.href = "/dashboardadmin/deptManagement/createDept";
            }}
          >
            + Create Department
          </Button>
        </div>

        {/* Company selection dropdown */}
        {/* Filters */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row', // Align dropdowns side by side
            gap: 2, // Add spacing between dropdowns
            mb: 4, // Add margin below the dropdowns
            flexWrap: 'wrap', // Allow wrapping if space is limited
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

          {/* Branch dropdown */}
          <FormControl fullWidth sx={{ maxWidth: 350 }} size="small">
            <InputLabel id="branch-select-label">Select Branch</InputLabel>
            <Select
              labelId="branch-select-label"
              id="branch-select"
              value={selectedBranchId}
              label="Select Branch"
              onChange={handleBranchChange}
            >
              {filteredBranches.map((branch) => (
                <MenuItem key={branch.branch_id} value={branch.branch_id.toString()}>
                  {branch.branch_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Search input */}
        <TextField
          placeholder="Search Departments..."
          onChange={handleSearchChange}
          fullWidth
          variant="outlined"
          size="small"
          sx={{ maxWidth: 350, mb: 4 }} // Added margin-bottom to create gap
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
            rows={filteredDepartments}
            columns={columns}
            getRowId={(row) => row.dept_id}
            loading={loading}
            disableRowSelectionOnClick
            slots={{
              toolbar: GridToolbar,
            }}
            initialState={{
              sorting: {
                sortModel: [{ field: 'dept_desc', sort: 'asc' }],
              },
            }}
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
