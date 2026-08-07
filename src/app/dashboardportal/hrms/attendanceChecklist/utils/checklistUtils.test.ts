import { describe, expect, it } from "vitest";
import { buildAttendanceRegisterQuery } from "@/utils/hrmsService";
import {
  ATT_TYPE_LABELS,
  attTypeLabel,
  checklistFilterSchema,
  excelFilename,
  mapReportRows,
} from "./checklistUtils";
import type { AttendanceReportRow } from "../types/attendanceChecklistTypes";

const makeRow = (overrides: Partial<AttendanceReportRow> = {}): AttendanceReportRow => ({
  id: 1,
  emp_code: "E001",
  eb_id: 10,
  emp_name: "Ravi Kumar",
  department_name: "Spinning",
  designation_name: "Operator",
  shift_name: "A",
  attendance_date: "2026-06-01",
  attendance_time: "08:01:23",
  exit_time: "",
  status: "Face",
  att_type: "R",
  shift_hours: 8,
  working_hours: 8,
  idle_hours: 0,
  has_photo: true,
  machine_nos: "",
  remarks: "",
  ...overrides,
});

describe("buildAttendanceRegisterQuery", () => {
  it("always includes from_date and to_date", () => {
    const qs = buildAttendanceRegisterQuery({
      from_date: "2026-06-01",
      to_date: "2026-06-12",
    });
    expect(qs).toBe("from_date=2026-06-01&to_date=2026-06-12");
  });

  it("includes optional filters only when set, and encodes values", () => {
    const qs = buildAttendanceRegisterQuery({
      from_date: "2026-06-01",
      to_date: "2026-06-12",
      branch_id: 4,
      department_id: "",
      designation_id: undefined,
      shift_name: "A Spell",
      att_type: "R",
      emp_code: "",
      emp_name: "Ravi Kumar",
    });
    const params = new URLSearchParams(qs);
    expect(params.get("branch_id")).toBe("4");
    expect(params.get("shift_name")).toBe("A Spell");
    expect(params.get("att_type")).toBe("R");
    expect(params.get("emp_name")).toBe("Ravi Kumar");
    expect(params.has("department_id")).toBe(false);
    expect(params.has("designation_id")).toBe(false);
    expect(params.has("emp_code")).toBe(false);
  });

  it("omits a numeric-zero branch_id", () => {
    const qs = buildAttendanceRegisterQuery({
      from_date: "2026-06-01",
      to_date: "2026-06-12",
      branch_id: 0,
    });
    expect(new URLSearchParams(qs).has("branch_id")).toBe(false);
  });
});

describe("attTypeLabel", () => {
  it("maps known codes", () => {
    expect(ATT_TYPE_LABELS.R).toBe("Regular");
    expect(attTypeLabel("O")).toBe("OT");
    expect(attTypeLabel("C")).toBe("Cash");
  });

  it("passes unknown codes through unchanged", () => {
    expect(attTypeLabel("X")).toBe("X");
  });
});

describe("mapReportRows", () => {
  it("returns an empty array for empty input", () => {
    expect(mapReportRows([])).toEqual([]);
  });

  it("maps backend fields to grid fields", () => {
    const [row] = mapReportRows([
      makeRow({ machine_nos: "S409, S410", remarks: "late in" }),
    ]);
    expect(row).toEqual({
      id: 1,
      sno: 1,
      date: "2026-06-01",
      spell: "A",
      ebNo: "E001",
      name: "Ravi Kumar",
      department: "Spinning",
      designation: "Operator",
      attType: "Regular",
      source: "Face",
      workingHours: 8,
      machineNos: "S409, S410",
      remarks: "late in",
    });
  });

  it("numbers rows sequentially from 1", () => {
    const rows = mapReportRows([makeRow({ id: 7 }), makeRow({ id: 8 }), makeRow({ id: 9 })]);
    expect(rows.map((r) => r.sno)).toEqual([1, 2, 3]);
  });

  it("defaults blank fields safely", () => {
    const [row] = mapReportRows([
      makeRow({
        shift_name: "",
        emp_name: "",
        att_type: "",
        working_hours: undefined as unknown as number,
      }),
    ]);
    expect(row.spell).toBe("");
    expect(row.name).toBe("");
    expect(row.attType).toBe("Regular"); // blank code treated as R
    expect(row.workingHours).toBe(0);
    expect(row.machineNos).toBe("");
    expect(row.remarks).toBe("");
  });
});

describe("checklistFilterSchema", () => {
  it("rejects missing dates and branch", () => {
    const res = checklistFilterSchema.safeParse({ from_date: "", to_date: "", branch_id: "" });
    expect(res.success).toBe(false);
  });

  it("rejects from_date after to_date", () => {
    const res = checklistFilterSchema.safeParse({
      from_date: "2026-06-12",
      to_date: "2026-06-01",
      branch_id: "4",
    });
    expect(res.success).toBe(false);
  });

  it("accepts a valid range", () => {
    const res = checklistFilterSchema.safeParse({
      from_date: "2026-06-01",
      to_date: "2026-06-12",
      branch_id: "4",
    });
    expect(res.success).toBe(true);
  });

  it("accepts a same-day range", () => {
    const res = checklistFilterSchema.safeParse({
      from_date: "2026-06-01",
      to_date: "2026-06-01",
      branch_id: "4",
    });
    expect(res.success).toBe(true);
  });
});

describe("excelFilename", () => {
  it("includes the searched range and no extension (exportRowsToExcel adds it)", () => {
    expect(excelFilename("2026-06-01", "2026-06-12")).toBe(
      "attendance-checklist_2026-06-01_2026-06-12",
    );
  });
});
