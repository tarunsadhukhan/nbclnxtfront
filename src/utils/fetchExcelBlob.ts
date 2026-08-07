import axios from "axios";

export type ExcelBlobParams = {
	coId?: number | string | null;
	branchId?: number | string | null;
	search?: string | null;
	fromDate?: string | null;
	toDate?: string | null;
	branchIds?: string | null;
	statusId?: number | string | null;
};

/**
 * GET an .xlsx blob from a backend route, applying optional filters as query
 * params. Mirrors the axios pattern in jutePurchase/mr/utils/mrService.ts so
 * that error JSON inside a Blob response gets surfaced as a string.
 */
export async function fetchExcelBlob(url: string, params: ExcelBlobParams): Promise<Blob> {
	const qs = new URLSearchParams();
	if (params.coId !== null && params.coId !== undefined && String(params.coId) !== "")
		qs.append("co_id", String(params.coId));
	if (params.branchId !== null && params.branchId !== undefined && String(params.branchId) !== "")
		qs.append("branch_id", String(params.branchId));
	if (params.branchIds && params.branchIds.trim()) qs.append("branch_ids", params.branchIds.trim());
	if (params.search && params.search.trim()) qs.append("search", params.search.trim());
	if (params.statusId !== null && params.statusId !== undefined && String(params.statusId) !== "")
		qs.append("status_id", String(params.statusId));
	if (params.fromDate) qs.append("from_date", params.fromDate);
	if (params.toDate) qs.append("to_date", params.toDate);

	const fullUrl = `${url}?${qs.toString()}`;

	try {
		const response = await axios.get<Blob>(fullUrl, {
			responseType: "blob",
			withCredentials: true,
		});
		return response.data;
	} catch (err: unknown) {
		if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
			try {
				const text = await err.response.data.text();
				const parsed = JSON.parse(text) as { detail?: string };
				throw new Error(parsed.detail ?? "Excel download failed");
			} catch {
				throw new Error("Excel download failed");
			}
		}
		throw err instanceof Error ? err : new Error(String(err));
	}
}
