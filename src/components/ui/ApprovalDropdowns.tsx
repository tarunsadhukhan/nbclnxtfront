"use client"

import React, { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

// Define types for dropdown items
export interface DropdownItem {
  id: string;
  name: string;
}

// Define type for dropdown field configuration
export interface DropdownField {
  id: string;
  label: string;
  dependsOn?: string;
  items: DropdownItem[] | Record<string, DropdownItem[]>;
}

interface ApprovalDropdownsProps {
  fields: DropdownField[];
  onSelectionChange?: (selections: Record<string, string>) => void;
}

export default function ApprovalDropdowns({ fields, onSelectionChange }: ApprovalDropdownsProps) {
  // Create a single combined state for both selections and their display names
  const [state, setState] = useState<{
    selections: Record<string, string>;
    displayNames: Record<string, string>;
  }>({
    selections: {},
    displayNames: {}
  });

  // Initialize state when fields change
  useEffect(() => {
    const initialSelections: Record<string, string> = {};
    const initialDisplayNames: Record<string, string> = {};
    
    fields.forEach(field => {
      initialSelections[field.id] = '';
      initialDisplayNames[field.id] = `Select ${field.label}`;
    });
    
    setState({
      selections: initialSelections,
      displayNames: initialDisplayNames
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Function to get items for a dropdown field
  const getItemsForField = (field: DropdownField): DropdownItem[] => {
    if (!field.dependsOn || Array.isArray(field.items)) {
      return field.items as DropdownItem[];
    }
    
    const parentSelection = state.selections[field.dependsOn];
    if (!parentSelection) {
      return [];
    }
    
    const itemsMap = field.items as Record<string, DropdownItem[]>;
    return itemsMap[parentSelection] || [];
  };
  
  // Handle item selection
  const handleSelect = (field: DropdownField, item: DropdownItem) => {
    // Create new state objects
    const newSelections = { ...state.selections, [field.id]: item.id };
    const newDisplayNames = { ...state.displayNames, [field.id]: item.name };
    
    // Reset dependent fields
    fields.forEach(otherField => {
      if (otherField.dependsOn === field.id) {
        newSelections[otherField.id] = '';
        newDisplayNames[otherField.id] = `Select ${otherField.label}`;
        
        // Clear fields that depend on this field too (cascading reset)
        fields.forEach(grandchildField => {
          if (grandchildField.dependsOn === otherField.id) {
            newSelections[grandchildField.id] = '';
            newDisplayNames[grandchildField.id] = `Select ${grandchildField.label}`;
          }
        });
      }
    });
    
    // Update state in a single operation to prevent inconsistency
    setState({
      selections: newSelections,
      displayNames: newDisplayNames
    });
    
    // Notify parent component
    if (onSelectionChange) {
      onSelectionChange(newSelections);
    }
  };
  
  // Check if a field should be disabled
  const isDisabled = (field: DropdownField): boolean => {
    if (!field.dependsOn) return false;
    return !state.selections[field.dependsOn];
  };

  return (
    <div className="flex flex-wrap gap-4">
      {fields.map((field) => (
        <div key={field.id} className="min-w-50 grow">
          <label className="block text-sm font-medium mb-1">{field.label}</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isDisabled(field)}>
              <Button 
                variant="outline" 
                className="w-full justify-between text-left"
                data-testid={`dropdown-${field.id}`}
              >
                <span className="truncate">
                  {state.selections[field.id] ? state.displayNames[field.id] : `Select ${field.label}`}
                </span>
                <span className="ml-2">▼</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-50 max-h-75 overflow-auto" 
              align="start"
            >
              {getItemsForField(field).map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="cursor-pointer"
                  data-testid={`${field.id}-option-${item.id}`}
                  onClick={() => handleSelect(field, item)}
                >
                  {item.name}
                </DropdownMenuItem>
              ))}
              {getItemsForField(field).length === 0 && field.dependsOn && state.selections[field.dependsOn] && (
                <div className="text-sm text-center py-2 text-gray-500">No options available</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
      
      {/* Debug info */}
      {/* <div className="w-full mt-2 text-xs text-gray-500">
        <details>
          <summary>Debug Info</summary>
          <pre>{JSON.stringify(state, null, 2)}</pre>
        </details>
      </div> */}
    </div>
  );
}