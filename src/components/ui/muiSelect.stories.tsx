import React, { useState } from 'react';
import MuiSelect from './muiSelect';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

export default {
  title: 'Components/MuiSelect',
  component: MuiSelect,
  decorators: [
    (Story: any) => (
      <ThemeProvider theme={theme}>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'A wrapper around MUI Select for single and multi-select dropdowns.\n' +
          'Props:\n' +
          '- label: Label for the select.\n' +
          '- options: Array of { value, label } objects.\n' +
          '- value: Selected value(s).\n' +
          '- onChange: Callback for value change.\n' +
          '- multiple: Enable multi-select.\n' +
          '- placeholder: Placeholder text.\n' +
          '- disabled: Disable the select.\n' +
          '- minWidth: Minimum width.\n' +
          '- sx: MUI style overrides.'
      }
    }
  }
};

export const SingleSelect = () => {
  const [value, setValue] = useState<string | number>('');
  return (
    <MuiSelect
      label="Fruit"
      options={options}
      value={value}
      onChange={(val) => setValue(val as string | number)}
      placeholder="Select a fruit"
    />
  );
};

export const MultiSelect = () => {
  const [value, setValue] = useState<Array<string | number>>([]);
  return (
    <MuiSelect
      label="Fruits"
      options={options}
      value={value}
      onChange={(val) => setValue(val as Array<string | number>)}
      multiple
      placeholder="Select fruits"
    />
  );
};
