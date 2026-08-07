import { renderHook, act } from '@testing-library/react';
import { usePOFormState } from './usePOFormState';

// Mock buildDefaultFormValues
const mockBuildDefaultFormValues = () => ({
  branch: '',
  date: '2025-01-01',
  supplier: '',
  supplier_branch: '',
  billing_address: '',
  shipping_address: '',
  tax_payable: 'Yes',
  credit_term: '',
  delivery_timeline: '',
  project: '',
  expense_type: '',
  contact_person: '',
  contact_no: '',
  footer_note: '',
  internal_note: '',
  terms_conditions: '',
  advance_percentage: '',
  expected_date: '',
  billing_state: '',
  shipping_state: '',
  tax_type: '',
});

describe('usePOFormState', () => {
  describe('branch initialization in edit mode', () => {
    it('should initialize with branch from URL when branchIdFromUrl is provided in edit mode', () => {
      const { result } = renderHook(() =>
        usePOFormState({
          mode: 'edit',
          buildDefaultFormValues: mockBuildDefaultFormValues,
          branchIdFromUrl: '123',
        })
      );

      // Branch should be pre-filled from URL
      expect(result.current.initialValues.branch).toBe('123');
      expect(result.current.formValues.branch).toBe('123');
    });

    it('should initialize with branch from URL when branchIdFromUrl is provided in view mode', () => {
      const { result } = renderHook(() =>
        usePOFormState({
          mode: 'view',
          buildDefaultFormValues: mockBuildDefaultFormValues,
          branchIdFromUrl: '456',
        })
      );

      // Branch should be pre-filled from URL
      expect(result.current.initialValues.branch).toBe('456');
      expect(result.current.formValues.branch).toBe('456');
    });

    it('should NOT pre-fill branch in create mode even if branchIdFromUrl is provided', () => {
      const { result } = renderHook(() =>
        usePOFormState({
          mode: 'create',
          buildDefaultFormValues: mockBuildDefaultFormValues,
          branchIdFromUrl: '789',
        })
      );

      // Branch should remain empty in create mode
      expect(result.current.initialValues.branch).toBe('');
      expect(result.current.formValues.branch).toBe('');
    });

    it('should initialize with empty branch when branchIdFromUrl is not provided', () => {
      const { result } = renderHook(() =>
        usePOFormState({
          mode: 'edit',
          buildDefaultFormValues: mockBuildDefaultFormValues,
          branchIdFromUrl: '',
        })
      );

      // Branch should be empty when no URL param
      expect(result.current.initialValues.branch).toBe('');
      expect(result.current.formValues.branch).toBe('');
    });
  });

  describe('branch sync after hydration', () => {
    it('should sync branch when branchIdFromUrl becomes available after initial render', () => {
      // Simulate SSR scenario where branchIdFromUrl is initially empty
      const { result, rerender } = renderHook(
        ({ mode, branchIdFromUrl }) =>
          usePOFormState({
            mode,
            buildDefaultFormValues: mockBuildDefaultFormValues,
            branchIdFromUrl,
          }),
        {
          initialProps: { mode: 'edit' as const, branchIdFromUrl: '' },
        }
      );

      // Initially branch should be empty
      expect(result.current.formValues.branch).toBe('');
      const initialFormKey = result.current.formKey;

      // Simulate hydration - branchIdFromUrl becomes available
      rerender({ mode: 'edit' as const, branchIdFromUrl: '123' });

      // Branch should be synced
      expect(result.current.formValues.branch).toBe('123');
      expect(result.current.initialValues.branch).toBe('123');
      // Form key should be bumped to force MuiForm remount
      expect(result.current.formKey).toBeGreaterThan(initialFormKey);
    });

    it('should sync branch correctly when branchIdFromUrl changes from empty to a value', () => {
      // This more closely simulates the Next.js App Router behavior
      const { result, rerender } = renderHook(
        ({ mode, branchIdFromUrl }) =>
          usePOFormState({
            mode,
            buildDefaultFormValues: mockBuildDefaultFormValues,
            branchIdFromUrl,
          }),
        {
          initialProps: { mode: 'edit' as const, branchIdFromUrl: '' },
        }
      );

      // Check initial state
      expect(result.current.formValues.branch).toBe('');
      expect(result.current.initialValues.branch).toBe('');
      const initialFormKey = result.current.formKey;

      // First rerender - still empty (simulates first client render before params are ready)
      rerender({ mode: 'edit' as const, branchIdFromUrl: '' });
      expect(result.current.formValues.branch).toBe('');
      expect(result.current.formKey).toBe(initialFormKey); // No change

      // Second rerender - params become available
      rerender({ mode: 'edit' as const, branchIdFromUrl: '456' });
      
      // Branch should now be set
      expect(result.current.formValues.branch).toBe('456');
      expect(result.current.initialValues.branch).toBe('456');
      // Form key should have increased
      expect(result.current.formKey).toBeGreaterThan(initialFormKey);
    });

    it('should NOT sync branch in create mode even after hydration', () => {
      const { result, rerender } = renderHook(
        ({ mode, branchIdFromUrl }) =>
          usePOFormState({
            mode,
            buildDefaultFormValues: mockBuildDefaultFormValues,
            branchIdFromUrl,
          }),
        {
          initialProps: { mode: 'create' as const, branchIdFromUrl: '' },
        }
      );

      const initialFormKey = result.current.formKey;

      // Simulate hydration
      rerender({ mode: 'create' as const, branchIdFromUrl: '123' });

      // Branch should remain empty in create mode
      expect(result.current.formValues.branch).toBe('');
      // Form key should NOT be bumped by the branch sync effect
      // (it may be bumped by the create mode seeding effect, so we check branch value instead)
    });

    it('should not re-sync branch if already synced', () => {
      const { result, rerender } = renderHook(
        ({ mode, branchIdFromUrl }) =>
          usePOFormState({
            mode,
            buildDefaultFormValues: mockBuildDefaultFormValues,
            branchIdFromUrl,
          }),
        {
          initialProps: { mode: 'edit' as const, branchIdFromUrl: '123' },
        }
      );

      const formKeyAfterInit = result.current.formKey;

      // Re-render with same branchIdFromUrl
      rerender({ mode: 'edit' as const, branchIdFromUrl: '123' });

      // Form key should not increase (no unnecessary remounts)
      expect(result.current.formKey).toBe(formKeyAfterInit);
    });
  });

  describe('form value changes', () => {
    it('should update formValues when handleMainFormValuesChange is called', () => {
      const { result } = renderHook(() =>
        usePOFormState({
          mode: 'edit',
          buildDefaultFormValues: mockBuildDefaultFormValues,
          branchIdFromUrl: '123',
        })
      );

      act(() => {
        result.current.handleMainFormValuesChange({ supplier: '456' });
      });

      expect(result.current.formValues.supplier).toBe('456');
      // Branch should remain unchanged
      expect(result.current.formValues.branch).toBe('123');
    });

    it('should update formValues when setFormValues is called directly', () => {
      const { result } = renderHook(() =>
        usePOFormState({
          mode: 'edit',
          buildDefaultFormValues: mockBuildDefaultFormValues,
          branchIdFromUrl: '123',
        })
      );

      act(() => {
        result.current.setFormValues((prev) => ({ ...prev, supplier: 'test-supplier' }));
      });

      expect(result.current.formValues.supplier).toBe('test-supplier');
      expect(result.current.formValues.branch).toBe('123');
    });
  });

  describe('formKey management', () => {
    it('should increment formKey when bumpFormKey is called', () => {
      const { result } = renderHook(() =>
        usePOFormState({
          mode: 'edit',
          buildDefaultFormValues: mockBuildDefaultFormValues,
          branchIdFromUrl: '123',
        })
      );

      const initialKey = result.current.formKey;

      act(() => {
        result.current.bumpFormKey();
      });

      expect(result.current.formKey).toBe(initialKey + 1);
    });
  });
});
