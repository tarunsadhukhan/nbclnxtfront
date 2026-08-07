import type { ApprovalStatusId } from "@/components/ui/transaction";

export const SO_STATUS_IDS = {
	DRAFT: 21 as ApprovalStatusId,
	OPEN: 1 as ApprovalStatusId,
	PENDING_APPROVAL: 20 as ApprovalStatusId,
	APPROVED: 3 as ApprovalStatusId,
	REJECTED: 4 as ApprovalStatusId,
	CLOSED: 5 as ApprovalStatusId,
	CANCELLED: 6 as ApprovalStatusId,
};

export const SO_STATUS_LABELS: Record<number, string> = {
	21: "Draft",
	1: "Open",
	20: "Pending Approval",
	3: "Approved",
	4: "Rejected",
	5: "Closed",
	6: "Cancelled",
};

export const DISCOUNT_MODE = {
	NONE: 0,
	PERCENTAGE: 1,
	FLAT: 2,
} as const;

export const EMPTY_CUSTOMERS: never[] = [];
export const EMPTY_BROKERS: never[] = [];
export const EMPTY_TRANSPORTERS: never[] = [];
export const EMPTY_ITEM_GROUPS: never[] = [];
export const EMPTY_QUOTATIONS: never[] = [];
export const EMPTY_BRANCH_ADDRESSES: never[] = [];
export const EMPTY_INVOICE_TYPES: never[] = [];
export const EMPTY_MUKAM_OPTIONS: never[] = [];
export const EMPTY_SETUP_PARAMS: { branchId?: string } = {};

// Invoice type codes — resolved from invoice_type_name, NOT from hardcoded IDs.
// The invoice_type_mst IDs vary across deployments, so we match by name instead.
export type InvoiceTypeCode = "regular" | "hessian" | "govt_skg" | "jute_yarn" | "jute" | "";

export function resolveInvoiceTypeCode(name: string): InvoiceTypeCode {
	const n = name.toLowerCase().trim();
	if (n.includes("hessian")) return "hessian";
	if (n.includes("govt") || n.includes("sacking") || n.includes("skg")) return "govt_skg";
	if (n.includes("yarn")) return "jute_yarn";
	if (n.includes("raw jute")) return "jute";
	if (n === "jute" || n.includes("jute invoice")) return "jute";
	return "regular";
}

// Type-checking helpers — accept a resolved typeCode string
export const isHessianOrder = (typeCode?: string | null): boolean => typeCode === "hessian";
export const isJuteYarnOrder = (typeCode?: string | null): boolean => typeCode === "jute_yarn";
export const isJuteOrder = (typeCode?: string | null): boolean => typeCode === "jute";
export const isGovtSkgOrder = (typeCode?: string | null): boolean => typeCode === "govt_skg";
