import React from "react";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type TransactionType = "indent" | "po" | "purchaseorder" | "grn" | "invoice" | "stock-transfer" | "delivery-order" | "quotation" | "salesOrder" | "sales-invoice" | "mr" | "priceEnquiry";

/**
 * Menu path patterns for each transaction type.
 * Used for fallback matching when exact path match fails.
 */
const TRANSACTION_MENU_PATTERNS: Record<TransactionType, { pathIncludes: string[]; nameIncludes: string[]; excludes: string[] }> = {
	indent: {
		pathIncludes: ["indent", "/procurement/indent"],
		nameIncludes: ["indent"],
		excludes: ["jute"],
	},
	po: {
		pathIncludes: ["procurement/purchaseorder", "procurement/po"],
		nameIncludes: ["po", "purchase order"],
		excludes: ["jute"],
	},
	purchaseorder: {
		pathIncludes: ["procurement/purchaseorder", "procurement/po"],
		nameIncludes: ["po", "purchase order"],
		excludes: ["jute"],
	},
	grn: {
		pathIncludes: ["grn", "goods-receipt"],
		nameIncludes: ["grn", "goods receipt"],
		excludes: ["jute"],
	},
	invoice: {
		pathIncludes: ["invoice"],
		nameIncludes: ["invoice"],
		excludes: ["jute"],
	},
	"stock-transfer": {
		pathIncludes: ["stock-transfer", "stocktransfer"],
		nameIncludes: ["stock transfer"],
		excludes: [],
	},
	"delivery-order": {
		pathIncludes: ["sales/deliveryorder", "sales/delivery-order"],
		nameIncludes: ["delivery order", "delivery_order"],
		excludes: [],
	},
	quotation: {
		pathIncludes: ["sales/quotation"],
		nameIncludes: ["quotation", "sales quotation"],
		excludes: [],
	},
	salesOrder: {
		pathIncludes: ["sales/salesorder", "sales/sales-order"],
		nameIncludes: ["sales order", "sales_order"],
		excludes: [],
	},
	"sales-invoice": {
		pathIncludes: ["sales/salesinvoice", "sales/sales-invoice"],
		nameIncludes: ["sales invoice", "sales_invoice"],
		excludes: [],
	},
	mr: {
		// Jute Material Receipt. Primary resolution is the exact-path match
		// against the MR menu (e.g. /dashboardportal/jutePurchase/mr); these
		// patterns are the name/path fallback.
		pathIncludes: ["jutepurchase/mr", "jute/mr"],
		nameIncludes: ["material receipt"],
		excludes: [],
	},
	priceEnquiry: {
		pathIncludes: ["procurement/priceenquiry", "procurement/price-enquiry"],
		nameIncludes: ["price enquiry", "price_enquiry", "priceenquiry"],
		excludes: ["jute"],
	},
};

type UseMenuIdParams = {
	/**
	 * The transaction type to match against menu paths/names.
	 */
	transactionType: TransactionType;
	/**
	 * Optional menu_id from URL query params. If provided, this takes precedence.
	 */
	menuIdFromUrl?: string;
};

/**
 * Hook to resolve the menu_id for a transaction page.
 * 
 * Resolution order:
 * 1. menuIdFromUrl (if provided)
 * 2. Exact path match from availableMenus
 * 3. Partial path match based on transaction type patterns
 * 4. Fallback to sidebarMenuItems
 * 5. Fallback to localStorage
 */
export const useMenuId = ({ transactionType, menuIdFromUrl }: UseMenuIdParams) => {
	const pathname = usePathname();
	const { availableMenus, menuItems: sidebarMenuItems } = useSidebarContext();

	const getMenuId = React.useCallback((): string => {
		// 1. Use URL param if provided
		if (menuIdFromUrl) return menuIdFromUrl;

		const patterns = TRANSACTION_MENU_PATTERNS[transactionType];
		if (!patterns) return "";

		// 2. Try matching from availableMenus
		if (availableMenus && availableMenus.length > 0) {
			const currentPath = pathname?.toLowerCase() || "";

			// First, try exact path match
			const matchingMenu = availableMenus.find((item) => {
				if (!item.menu_path) return false;
				const menuPath = item.menu_path.toLowerCase();
				return currentPath === menuPath || currentPath.startsWith(menuPath + "/");
			});
			if (matchingMenu?.menu_id) {
				return String(matchingMenu.menu_id);
			}

			// Second, try matching based on transaction type patterns
			const menuByPattern = availableMenus.find((item) => {
				const path = (item.menu_path || "").toLowerCase();
				const name = (item.menu_name || "").toLowerCase();

				// Check excludes first
				const isExcluded = patterns.excludes.some(
					(exc) => path.includes(exc) || name.includes(exc)
				);
				if (isExcluded) return false;

				// Check if path or name matches any pattern
				const pathMatches = patterns.pathIncludes.some((p) => path.includes(p));
				const nameMatches = patterns.nameIncludes.some((n) => name.includes(n) || name === n);

				return pathMatches || nameMatches;
			});
			if (menuByPattern?.menu_id) {
				return String(menuByPattern.menu_id);
			}
		}

		// 3. Fallback to sidebarMenuItems
		if (sidebarMenuItems && sidebarMenuItems.length > 0) {
			const menuFromSidebar = sidebarMenuItems.find((item) => {
				const path = (item.menu_path || "").toLowerCase();
				const name = (item.menu_name || "").toLowerCase();

				const isExcluded = patterns.excludes.some(
					(exc) => path.includes(exc) || name.includes(exc)
				);
				if (isExcluded) return false;

				const pathMatches = patterns.pathIncludes.some((p) => path.includes(p));
				const nameMatches = patterns.nameIncludes.some((n) => name.includes(n) || name === n);

				return pathMatches || nameMatches;
			});
			if (menuFromSidebar?.menu_id) {
				return String(menuFromSidebar.menu_id);
			}
		}

		// 4. Try localStorage as last resort
		if (typeof window !== "undefined" && pathname) {
			try {
				const storedMenuItems = localStorage.getItem("sidebar_menuItems");
				if (storedMenuItems) {
					const menuItems = JSON.parse(storedMenuItems) as Array<{
						menu_id?: number;
						menu_path?: string;
						menu_name?: string;
					}> | null;
					if (Array.isArray(menuItems)) {
						const menuFromStorage = menuItems.find((item) => {
							const path = (item.menu_path || "").toLowerCase();
							const name = (item.menu_name || "").toLowerCase();

							const isExcluded = patterns.excludes.some(
								(exc) => path.includes(exc) || name.includes(exc)
							);
							if (isExcluded) return false;

							const pathMatches = patterns.pathIncludes.some((p) => path.includes(p));
							const nameMatches = patterns.nameIncludes.some((n) => name.includes(n) || name === n);

							return pathMatches || nameMatches;
						});
						if (menuFromStorage?.menu_id) {
							return String(menuFromStorage.menu_id);
						}
					}
				}
			} catch {
				// Ignore errors
			}
		}

		return "";
	}, [menuIdFromUrl, pathname, availableMenus, sidebarMenuItems, transactionType]);

	return { getMenuId };
};

export default useMenuId;
