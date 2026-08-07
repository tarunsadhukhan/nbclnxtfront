"use client";

import { useState, useEffect } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { AssignmentValue } from "./types";

interface AssignmentDropdownProps {
  itemId: string;
  value: AssignmentValue;
  onChange: (value: AssignmentValue) => void;
  options: { label: string; value: string | null }[];
}

export function AssignmentDropdown({
  itemId,
  value,
  onChange,
  options
}: AssignmentDropdownProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(value);
  
  // Handle selection change
  const handleValueChange = (newValue: string) => {
    // Convert "null" string to actual null if needed
    const processedValue = newValue === "null" ? null : newValue;
    setSelectedValue(processedValue);
    onChange(processedValue);
  };
  
  // Update internal state when prop changes
  useEffect(() => {
    setSelectedValue(value);
  }, [value]);
  
  return (
    <Select
      value={selectedValue === null ? "null" : selectedValue}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-[140px] h-8">
        <SelectValue placeholder="Not assigned" />
      </SelectTrigger>
      <SelectContent className="bg-white">
        {options.map(option => (
          <SelectItem 
            key={`${itemId}-${option.value === null ? 'null' : option.value}`} 
            value={option.value === null ? "null" : option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}