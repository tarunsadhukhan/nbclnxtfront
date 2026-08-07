export type AssignmentValue = string | null;

export interface MenuItem {
  id: string;
  label: string;
  assignment?: AssignmentValue;
  children?: MenuItem[];
}

export interface MenuItemProps {
  item: MenuItem;
  level?: number;
  onToggle: (itemId: string, expanded: boolean) => void;
  expanded: Record<string, boolean>;
  selected: Record<string, boolean>;
  onSelect: (itemId: string, selected: boolean) => void;
  assignments: Record<string, AssignmentValue>;
  onAssign: (itemId: string, value: AssignmentValue) => void;
  assignmentOptions: { label: string; value: string | null }[];
}

export interface MenuProps {
  items: MenuItem[];
  assignmentOptions: { label: string; value: string | null }[];
  onAssignmentChange?: (itemId: string, value: AssignmentValue) => void;
}