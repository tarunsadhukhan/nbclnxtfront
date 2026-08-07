"use client";

import * as React from "react";
import Autocomplete, { type AutocompleteProps } from "@mui/material/Autocomplete";
import TextField, { type TextFieldProps } from "@mui/material/TextField";

export type SearchableSelectProps<TOption> = {
  options: TOption[];
  value: TOption | null;
  onChange: (option: TOption | null) => void;
  getOptionLabel?: AutocompleteProps<TOption, false, false, false>["getOptionLabel"];
  getOptionKey?: AutocompleteProps<TOption, false, false, false>["getOptionKey"];
  isOptionEqualToValue?: AutocompleteProps<TOption, false, false, false>["isOptionEqualToValue"];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  noOptionsText?: string;
  textFieldProps?: Partial<TextFieldProps>;
  className?: string;
  fullWidth?: boolean;
  clearOnEscape?: boolean;
};

export function SearchableSelect<TOption>({
  options,
  value,
  onChange,
  getOptionLabel,
  getOptionKey,
  isOptionEqualToValue,
  placeholder,
  disabled,
  loading,
  noOptionsText,
  textFieldProps,
  className,
  fullWidth = true,
  clearOnEscape = true,
}: SearchableSelectProps<TOption>) {
  const { sx, size, placeholder: overridePlaceholder, ...restTextFieldProps } = textFieldProps ?? {};

  return (
    <Autocomplete<TOption, false, false, false>
      options={options}
      value={value}
      onChange={(_, next) => onChange(next)}
      getOptionLabel={getOptionLabel}
      getOptionKey={getOptionKey}
      isOptionEqualToValue={isOptionEqualToValue}
      disabled={disabled}
      loading={loading}
      noOptionsText={noOptionsText ?? "No options"}
      clearOnEscape={clearOnEscape}
      className={className}
      fullWidth={fullWidth}
      openOnFocus
      renderInput={(params) => (
        <TextField
          {...params}
          {...restTextFieldProps}
          placeholder={overridePlaceholder ?? placeholder}
          size={size ?? "small"}
          sx={{
            "& .MuiInputBase-root": {
              backgroundColor: "transparent",
              border: "none",
              boxShadow: "none",
              "&:hover": {
                border: "none",
                boxShadow: "none",
              },
              "&.Mui-focused": {
                border: "1px solid #3b82f6",
                boxShadow: "0 0 0 1px #3b82f6",
              },
              "& fieldset": {
                border: "none",
              },
            },
            "& .MuiOutlinedInput-input": {
              py: 0.5,
              px: 1,
              fontSize: "0.875rem",
              lineHeight: "1.25rem",
            },
            ...sx,
          }}
        />
      )}
    />
  );
}
