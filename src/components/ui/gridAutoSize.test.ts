import { describe, it, expect } from "vitest";
import type { GridColDef } from "@mui/x-data-grid";
import { sizeColumnsToContent, MAX_COLUMN_PX } from "./gridAutoSize";

const rows = [
  { supplier_name: "others", note: "x".repeat(80), qty: 4.74 },
  { supplier_name: "SHREE BALAJI JUTE TRADERS", note: "short", qty: 12 },
];

describe("sizeColumnsToContent", () => {
  it("widens a column to fit its longest value", () => {
    const [col] = sizeColumnsToContent([{ field: "supplier_name", headerName: "Supplier Name" }], rows);
    // 25-char value, still under the 30-char cap
    expect(col.minWidth).toBe(25 * 8 + 34);
  });

  it("caps at ~30 characters so longer content wraps instead of widening", () => {
    const [col] = sizeColumnsToContent([{ field: "note", headerName: "Note" }], rows);
    expect(col.minWidth).toBe(MAX_COLUMN_PX);
  });

  it("never shrinks a minWidth the page asked for", () => {
    const [col] = sizeColumnsToContent([{ field: "qty", headerName: "Qty", minWidth: 200 }], rows);
    expect(col.minWidth).toBe(200);
  });

  it("leaves deliberately sized columns alone", () => {
    const cols: GridColDef[] = [{ field: "__actions", headerName: "Actions", width: 90 }];
    expect(sizeColumnsToContent(cols, rows)).toEqual(cols);
  });

  it("does not touch flex or add renderCell, so layout and built-in column types survive", () => {
    const actions: GridColDef = { field: "row_actions", type: "actions", getActions: () => [] };
    const flexed: GridColDef = { field: "supplier_name", headerName: "Supplier Name", flex: 1 };
    const [sizedActions, sizedFlexed] = sizeColumnsToContent([actions, flexed], rows);
    expect(sizedActions.renderCell).toBeUndefined();
    expect(sizedFlexed.renderCell).toBeUndefined();
    expect(sizedFlexed.flex).toBe(1);
  });
});
