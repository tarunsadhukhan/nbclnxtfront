// File: components/DataTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, X, ChevronDown, Check } from "lucide-react";
import React, { RefObject, useState, useEffect, useMemo } from "react";
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export type Column<T> = {
  key: keyof T | string;
  label: string;
  className?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: string[]; // Optional predefined filter options
  visible?: boolean; // defaults to true
};

type Filter = {
  key: string;
  value: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  totalCount?: number;
  loadMoreRef?: RefObject<HTMLDivElement | null>;
  sortKey?: string | null;
  sortOrder?: "asc" | "desc";
  setSortKey?: (key: string) => void;
  setSortOrder?: (order: "asc" | "desc") => void;
  onFilterChange?: (filters: Filter[]) => void;
  serverSideFiltering?: boolean;
};

export function DataTable<T>({
  columns,
  data,
  isLoading,
  totalCount,
  loadMoreRef,
  sortKey,
  sortOrder,
  setSortKey,
  setSortOrder,
  onFilterChange,
  serverSideFiltering = false,
}: DataTableProps<T>) {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filteredData, setFilteredData] = useState<T[]>(data);
  const [filterMenuOpen, setFilterMenuOpen] = useState<Record<string, boolean>>({});
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});

  // Generate unique filter options for each column
  const filterOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {};
    
    columns.forEach(col => {
      if (col.filterable) {
        const key = col.key as string;

        // If predefined options are provided, use those
        if (col.filterOptions) {
          options[key] = new Set(col.filterOptions);
        } else {
          // Otherwise derive from data
          options[key] = new Set();
          data.forEach((row: unknown) => {
            const r = row as Record<string, unknown>;
            const value = r[key];
            if (value !== undefined && value !== null) {
              // Handle special rendering for the active column
              if (key === 'active' && typeof value === 'number') {
                options[key].add(value === 1 ? 'Yes' : 'No');
              } else {
                options[key].add(String(value));
              }
            }
          });
        }
      }
    });
    
    return options;
  }, [columns, data]);

  // Apply filters to data
  useEffect(() => {
    if (serverSideFiltering || filters.length === 0) {
      setFilteredData(data);
      return;
    }

    const result = data.filter((row: unknown) => {
      const r = row as Record<string, unknown>;
      return filters.every(filter => {
        const value = r[filter.key];
        if (value === undefined || value === null) return false;

        // Handle special case for active column
        if (filter.key === 'active' && typeof value === 'number') {
          const stringVal = value === 1 ? 'Yes' : 'No';
          return stringVal === filter.value;
        }

        return String(value).toLowerCase() === filter.value.toLowerCase();
      });
    });

    setFilteredData(result);
  }, [data, filters, serverSideFiltering]);

  // Notify parent component about filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  }, [filters, onFilterChange]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => {
      const filterExists = prev.some(filter => filter.key === key);
      
      if (!value && filterExists) {
        return prev.filter(filter => filter.key !== key);
      }
      
      if (!filterExists && value) {
        return [...prev, { key, value }];
      }
      
      return prev.map(filter => filter.key === key ? { ...filter, value } : filter);
    });
  };

  const getFilterValue = (key: string): string | undefined => {
    const filter = filters.find(f => f.key === key);
    return filter ? filter.value : undefined;
  };

  const clearFilter = (key: string) => {
    setFilters(prev => prev.filter(filter => filter.key !== key));
  };

  const handleSearchChange = (key: string, value: string) => {
    setSearchValues(prev => ({
      ...prev,
      [key]: value.toLowerCase()
    }));
  };

  // Get filtered options based on search value
  const getFilteredOptions = (key: string) => {
    const options = Array.from(filterOptions[key] || []).sort();
    const searchValue = searchValues[key] || '';
    
    if (!searchValue) return options;
    
    return options.filter(option => 
      option.toLowerCase().includes(searchValue.toLowerCase())
    );
  };

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.filter(col => col.visible !== false).map(col => (
              <TableHead
                key={col.key as string}
                className={col.className ?? (col.sortable ? "bg-[#3ea6da] text-white cursor-pointer" : "bg-[#3ea6da] text-white")}
                onClick={() => {
                  if (col.sortable && setSortKey && setSortOrder) {
                    if (sortKey === col.key) {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortKey(col.key as string);
                      setSortOrder("asc");
                    }
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            {columns.filter(col => col.visible !== false).map(col => (
              <TableHead key={`filter-${col.key as string}`} className="p-2">
                {col.filterable && (
                  <DropdownMenu 
                    open={filterMenuOpen[col.key as string]} 
                    onOpenChange={(open) => setFilterMenuOpen(prev => ({ ...prev, [col.key as string]: open }))}
                  >
                    <DropdownMenuTrigger className="w-full flex items-center justify-between whitespace-nowrap rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 focus:border-blue-500 focus:outline-none">
                      {getFilterValue(col.key as string) || `Filter ${col.label}`}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 max-h-60 overflow-y-auto">
                      <div className="px-2 py-1">
                        <input
                          type="text"
                          className="w-full px-2 py-1 text-sm border rounded"
                          placeholder="Search..."
                          value={searchValues[col.key as string] || ''}
                          onChange={(e) => handleSearchChange(col.key as string, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      {getFilterValue(col.key as string) && (
                        <div 
                          className="px-2 py-1 text-sm text-gray-700 flex items-center cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            clearFilter(col.key as string);
                            setFilterMenuOpen(prev => ({ ...prev, [col.key as string]: false }));
                          }}
                        >
                          <X className="h-3 w-3 mr-2" />
                          Clear filter
                        </div>
                      )}
                      
                      {getFilteredOptions(col.key as string).map(option => (
                        <div 
                          key={option}
                          className="px-2 py-1 text-sm text-gray-700 flex items-center cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            handleFilterChange(col.key as string, option);
                            setFilterMenuOpen(prev => ({ ...prev, [col.key as string]: false }));
                          }}
                        >
                          {getFilterValue(col.key as string) === option && (
                            <Check className="h-3 w-3 mr-2" />
                          )}
                          <span className={getFilterValue(col.key as string) === option ? "font-bold" : ""}>
                            {option}
                          </span>
                        </div>
                      ))}
                      
                      {getFilteredOptions(col.key as string).length === 0 && (
                        <div className="px-2 py-1 text-sm text-gray-500">
                          No options found
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(serverSideFiltering ? data : filteredData).map((row, idx) => (
            <TableRow key={(row as any).id || idx}>
              {columns.filter(col => col.visible !== false).map(col => (
                <TableCell key={col.key as string}>
                  {col.render
                    ? col.render((row as any)[col.key], row)
                    : (row as any)[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {!isLoading && (serverSideFiltering ? data : filteredData).length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.filter(col => col.visible !== false).length} className="text-center py-4">
                No data found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div ref={loadMoreRef} className="py-4 text-center text-sm text-gray-500">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : totalCount !== undefined && (serverSideFiltering ? data : filteredData).length < totalCount ? (
          "Scroll for more"
        ) : (
          "No more data to load"
        )}
      </div>
    </div>
  );
}
