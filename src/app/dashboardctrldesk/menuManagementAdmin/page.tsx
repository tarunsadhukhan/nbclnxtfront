"use client";

import { Button } from "@/components/ui/button";
import { PencilIcon, Search } from "lucide-react";
import { apiRoutes, apiRoutesconsole } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { Box, TextField, InputAdornment, Tooltip  } from '@mui/material';
import { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
//import type { TooltipProps } from '@mui/material/Tooltip';
import  CustomTooltip  from "@/components/ui/CustomTooltip"; // Adjust import path as necessary

// Sample Role type

type Menu = {
  menu_id: number;
  menu_name: string;
  parent_id: number;
  parent_name: string;
  active: number;
  module_id: number;
  module_name: string;
  tooltip: {
    menu_path: string;
    menu_icon: string | null;
  };
};


export default function MenuManagement() {
  const [rows, setRows] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);


// Real API fetch function with pagination and search
const fetchPortalMenus1 = async (page: number, search?: string) => {
  const limit = 20;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
//    user_id: localStorage.getItem('user_id') || '', // Ensure user_id is not null
  });
  if (search) {
    queryParams.append('search', search);
  }

  const { data, error } = await fetchWithCookie(
    `${apiRoutesconsole.GET_PORTAL_MENU_CTRLDSK_ADMIN}?${queryParams}`,
    "GET"
  );

  if (error || !data) {
    throw new Error(error || 'Failed to fetch roles');
  }
  return data;
};

const fetchPortalMenus = async () => {
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
        `${apiRoutesconsole.GET_PORTAL_MENU_CTRLDSK_ADMIN}?${queryParams}`,
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
    fetchPortalMenus();
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  // Handle pagination model change
  const handlePaginationModelChange = (newPaginationModel: GridPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };




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


// Helper function to create URL with all user data as parameters
const createEditUrl = (menu: Menu) => {
   const params = new URLSearchParams({
      coId: menu.menu_id.toString(),
      coName: encodeURIComponent(menu.menu_name),
    });
  
  console.log("Creating edit URL with params:", Object.fromEntries(params.entries()));
  return `/dashboardctrldesk/menuManagementAdmin/createMenuAdmin?${params.toString()}`;
};

  // Table columns
  const columns: GridColDef[] = [
    {
      field: 'menu_name',
      headerName: 'Menu Name',
      flex: 1,
      minWidth: 180,
      headerClassName: 'bg-[#3ea6da] text-white',
      renderCell: (params) => {
        const menuIconHtml = params.row.tooltip.menu_icon; // HTML string from the database
        let imageSrc = '';
        let fileName = 'image.png'; // Default file name

        if (menuIconHtml) {
          // Parse the HTML to extract the src attribute
          const parser = new DOMParser();
          const doc = parser.parseFromString(menuIconHtml, 'text/html');
          const imgTag = doc.querySelector('img');
          if (imgTag) {
            imageSrc = imgTag.getAttribute('src') || '';
            fileName = imageSrc.split('/').pop() || 'N/A'; // Extract the file name from the URL
          }
        console.log('imageSrc:', imageSrc);
        console.log('fileName:', menuIconHtml);
          imageSrc=menuIconHtml
        }

        return (
          <CustomTooltip
            title={
              <>
                <div>Menu Path: {params.row.tooltip.menu_path || 'N/A'}</div>
                <div>Menu Icon: {fileName}</div>
                {imageSrc && <img src={imageSrc} alt={fileName} style={{ width: '50px', height: '50px', marginTop: '8px' }} />}
              </>
            }
            arrow
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {imageSrc && <img src={imageSrc} alt={fileName} style={{ width: '24px', height: '24px' }} />}
              <span>{params.value}</span>
            </div>
          </CustomTooltip>
        );
      },
    },
    {
      field: 'parent_name',
      headerName: 'Parent Menu',
      flex: 1,
      minWidth: 180,
      headerClassName: 'bg-[#3ea6da] text-white',
      renderCell: (params) => (
        <Tooltip
          title={`Menu Path: ${params.row.tooltip.menu_path || 'N/A'}\nMenu Icon: ${params.row.tooltip.menu_icon || 'N/A'}`}
          arrow
        >
          <span>{params.value}</span>
        </Tooltip>
      ),
    },
    {
      field: 'module_name',
      headerName: 'Module Name',
      flex: 1,
      minWidth: 180,
      headerClassName: 'bg-[#3ea6da] text-white',
      renderCell: (params) => (
        <Tooltip
          title={`Menu Path: ${params.row.tooltip.menu_path || 'N/A'}\nMenu Icon: ${params.row.tooltip.menu_icon || 'N/A'}`}
          arrow
        >
          <span>{params.value}</span>
        </Tooltip>
      ),
    },
    {
      field: 'active',
      headerName: 'Active',
      flex: 1,
      minWidth: 180,
      headerClassName: 'bg-[#3ea6da] text-white',
      renderCell: (params) => (
        <Tooltip
          title={`Menu Path: ${params.row.tooltip.menu_path || 'N/A'}\nMenu Icon: ${params.row.tooltip.menu_icon || 'N/A'}`}
          arrow
        >
          <span>{params.value ? 'Yes' : 'No'}</span>
        </Tooltip>
      ),
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
             window.location.href = createEditUrl(params.row as Menu);
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
          <h1 className="text-2xl font-bold text-[#0C3C60]">Menu Setup</h1>
          <Button
            className="bg-[#95C11F] hover:bg-[#85ad1b] text-white"
            onClick={() => {
              window.location.href = "/dashboardctrldesk/menuManagementAdmin/createMenuAdmin";
            }}
          >
            + Create Menu
          </Button>
        </div>
        
        <Box sx={{ width: '100%', mb: 2 }}>
          <TextField
            placeholder="Search Menus..."
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
          },
          '& .MuiDataGrid-row:hover': {
              cursor: 'pointer',
          },
        }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.menu_id} // Use menu_id as the unique identifier for each row
            paginationModel={paginationModel}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={[10, 20, 50]}
            pagination
            paginationMode="server"
            rowCount={totalRows}
            loading={loading}
            disableRowSelectionOnClick
            onRowDoubleClick={(params) => {
              const menu = params.row as Menu;
              window.location.href = createEditUrl(menu);
            }}
            sx={{
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: '#3ea6da',
                color: 'white',
                fontWeight: 'bold',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 'bold',
              },
            }}
          />
        </Box>
      </div>
    </div>
  );
}
