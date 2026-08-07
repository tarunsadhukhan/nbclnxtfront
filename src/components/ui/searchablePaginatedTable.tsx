import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Share } from "lucide-react";
import { Column, DataTable } from "./datatablewithedit";
import { usePaginatedSearch } from "./paginatedSearch";
import { exportToCSV } from "@/utils/exportToCSV"; // Adjust import path as necessary

export type SearchableTableProps<T> = {
  columns: Column<T>[];
  fetchFn: (page: number, search?: string) => Promise<{ data: T[]; total: number; }>;
};

export function SearchablePaginatedTable<T>({ columns, fetchFn }: SearchableTableProps<T>) {
  const { data, total , isLoading, searchQuery, setSearchQuery, loadMoreRef } = usePaginatedSearch(fetchFn);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Input
          placeholder="Search"
          className="max-w-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button variant="outline" className="gap-2" onClick={() => exportToCSV(data)}>
          <Share className="h-4 w-4" />
          Export
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        totalCount={total}
        isLoading={isLoading}
        loadMoreRef={loadMoreRef}
      />
    </>
  );
}
