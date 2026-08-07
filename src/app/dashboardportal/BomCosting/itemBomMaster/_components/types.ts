export type BomTreeItem = {
  bom_id: number;
  parent_item_id: number;
  child_item_id: number;
  child_item_code: string;
  child_full_item_code?: string;
  child_item_name: string;
  additional_description?: string | null;
  qty: number;
  uom_id: number;
  uom_name: string;
  sequence_no: number;
  has_children: boolean;
  is_leaf: boolean;
  children: BomTreeItem[];
};

export type ItemOption = {
  item_id: number;
  item_code: string;
  full_item_code?: string;
  item_name: string;
  uom_id?: number;
  uom_name?: string;
  [key: string]: any;
};

export type UomOption = {
  uom_id: number;
  uom_name: string;
};

export function getCoId(): string {
  try {
    const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
    return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
  } catch {
    return "";
  }
}