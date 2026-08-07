import "@testing-library/jest-dom";
import { renderHook, act } from "@testing-library/react";
import { usePaySchemeFormState } from "./usePaySchemeFormState";

describe("usePaySchemeFormState", () => {
  it("should initialize with empty defaults in create mode", () => {
    const { result } = renderHook(() =>
      usePaySchemeFormState({ mode: "create" }),
    );

    expect(result.current.formData.code).toBe("");
    expect(result.current.formData.name).toBe("");
    expect(result.current.formData.description).toBe("");
    expect(result.current.formData.components).toEqual([]);
    expect(result.current.isDisabled).toBe(false);
  });

  it("should be disabled in view mode", () => {
    const { result } = renderHook(() =>
      usePaySchemeFormState({ mode: "view" }),
    );

    expect(result.current.isDisabled).toBe(true);
  });

  it("should update fields via updateField", () => {
    const { result } = renderHook(() =>
      usePaySchemeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.updateField("code", "PS001");
    });

    expect(result.current.formData.code).toBe("PS001");

    act(() => {
      result.current.updateField("name", "Basic Scheme");
    });

    expect(result.current.formData.name).toBe("Basic Scheme");
  });

  it("should add components", () => {
    const { result } = renderHook(() =>
      usePaySchemeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.addComponent({
        component_id: 1,
        amount: 5000,
        effective_from: "2025-01-01",
        ends_on: null,
        remarks: null,
      });
    });

    expect(result.current.formData.components).toHaveLength(1);
    expect(result.current.formData.components[0].component_id).toBe(1);
    expect(result.current.formData.components[0].amount).toBe(5000);
  });

  it("should update components at specific index", () => {
    const { result } = renderHook(() =>
      usePaySchemeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.addComponent({
        component_id: 1,
        amount: 5000,
        effective_from: null,
        ends_on: null,
        remarks: null,
      });
    });

    act(() => {
      result.current.updateComponent(0, { amount: 8000 });
    });

    expect(result.current.formData.components[0].amount).toBe(8000);
  });

  it("should remove components", () => {
    const { result } = renderHook(() =>
      usePaySchemeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.addComponent({
        component_id: 1,
        amount: 5000,
        effective_from: null,
        ends_on: null,
        remarks: null,
      });
      result.current.addComponent({
        component_id: 2,
        amount: 3000,
        effective_from: null,
        ends_on: null,
        remarks: null,
      });
    });

    act(() => {
      result.current.removeComponent(0);
    });

    expect(result.current.formData.components).toHaveLength(1);
    expect(result.current.formData.components[0].component_id).toBe(2);
  });

  it("should reset form with new data", () => {
    const { result } = renderHook(() =>
      usePaySchemeFormState({ mode: "edit" }),
    );

    act(() => {
      result.current.updateField("code", "OLD");
    });

    act(() => {
      result.current.resetForm({
        code: "NEW",
        name: "New Scheme",
        description: "Desc",
        components: [],
      });
    });

    expect(result.current.formData.code).toBe("NEW");
    expect(result.current.formData.name).toBe("New Scheme");
  });

  it("should reset to defaults when called without args", () => {
    const { result } = renderHook(() =>
      usePaySchemeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.updateField("code", "TEST");
      result.current.addComponent({
        component_id: 1,
        amount: 500,
        effective_from: null,
        ends_on: null,
        remarks: null,
      });
    });

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formData.code).toBe("");
    expect(result.current.formData.components).toEqual([]);
  });
});
