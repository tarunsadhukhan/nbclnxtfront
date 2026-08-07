import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowsProp,
  GridFilterModel,
  GridSortModel,
  GridRowClassNameParams,
} from '@mui/x-data-grid';
import { Box } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import {
  useColumnsSizedToContent,
  wrappingGridSx,
  autoRowHeight,
  showCellTooltip,
  WRAPPED_HEADER_HEIGHT,
} from './gridAutoSize';

interface MuiDataGridProps {
  rows: GridRowsProp;
  columns: GridColDef[];
  rowCount: number;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  loading?: boolean;
  paginationModel?: GridPaginationModel;
  pageSizeOptions?: number[];
  paginationMode?: 'client' | 'server';
  disableRowSelectionOnClick?: boolean;
  showLoadingUntilLoaded?: boolean;
  /** Grow the grid to fit all rows so the page scrolls instead of the grid. */
  autoHeight?: boolean;
  // Toolbar and filtering props
  showToolbar?: boolean;
  filterMode?: 'client' | 'server';
  sortingMode?: 'client' | 'server';
  filterModel?: GridFilterModel;
  onFilterModelChange?: (model: GridFilterModel) => void;
  sortModel?: GridSortModel;
  onSortModelChange?: (model: GridSortModel) => void;
  // Column features
  disableColumnFilter?: boolean;
  disableColumnSelector?: boolean;
  disableDensitySelector?: boolean;
  disableExport?: boolean;
  // Optional per-row class hook (e.g. to style a pinned grand-total row).
  // Return "row-grand-total" to apply the built-in bold/highlight styling.
  getRowClassName?: (params: GridRowClassNameParams) => string;
}

const MuiDataGrid: React.FC<MuiDataGridProps> = ({
  rows,
  columns,
  rowCount,
  onPaginationModelChange,
  loading = false,
  paginationModel = { page: 0, pageSize: 10 },
  pageSizeOptions = [10, 20, 50],
  paginationMode = 'server',
  disableRowSelectionOnClick = true,
  showLoadingUntilLoaded = false,
  autoHeight = true,
  // Toolbar and filtering props
  showToolbar = false,
  filterMode = 'client',
  sortingMode = 'client',
  filterModel,
  onFilterModelChange,
  sortModel,
  onSortModelChange,
  // Column features
  disableColumnFilter = false,
  disableColumnSelector = false,
  disableDensitySelector = false,
  disableExport = false,
  getRowClassName,
}) => {
  // Ensure component is mounted before rendering DataGrid to avoid
  // "Can't perform a React state update on a component that hasn't mounted yet"
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Columns size themselves to their content (capped at ~30 chars, then the cell
  // wraps) and every cell gets a hover tooltip — applied here so all grids inherit it.
  const sizedColumns = useColumnsSizedToContent(columns, rows as readonly Record<string, unknown>[]);

  // Render empty placeholder with same dimensions to avoid hydration mismatch
  // The placeholder must be identical on server and client for initial render
  if (!isMounted) {
    return (
      <Box
        sx={{
          height: autoHeight ? 'auto' : 500,
          minHeight: autoHeight ? 200 : undefined,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        suppressHydrationWarning
      />
    );
  }

  return (
    <Box onMouseOver={showCellTooltip} sx={{
      height: autoHeight ? 'auto' : 500,
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
        columns={sizedColumns}
        autoHeight={autoHeight}
        getRowHeight={autoRowHeight}
        columnHeaderHeight={WRAPPED_HEADER_HEIGHT}
        getRowId={(row) => row.id ?? row.co_id}
        loading={showLoadingUntilLoaded ? loading : false}
        paginationMode={paginationMode}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        pageSizeOptions={pageSizeOptions}
        // `rowCount` only has meaning for server-side pagination; passing it in
        // client mode triggers a MUI X warning (the grid derives the count from
        // `rows` itself).
        {...(paginationMode === 'server' ? { rowCount } : {})}
        disableRowSelectionOnClick={disableRowSelectionOnClick}
        pagination
        // Use the new showToolbar prop instead of deprecated GridToolbar
        showToolbar={showToolbar}
        // Filtering
        filterMode={filterMode}
        filterModel={filterModel}
        onFilterModelChange={onFilterModelChange}
        // Sorting
        sortingMode={sortingMode}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        // Column features
        disableColumnFilter={disableColumnFilter}
        disableColumnSelector={disableColumnSelector}
        disableDensitySelector={disableDensitySelector}
        getRowClassName={getRowClassName}
        sx={{
          ...wrappingGridSx,
          '& .MuiDataGrid-columnHeader': {
            backgroundColor: '#3ea6da',
            color: 'white',
            fontWeight: 'bold',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            ...wrappingGridSx['& .MuiDataGrid-columnHeaderTitle'],
            fontWeight: 'bold',
          },
          '& .MuiDataGrid-toolbarContainer': {
            padding: '8px 16px',
            gap: '8px',
          },
          // Pinned grand-total row (opt-in via getRowClassName).
          '& .row-grand-total': {
            backgroundColor: '#eef6fb',
            fontWeight: 'bold',
          },
          '& .row-grand-total:hover': {
            backgroundColor: '#e0eff7',
          },
        }}
      />
    </Box>
  );
};

export default MuiDataGrid;
