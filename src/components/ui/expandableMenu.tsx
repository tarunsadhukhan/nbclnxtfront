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
  const [expandedParents, setExpandedParents] = useState<number[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);

  // Extract field names from mapping
  const { idField, nameField, parentIdField, roleIdField } = fieldMapping;

  useEffect(() => {
    // Initialize selected menu IDs based on role ID field if it exists
    const initialSelectedIds = roleIdField 
      ? menuData.filter(item => item[roleIdField] !== null).map(item => item[idField])
      : [];
    
    // Only update state if the selected IDs have actually changed
    const currentIds = JSON.stringify(selectedMenuIds.sort());
    const newIds = JSON.stringify(initialSelectedIds.sort());
    
    if (currentIds !== newIds) {
      setSelectedMenuIds(initialSelectedIds);
      // Only call the callback if we're actually changing the selection
      onSelectionChange(initialSelectedIds);
    }
  }, [menuData, roleIdField, idField]); // Remove onSelectionChange from dependencies

  const toggleExpand = (parentId: number) => {
    setExpandedParents((prev) =>
      prev.includes(parentId) ? prev.filter((id) => id !== parentId) : [...prev, parentId]
    );
  };

  // Get all child menu IDs for a given parent
  const getChildMenuIds = (parentId: number): number[] => {
    return validMenuData
      .filter((item) => item[parentIdField] === parentId)
      .map((item) => item[idField]);
  };

  // Check if all children of a parent are selected
  const areAllChildrenSelected = (parentId: number): boolean => {
    const childIds = getChildMenuIds(parentId);
    return childIds.length > 0 && childIds.every(id => selectedMenuIds.includes(id));
  };

  // Check if any child of a parent is selected
  const isAnyChildSelected = (parentId: number): boolean => {
    const childIds = getChildMenuIds(parentId);
    return childIds.some(id => selectedMenuIds.includes(id));
  };

  const handleParentCheckboxChange = (parentId: number, isChecked: boolean) => {
    const childIds = getChildMenuIds(parentId);
    let newSelectedIds;

    if (isChecked) {
      // Add parent and all children to selection (avoid duplicates)
      newSelectedIds = [...new Set([...selectedMenuIds, parentId, ...childIds])];
    } else {
      // Remove parent and all children from selection
      newSelectedIds = selectedMenuIds.filter(id => id !== parentId && !childIds.includes(id));
    }

    setSelectedMenuIds(newSelectedIds);
    onSelectionChange(newSelectedIds);
  };

  const handleChildCheckboxChange = (menuId: number, isChecked: boolean, parentId: number) => {
    let newSelectedIds: number[];
    
    if (isChecked) {
      // Add the child to selection
      newSelectedIds = [...selectedMenuIds, menuId];
      
      // Get all children of this parent
      const childIds = getChildMenuIds(parentId);
      
      // Check if all children are now selected
      const allChildrenSelected = childIds.every(id => menuId === id || selectedMenuIds.includes(id));
      
      // If all children are selected, include the parent
      if (allChildrenSelected && !newSelectedIds.includes(parentId)) {
        newSelectedIds.push(parentId);
      } 
      // If any children are selected, include the parent (indeterminate state)
      else if (!newSelectedIds.includes(parentId)) {
        newSelectedIds.push(parentId);
      }
    } else {
      // Remove the child from selection
      newSelectedIds = selectedMenuIds.filter(id => id !== menuId);
      
      // Get all children of this parent
      const childIds = getChildMenuIds(parentId);
      
      // Check if any other children are still selected
      const anyChildSelected = childIds.some(id => id !== menuId && newSelectedIds.includes(id));
      
      // Only remove parent if no children are selected anymore
      if (!anyChildSelected && newSelectedIds.includes(parentId)) {
        newSelectedIds = newSelectedIds.filter(id => id !== parentId);
      }
    }

    setSelectedMenuIds(newSelectedIds);
    onSelectionChange(newSelectedIds);
  };

  const validMenuData = Array.isArray(menuData) ? menuData : [];
  
  // Filter parent and child menus based on the dynamic field names
  const parentMenus = validMenuData.filter((item) => item[parentIdField] === null);
  const childMenus = validMenuData.filter((item) => item[parentIdField] !== null);

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
          <React.Fragment key={parent[idField]}>
            <tr className="bg-white border-t">
              <td className="px-4 py-2 font-medium">

                <button type="button" onClick={() => toggleExpand(parent[idField])}>

                  {expandedParents.includes(parent[idField]) ? "▼" : "►"} {parent[nameField]}
                </button>
              </td>
              <td className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={areAllChildrenSelected(parent[idField])}
                  onChange={(e) => handleParentCheckboxChange(parent[idField], e.target.checked)}
                  // Make the checkbox appear in an indeterminate state when some but not all children are selected
                  ref={el => {
                    if (el) {
                      el.indeterminate = !areAllChildrenSelected(parent[idField]) && isAnyChildSelected(parent[idField]);
                    }
                  }}
                />
              </td>
            </tr>

            {expandedParents.includes(parent[idField]) &&
              childMenus
                .filter((child) => child[parentIdField] === parent[idField])
                .map((child) => (
                  <tr key={child[idField]} className="bg-gray-50 border-t">
                    <td className="px-8 py-2 text-gray-700">— {child[nameField]}</td>
                    <td className="px-4 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedMenuIds.includes(child[idField])}
                        onChange={(e) => handleChildCheckboxChange(child[idField], e.target.checked, parent[idField])}
                      />
                    </td>
                  </tr>
                ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

export default MenuTable;
