/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import MuiForm, { type Schema } from '@/components/ui/muiform';

// Mock MUI components to avoid complex setup
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    // Keep actual implementations
  };
});

describe('MuiForm with select field', () => {
  const branchOptions = [
    { label: 'Branch A', value: '1' },
    { label: 'Branch B', value: '2' },
    { label: 'Branch C', value: '3' },
  ];

  const schema: Schema = {
    fields: [
      {
        name: 'branch',
        label: 'Branch',
        type: 'select',
        options: branchOptions,
        required: true,
        disabled: true, // In edit mode, branch is disabled
        grid: { xs: 12, md: 4 },
      },
    ],
  };

  it('should display the correct branch label when initialValues contains branch id', async () => {
    const initialValues = { branch: '2' }; // Branch B

    render(
      <MuiForm
        key={1}
        schema={schema}
        initialValues={initialValues}
        mode="edit"
        hideModeToggle
        hideSubmit
      />
    );

    // Wait for the component to render
    await waitFor(() => {
      // The Autocomplete should show "Branch B" since value is "2"
      const input = screen.getByRole('combobox');
      expect(input).toHaveValue('Branch B');
    });
  });

  it('should show empty when initialValues has empty branch', async () => {
    const initialValues = { branch: '' };

    render(
      <MuiForm
        key={2}
        schema={schema}
        initialValues={initialValues}
        mode="edit"
        hideModeToggle
        hideSubmit
      />
    );

    await waitFor(() => {
      const input = screen.getByRole('combobox');
      expect(input).toHaveValue('');
    });
  });

  it('should update displayed value when key changes with new initialValues', async () => {
    const { rerender } = render(
      <MuiForm
        key={1}
        schema={schema}
        initialValues={{ branch: '' }}
        mode="edit"
        hideModeToggle
        hideSubmit
      />
    );

    // Initially empty
    await waitFor(() => {
      const input = screen.getByRole('combobox');
      expect(input).toHaveValue('');
    });

    // Re-render with new key and new initialValues (simulating what happens after hydration)
    rerender(
      <MuiForm
        key={2} // Key changed
        schema={schema}
        initialValues={{ branch: '3' }} // Branch C
        mode="edit"
        hideModeToggle
        hideSubmit
      />
    );

    await waitFor(() => {
      const input = screen.getByRole('combobox');
      expect(input).toHaveValue('Branch C');
    });
  });

  it('should handle branch value that exists in options', async () => {
    const initialValues = { branch: '1' }; // Branch A

    render(
      <MuiForm
        key={1}
        schema={schema}
        initialValues={initialValues}
        mode="edit"
        hideModeToggle
        hideSubmit
      />
    );

    await waitFor(() => {
      const input = screen.getByRole('combobox');
      expect(input).toHaveValue('Branch A');
    });
  });

  it('should handle branch value NOT in options by showing empty', async () => {
    // Branch id "999" doesn't exist in options
    const initialValues = { branch: '999' };

    render(
      <MuiForm
        key={1}
        schema={schema}
        initialValues={initialValues}
        mode="edit"
        hideModeToggle
        hideSubmit
      />
    );

    await waitFor(() => {
      const input = screen.getByRole('combobox');
      // When value doesn't match any option, Autocomplete shows empty
      expect(input).toHaveValue('');
    });
  });
});
