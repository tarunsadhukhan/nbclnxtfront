import * as React from 'react';
import { FormControl, InputLabel, MenuItem, Select, Checkbox, ListItemText, OutlinedInput } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

interface Option {
  value: string | number;
  label: string;
}

interface MuiSelectProps {
  label?: string;
  options: Option[];
  value: string | number | Array<string | number>;
  onChange: (value: string | number | Array<string | number>) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  minWidth?: number;
  sx?: SxProps<Theme>;
}

const MuiSelect: React.FC<MuiSelectProps> = ({
  label,
  options,
  value,
  onChange,
  multiple = false,
  placeholder = '',
  disabled = false,
  minWidth = 200,
  sx,
}) => {
  return (
    <FormControl fullWidth size="small" sx={{ minWidth, ...sx }}>
      {label && <InputLabel>{label}</InputLabel>}
      <Select
        label={label}
        multiple={multiple}
        value={value}
        onChange={(e) => {
          if (multiple) {
            onChange(e.target.value as Array<string | number>);
          } else {
            onChange(e.target.value as string | number);
          }
        }}
        input={<OutlinedInput label={label} />}
        renderValue={(selected) => {
          if (multiple) {
            if (Array.isArray(selected)) {
              return selected.map(sel => {
                const opt = options.find(o => o.value === sel);
                return opt ? opt.label : sel;
              }).join(', ');
            }
            return '';
          } else {
            const opt = options.find(o => o.value === selected);
            return opt ? opt.label : '';
          }
        }}
        disabled={disabled}
        displayEmpty={!!placeholder}
      >
        {placeholder && !multiple && (
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {multiple ? (
              <>
                <Checkbox checked={Array.isArray(value) && value.indexOf(option.value) > -1} />
                <ListItemText primary={option.label} />
              </>
            ) : (
              option.label
            )}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default MuiSelect;
