// Types for Approval Hierarchy page

export interface UserOption {
  id: string;
  name: string;
}

export interface ApprovalLevelRow {
  level: number;
  users: string[]; // user IDs
  maxSingle: string;
  maxDay: string;
  maxMonth: string;
}

export interface ApprovalLevelsData {
  maxLevel: number;
  userOptions: UserOption[];
  data: ApprovalLevelRow[];
}

export interface DropdownItem {
  id: string;
  name: string;
}

export interface DropdownField {
  id: string;
  label: string;
  dependsOn?: string;
  items: DropdownItem[] | Record<string, DropdownItem[]>;
}

export interface ApprovalFormSelections {
  company: string;
  branch: string;
  menu: string;
}

// Factory function for empty row
export const createEmptyRow = (level: number): ApprovalLevelRow => ({
  level,
  users: [],
  maxSingle: "",
  maxDay: "",
  maxMonth: "",
});

