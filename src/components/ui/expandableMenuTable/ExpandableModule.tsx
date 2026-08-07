"use client";

import {Menu as ExpandableMenu} from "@/components/ui/expandableMenuTable/menu";
import { MenuItem } from "@/components/ui/expandableMenuTable/types";

// Define props interface for the Menu component
interface MenuProps {
  items?: MenuItem[];
  assignmentOptions?: Array<{ label: string; value: string | null }>;
  onAssignmentChange?: (itemId: string, value: string | null) => void;
  title?: string;
  description?: string;
}

// Default menu items - only used when no items are provided
const defaultMenuItems: MenuItem[] = [
  {
    id: "department-1",
    label: "Engineering",
    children: [
      {
        id: "team-1",
        label: "Frontend Team",
        assignment: null
      },
      {
        id: "team-2",
        label: "Backend Team",
        assignment: null
      }
    ]
  },
  {
    id: "department-2",
    label: "Design",
    children: [
      {
        id: "team-4",
        label: "UI Design",
        assignment: null
      }
    ]
  }
];

// Default assignment options - only used when no options are provided
const defaultAssignmentOptions = [
  { label: "Not Assigned", value: null },
  { label: "User 1", value: "user-1" },
  { label: "User 2", value: "user-2" }
];

export default function Menu({
  items = defaultMenuItems,
  assignmentOptions = defaultAssignmentOptions,
  onAssignmentChange = (itemId, value) => console.log(`Assignment changed for ${itemId}:`, value),
  title = "Assignments",
  description = "Assign roles to items"
}: MenuProps) {
  return (
      
      <div className="p-4">
        <ExpandableMenu 
          items={items} 
          assignmentOptions={assignmentOptions}
          onAssignmentChange={onAssignmentChange}
        />
      </div>

  );
}