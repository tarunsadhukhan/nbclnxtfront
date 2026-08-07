"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MenuItem } from "@/components/ui/expandableMenuTable/menu-item";
import { MenuProps, AssignmentValue } from "./types";

export function Menu({ 
  items, 
  assignmentOptions,
  onAssignmentChange 
}: MenuProps) {
  // State to track expanded items
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // State to track selected items
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  
  // State to track assignments
  const [assignments, setAssignments] = useState<Record<string, AssignmentValue>>({});
  
  // Add a ref to track initialization state
  const isInitialized = useRef(false);
  
  // Initialize expanded state for items with children
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    const processItems = (items: any[]) => {
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          initialExpanded[item.id] = false;
          processItems(item.children);
        }
      });
    };
    
    processItems(items);
    setExpanded(initialExpanded);
  }, [items]);
  
  // Initialize assignment state and selected state based on assignments
  useEffect(() => {
    // Skip re-initialization if we've already processed items
    // This prevents unnecessary state updates when items are re-rendered
    if (isInitialized.current && Object.keys(assignments).length > 0) {
      return;
    }
    
    const initialAssignments: Record<string, AssignmentValue> = {};
    const initialSelected: Record<string, boolean> = {};
    
    const processItems = (items: any[]) => {
      items.forEach(item => {
        // Set the assignment value
        initialAssignments[item.id] = item.assignment || null;
        
        // Set selection based on assignment value
        // Select if assignment is not null and not "0" (Not Assigned)
        initialSelected[item.id] = (item.assignment !== null && item.assignment !== "0");
        
        // Process children recursively
        if (item.children && item.children.length > 0) {
          processItems(item.children);
          
          // Calculate parent selection based on children
            // Define a lightweight interface for child items
            interface ChildItem {
            id: string;
            }

            // Count how many children are currently selected
            const selectedChildren: number = (item.children as ChildItem[]).filter(
            (child: ChildItem) => initialSelected[child.id]
            ).length;
          
          // Parent should be selected if any child is selected
          if (selectedChildren > 0) {
            initialSelected[item.id] = true;
          }
        }
      });
    };
    
    processItems(items);
    
    // Compare current state with new state before updating to avoid unnecessary renders
    const shouldUpdateAssignments = !shallowEqual(assignments, initialAssignments);
    const shouldUpdateSelected = !shallowEqual(selected, initialSelected);
    
    if (shouldUpdateAssignments) {
      setAssignments(initialAssignments);
    }
    
    if (shouldUpdateSelected) {
      setSelected(initialSelected);
    }
    
    // Mark as initialized to avoid unnecessary updates
    isInitialized.current = true;
  }, [items]);
  
  // Shallow equality helper to compare objects
  function shallowEqual(obj1: Record<string, any>, obj2: Record<string, any>) {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) {
      return false;
    }
    
    for (const key in obj1) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }
    
    return true;
  }
  
  // Handle toggle
  const handleToggle = (itemId: string, isExpanded: boolean) => {
    setExpanded(prev => ({
      ...prev,
      [itemId]: isExpanded
    }));
  };
  
  // Handle selection with throttling to prevent cascading updates
  const handleSelect = (itemId: string, isSelected: boolean) => {
    // Only update if the value has changed to prevent unnecessary renders
    setSelected(prev => {
      if (prev[itemId] === isSelected) {
        return prev;
      }
      return {
        ...prev,
        [itemId]: isSelected
      };
    });
  };
  
  // Handle assignment
  const handleAssign = (itemId: string, value: AssignmentValue) => {
    // Only update if the value has changed
    setAssignments(prev => {
      if (prev[itemId] === value) {
        return prev;
      }
      return {
        ...prev,
        [itemId]: value
      };
    });
    
    // Call external handler if provided
    if (onAssignmentChange) {
      onAssignmentChange(itemId, value);
    }
  };
  
  return (
    <div className="menu-container bg-card rounded-lg border border-border p-4 shadow-sm">
      {items.map(item => (
        <MenuItem
          key={item.id}
          item={item}
          onToggle={handleToggle}
          expanded={expanded}
          selected={selected}
          onSelect={handleSelect}
          assignments={assignments}
          onAssign={handleAssign}
          assignmentOptions={assignmentOptions}
        />
      ))}
    </div>
  );
}