import { ReactNode } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Control } from "react-hook-form";

type Option = {
  value: string;
  label: string;
};

type ControlledFormFieldWrapperProps = {
  name: string;
  control: Control<any>;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "select" | "checkbox";
  options?: Option[];
  disabled?: boolean;
  required?: boolean;
  customInput?: ReactNode;
  value?: any;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const ControlledFormFieldWrapper = ({
  name,
  control,
  label,
  placeholder = "",
  type = "text",
  options = [],
  disabled = false,
  required = false,
  customInput,
  value,
  onChange,
}: ControlledFormFieldWrapperProps) => {
  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
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
                defaultValue={field.value}
                value={value !== undefined ? value : field.value}
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
                  checked={value !== undefined ? value : field.value}
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
                value={value !== undefined ? value : field.value}
                onChange={(e) => {
                  field.onChange(e);
                  if (onChange) {
                    onChange(e);
                  }
                }}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ControlledFormFieldWrapper;