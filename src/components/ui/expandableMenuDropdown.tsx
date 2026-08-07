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
  accessLevelField?: string; // Add field for access level
}

// Default mapping that matches the original implementation
const DEFAULT_MAPPING: FieldMapping = {
  idField: "con_menu_id",
  nameField: "con_menu_name",
  parentIdField: "con_menu_parent_id",
  roleIdField: "con_role_id",
  accessLevelField: undefined // Default to undefined
};

// Dropdown option interface for child items
interface DropdownOption {
  value: string;
  label: string;
}

// Default dropdown options
const DEFAULT_OPTIONS: DropdownOption[] = [
  { value: "0", label: "Not Accessible" },
  { value: "1", label: "Read Only" },
  { value: "2", label: "Full Access" }
];

type Props = {
  menuData: MenuItemGeneric[];
  onSelectionChange: (selectedIds: number[], accessLevels?: Record<number, string>) => void;
  fieldMapping?: FieldMapping;
  dropdownOptions?: DropdownOption[];
};

const MenuTableDropdown: React.FC<Props> = ({ 
  menuData, 
  onSelectionChange, 
  fieldMapping = DEFAULT_MAPPING, // Use default mapping if not provided
  dropdownOptions = DEFAULT_OPTIONS // Use default options if not provided
}) => {
  const [expandedParents, setExpandedParents] = useState<number[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);
  const [accessLevels, setAccessLevels] = useState<Record<number, string>>({});

  // Extract field names from mapping
  const { idField, nameField, parentIdField, roleIdField, accessLevelField } = fieldMapping; // Destructure accessLevelField

  // Added ref to track initial load
  const initialLoadRef = React.useRef(true);

  useEffect(() => {
    // Skip effect after initial load to prevent overriding user selections
    if (!initialLoadRef.current) {
      return;
    }
    
    // Initialize selected menu IDs based on role ID field if it exists
    const initialSelectedIdsBasedOnRole = roleIdField 
      ? menuData.filter(item => item[roleIdField] !== null).map(item => item[idField])
      : [];
    
    const initialAccessLevels: Record<number, string> = {};
    initialSelectedIdsBasedOnRole.forEach(id => {
      const menuItem = menuData.find(item => item[idField] === id);
      // Use accessLevelField if provided and exists on item, otherwise default to "1"
      const initialLevel = (accessLevelField && menuItem && menuItem[accessLevelField] !== null && menuItem[accessLevelField] !== undefined)
        ? String(menuItem[accessLevelField]) // Convert to string as dropdown values are strings
        : "1"; // Default to "Read Only"
      initialAccessLevels[id] = initialLevel; // Store the determined initial level
    });

    // Filter out IDs where the initial level resolved to "0" (Not Accessible)
    // These shouldn't be considered 'selected' in the checkbox logic
    const finalSelectedIds = initialSelectedIdsBasedOnRole.filter(id => initialAccessLevels[id] !== "0");

    setSelectedMenuIds(finalSelectedIds);
    setAccessLevels(initialAccessLevels); // Set the full map including potential "0"s for dropdown state
    // Pass the filtered IDs (truly selected) and the full initial levels map
    onSelectionChange(finalSelectedIds, initialAccessLevels);
    
    // Mark initial load as complete
    initialLoadRef.current = false;
  }, [menuData, roleIdField, idField, accessLevelField]); // Remove onSelectionChange from dependencies

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
    const newAccessLevels = { ...accessLevels };

    if (isChecked) {
      // Add parent and all children to selection (avoid duplicates)
      newSelectedIds = [...new Set([...selectedMenuIds, parentId, ...childIds])];
      
      // Set default access level for newly selected children
      childIds.forEach(childId => {
        if (!accessLevels[childId]) {
          newAccessLevels[childId] = "1"; // Default to "Read Only"
        }
      });
    } else {
      // Remove parent and all children from selection
      newSelectedIds = selectedMenuIds.filter(id => id !== parentId && !childIds.includes(id));
      
      // Remove access levels for deselected children
      childIds.forEach(childId => {
        delete newAccessLevels[childId];
      });
    }

    setSelectedMenuIds(newSelectedIds);
    setAccessLevels(newAccessLevels);
    onSelectionChange(newSelectedIds, newAccessLevels);
  };

  const handleChildAccessChange = (childId: number, value: string, parentId: number) => {
    // Create new copies of state to avoid mutation issues
    const newSelectedIds = [...selectedMenuIds];
    const newAccessLevels = { ...accessLevels };
    
    // If value is "0" (Not Accessible), remove from selection
    if (value === "0") {
      const filteredIds = newSelectedIds.filter(id => id !== childId);
      delete newAccessLevels[childId];
      
      // Check if any children are still selected for this parent
      const childIds = getChildMenuIds(parentId);
      const anyChildSelected = childIds.some(id => id !== childId && filteredIds.includes(id));
      
      // Remove parent if no children are selected anymore
      const finalIds = anyChildSelected ? filteredIds : filteredIds.filter(id => id !== parentId);
      
      // Update state with the new cleaned arrays
      setSelectedMenuIds(finalIds);
      setAccessLevels(newAccessLevels);
      onSelectionChange(finalIds, newAccessLevels);
    } 
    // Otherwise add to selection if not already selected
    else {
      // Ensure the child ID is in the selection
      if (!newSelectedIds.includes(childId)) {
        newSelectedIds.push(childId);
      }
      
      // Update the access level for this child
      newAccessLevels[childId] = value;
      
      // Make sure parent is selected if any child is selected
      if (!newSelectedIds.includes(parentId)) {
        newSelectedIds.push(parentId);
      }
      
      console.log(`Changed access level for menu ${childId} to ${value}`);
      
      // Update state with the new values
      setSelectedMenuIds(newSelectedIds);
      setAccessLevels(newAccessLevels);
      onSelectionChange(newSelectedIds, newAccessLevels);
    }
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
          <th className="px-4 py-2 text-left">Access Level</th>
        </tr>
      </thead>
      <tbody>
        {parentMenus.map((parent) => (
          <React.Fragment key={parent[idField]}>
            <tr className="bg-white border-t">
              <td className="px-4 py-2 font-medium">
                <button onClick={() => toggleExpand(parent[idField])}>
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
                      <select
                        className="border rounded px-2 py-1 text-sm w-full"
                        value={selectedMenuIds.includes(child[idField]) ? accessLevels[child[idField]] || "1" : "0"} 
                        onChange={(e) => handleChildAccessChange(child[idField], e.target.value, parent[idField])}
                      >
                        {dropdownOptions.map(option => (
                          <option key={`${child[idField]}-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

export default MenuTableDropdown;
