"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { CheckCircle, Plus, Save as SaveIcon, Trash2, X } from "lucide-react";
import { z } from "zod";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { fetchWithCookie } from "@/utils/apiClient2";
import { val } from "./calc";
import { EmpPicker, entryTableSx, GRAT_API, useNotify, type Row } from "./shared";

type Mode = "request" | "approve";
const APPROVED = "APPROVED";
const today = () => new Date().toISOString().slice(0, 10);

interface VLine {
  LineID?: number;
  GPercent: string | number;
  GPAmt: string | number;
  NomineeName: string;
  NomineeRel: string;
  Remarks: string;
  ChequeNo?: string;
  ChequeDate?: string;
}
interface VDoc {
  header: Row;
  lines: VLine[];
}

const requestSchema = z.object({
  header: z.object({
    ECode: z.string().min(1, "Please select the employee"),
    DocDate: z.string().min(1, "Date is required"),
  }),
  lines: z
    .array(z.object({ GPAmt: z.union([z.string(), z.number()]) }))
    .refine((ls) => ls.some((l) => val(l.GPAmt) !== 0), "Enter at least one amount"),
});
const approveSchema = z.array(
  z.object({
    ChequeNo: z.string().trim().min(1, "Cheque no is required on every line"),
    ChequeDate: z.string().min(1, "Cheque date is required on every line"),
  }),
);

const LINE_COLS: [keyof VLine, string, "num" | "text"][] = [
  ["GPercent", "%", "num"],
  ["GPAmt", "Amount", "num"],
  ["NomineeName", "Cheque Beneficiary Name", "text"],
  ["NomineeRel", "Relation With Employee", "text"],
  ["Remarks", "Remarks", "text"],
];

/**
 * Winsome gratuity payment — legacy FrmPayGratVoucher (mode "request": split the gratuity into
 * cheques) and PayGratVoucherChequeUpdate (mode "approve": cheque no / date, then APPROVED).
 */
export default function VoucherPage({ mode }: { mode: Mode }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(mode === "request");
  const [editor, setEditor] = useState<{ open: boolean; docEntry?: number }>({
    open: false,
  });
  const { notify, snackbar } = useNotify();

  const fetchList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ pending: showAll ? "0" : "1" });
    if (search) params.append("search", search);
    const { data, error } = await fetchWithCookie<{ data: Row[] }>(
      `${GRAT_API}/voucher/list?${params}`,
      "GET",
    );
    if (error || !data) notify(error || "Failed to load", "error");
    else setRows(data.data.map((r) => ({ ...r, id: r.DocEntry })));
    setLoading(false);
  }, [showAll, search, notify]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      { field: "DocEntry", headerName: "DOC", width: 80 },
      { field: "DocDate", headerName: "DATE", width: 110 },
      { field: "ECode", headerName: "EB NO", width: 100 },
      { field: "EName", headerName: "NAME", flex: 2, minWidth: 180 },
      { field: "GratAmount", headerName: "GRATUITY", type: "number", width: 120 },
      { field: "Total", headerName: "REQUESTED", type: "number", width: 120 },
      { field: "LineCount", headerName: "CHEQUES", type: "number", width: 90 },
      { field: "MillSLNo", headerName: "MILL SL NO", width: 110 },
      { field: "DocMode", headerName: "MODE", width: 110 },
    ],
    [],
  );

  // ponytail: the list endpoint returns at most 500 requests; paged here.
  const page = rows.slice(
    paging.page * paging.pageSize,
    (paging.page + 1) * paging.pageSize,
  );
  const open = (r: Row) => setEditor({ open: true, docEntry: Number(r.DocEntry) });

  return (
    <IndexWrapper
      title={mode === "request" ? "Gratuity Payment Request" : "Gratuity Payment Approval"}
      rows={page}
      columns={columns}
      rowCount={rows.length}
      paginationModel={paging}
      onPaginationModelChange={setPaging}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: search,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setSearch(e.target.value);
          setPaging((p) => ({ ...p, page: 0 }));
        },
        placeholder: "Search by EB no or name",
        debounceDelayMs: 500,
      }}
      toolbarContent={
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
          }
          label="Include approved"
        />
      }
      createAction={
        mode === "request"
          ? { label: "New Request", onClick: () => setEditor({ open: true }) }
          : undefined
      }
      onView={open}
      onEdit={open}
      isRowEditable={(r) => r.DocMode !== APPROVED}
    >
      {editor.open && (
        <VoucherDialog
          mode={mode}
          docEntry={editor.docEntry}
          onClose={() => setEditor({ open: false })}
          onSaved={(msg) => {
            notify(msg);
            setEditor({ open: false });
            void fetchList();
          }}
          onError={(msg) => notify(msg, "error")}
        />
      )}
      {snackbar}
    </IndexWrapper>
  );
}

