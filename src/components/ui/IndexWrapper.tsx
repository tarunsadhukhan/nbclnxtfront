"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, TextField, Tooltip, IconButton, Typography, Stack } from "@mui/material";
import { GridColDef, GridFilterModel, GridPaginationModel, GridRenderCellParams, GridValidRowModel } from "@mui/x-data-grid";
import { usePathname } from "next/navigation";
import { Eye, Edit } from "lucide-react";
import MuiDataGrid from "./muiDataGrid";
import { Button } from "./button";
import { useSidebarContextSafe } from "@/components/dashboard/sidebarContext";

export type IndexWrapperSearchConfig = {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  debounceDelayMs?: number;
};

type CreateActionConfig = {
  label?: string;
  onClick: () => void;
  allowed?: boolean;
};

type BaseColumn<RowType extends GridValidRowModel> = GridColDef<RowType>;

type CommonGridProps<RowType extends GridValidRowModel> = {
  rows: RowType[];
  columns: BaseColumn<RowType>[];
  rowCount: number;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  loading?: boolean;
  showLoadingUntilLoaded?: boolean;
  /** Grow the grid to fit all rows so the page scrolls instead of the grid. */
  autoHeight?: boolean;
};

type IndexWrapperProps<RowType extends GridValidRowModel & { id?: string | number }> = CommonGridProps<RowType> & {
  title?: string;
  subtitle?: string;
  search?: IndexWrapperSearchConfig;
  createAction?: CreateActionConfig;
  onView?: (row: RowType) => void;
  onEdit?: (row: RowType) => void;
  /** Per-row callback to determine if a row can be edited.
   * When provided, rows where this returns false show the View (eye) icon
   * even if the user has page-level edit permission.
   * When not provided, all rows follow page-level permission (current behavior). */
  isRowEditable?: (row: RowType) => boolean;
  toolbarContent?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Show MUI DataGrid toolbar with filters, column selector, density, and export */
  showToolbar?: boolean;
  /** Server-side filtering support */
  filterMode?: "client" | "server";
  filterModel?: GridFilterModel;
  onFilterModelChange?: (model: GridFilterModel) => void;
};

function IndexWrapper<RowType extends GridValidRowModel & { id?: string | number }>({
  title,
  subtitle,
  rows,
  columns,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  loading = false,
  showLoadingUntilLoaded = false,
  autoHeight = true,
  search,
  createAction,
  onView,
  onEdit,
  isRowEditable,
  toolbarContent,
  children,
  className,
  contentClassName,
  showToolbar = false,
  filterMode,
  filterModel,
  onFilterModelChange,
}: IndexWrapperProps<RowType>) {
  const sidebarContext = useSidebarContextSafe();
  const hasMenuAccess = sidebarContext?.hasMenuAccess ?? (() => true);
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState<string>(search?.value ?? "");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchConfigRef = useRef<typeof search>(search);

  const externalSearchValue = search?.value ?? "";

  const canView = useMemo(() => hasMenuAccess(pathname, "view"), [hasMenuAccess, pathname]);
  const canEdit = useMemo(() => hasMenuAccess(pathname, "edit"), [hasMenuAccess, pathname]);
  const canCreate = useMemo(() => hasMenuAccess(pathname, "create"), [hasMenuAccess, pathname]);

  useEffect(() => {
    latestSearchConfigRef.current = search;
  }, [search]);

  useEffect(() => {
    if (!search) {
      setSearchInput(prev => {
        if (prev === "") {
          return prev;
        }
        return "";
      });
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      return;
    }

    setSearchInput(prev => {
      if (prev === externalSearchValue) {
        return prev;
      }
      return externalSearchValue;
    });
  }, [externalSearchValue, search]);

  useEffect(() => () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
  }, []);

  const triggerSearchChange = useCallback((value: string) => {
    const config = latestSearchConfigRef.current;
    if (!config?.onChange) return;

    const syntheticEvent = {
      target: { value } as EventTarget & HTMLInputElement,
      currentTarget: { value } as EventTarget & HTMLInputElement,
    } as React.ChangeEvent<HTMLInputElement>;

    config.onChange(syntheticEvent);
  }, []);

  const handleSearchInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setSearchInput(nextValue);

    const config = latestSearchConfigRef.current;
    if (!config?.onChange) {
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const delay = typeof config.debounceDelayMs === "number" ? Math.max(config.debounceDelayMs, 0) : 1000;

    if (delay === 0) {
      triggerSearchChange(nextValue);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      triggerSearchChange(nextValue);
    }, delay);
  }, [triggerSearchChange]);

  const actionColumn = useMemo<BaseColumn<RowType> | undefined>(() => {
    const hasEditHandler = Boolean(onEdit) && canEdit;
    const hasViewHandler = Boolean(onView) && canView;

    // If neither action is available at the page level, no column needed
    if (!hasEditHandler && !hasViewHandler) {
      return undefined;
    }

    return {
      field: "__actions",
      headerName: "Actions",
      width: 90,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams<RowType>) => {
        const row = params.row;

        // Determine per-row editability
        // If isRowEditable is provided, use it; otherwise default to true (all rows editable)
        const rowEditable = isRowEditable ? isRowEditable(row) : true;
        const showEditForRow = hasEditHandler && rowEditable;
        const showViewForRow = !showEditForRow && hasViewHandler;

        return (
          <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
            {showEditForRow ? (
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit?.(row)}>
                  <Edit size={16} />
                </IconButton>
              </Tooltip>
            ) : showViewForRow ? (
              <Tooltip title="View">
                <IconButton size="small" onClick={() => onView?.(row)}>
                  <Eye size={16} />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        );
      },
    } satisfies BaseColumn<RowType>;
  }, [canEdit, canView, isRowEditable, onEdit, onView]);

  const finalColumns = useMemo<BaseColumn<RowType>[]>(() => {
    if (!actionColumn) {
      return columns;
    }
    return [actionColumn, ...columns];
  }, [actionColumn, columns]);

  const createAllowed = createAction ? (createAction.allowed ?? canCreate) : false;

  return (
    <div className={`min-h-screen bg-gray-50 p-8 ${className ?? ""}`}>
      <div className={`mx-auto ${contentClassName ?? "max-w-7xl"}`}>
        {(title || subtitle) ? (
          <div className="mb-6 flex flex-col gap-2">
            {title ? (
              <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </div>
        ) : null}

        {(search || createAllowed || toolbarContent) && (
          <Box className="mb-6 flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between">
            {toolbarContent ? <Box className="flex flex-wrap items-center gap-3">{toolbarContent}</Box> : <span />}
            <Box className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {search ? (
                <TextField
                  size="small"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  placeholder={search.placeholder ?? "Search"}
                />
              ) : null}
              {createAction && createAllowed ? (
                <Button onClick={createAction.onClick}>
                  {createAction.label ?? "Create"}
                </Button>
              ) : null}
            </Box>
          </Box>
        )}

        <MuiDataGrid
          rows={rows}
          columns={finalColumns}
          rowCount={rowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          paginationMode="server"
          loading={loading}
          showLoadingUntilLoaded={showLoadingUntilLoaded}
          autoHeight={autoHeight}
          showToolbar={showToolbar}
          filterMode={filterMode}
          filterModel={filterModel}
          onFilterModelChange={onFilterModelChange}
        />

        {children}
      </div>
    </div>
  );
}

export default IndexWrapper;
