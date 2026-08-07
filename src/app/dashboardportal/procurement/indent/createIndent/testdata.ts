export const branchOptions = [
  { label: "Main Branch", value: "1" },
  { label: "Secondary", value: "2" },
];

export const expenseOptions = [
  { label: "CapEx", value: "capex" },
  { label: "OpEx", value: "opex" },
];

export const indentTypeOptions = [
  { label: "Regular Indent", value: "regular" },
  { label: "Open Indent", value: "open" },
  { label: "BOM", value: "bom" },
];

export const projectOptions = [
  { label: "Project A", value: "p1" },
  { label: "Project B", value: "p2" },
];

export const departmentOptions = [
  { label: "Sales", value: "d1" },
  { label: "Production", value: "d2" },
];

export const itemGroupOptions = [
  { label: "Group X", value: "g1" },
  { label: "Group Y", value: "g2" },
];

export const itemOptions = [
  { label: "Item 1", value: "i1" },
  { label: "Item 2", value: "i2" },
];

export const makeOptions = [
  { label: "Make A", value: "m1" },
  { label: "Make B", value: "m2" },
];

export const uomOptions = [
  { label: "NOS", value: "nos" },
  { label: "KG", value: "kg" },
];

// A small set of sample rows for testing. The page will assign ids when used.
export const defaultRows = [
  { department: "d1", item_group: "g1", item: "i1", item_make: "m1", quantity: 5, uom: "nos", remarks: "Sample 1" },
  { department: "d2", item_group: "g2", item: "i2", item_make: "m2", quantity: 12, uom: "kg", remarks: "Sample 2" },
];

export default {};
