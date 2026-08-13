/**
 * Resolves a Material Symbols glyph name for a portal menu.
 *
 * `menu_mst.menu_icon` is only populated for part of the tree (in nbcl, 106 of
 * 192 active menus — mostly jute production/SQC leaves), and filling the rest
 * would be a data migration per tenant. So the stored value wins when present
 * and everything else falls back to a rule derived from the menu's path and
 * name, which works for every tenant with no migration at all.
 */

/** Module root path → icon. Also the fallback for that module's descendants. */
const MODULE_ICONS: Record<string, string> = {
  masters: "category",
  hrmsmasters: "badge",
  procurement: "shopping_cart",
  sales: "sell",
  inventory: "inventory_2",
  hrms: "groups",
  accounting: "account_balance",
  jutepurchase: "local_shipping",
  jute_procurement: "local_shipping",
  juteproduction: "precision_manufacturing",
  jutesqc: "verified",
  bomcosting: "account_tree",
};

/**
 * Name keyword → icon, checked in order so the more specific rule wins
 * ("Sales Reports" is a report, not a sale).
 */
const NAME_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/report|register/i, "assessment"],
  [/quality|inspection|check/i, "fact_check"],
  [/attendance/i, "event_available"],
  [/leave/i, "event_busy"],
  [/pay ?roll|pay ?register|salary|pay/i, "payments"],
  [/invoice|bill/i, "request_quote"],
  [/quotation|enquiry/i, "price_change"],
  [/indent/i, "assignment"],
  [/order/i, "receipt_long"],
  [/gate entry|inward|receipt/i, "input"],
  [/issue/i, "output"],
  [/ledger|voucher|financial|determination/i, "receipt"],
  [/employee|worker|contractor|grade|designation/i, "badge"],
  [/warehouse|store/i, "warehouse"],
  [/machine/i, "precision_manufacturing"],
  [/party|supplier|agent|customer/i, "handshake"],
  [/bank/i, "account_balance"],
  [/department/i, "apartment"],
  [/shift|spell|calendar/i, "schedule"],
  [/batch|plan/i, "event_note"],
  [/bom|cost/i, "calculate"],
  [/item|yarn|jute|material/i, "inventory_2"],
  [/canteen/i, "restaurant"],
  [/on ?board/i, "how_to_reg"],
  [/master|type|group/i, "list_alt"],
];

/** Used when nothing else matches, so every row still lines up with a glyph. */
const GENERIC = "description";

export interface MenuIconInput {
  menu_name: string;
  menu_path: string;
  menu_icon?: string | null;
}

export function resolveMenuIcon({ menu_name, menu_path, menu_icon }: MenuIconInput): string {
  const stored = menu_icon?.trim();
  if (stored) return stored;

  // Some rows carry a leading slash (e.g. "/masters/projectMaster").
  const segments = (menu_path ?? "").replace(/^\/+/, "").split("/").filter(Boolean);
  const moduleKey = segments[0]?.toLowerCase() ?? "";

  // A module root ("masters", "sales") gets the module's own icon rather than
  // matching its name against the keyword rules.
  if (segments.length <= 1 && MODULE_ICONS[moduleKey]) return MODULE_ICONS[moduleKey];

  const name = menu_name ?? "";
  for (const [pattern, icon] of NAME_RULES) {
    if (pattern.test(name)) return icon;
  }

  return MODULE_ICONS[moduleKey] ?? GENERIC;
}

export default resolveMenuIcon;
