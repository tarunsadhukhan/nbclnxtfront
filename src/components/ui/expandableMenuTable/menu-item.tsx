"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { MenuItemProps } from "./types";
import { AssignmentDropdown } from "./assignment-dropdown";

export function MenuItem({
  item,
  level = 0,
  onToggle,
  expanded,
  selected,
  onSelect,
  assignments,
  onAssign,
  assignmentOptions,
}: MenuItemProps) {
  const isExpanded = expanded[item.id] || false;
  const isSelected = selected[item.id] || false;
  const hasChildren = item.children && item.children.length > 0;
  const assignment = assignments[item.id];
  
  // Add a ref to track if the component has mounted and prevent initial update loops
  const isInitialMount = useRef(true);
  
  // Determine if all children are selected or none are selected
  const childrenStatus = () => {
    if (!hasChildren) return { allSelected: false, noneSelected: true };
    
    const selectedChildren = item.children!.filter(child => selected[child.id]).length;
    const allSelected = selectedChildren === item.children!.length;
    const noneSelected = selectedChildren === 0;
    
    return { allSelected, noneSelected };
  };
  
  const { allSelected, noneSelected } = childrenStatus();
  
  // Check if this is a parent item
  const isParent = hasChildren;

  // Handle toggle expansion
  const handleToggle = () => {
    if (hasChildren) {
      onToggle(item.id, !isExpanded);
    }
  };
  
  // This function will not be directly triggered by checkbox clicks anymore
  // It is used internally when assignment changes
  const handleSelect = (checked: boolean) => {
    onSelect(item.id, checked);
    
    // If this is a parent, select/deselect all children
    if (hasChildren) {
      item.children!.forEach(child => {
        onSelect(child.id, checked);
      });
    }
  };
  
  // Handle assignment change
  const handleAssignmentChange = (value: string | null) => {
    onAssign(item.id, value);
    
    // Automatically check/uncheck based on assignment value
    // Only select if a role is assigned (not "Not Assigned")
    const hasAssignment = value !== null && value !== "0";
    
    // Only update selection if it's different from current state to avoid unnecessary updates
    if (isSelected !== hasAssignment) {
      onSelect(item.id, hasAssignment);
    }
    
    // If this is a parent and a role is assigned, select all children
    if (hasChildren && hasAssignment) {
      item.children!.forEach(child => {
        // Only update if needed to avoid unnecessary updates
        if (!selected[child.id]) {
          onSelect(child.id, true);
        }
      });
    }
  };
  
  // Update parent selection based on children's selection status
  // Use a ref to prevent infinite update loops
  useEffect(() => {
    // Skip the effect on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only run this for parent items and only when needed to prevent loops
    if (isParent) {
      const shouldBeSelected = !noneSelected;
      if (isSelected !== shouldBeSelected) {
        onSelect(item.id, shouldBeSelected);
      }
    }
  }, [selected, item.id, isParent, isSelected, noneSelected, onSelect]);

  // Update selection based on assignment - initial setup only
  useEffect(() => {
    // Skip this effect after initial mount to prevent update loops
    if (!isInitialMount.current) return;
    
    // Only select if assignment is not null and not "0" (Not Assigned)
    if (assignment !== null && assignment !== "0" && !isSelected) {
      onSelect(item.id, true);
    } else if ((assignment === null || assignment === "0") && isSelected) {
      // Deselect if assignment is null or "0" (Not Assigned)
      onSelect(item.id, false);
    }
    
    // We'll handle the dependency for assignment and selection state changes separately
  }, [assignment]); // Simplified dependency array

  return (
    <div className="menu-item-container">
      <div 
        className={cn(
          "group flex items-center py-2 px-2 rounded-md transition-colors",
          "hover:bg-accent",
          level > 0 && "ml-6",
        )}
        style={{ paddingLeft: `${(level) * 8}px` }}
      >
        <div 
          className={cn(
            "flex items-center cursor-pointer mr-2 text-muted-foreground hover:text-foreground transition-colors",
            hasChildren && "h-6 w-6 flex items-center justify-center"
          )}
          onClick={handleToggle}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            ) : (
              <ChevronRight className="h-4 w-4 transition-transform duration-200" />
            )
          )}
        </div>
        
        <div className="flex items-center flex-1">
          <Checkbox 
            id={`checkbox-${item.id}`}
            checked={isSelected}
            className="mr-2 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground transition-colors"
            // Make checkbox read-only by:
            // 1. Removing the onCheckedChange handler so user clicks don't do anything
            // 2. Adding disabled attribute would make it look grey, so we use pointer-events-none instead
            disabled={false}
            style={{ pointerEvents: 'none' }}
          />
          
          <label 
            htmlFor={`checkbox-${item.id}`}
            className={cn(
              "text-sm flex-1",
              isParent && "font-medium",
              // Remove cursor-pointer class since checkboxes are not clickable
            )}
          >
            {item.label}
          </label>
          
          {!isParent && (
            <AssignmentDropdown
              itemId={item.id}
              value={assignment}
              onChange={handleAssignmentChange}
              options={assignmentOptions}
            />
          )}
        </div>
      </div>
      
      {hasChildren && (
        <div 
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          {isExpanded && item.children!.map((child) => (
            <MenuItem 
              key={child.id}
              item={child}
              level={level + 1}
              onToggle={onToggle}
              expanded={expanded}
              selected={selected}
              onSelect={onSelect}
              assignments={assignments}
              onAssign={onAssign}
              assignmentOptions={assignmentOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}