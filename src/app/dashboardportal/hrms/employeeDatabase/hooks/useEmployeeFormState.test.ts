import "@testing-library/jest-dom";
import { renderHook, act } from "@testing-library/react";
import { useEmployeeFormState } from "./useEmployeeFormState";

describe("useEmployeeFormState", () => {
  it("should initialize with default values in create mode", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    expect(result.current.formData.personal).toBeNull();
    expect(result.current.formData.contact).toBeNull();
    expect(result.current.formData.address).toEqual([]);
    expect(result.current.formData.experience).toEqual([]);
    expect(result.current.activeStep).toBe(0);
    expect(result.current.ebId).toBeNull();
  });

  it("should mark form as disabled in view mode", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "view" }),
    );

    expect(result.current.isDisabled).toBe(true);
  });

  it("should mark form as enabled in edit mode", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "edit" }),
    );

    expect(result.current.isDisabled).toBe(false);
  });

  it("should update personal data via updatePersonal", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.updatePersonal({ first_name: "John", last_name: "Doe" });
    });

    expect(result.current.formData.personal?.first_name).toBe("John");
    expect(result.current.formData.personal?.last_name).toBe("Doe");
  });

  it("should update contact data via updateContact", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.updateContact({ mobile_no: "9876543210" });
    });

    expect(result.current.formData.contact?.mobile_no).toBe("9876543210");
  });

  it("should add and remove addresses", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.addAddress({
        tbl_hrms_ed_contact_details_id: 0,
        eb_id: 0,
        address_type: 1,
        country_id: null,
        state_id: null,
        city_name: "Mumbai",
        address_line_1: "Test Street",
        address_line_2: null,
        pin_code: 400001,
        is_correspondent_address: 0,
      });
    });

    expect(result.current.formData.address).toHaveLength(1);
    expect(result.current.formData.address[0].city_name).toBe("Mumbai");

    act(() => {
      result.current.removeAddress(0);
    });

    expect(result.current.formData.address).toHaveLength(0);
  });

  it("should update an address at a specific index", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.addAddress({
        tbl_hrms_ed_contact_details_id: 0,
        eb_id: 0,
        address_type: 1,
        country_id: null,
        state_id: null,
        city_name: "Mumbai",
        address_line_1: "Old Street",
        address_line_2: null,
        pin_code: 400001,
        is_correspondent_address: 0,
      });
    });

    act(() => {
      result.current.updateAddress(0, { city_name: "Delhi", pin_code: 110001 });
    });

    expect(result.current.formData.address[0].city_name).toBe("Delhi");
    expect(result.current.formData.address[0].pin_code).toBe(110001);
  });

  it("should add and remove experience items", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.addExperience({
        auto_id: 0,
        eb_id: 0,
        company_name: "Acme Corp",
        from_date: "2020-01-01",
        to_date: "2022-12-31",
        designation: "Developer",
        project: null,
        contact: null,
      });
    });

    expect(result.current.formData.experience).toHaveLength(1);
    expect(result.current.formData.experience[0].company_name).toBe("Acme Corp");

    act(() => {
      result.current.removeExperience(0);
    });

    expect(result.current.formData.experience).toHaveLength(0);
  });

  it("should advance activeStep", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.setActiveStep(3);
    });

    expect(result.current.activeStep).toBe(3);
  });

  it("should set ebId", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.setEbId(42);
    });

    expect(result.current.ebId).toBe(42);
  });

  it("should compute completedSteps from sectionProgress", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    // personal is part of step 0 (Personal Information) — update it
    act(() => {
      result.current.updatePersonal({ first_name: "John" });
    });

    expect(result.current.sectionProgress.personal).toBe(true);
    // Step 0 requires all 4 sections: personal, contact, address, experience
    // Only personal is filled → step 0 should NOT be in completedSteps
    expect(result.current.completedSteps.has(0)).toBe(false);
  });

  it("should mark step 0 as completed when all its sections are filled", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    // Fill all 4 sections that belong to Step 0 (Personal Information)
    act(() => {
      result.current.updatePersonal({ first_name: "John" });
      result.current.updateContact({ mobile_no: "9876543210" });
      result.current.addAddress({
        tbl_hrms_ed_contact_details_id: 0,
        eb_id: 0,
        address_type: 1,
        country_id: null,
        state_id: null,
        city_name: "Mumbai",
        address_line_1: "Test Street",
        address_line_2: null,
        pin_code: 400001,
        is_correspondent_address: 0,
      });
      result.current.addExperience({
        auto_id: 0,
        eb_id: 0,
        company_name: "Acme Corp",
        from_date: "2020-01-01",
        to_date: "2022-12-31",
        designation: "Developer",
        project: null,
        contact: null,
      });
    });

    expect(result.current.completedSteps.has(0)).toBe(true);
  });

  it("should not mark placeholder steps (3-5) as completed", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    // Steps 2-5 have empty sections[] — should never be in completedSteps
    expect(result.current.completedSteps.has(2)).toBe(false);
    expect(result.current.completedSteps.has(3)).toBe(false);
    expect(result.current.completedSteps.has(4)).toBe(false);
    expect(result.current.completedSteps.has(5)).toBe(false);
  });

  it("should toggle saving state", () => {
    const { result } = renderHook(() =>
      useEmployeeFormState({ mode: "create" }),
    );

    act(() => {
      result.current.setSaving(true);
    });

    expect(result.current.saving).toBe(true);

    act(() => {
      result.current.setSaving(false);
    });

    expect(result.current.saving).toBe(false);
  });
});
