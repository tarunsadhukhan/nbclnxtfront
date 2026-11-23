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
  MenuItem,
  TableContainer,
  TextField,
  Typography,
} from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Plus, Save as SaveIcon, Trash2, X } from "lucide-react";
import { z } from "zod";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { fullScreenBesideSidebar } from "@/components/ui/entryGrid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import {
  blankLine,
  calcGratuity,
  editLine,
  getAge,
  ratesFromLastWages,
  val,
  type GratHeader,
  type GratKind,
  type GratLine,
  type Nominee,
  type Val,
} from "./calc";
import {
  EmpPicker,
  entryTableSx,
  GRAT_API,
  useNotify,
  type Row,
} from "./shared";

const APPROVED = "APPROVED";

interface Doc {
  header: GratHeader;
  lines: GratLine[];
  nominees: Nominee[];
}

const docSchema = z.object({
  header: z.object({
    ECode: z.string().min(1, "Employee can't be blank"),
    TEReason: z.string().min(1, "Exit reason can't be blank"),
    DoJ: z.string().min(1, "Date of joining is required"),
    DoL: z.string().min(1, "Leaving / last worked date is required"),
  }),
  lines: z.array(z.unknown()).min(1, "Fill the year-wise lines first"),
});

const TITLES: Record<GratKind, string> = {
  stl: "Gratuity STL Entry",
  calc: "Gratuity Calculation",
};

type Field = [key: string, label: string];
const INFO: Field[] = [
  ["LotNo", "Lot No"],
  ["Grade", "Grade"],
  ["DeptCode", "Dept Code"],
  ["DeptName", "Department"],
  ["Designation", "Designation"],
  ["Occupation", "Occupation"],
  ["PolicyNo", "Policy Number"],
  ["PolicyID", "LIC-ID"],
  ["TENo", "T.E. No."],
];
const RATES: Field[] = [
  ["LastWagesDrawnHrs", "Last Wages Drawn Hrs."],
  ["LastWagesPerDay", "Last Wages / Day"],
  ["AvgRatePerHour", "Avg. Rate / Hr"],
  ["AvgRatePerDay", "Avg. Rate / Day"],
  ["AdvanceAgainstGrat", "Less: Advance"],
  ["LCSAAmt", "Add: LCSA"],
  ["FinalPayPercent", "Final Pay %"],
  ["SettledYrs", "Settled Years"],
  ["SettledAmt", "Settled Amt."],
];
// [flag column, value column, label] — legacy "Adj." checkboxes unlock the value box.
const ADJUST: [string, string, string][] = [
  ["AdjApplicableYrs", "MaxAdjApplicableYrs", "Adj. Appli. Yrs"],
  ["AdjNonApplicableYrs", "NonAdjEligibleYrs", "Adj. Non Eli. Yrs"],
  ["AdjNoOfApplicableYrs", "NoOfAdjApplicableYrs", "No. of Adj. Appli. Yrs"],
];
const RESULTS: Field[] = [
  ["MaxApplicableYrs", "Max Appli. Years"],
  ["NonEligibleYrs", "Non Eli. Years"],
  ["NoOfApplicableYrs", "No. of Appl. Years"],
  ["EligiblityStartingYear", "Eligible From Year"],
  ["FinalMaxApplicableYrs", "Final Appli. Years"],
  ["FinalNonEligibleYrs", "Final Non Eli. Years"],
  ["FinalNoOfApplicableYrs", "Final Appl. Years"],
  ["GratuityAmt", "Gratuity Amt"],
  ["NetAmt", "Net Amount"],
  ["FinalGratuityAmt", "Final Gratuity Amt"],
  ["FinalNetAmt", "Final Amount"],
];
type LineCol = [key: keyof GratLine, label: string, kind: "num" | "out" | "tsw" | "text"];
const LINE_COLS: LineCol[] = [
  ["WorkingDays", "Working Days", "num"],
  ["StrikeDays", "TSW Days", "num"],
  ["TSWAllow", "TSW Allow", "tsw"],
  ["LockOutDays", "Lock Out", "num"],
  ["LockDownDays", "Lock Down", "num"],
  ["LayOffDays", "Lay Off", "num"],
  ["PreviousSTL", "Prev. STL", "num"],
  ["STLAvailed", "STL Availed", "num"],
  ["AdjDays", "Adj. Days", "num"],
  ["TotalDays", "Total Days", "out"],
  ["STLEarned", "STL Earned", "out"],
  ["Eligible", "Eligible", "out"],
  ["FinalCount", "Final Count", "out"],
  ["Remarks", "Remarks", "text"],
];
const NOMINEE_COLS: [keyof Nominee, string, "num" | "text" | "out"][] = [
  ["NomineeName", "Nominee Name", "text"],
  ["PShare", "PF Share %", "num"],
  ["GShare", "Gratuity Share %", "num"],
  ["GAmount", "Amount", "out"],
  ["Relation", "Relation", "text"],
  ["Address", "Address", "text"],
];

