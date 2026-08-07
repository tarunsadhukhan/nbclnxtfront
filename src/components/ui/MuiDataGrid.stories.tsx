import React from 'react';
import MuiDataGrid from './muiDataGrid';
import { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 90 },
  { field: 'name', headerName: 'Name', width: 150 },
];

const rows = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

/**
 * MuiDataGrid - A wrapper around MUI's DataGrid for consistent styling and server/client pagination support.
 *
 * Props:
 * - rows: Array of row data objects.
 * - columns: Array of column definitions.
 * - rowCount: Total number of rows (for server-side pagination).
 * - onPaginationModelChange: Callback for pagination changes.
 * - loading: Whether to show loading spinner.
 * - paginationModel: Current pagination state.
 * - pageSizeOptions: Page size options for the DataGrid.
 * - paginationMode: Pagination mode ('client' | 'server').
 * - disableRowSelectionOnClick: Disable row selection on click.
 * - showLoadingUntilLoaded: If true, loading spinner is shown until explicitly set to false.
 */

export default {
  title: 'Components/MuiDataGrid',
  component: MuiDataGrid,
  decorators: [
    (Story: any) => (
      <ThemeProvider theme={theme}>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'A wrapper around MUI DataGrid for consistent styling and server/client pagination.\n' +
          'Props:\n' +
          '- rows: Array of row data objects.\n' +
          '- columns: Array of column definitions.\n' +
          '- rowCount: Total number of rows (for server-side pagination).\n' +
          '- onPaginationModelChange: Callback for pagination changes.\n' +
          '- loading: Whether to show loading spinner.\n' +
          '- paginationModel: Current pagination state.\n' +
          '- pageSizeOptions: Page size options for the DataGrid.\n' +
          '- paginationMode: Pagination mode (\'client\' | \'server\').\n' +
          '- disableRowSelectionOnClick: Disable row selection on click.\n' +
          '- showLoadingUntilLoaded: If true, loading spinner is shown until explicitly set to false.'
      }
    }
  }
};

export const Default = () => {
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  return (
    <MuiDataGrid
      rows={rows}
      columns={columns}
      rowCount={rows.length}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={false}
      showLoadingUntilLoaded={true}
    />
  );
};
