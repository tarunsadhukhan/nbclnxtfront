
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import { usePOFormState } from './hooks/usePOFormState';
import MuiForm, { type Schema } from '@/components/ui/muiform';

const mockBuildDefaultFormValues = () => ({
  branch: '',
  date: '2025-01-01',
  supplier: '',
});

// Simulate the POHeaderForm receiving props from the page
function TestPOHeaderForm({
  schema,
  formKey,
  initialValues,
  mode,
}: {
  schema: Schema;
  formKey: number;
  initialValues: Record<string, unknown>;
  mode: 'create' | 'edit' | 'view';
}) {
  return (
    <div data-testid="form-container">
      <div data-testid="form-key">{formKey}</div>
      <div data-testid="initial-branch">{String(initialValues.branch || '')}</div>
      <MuiForm
        key={formKey}
        schema={schema}
        initialValues={initialValues}
        mode={mode}
        hideModeToggle
        hideSubmit
      />
    </div>
  );
}

// Simulate the complete page flow
function TestPOPage({ branchIdFromUrl }: { branchIdFromUrl: string }) {
  const mode = 'edit' as 'create' | 'edit' | 'view';
  
  // Simulate useBranchOptions - initially empty, then loads
  const [branchOptions, setBranchOptions] = React.useState<Array<{ label: string; value: string }>>([]);
  
  // Use the actual hook
  const {
    initialValues,
    formKey,
  } = usePOFormState({
    mode,
    buildDefaultFormValues: mockBuildDefaultFormValues,
    branchIdFromUrl,
  });

  // Simulate lockedBranchId
  const [lockedBranchId] = React.useState<string | null>(() => 
    mode !== 'create' && branchIdFromUrl ? branchIdFromUrl : null
  );

  // Simulate branchValue memo
  const branchValue = React.useMemo(() => {
    if (lockedBranchId) return lockedBranchId;
    const fromForm = initialValues.branch != null ? String(initialValues.branch) : '';
    if (fromForm) return fromForm;
    return branchIdFromUrl || '';
  }, [lockedBranchId, initialValues.branch, branchIdFromUrl]);

  // Simulate resolvedBranchOptions
  const resolvedBranchOptions = React.useMemo(() => {
    if (!branchValue) return branchOptions;
    const exists = branchOptions.some((opt) => String(opt.value) === String(branchValue));
    if (exists) return branchOptions;
    return [...branchOptions, { label: `Branch ${branchValue}`, value: branchValue }];
  }, [branchOptions, branchValue]);

  // Simulate async loading of branch options
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setBranchOptions([
        { label: 'Branch 1', value: '1' },
        { label: 'Branch 2', value: '2' },
        { label: 'Branch 3', value: '3' },
      ]);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const schema: Schema = {
    fields: [
      {
        name: 'branch',
        label: 'Branch',
        type: 'select',
        options: resolvedBranchOptions,
        required: true,
        disabled: mode !== 'create',
        grid: { xs: 12 },
      },
    ],
  };

  return (
    <div>
      <div data-testid="branch-value">{branchValue}</div>
      <div data-testid="options-count">{resolvedBranchOptions.length}</div>
      <TestPOHeaderForm
        schema={schema}
        formKey={formKey}
        initialValues={initialValues}
        mode={mode}
      />
    </div>
  );
}

describe('PO Page branch flow integration', () => {
  it('should show branch value in select when branchIdFromUrl is provided', async () => {
    render(<TestPOPage branchIdFromUrl="2" />);

    // Check that branch value is set
    await waitFor(() => {
      expect(screen.getByTestId('branch-value')).toHaveTextContent('2');
    });

    // Check that initial values have the branch
    await waitFor(() => {
      expect(screen.getByTestId('initial-branch')).toHaveTextContent('2');
    });

    // Check that options include the branch
    await waitFor(() => {
      const optionsCount = screen.getByTestId('options-count');
      expect(parseInt(optionsCount.textContent || '0')).toBeGreaterThan(0);
    });

    // Check that the select shows the correct value
    await waitFor(() => {
      const combobox = screen.getByRole('combobox');
      // When branch options are loaded and include "2", it should show "Branch 2"
      // When using fallback, it should show "Branch 2" (our fallback label)
      expect(combobox).toHaveValue('Branch 2');
    });
  });

  it('should handle branch value before options load (fallback case)', async () => {
    render(<TestPOPage branchIdFromUrl="99" />);

    // Branch value should be set immediately
    expect(screen.getByTestId('branch-value')).toHaveTextContent('99');
    expect(screen.getByTestId('initial-branch')).toHaveTextContent('99');

    // Options should include fallback initially (just the one fallback)
    expect(screen.getByTestId('options-count')).toHaveTextContent('1');

    // Select should show the fallback label
    await waitFor(() => {
      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveValue('Branch 99');
    });
  });
});