const fmt = (v: Val | null | undefined) =>
  v === null || v === undefined || v === "" ? "" : String(v);

/** DoJ / DoL changed -> legacy GetServicePeriod. */
const withPeriod = (h: GratHeader): GratHeader => {
  const a = getAge(String(h.DoJ ?? ""), String(h.DoL ?? ""));
  return a
    ? { ...h, PeriodInYears: a.y, PeriodInMonth: a.m, PeriodInDays: a.d }
    : h;
};

interface Props {
  kind: GratKind;
  /** Gratuity Details: list + view only. */
  readOnly?: boolean;
  title?: string;
}

/**
 * Winsome gratuity documents (legacy FrmGratuityCalcActive_WIL = STL entry, FrmGratuityCalc =
 * calculation, FrmGratuityDetails = read-only list). Newest-first list, full-screen editor with
 * the employee header, year-wise days grid, results and nominees. Recalculates on every change.
 */
export default function GratuityDocPage({ kind, readOnly, title }: Props) {
  const { selectedCompany } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ open: boolean; docEntry?: number }>({
    open: false,
  });
  const { notify, snackbar } = useNotify();

  const fetchList = useCallback(async () => {
    if (coId == null) return;
    setLoading(true);
    const params = new URLSearchParams({
      co_id: String(coId),
      page: String(paging.page + 1),
      limit: String(paging.pageSize),
    });
    if (search) params.append("search", search);
    const { data, error } = await fetchWithCookie<{
      data: Row[];
      total: number;
    }>(`${GRAT_API}/${kind}/list?${params}`, "GET");
    if (error || !data) notify(error || "Failed to load documents", "error");
    else {
      setRows(data.data.map((r) => ({ ...r, id: r.DocEntry })));
      setTotal(data.total);
    }
    setLoading(false);
  }, [coId, paging, search, kind, notify]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      { field: "DocEntry", headerName: "DOC", width: 80 },
      { field: "ECode", headerName: "EB NO", width: 100 },
      { field: "EName", headerName: "NAME", flex: 2, minWidth: 180 },
      { field: "Occupation", headerName: "OCCUPATION", flex: 1, minWidth: 110 },
      { field: "DoJ", headerName: "DOJ", width: 105 },
      {
        field: "DoL",
        headerName: kind === "calc" ? "LEFT ON" : "UPTO",
        width: 105,
      },
      { field: "TEReason", headerName: "EXIT REASON", width: 130 },
      {
        field: "NoOfApplicableYrs",
        headerName: "APPL. YRS",
        type: "number",
        width: 90,
      },
      { field: "WagesRate", headerName: "RATE/DAY", type: "number", width: 100 },
      { field: "FinalNetAmt", headerName: "AMOUNT", type: "number", width: 110 },
      { field: "DocMode", headerName: "MODE", width: 100 },
    ],
    [kind],
  );

  const open = (row: Row) =>
    setEditor({ open: true, docEntry: Number(row.DocEntry) });

  return (
    <IndexWrapper
      title={title ?? TITLES[kind]}
      rows={rows}
      columns={columns}
      rowCount={total}
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
      createAction={
        readOnly
          ? undefined
          : { label: "New", onClick: () => setEditor({ open: true }) }
      }
      onView={open}
      onEdit={readOnly ? undefined : open}
      isRowEditable={(r) => !readOnly && r.DocMode !== APPROVED}
    >
      {editor.open && (
        <DocDialog
          kind={kind}
          title={title ?? TITLES[kind]}
          docEntry={editor.docEntry}
          readOnly={readOnly}
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

interface DocDialogProps {
  kind: GratKind;
  title: string;
  docEntry?: number;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

function DocDialog({
  kind,
  title,
  docEntry,
  readOnly,
  onClose,
  onSaved,
  onError,
}: DocDialogProps) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [setup, setSetup] = useState<{
    exit_reasons: string[];
    doc_types: string[];
  }>({ exit_reasons: [], doc_types: [] });
  const [fc, setFc] = useState("0.5"); // legacy "FC" box: final count of a badli year
  const [busy, setBusy] = useState(docEntry != null);
  const [saving, setSaving] = useState(false);
  const locked =
    !!readOnly || (doc != null && doc.header.DocMode === APPROVED);

  useEffect(() => {
    void fetchWithCookie<{ data: typeof setup }>(`${GRAT_API}/setup`, "GET").then(
      ({ data }) => data && setSetup(data.data),
    );
  }, []);

  // Stored documents show their stored figures; any change recalculates (legacy LostFocus).
  useEffect(() => {
    if (docEntry == null) return;
    void fetchWithCookie<{ data: Doc }>(
      `${GRAT_API}/${kind}/doc/${docEntry}`,
      "GET",
    ).then(({ data, error }) => {
      setBusy(false);
      if (error || !data) onError(error || "Failed to load document");
      else setDoc(data.data);
    });
  }, [docEntry, kind, onError]);

  const recalc = useCallback(
    (d: Doc): Doc => calcGratuity(kind, d.header, d.lines, d.nominees, val(fc)),
    [kind, fc],
  );
  const update = (fn: (d: Doc) => Doc) =>
    setDoc((d) => (d ? recalc(fn(d)) : d));

  const pickEmployee = async (emp: Row) => {
    setBusy(true);
    const { data, error } = await fetchWithCookie<{ data: Doc }>(
      `${GRAT_API}/${kind}/new/${encodeURIComponent(String(emp.ECode))}`,
      "GET",
    );
    setBusy(false);
    if (error || !data) return onError(error || "Failed to load employee");
    const d = data.data;
    setDoc(recalc({ ...d, header: withPeriod(d.header) }));
  };

  const setField = (key: string, value: Val) =>
    update((d) => {
      let h: GratHeader = { ...d.header, [key]: value };
      if (key === "DoJ" || key === "DoL") h = withPeriod(h);
      if (key === "LastWagesPerDay" || key === "LastWagesDrawnHrs")
        h = { ...h, ...ratesFromLastWages(h.LastWagesPerDay, h.LastWagesDrawnHrs) };
      if (key === "FinalPayPercent" && val(value) > 100) h.FinalPayPercent = 50;
      return { ...d, header: h };
    });

  // Legacy "Fill": one line per calendar year DoJ..DoL with the TSW days, eligibility restarts.
  const fill = async () => {
    if (!doc) return;
    const { DoJ, DoL, TEReason } = doc.header;
    if (!TEReason) return onError("Exit reason can't be blank");
    if (!DoJ || !DoL) return onError("Enter the joining and leaving dates");
    if (doc.lines.length && !window.confirm("Replace the year-wise lines?"))
      return;
    const { data, error } = await fetchWithCookie<{ data: Partial<GratLine>[] }>(
      `${GRAT_API}/years?from=${DoJ}&to=${DoL}`,
      "GET",
    );
    if (error || !data) return onError(error || "Fill failed");
    update((d) => ({
      ...d,
      header: { ...d.header, EligiblityStartingYear: 0 },
      lines: data.data.map((r) => ({ ...blankLine(Number(r.GYear)), ...r })),
    }));
  };

  const save = async () => {
    if (!doc) return;
    const check = docSchema.safeParse(doc);
    if (!check.success) return onError(check.error.issues[0].message);
    setSaving(true);
    const final = recalc(doc);
    const { data, error } = await fetchWithCookie<{ message: string }>(
      `${GRAT_API}/${kind}/save`,
      "POST",
      { ...final, header: { ...final.header, DocEntry: docEntry ?? 0 } },
    );
    setSaving(false);
    if (error || !data) onError(error || "Save failed");
    else onSaved(data.message);
  };

  const h = doc?.header ?? {};
  const text = (key: string, label: string, type = "text") => (
    <TextField
      key={key}
      size="small"
      label={label}
      type={type}
      value={fmt(h[key])}
      disabled={locked}
      onChange={(e) => setField(key, e.target.value)}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
  const select = (key: string, label: string, items: string[]) => (
    <TextField
      select
      size="small"
      label={label}
      value={fmt(h[key])}
      disabled={locked}
      onChange={(e) => setField(key, e.target.value)}
    >
      <MenuItem value="">
        <em>—</em>
      </MenuItem>
      {items.map((v) => (
        <MenuItem key={v} value={v}>
          {v}
        </MenuItem>
      ))}
    </TextField>
  );
  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 1.5,
  } as const;

  return (
    <Dialog open onClose={onClose} {...fullScreenBesideSidebar}>
      <DialogTitle
        sx={{ display: "flex", justifyContent: "space-between", pb: 1 }}
      >
        <Typography variant="h6" component="span">
          {title} {docEntry != null ? `— Doc ${docEntry}` : "— New"}
          {doc ? ` · ${h.ECode} ${h.EName}` : ""}
          {doc?.header.FromSTL ? ` (from STL ${doc.header.FromSTL})` : ""}
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
          <Box sx={{ pt: 1 }}>
            <EmpPicker url={`${GRAT_API}/${kind}/emp_search`} onPick={pickEmployee} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {kind === "calc"
                ? "Leavers without a gratuity. An employee with an STL entry starts from it."
                : "Employees without an STL entry or gratuity."}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={grid}>
              {INFO.map(([k, l]) => text(k, l))}
              {select("DocType", "Doc Type", setup.doc_types)}
              {text("DoB", "Date of Birth", "date")}
              {text("DoJ", "Date of Joining", "date")}
              {text("DoP", "Date of Permanent", "date")}
              {text("DoL", kind === "calc" ? "Date of Cessation" : "Last Worked Upto", "date")}
              {text("DoJLic", "DOJ-LIC", "date")}
              {text("TEDate", "T.E. Date", "date")}
              {select("TEReason", "Exit Reason", setup.exit_reasons)}
              <TextField
                size="small"
                label="Period (Y/M/D)"
                value={`${fmt(h.PeriodInYears)} / ${fmt(h.PeriodInMonth)} / ${fmt(h.PeriodInDays)}`}
                disabled
              />
            </Box>
            <Box sx={grid}>
              {RATES.map(([k, l]) => text(k, l, "number"))}
              <TextField
                size="small"
                label="FC (badli)"
                type="number"
                value={fc}
                disabled={locked}
                onChange={(e) => {
                  const v = e.target.value;
                  setFc(v);
                  setDoc((d) =>
                    d && calcGratuity(kind, d.header, d.lines, d.nominees, val(v)),
                  );
                }}
              />
              {ADJUST.map(([flag, k, l]) => (
                <Box key={k} sx={{ display: "flex", alignItems: "center" }}>
                  <Checkbox
                    size="small"
                    checked={h[flag] === "Y"}
                    disabled={locked}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        header: {
                          ...d.header,
                          [flag]: e.target.checked ? "Y" : "N",
                          ...(e.target.checked ? {} : { [k]: 0 }),
                        },
                      }))
                    }
                    inputProps={{ "aria-label": l }}
                  />
                  <TextField
                    size="small"
                    label={l}
                    type="number"
                    value={fmt(h[k])}
                    disabled={locked || h[flag] !== "Y"}
                    onChange={(e) => setField(k, e.target.value)}
                  />
                </Box>
              ))}
              {text("ORemarks", "Remarks")}
            </Box>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={h.FiveYear240Validation === "Y"}
                    // legacy: fixed once the years are filled (re-Fill to start over)
                    disabled={locked || doc.lines.length > 0}
                    onChange={(e) =>
                      setField("FiveYear240Validation", e.target.checked ? "Y" : "N")
                    }
                  />
                }
                label="Five Year Continuous 240-Days Check"
              />
              {!locked && (
                <Button variant="outlined" onClick={() => void fill()}>
                  Fill years &gt;&gt;
                </Button>
              )}
            </Box>

            <TableContainer sx={{ maxHeight: "45vh", overflow: "auto" }}>
              <Box component="table" sx={{ ...entryTableSx, width: "100%" }}>
                <thead>
                  <tr>
                    <th>Year</th>
                    {LINE_COLS.map(([k, l]) => (
                      <th key={k}>{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {doc.lines.map((ln, i) => (
                    <tr key={`${ln.GYear}-${i}`}>
                      <td>{fmt(ln.GYear)}</td>
                      {LINE_COLS.map(([k, l, t]) => (
                        <td key={k} className={t === "out" ? "out" : undefined}>
                          {t === "out" ? (
                            fmt(ln[k])
                          ) : t === "tsw" ? (
                            <Checkbox
                              size="small"
                              sx={{ p: 0 }}
                              checked={ln.TSWAllow === "Y"}
                              disabled={locked}
                              inputProps={{ "aria-label": `${ln.GYear} ${l}` }}
                              onChange={(e) =>
                                update((d) => ({
                                  ...d,
                                  lines: editLine(d.lines, i, {
                                    TSWAllow: e.target.checked ? "Y" : "N",
                                  }),
                                }))
                              }
                            />
                          ) : (
                            <input
                              className={t === "num" ? "cell num" : "cell"}
                              type={t === "num" ? "number" : "text"}
                              min={0}
                              aria-label={`${ln.GYear} ${l}`}
                              value={fmt(ln[k])}
                              disabled={locked}
                              onChange={(e) =>
                                update((d) => ({
                                  ...d,
                                  lines: editLine(d.lines, i, { [k]: e.target.value }),
                                }))
                              }
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {doc.lines.length === 0 && (
                    <tr>
                      <td colSpan={LINE_COLS.length + 1}>
                        Press “Fill years” to list the years of service.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Box>
            </TableContainer>

            <Box sx={grid}>
              {RESULTS.map(([k, l]) => (
                <TextField key={k} size="small" label={l} value={fmt(h[k])} disabled />
              ))}
            </Box>

            <Typography variant="subtitle2">Nominees</Typography>
            <Box component="table" sx={{ ...entryTableSx, width: "100%" }}>
              <thead>
                <tr>
                  {NOMINEE_COLS.map(([k, l]) => (
                    <th key={k}>{l}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {doc.nominees.map((n, i) => (
                  <tr key={i}>
                    {NOMINEE_COLS.map(([k, l, t]) => (
                      <td key={k} className={t === "out" ? "out" : undefined}>
                        {t === "out" ? (
                          fmt(n[k])
                        ) : (
                          <input
                            className={t === "num" ? "cell num" : "cell"}
                            type={t === "num" ? "number" : "text"}
                            aria-label={`Nominee ${i + 1} ${l}`}
                            value={fmt(n[k])}
                            disabled={locked}
                            onChange={(e) =>
                              update((d) => ({
                                ...d,
                                nominees: d.nominees.map((x, j) =>
                                  j === i ? { ...x, [k]: e.target.value } : x,
                                ),
                              }))
                            }
                          />
                        )}
                      </td>
                    ))}
                    <td>
                      {!locked && (
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Remove nominee ${i + 1}`}
                          onClick={() =>
                            update((d) => ({
                              ...d,
                              nominees: d.nominees.filter((_, j) => j !== i),
                            }))
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
            {!locked && (
              <Box>
                <Button
                  size="small"
                  startIcon={<Plus size={16} />}
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      nominees: [
                        ...d.nominees,
                        {
                          NomineeName: "",
                          PShare: 0,
                          GShare: 0,
                          GAmount: 0,
                          Relation: "",
                          Address: "",
                        },
                      ],
                    }))
                  }
                >
                  Add nominee
                </Button>
              </Box>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              {locked && (
                <Typography variant="body2" color="text.secondary" sx={{ mr: "auto" }}>
                  {readOnly ? "View only." : "Approved — can't be changed."}
                </Typography>
              )}
              <Button onClick={onClose}>Close</Button>
              {!locked && (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon size={18} />}
                  onClick={() => void save()}
                  disabled={saving}
                >
                  {saving ? "Saving..." : docEntry != null ? "Update" : "Save"}
                </Button>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
