"use client";
import React, { useState, useEffect } from "react";

// Company and Branch structure to match the API format
interface Company {
  company_id: number;
  company_name: string;
  branches?: Branch[];
}

interface Branch {
  branch_id: number;
  branch_name: string;
  company_id: number;
  role_id?: string | null;
}

interface Role {
  value: string;
  label: string;
}

// Generic item interface that can handle any field names
interface ItemGeneric {
  [key: string]: any;
}

// Field mapping interface to define property mappings
interface FieldMapping {
  idField: string;
  nameField: string;
  parentIdField: string;
  roleIdField?: string;
}

// Dropdown option interface for item access levels
interface DropdownOption {
  value: string;
  label: string;
}

type Props = {
  data: ItemGeneric[];
  onSelectionChange: (selectedIds: number[], accessLevels?: Record<number, string>) => void;
  fieldMapping: FieldMapping;
  dropdownOptions: DropdownOption[];
  parentLabel?: string;
  childLabel?: string;
  selectionLabel?: string;
  initialSelectedIds?: number[];
  initialAccessLevels?: Record<number, string>;
};

const ExpandableTableWithDropdown: React.FC<Props> = ({ 
  data, 
  onSelectionChange, 
  fieldMapping,
  dropdownOptions,
  parentLabel = "Parent",
  childLabel = "Child",
  selectionLabel = "Access Level",
  initialSelectedIds,
  initialAccessLevels
}) => {
  /* ---------- helpers to compare incoming props with current state ---------- */
  const arraysEqual = (a?: number[], b?: number[]) =>
    a === b ||
    (!!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]));

  const shallowObjEqual = (
    obj1?: Record<number, string>,
    obj2?: Record<number, string>
  ) =>
    obj1 === obj2 ||
    (!!obj1 &&
      !!obj2 &&
      Object.keys(obj1).length === Object.keys(obj2).length &&
      Object.keys(obj1).every((k) => obj1[k as any] === obj2[k as any]));

  /* ------------------------------ state ------------------------------------ */
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>(
      () => initialSelectedIds ?? []
    );
    const [accessLevels, setAccessLevels] = useState<Record<number, string>>(
      () => initialAccessLevels ?? {}
    );
    // Keeps track of which parent rows are expanded
    const [expandedParents, setExpandedParents] = useState<number[]>([]);

  /* --------- bring state in sync only when real content changes ------------ */
  useEffect(() => {
    if (initialSelectedIds && !arraysEqual(initialSelectedIds, selectedItemIds)) {
      setSelectedItemIds(initialSelectedIds);
    }
  }, [initialSelectedIds]);

  useEffect(() => {
    if (initialAccessLevels && !shallowObjEqual(initialAccessLevels, accessLevels)) {
      setAccessLevels(initialAccessLevels);
    }
  }, [initialAccessLevels]);

  // Extract field names from mapping
  const { idField, nameField, parentIdField, roleIdField } = fieldMapping;

  const toggleExpand = (parentId: number) => {
    setExpandedParents(
      (prev: number[]): number[] =>
        prev.includes(parentId)
          ? prev.filter((id: number): boolean => id !== parentId)
          : [...prev, parentId]
    );
  };

  // Get all child item IDs for a given parent
  const getChildItemIds = (parentId: number): number[] => {
    return validData
      .filter((item) => item[parentIdField] === parentId)
      .map((item) => item[idField]);
  };

  // Check if all children of a parent are selected
  const areAllChildrenSelected = (parentId: number): boolean => {
    const childIds = getChildItemIds(parentId);
    return childIds.length > 0 && childIds.every(id => selectedItemIds.includes(id));
  };

  // Check if any child of a parent is selected
  const isAnyChildSelected = (parentId: number): boolean => {
    const childIds = getChildItemIds(parentId);
    return childIds.some(id => selectedItemIds.includes(id));
  };

  const handleParentCheckboxChange = (parentId: number, isChecked: boolean) => {
    const childIds = getChildItemIds(parentId);
    let newSelectedIds;
    const newAccessLevels = { ...accessLevels };

    if (isChecked) {
      // Add parent and all children to selection (avoid duplicates)
      newSelectedIds = [...new Set([...selectedItemIds, ...childIds])];
      
      // Set default access level for newly selected children
      childIds.forEach(childId => {
        if (!accessLevels[childId]) {
          newAccessLevels[childId] = "1"; // Default to first level after "Not Accessible"
        }
      });
    } else {
      // Remove all children from selection
      newSelectedIds = selectedItemIds.filter(id => !childIds.includes(id));
      
      // Remove access levels for deselected children
      childIds.forEach(childId => {
        delete newAccessLevels[childId];
      });
    }

    setSelectedItemIds(newSelectedIds);
    setAccessLevels(newAccessLevels);
    onSelectionChange(newSelectedIds, newAccessLevels);
  };

  const handleChildAccessChange = (childId: number, value: string) => {
    // Create new copies of state to avoid mutation issues
    const newSelectedIds = [...selectedItemIds];
    const newAccessLevels = { ...accessLevels };
    const childItem = validData.find(item => item[idField] === childId);
    const parentId = childItem ? childItem[parentIdField] : null;

    if (value === "0") {
      // Remove child
      const filteredIds = newSelectedIds.filter(id => id !== childId);
      delete newAccessLevels[childId];

      // Check if any other children of the same parent are still selected
      const finalIds = filteredIds;
      if (parentId !== null) {
          const childIdsOfParent = getChildItemIds(parentId);
          const anyOtherChildSelected = childIdsOfParent.some(id => id !== childId && filteredIds.includes(id));
          // If no other children are selected, potentially deselect parent (if parent selection is tied to children)
          // Depending on desired logic, you might remove parentId here if !anyOtherChildSelected
      }

      setSelectedItemIds(finalIds);
      setAccessLevels(newAccessLevels);
      onSelectionChange(finalIds, newAccessLevels);

    } else {
      // Add/update child
      if (!newSelectedIds.includes(childId)) {
        newSelectedIds.push(childId);
      }
      newAccessLevels[childId] = value;

      setSelectedItemIds(newSelectedIds);
      setAccessLevels(newAccessLevels);
      onSelectionChange(newSelectedIds, newAccessLevels);
    }
  };

  const validData = Array.isArray(data) ? data : [];
  
  // Filter parent and child items based on the dynamic field names
  const parentItems = validData.filter((item) => item[parentIdField] === null);
  const childItems = validData.filter((item) => item[parentIdField] !== null);

  return (
    <table className="min-w-full border-blue text-sm">
      <thead className="border-blue">
        <tr>
          <th className="px-4 py-2 text-left">{parentLabel}</th>
          <th className="px-4 py-2 text-left">{selectionLabel}</th>
        </tr>
      </thead>
      <tbody>
        {parentItems.map((parent) => (
          <React.Fragment key={parent[idField]}>
            <tr className="bg-white border-t">
              <td className="px-4 py-2 font-medium">
                <button 
                  onClick={() => toggleExpand(parent[idField])}
                  type="button"
                  className="text-left flex items-center focus:outline-none"
                >
                  <span className="mr-2">
                    {expandedParents.includes(parent[idField]) ? "▼" : "►"}
                  </span>
                  {parent[nameField]}
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
              childItems
                .filter((child) => child[parentIdField] === parent[idField])
                .map((child) => (
                  <tr key={child[idField]} className="bg-gray-50 border-t">
                    <td className="px-8 py-2 text-gray-700">
                      <span className="ml-6">— {child[nameField]}</span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <select
                        className="border rounded px-2 py-1 text-sm w-full"
                        value={accessLevels[child[idField]] || "0"} 
                        onChange={(e) => handleChildAccessChange(child[idField], e.target.value)}
                      >
                        <option value="0">Not Assigned</option>
                        {Array.isArray(dropdownOptions) && dropdownOptions
                          .filter(option => option.value !== "0") // Filter out "Not Assigned" since we added it manually
                          .map((option, index) => {
                            return (
                              <option 
                                key={`${child[idField]}-${index}-${option.value}`} 
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            );
                        })}
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

export default ExpandableTableWithDropdown;
