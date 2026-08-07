import { ReactNode, useEffect } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Control } from "react-hook-form";

type Option = {
  value: string;
  label: string;
};

type FormFieldWrapperProps = {
  name: string;
  control: Control<any>;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "select" | "checkbox";
  options?: Option[];
  disabled?: boolean;
  required?: boolean;
  customInput?: ReactNode;
};

const FormFieldWrapper = ({
  name,
  control,
  label,
  placeholder = "",
  type = "text",
  options = [],
  disabled = false,
  required = false,
  customInput,
}: FormFieldWrapperProps) => {
  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => {
        // For debugging select fields
        if (type === "select") {
          console.log(`Select field ${name}:`, {
            value: field.value,
            hasMatchingOption: options.some(opt => opt.value === field.value),
            options: options.map(opt => ({ value: opt.value, label: opt.label }))
          });
        }
        
        return (
          <FormItem>
            <FormLabel>
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              {customInput ? (
                customInput
              ) : type === "select" ? (
                <Select
                  disabled={disabled}
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : type === "checkbox" ? (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                    id={name}
                  />
                  <label
                    htmlFor={name}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {placeholder}
                  </label>
                </div>
              ) : (
                <Input
                  placeholder={placeholder}
                  type={type}
                  disabled={disabled}
                  {...field}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default FormFieldWrapper;