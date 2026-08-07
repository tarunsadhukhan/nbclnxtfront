// File: components/DataTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import React, { RefObject } from "react";

export type Column<T> = {
  key: keyof T | string;
  label: string;
  className?: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  visible?: boolean; // defaults to true
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
}: DataTableProps<T>) {
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
                  // console.log(`Sorting by ${col.key} in ${sortOrder} order ${col.sortable} ${sortKey}`);
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
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
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
        </TableBody>
      </Table>
      <div ref={loadMoreRef} className="py-4 text-center text-sm text-gray-500">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : totalCount !== undefined && data.length < totalCount ? (
          "Scroll for more"
        ) : (
          "No more data to load"
        )}
      </div>
    </div>
  );
}
