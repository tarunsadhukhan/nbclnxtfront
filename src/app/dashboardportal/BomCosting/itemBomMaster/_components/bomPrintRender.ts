import { BomTreeItem } from "./types";

export type BomPrintOptions = {
  depth: number | "all";
  includeQtyUom: boolean;
  includeSequence: boolean;
};

type RootItem = {
  item_code: string;
  item_name: string;
  bom_status: string | null;
};

type Meta = {
  printedAt: Date;
  coName?: string;
};

const escapeHtml = (s: string | number | null | undefined): string => {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

type RowOut = {
  numbering: string;
  depth: number;
  code: string;
  name: string;
  qty: number;
  bomQty: number;
  uom: string;
  seq: number;
};

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

const collectRows = (
  nodes: BomTreeItem[],
  opts: BomPrintOptions,
  parentNumbering: string,
  currentDepth: number,
  parentMultiplier: number,
  out: RowOut[]
): void => {
  const cap = opts.depth === "all" ? Number.POSITIVE_INFINITY : opts.depth;
  if (currentDepth > cap) return;

  nodes.forEach((node, idx) => {
    const numbering = parentNumbering
      ? `${parentNumbering}.${idx + 1}`
      : String(idx + 1);
    const bomQty = node.qty * parentMultiplier;
    out.push({
      numbering,
      depth: currentDepth,
      code: node.child_full_item_code || node.child_item_code,
      name: node.child_item_name,
      qty: node.qty,
      bomQty: round3(bomQty),
      uom: node.uom_name,
      seq: node.sequence_no ?? idx + 1,
    });
    if (node.children && node.children.length > 0) {
      collectRows(node.children, opts, numbering, currentDepth + 1, bomQty, out);
    }
  });
};

export function buildBomPrintHtml(
  rootItem: RootItem,
  tree: BomTreeItem[],
  opts: BomPrintOptions,
  meta: Meta
): string {
  const rows: RowOut[] = [];
  collectRows(tree, opts, "", 1, 1, rows);

  const showQtyUom = opts.includeQtyUom;
  const showSeq = opts.includeSequence;

  const depthLabel = opts.depth === "all" ? "All" : `Up to Level ${opts.depth}`;
  const timestamp = meta.printedAt.toLocaleString();

  const colHeaders: string[] = ["#", "Item Code", "Item Name"];
  if (showQtyUom) {
    colHeaders.push("Qty");
    colHeaders.push("BOM Qty");
    colHeaders.push("UOM");
  }
  if (showSeq) colHeaders.push("Seq");

  const headerCells = colHeaders
    .map(
      (h) =>
        `<th style="border:1px solid #444;padding:4px 6px;background:#f0f0f0;text-align:left;font-size:11px;">${escapeHtml(
          h
        )}</th>`
    )
    .join("");

  const bodyRows = rows
    .map((r) => {
      const cells: string[] = [];
      cells.push(
        `<td style="border:1px solid #ccc;padding:3px 6px;font-family:monospace;font-size:11px;white-space:nowrap;">${escapeHtml(
          r.numbering
        )}</td>`
      );
      cells.push(
        `<td style="border:1px solid #ccc;padding:3px 6px;font-family:monospace;font-size:11px;padding-left:${
          6 + r.depth * 16
        }px;white-space:nowrap;">${escapeHtml(r.code)}</td>`
      );
      cells.push(
        `<td style="border:1px solid #ccc;padding:3px 6px;font-size:11px;word-break:break-word;">${escapeHtml(
          r.name
        )}</td>`
      );
      if (showQtyUom) {
        cells.push(
          `<td style="border:1px solid #ccc;padding:3px 6px;font-size:11px;text-align:right;white-space:nowrap;">${escapeHtml(
            r.qty
          )}</td>`
        );
        cells.push(
          `<td style="border:1px solid #ccc;padding:3px 6px;font-size:11px;text-align:right;white-space:nowrap;font-weight:600;">${escapeHtml(
            r.bomQty
          )}</td>`
        );
        cells.push(
          `<td style="border:1px solid #ccc;padding:3px 6px;font-size:11px;white-space:nowrap;">${escapeHtml(
            r.uom
          )}</td>`
        );
      }
      if (showSeq) {
        cells.push(
          `<td style="border:1px solid #ccc;padding:3px 6px;font-size:11px;text-align:right;white-space:nowrap;">${escapeHtml(
            r.seq
          )}</td>`
        );
      }
      return `<tr style="page-break-inside:avoid;">${cells.join("")}</tr>`;
    })
    .join("");

  const emptyMsg =
    rows.length === 0
      ? `<p style="font-size:12px;color:#666;margin-top:12px;">No components within selected depth.</p>`
      : "";

  const coNameBlock = meta.coName
    ? `<div style="font-size:13px;font-weight:600;margin-bottom:2px;">${escapeHtml(
        meta.coName
      )}</div>`
    : "";

  const statusBlock = rootItem.bom_status
    ? `<span style="margin-left:12px;font-size:11px;color:#555;">Status: <b>${escapeHtml(
        rootItem.bom_status
      )}</b></span>`
    : "";

  return `
<div style="font-family:Arial,Helvetica,sans-serif;color:#222;">
  ${coNameBlock}
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #333;padding-bottom:6px;margin-bottom:10px;">
    <div>
      <div style="font-size:16px;font-weight:700;">Bill of Materials</div>
      <div style="font-size:12px;margin-top:4px;">
        <span style="font-family:monospace;">${escapeHtml(rootItem.item_code)}</span>
        &nbsp;&mdash;&nbsp;
        <span>${escapeHtml(rootItem.item_name)}</span>
        ${statusBlock}
      </div>
    </div>
    <div style="font-size:10px;color:#555;text-align:right;">
      <div>${escapeHtml(depthLabel)}</div>
      <div>Printed: ${escapeHtml(timestamp)}</div>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;table-layout:auto;">
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  ${emptyMsg}
</div>
`;
}
