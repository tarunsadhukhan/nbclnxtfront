import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";

/**
 * Item returned from the item search endpoint.
 */
export type ItemSearchResult = {
	item_id: number;
	item_grp_id: number;
	item_grp_code: string;
	item_grp_name: string;
	item_code: string;
	full_item_code: string;
	item_name: string;
	uom_id: number;
	uom_name: string;
	hsn_code: string | null;
	tax_percentage: number | null;
	purchaseable: number;
	saleable: number;
};

/**
 * Item make returned alongside search results.
 */
export type ItemSearchMake = {
	item_make_id: number;
	item_make_name: string;
	item_grp_id: number;
};

/**
 * UOM mapping returned alongside search results.
 */
export type ItemSearchUom = {
	item_id: number;
	map_from_id: number;
	map_from_name: string;
	map_to_id: number;
	uom_name: string;
	relation_value: number | null;
	rounding: number | null;
};

/**
 * Full response from the item search endpoint.
 */
export type ItemSearchResponse = {
	data: ItemSearchResult[];
	total: number;
	page: number;
	limit: number;
	makes: ItemSearchMake[];
	uoms: ItemSearchUom[];
};

/**
 * Fetch paginated, searchable item list for selection dialog.
 */
export const fetchItemSearch = async (
	coId: string,
	params?: {
		page?: number;
		limit?: number;
		search?: string;
		filter?: "purchaseable" | "saleable";
	}
): Promise<ItemSearchResponse> => {
	const searchParams = new URLSearchParams();
	searchParams.append("co_id", coId);
	if (params?.page) searchParams.append("page", String(params.page));
	if (params?.limit) searchParams.append("limit", String(params.limit));
	if (params?.search) searchParams.append("search", params.search);
	if (params?.filter) searchParams.append("filter", params.filter);

	const url = `${apiRoutesPortalMasters.ITEM_SEARCH}?${searchParams.toString()}`;
	const response = await fetchWithCookie(url, "GET");

	if (!response || response.error) {
		throw new Error(response?.error ?? "Failed to fetch item search results");
	}

	const result = response.data as Record<string, unknown> | null;
	return {
		data: (result?.data as ItemSearchResult[]) ?? [],
		total: (result?.total as number) ?? 0,
		page: (result?.page as number) ?? 1,
		limit: (result?.limit as number) ?? 15,
		makes: (result?.makes as ItemSearchMake[]) ?? [],
		uoms: (result?.uoms as ItemSearchUom[]) ?? [],
	};
};
