"use client";
import React, { useState, useEffect } from "react";

// Generic menu item interface that can handle any field names
interface MenuItemGeneric {
  [key: string]: any;
}

// Field mapping interface to define property mappings
interface FieldMapping {
  idField: string;
  nameField: string;
  parentIdField: string;
  roleIdField?: string;
}

// Default mapping that matches the original implementation
const DEFAULT_MAPPING: FieldMapping = {
  idField: "con_menu_id",
  nameField: "con_menu_name",
  parentIdField: "con_menu_parent_id",
  roleIdField: "con_role_id"
};

type Props = {
  menuData: MenuItemGeneric[];
  onSelectionChange: (selectedIds: number[]) => void;
  fieldMapping?: FieldMapping;
};

const MenuTable: React.FC<Props> = ({ 
  menuData, 
  onSelectionChange, 
  fieldMapping = DEFAULT_MAPPING // Use default mapping if not provided
}) => {
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);

  // Extract field names from mapping
  const { idField, nameField, parentIdField } = fieldMapping;

  useEffect(() => {
    // Initialize selected menu IDs based on parent items only and their con_role_id
    const initialSelectedIds = menuData
      .filter(item => item[parentIdField] === null && item.con_role_id !== null) // Only parent items with con_role_id not null
      .map(item => item[idField]);

    setSelectedMenuIds(initialSelectedIds);
    onSelectionChange(initialSelectedIds);
  }, [menuData, parentIdField, idField]);

  const handleParentCheckboxChange = (parentId: number, isChecked: boolean) => {
    let newSelectedIds;

    if (isChecked) {
      // Add only the parent to selection
      newSelectedIds = [...new Set([...selectedMenuIds, parentId])];
    } else {
      // Remove only the parent from selection
      newSelectedIds = selectedMenuIds.filter(id => id !== parentId);
    }

    setSelectedMenuIds(newSelectedIds);
    onSelectionChange(newSelectedIds);
  };

  const parentMenus = menuData.filter((item) => item[parentIdField] === null); // Only parent items

  return (
    <table className="min-w-full border-blue text-sm">
      <thead className="border-blue">
        <tr>
          <th className="px-4 py-2 text-left">Menu Name</th>
          <th className="px-4 py-2 text-left">Accessible</th>
        </tr>
      </thead>
      <tbody>
        {parentMenus.map((parent) => (
          <tr key={parent[idField]} className="bg-white border-t">
            <td className="px-4 py-2 font-medium">{parent[nameField]}</td>
            <td className="px-4 py-2">
              <input
                type="checkbox"
                checked={selectedMenuIds.includes(parent[idField])}
                onChange={(e) => handleParentCheckboxChange(parent[idField], e.target.checked)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MenuTable;