interface DialogProps {
  mode: Mode;
  docEntry?: number;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

function VoucherDialog({ mode, docEntry, onClose, onSaved, onError }: DialogProps) {
  const [doc, setDoc] = useState<VDoc | null>(null);
  const [busy, setBusy] = useState(docEntry != null);
  const [saving, setSaving] = useState(false);
  const approved = doc?.header.DocMode === APPROVED;
  const editRequest = mode === "request" && !approved;
  const editCheque = mode === "approve" && !approved;

  useEffect(() => {
    if (docEntry == null) return;
    void fetchWithCookie<{ data: VDoc }>(`${GRAT_API}/voucher/doc/${docEntry}`, "GET").then(
      ({ data, error }) => {
        setBusy(false);
        if (error || !data) onError(error || "Failed to load");
        else
          setDoc({
            ...data.data,
            lines: data.data.lines.map((l) => ({
              ...l,
              ChequeNo: l.ChequeNo ?? "",
              ChequeDate: l.ChequeDate || today(),
            })),
          });
      },
    );
  }, [docEntry, onError]);

  const pick = (emp: Row) =>
    setDoc({
      header: {
        ECode: emp.ECode,
        EName: emp.EName,
        GratAmount: emp.GAmt,
        DocDate: today(),
        MillSLNo: "",
        Nominee: "N",
      },
      lines: [
        {
          GPercent: 100,
          GPAmt: emp.GAmt ?? 0,
          NomineeName: String(emp.EName ?? ""),
          NomineeRel: "SELF",
          Remarks: "BEING AMT PAID AGNST GRATUITY FULL FINAL",
        },
      ],
    });

  const setLine = (i: number, patch: Partial<VLine>) =>
    setDoc((d) => d && { ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const setHead = (k: string, v: string) =>
    setDoc((d) => d && { ...d, header: { ...d.header, [k]: v } });

  const total = (doc?.lines ?? []).reduce((s, l) => s + val(l.GPAmt), 0);

  const submit = async () => {
    if (!doc) return;
    let url = `${GRAT_API}/voucher/save`;
    let body: unknown = {
      header: { ...doc.header, DocEntry: docEntry ?? 0 },
      lines: doc.lines,
    };
    if (mode === "approve") {
      const check = approveSchema.safeParse(doc.lines);
      if (!check.success) return onError(check.error.issues[0].message);
      url = `${GRAT_API}/voucher/approve`;
      body = { DocEntry: docEntry, lines: doc.lines };
    } else {
      const check = requestSchema.safeParse(doc);
      if (!check.success) return onError(check.error.issues[0].message);
    }
    setSaving(true);
    const { data, error } = await fetchWithCookie<{ message: string }>(url, "POST", body);
    setSaving(false);
    if (error || !data) onError(error || "Save failed");
    else onSaved(data.message);
  };

  const h = doc?.header ?? {};
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", pb: 1 }}>
        <Typography variant="h6" component="span">
          {mode === "request" ? "Payment Request" : "Payment Approval"}{" "}
          {docEntry != null ? `— Doc ${docEntry}` : "— New"}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close dialog">
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {busy ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
            <CircularProgress />
          </Box>
        ) : !doc ? (
          <EmpPicker url={`${GRAT_API}/voucher/emp_search`} onPick={pick} />
        ) : (
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
              <TextField size="small" label="Employee" value={`${h.ECode} - ${h.EName}`} disabled />
              <TextField
                size="small"
                label="Gratuity Amount"
                type="number"
                value={h.GratAmount ?? ""}
                disabled={!editRequest}
                onChange={(e) => setHead("GratAmount", e.target.value)}
              />
              <TextField
                size="small"
                type="date"
                label="Date"
                value={h.DocDate ?? ""}
                disabled={!editRequest}
                onChange={(e) => setHead("DocDate", e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                label="Mill SL No"
                value={h.MillSLNo ?? ""}
                disabled={!editRequest}
                onChange={(e) => setHead("MillSLNo", e.target.value)}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={h.Nominee === "Y"}
                    disabled={!editRequest}
                    onChange={(e) => setHead("Nominee", e.target.checked ? "Y" : "N")}
                  />
                }
                label="Paid to nominee"
              />
            </Box>

            <Box component="table" sx={{ ...entryTableSx, width: "100%" }}>
              <thead>
                <tr>
                  <th>SL#</th>
                  {LINE_COLS.map(([k, l]) => (
                    <th key={k}>{l}</th>
                  ))}
                  {mode === "approve" && (
                    <>
                      <th>Cheque No</th>
                      <th>Cheque Date</th>
                    </>
                  )}
                  <th />
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((ln, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    {LINE_COLS.map(([k, l, t]) => (
                      <td key={k}>
                        <input
                          className={t === "num" ? "cell num" : "cell"}
                          type={t === "num" ? "number" : "text"}
                          aria-label={`Line ${i + 1} ${l}`}
                          value={String(ln[k] ?? "")}
                          disabled={!editRequest}
                          onChange={(e) => setLine(i, { [k]: e.target.value })}
                        />
                      </td>
                    ))}
                    {mode === "approve" && (
                      <>
                        <td>
                          <input
                            className="cell"
                            aria-label={`Line ${i + 1} cheque no`}
                            value={ln.ChequeNo ?? ""}
                            disabled={!editCheque}
                            onChange={(e) => setLine(i, { ChequeNo: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="cell"
                            type="date"
                            aria-label={`Line ${i + 1} cheque date`}
                            value={ln.ChequeDate ?? ""}
                            disabled={!editCheque}
                            onChange={(e) => setLine(i, { ChequeDate: e.target.value })}
                          />
                        </td>
                      </>
                    )}
                    <td>
                      {editRequest && doc.lines.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Remove line ${i + 1}`}
                          onClick={() =>
                            setDoc((d) => d && { ...d, lines: d.lines.filter((_, j) => j !== i) })
                          }
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              {editRequest && (
                <Button
                  size="small"
                  startIcon={<Plus size={16} />}
                  onClick={() =>
                    setDoc(
                      (d) =>
                        d && {
                          ...d,
                          lines: [
                            ...d.lines,
                            { GPercent: 0, GPAmt: 0, NomineeName: "", NomineeRel: "", Remarks: "" },
                          ],
                        },
                    )
                  }
                >
                  Add cheque
                </Button>
              )}
              <Typography
                variant="body2"
                color={Math.abs(total - val(h.GratAmount)) > 0.005 ? "error" : "text.primary"}
                sx={{ mr: "auto" }}
              >
                Total: <b>{total.toFixed(2)}</b> · Gratuity: <b>{val(h.GratAmount).toFixed(2)}</b>
                {approved ? " · Approved" : ""}
              </Typography>
              <Button onClick={onClose}>Close</Button>
              {(editRequest || editCheque) && (
                <Button
                  variant="contained"
                  startIcon={mode === "approve" ? <CheckCircle size={18} /> : <SaveIcon size={18} />}
                  onClick={() => void submit()}
                  disabled={saving}
                >
                  {saving ? "Saving..." : mode === "approve" ? "Approve" : docEntry != null ? "Update" : "Save"}
                </Button>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
