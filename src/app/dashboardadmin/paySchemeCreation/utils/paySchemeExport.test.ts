import { describe, it, expect } from "vitest";
import {
  buildExportRows,
  paySchemeExportFileName,
  type PaySchemeExportScheme,
  type PaySchemeExportDetail,
} from "./paySchemeExport";

const scheme: PaySchemeExportScheme = {
  payscheme_id: 15,
  payscheme_code: "PS-STAFF",
  payscheme_name: "Staff Monthly",
};

const details: PaySchemeExportDetail[] = [
  {
    component_id: 101,
    component_code: "BASIC",
    component_name: "Basic Pay",
    type: 1,
    default_value: 10000,
    formula: "result=BASIC",
  },
  {
    component_id: 102,
    component_code: "PF",
    component_name: "Provident Fund",
    type: 2,
    default_value: null,
    formula: "result=BASIC*0.12",
  },
];

describe("buildExportRows", () => {
  it("produces one flat row per component with the scheme identity repeated", () => {
    const rows = buildExportRows(scheme, details);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      "Pay Scheme ID": 15,
      "Pay Scheme Code": "PS-STAFF",
      "Pay Scheme Name": "Staff Monthly",
      "Component ID": 101,
      "Component Code": "BASIC",
      "Component Name": "Basic Pay",
      Type: 1,
      "Type Description": "Earnings",
      "Default Value": 10000,
      Formula: "result=BASIC",
    });
  });

  it("maps numeric type to the configured labels (0/1/2/3)", () => {
    const typed = (t: number | string) =>
      buildExportRows(scheme, [{ ...details[0], type: t }])[0]["Type Description"];
    expect(typed(0)).toBe("Input");
    expect(typed(1)).toBe("Earnings");
    expect(typed(2)).toBe("Deductions");
    expect(typed(3)).toBe("Summary");
    // type may arrive as a string from JSON
    expect(typed("2")).toBe("Deductions");
    // unknown type → empty label, never throws
    expect(typed(9)).toBe("");
  });

  it("emits blank (not null/undefined) for missing default value and formula", () => {
    const row = buildExportRows(scheme, [
      {
        component_id: 200,
        component_code: null,
        component_name: null,
        type: 0,
        default_value: null,
        formula: null,
      },
    ])[0];
    expect(row["Default Value"]).toBe("");
    expect(row.Formula).toBe("");
    expect(row["Component Code"]).toBe("");
    expect(row["Component Name"]).toBe("");
  });

  it("preserves a zero default value rather than blanking it", () => {
    const row = buildExportRows(scheme, [{ ...details[0], default_value: 0 }])[0];
    expect(row["Default Value"]).toBe(0);
  });

  it("returns an empty array when there are no components", () => {
    expect(buildExportRows(scheme, [])).toEqual([]);
  });
});

describe("paySchemeExportFileName", () => {
  it("uses the scheme code and sanitizes filesystem-unsafe characters", () => {
    expect(paySchemeExportFileName({ ...scheme, payscheme_code: "PS/STAFF 01" })).toBe(
      "PayScheme_PS_STAFF_01.xlsx",
    );
  });

  it("falls back to the scheme name, then the id, when code is blank", () => {
    expect(
      paySchemeExportFileName({ ...scheme, payscheme_code: "", payscheme_name: "Staff Monthly" }),
    ).toBe("PayScheme_Staff_Monthly.xlsx");
    expect(
      paySchemeExportFileName({
        payscheme_id: 15,
        payscheme_code: "",
        payscheme_name: "",
      }),
    ).toBe("PayScheme_15.xlsx");
  });
});
