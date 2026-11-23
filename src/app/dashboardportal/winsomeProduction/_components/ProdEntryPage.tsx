"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  createFilterOptions,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Save as SaveIcon, Trash2 as DeleteIcon, X } from "lucide-react";
import IndexWrapper from "@/components/ui/IndexWrapper";
import {
  entryGridCellColorsSx,
  fullScreenBesideSidebar,
  handleGridEnterKey,
  keyedCellBg,
  pickCellBg,
} from "@/components/ui/entryGrid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { yesterdayIso } from "@/components/reports/reportDates";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
  blankLine,
  FORMS,
  headerSchema,
  lineSchema,
  previewAmounts,
  type EntryHeader,
  type EntryLine,
  type LineColumn,
  type Option,
  type ProdKind,
  type ProdListRow,
  type ProdSetup,
} from "./config";

const api = apiRoutesPortalMasters;
// ponytail: ~5k employees; only render the first 50 matches.
const filterOptions = createFilterOptions<Option>({ limit: 50 });
const cellSx = { p: 0.5, border: "1px solid" } as const;
const headCellSx = {
  ...cellSx,
  fontWeight: 600,
  whiteSpace: "nowrap",
} as const;

const num = (v: string): number => (v.trim() === "" ? 0 : Number(v));
const isBlank = (l: EntryLine) =>
  !l.ECode && !l.Mch1Code && !l.QCode && !l.Prod1;

type Snack = { open: boolean; message: string; severity: "success" | "error" };

interface DocResponse {
  header: {
    doc_entry: number;
    wdate: string;
    shift: string;
    spell: string;
    dept_code: string;
    mch_type: string;
  };
  lines: Record<string, string | number | null>[];
}

/**
 * One Winsome production screen (legacy Smart-Eye WIL form): a newest-first list of
 * documents, and a full-screen grid to enter or edit one document (date + shift header,
 * one line per worker). Scoped by the sidebar company/branch.
 */
export default function ProdEntryPage({ kind }: { kind: ProdKind }) {
  const form = FORMS[kind];
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId =
    selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<ProdListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    from_date: yesterdayIso(),
    to_date: yesterdayIso(),
    shift: "",
  });
  const [shifts, setShifts] = useState<string[]>([]);
  const [editor, setEditor] = useState<{ open: boolean; docEntry?: number }>({
    open: false,
  });
  const [snack, setSnack] = useState<Snack>({
    open: false,
    message: "",
    severity: "success",
  });

  const notify = useCallback(
    (message: string, severity: Snack["severity"] = "success") => {
      setSnack({ open: true, message, severity });
    },
    [],
  );

  const fetchList = useCallback(async () => {
    if (coId == null) return;
    setLoading(true);
    const params = new URLSearchParams({
      co_id: String(coId),
      page: String(paging.page + 1),
      limit: String(paging.pageSize),
    });
    if (branchId != null) params.append("branch_id", String(branchId));
    if (search) params.append("search", search);
    for (const [k, v] of Object.entries(filters)) if (v) params.append(k, v);
    const { data, error } = await fetchWithCookie<{
      data: ProdListRow[];
      total: number;
    }>(`${api.WINSOME_PROD_LIST}/${kind}?${params}`, "GET");
    if (error || !data) notify(error || "Failed to load documents", "error");
    else {
      setRows(data.data);
      setTotal(data.total);
    }
    setLoading(false);
  }, [coId, branchId, paging, search, filters, kind, notify]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // Shift filter choices: same shift list as the entry header.
  useEffect(() => {
    if (coId == null) return;
    const params = new URLSearchParams({ co_id: String(coId) });
    if (branchId != null) params.append("branch_id", String(branchId));
    void fetchWithCookie<{ data: ProdSetup }>(
      `${api.WINSOME_PROD_SETUP}/${kind}?${params}`,
      "GET",
    ).then(({ data }) => data && setShifts(data.data.shifts));
  }, [coId, branchId, kind]);

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPaging((p) => ({ ...p, page: 0 }));
  };

  const columns = useMemo<GridColDef<ProdListRow>[]>(
    () => [
      // flex: columns share the full width, like the entry grid. Doc no stays hidden (Edit uses it).
      { field: "wdate", headerName: "DATE", flex: 1, minWidth: 100 },
      { field: "shift", headerName: "SHIFT", flex: 0.5, minWidth: 60 },
      ...(form.doc
        ? [
            {
              field: "dept_code",
              headerName: "DEPT",
              flex: 0.5,
              minWidth: 70,
            } as GridColDef<ProdListRow>,
          ]
        : [
            {
              field: "mch_code",
              headerName: "MACHINE",
              flex: 0.8,
              minWidth: 90,
            } as GridColDef<ProdListRow>,
          ]),
      { field: "eb_no", headerName: "EB NO", flex: 0.8, minWidth: 90 },
      { field: "name", headerName: "NAME", flex: 2, minWidth: 180 },
      { field: "quality", headerName: "QUALITY", flex: 0.8, minWidth: 90 },
      {
        field: "rate",
        headerName: "RATE",
        type: "number",
        flex: 0.8,
        minWidth: 90,
      },
      {
        field: "prod",
        headerName: "PRODUCTION",
        type: "number",
        flex: 1,
        minWidth: 110,
      },
      {
        field: "amount",
        headerName: "AMOUNT",
        type: "number",
        flex: 1,
        minWidth: 110,
      },
    ],
    [form.doc],
  );

  return (
    // No vertical column lines in the list grid.
    <Box
      sx={{
        "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader": {
          borderRight: "0 !important",
        },
      }}
    >
      <IndexWrapper
        title={form.title}
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
          placeholder: "Search by EB no, machine or quality",
          debounceDelayMs: 500,
        }}
        toolbarContent={
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {(["from_date", "to_date"] as const).map((k) => (
              <TextField
                key={k}
                type="date"
                size="small"
                label={k === "from_date" ? "From Date" : "To Date"}
                value={filters[k]}
                onChange={(e) => setFilter(k, e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            ))}
            <TextField
              select
              size="small"
              label="Shift"
              value={filters.shift}
              onChange={(e) => setFilter("shift", e.target.value)}
              sx={{ minWidth: 110 }}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {shifts.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        }
        createAction={{
          label: "New Entry",
          onClick: () => setEditor({ open: true }),
        }}
        onEdit={(row) => setEditor({ open: true, docEntry: row.doc_entry })}
      >
        {editor.open && coId != null && (
          <EntryDialog
            kind={kind}
            coId={coId}
            branchId={branchId}
            docEntry={editor.docEntry}
            onClose={() => setEditor({ open: false })}
            onSaved={(msg, close) => {
              notify(msg);
              if (close) setEditor({ open: false }); // save keeps the dialog open until Close
              void fetchList();
            }}
            onError={(msg) => notify(msg, "error")}
          />
        )}
        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity={snack.severity}
            onClose={() => setSnack((s) => ({ ...s, open: false }))}
            sx={{ width: "100%" }}
          >
            {snack.message}
          </Alert>
        </Snackbar>
      </IndexWrapper>
    </Box>
  );
}

type PickField = "OcpCode" | "Mch1Code" | "Mch2Code" | "ECode" | "QCode";

/**
 * Grid body styling as plain class rules on the table: a ~250-line document renders ~2,500 cells,
 * and MUI TableCell/TextField per cell (plus `td:has()` colour rules) froze the browser.
 * The body therefore uses native <td>/<input>; only the focused pick cell mounts an Autocomplete.
 */
const gridBodySx = {
  // Row lines only — no vertical column lines.
  "& th": { borderLeft: 0, borderRight: 0, borderColor: "divider" },
  "& tbody td": {
    p: "2px 4px",
    borderBottom: "1px solid",
    borderColor: "divider",
    fontSize: "0.875rem",
  },
  "& tbody td.pick": { backgroundColor: pickCellBg },
  "& tbody td.key": { backgroundColor: keyedCellBg },
  "& tbody td.out": { textAlign: "right", color: "text.secondary" },
  "& input.cell": {
    width: "100%",
    border: 0,
    outline: 0,
    background: "transparent",
    font: "inherit",
    color: "inherit",
    p: "4px 2px",
  },
  "& input.cell.num": { textAlign: "right" },
} as const;

interface PickCellProps {
  value: string;
  options: Option[];
  optionMap: Map<string, Option>;
  label: string;
  onPick: (value: string) => void;
}

/** Plain input until focused, then the Autocomplete (one mounted at a time). */
const PickCell = React.memo(function PickCell({
  value,
  options,
  optionMap,
  label,
  onPick,
}: PickCellProps) {
  const [editing, setEditing] = useState(false);
  const selected =
    optionMap.get(value) ?? (value ? { value, label: value } : null);
  if (!editing) {
    return (
      <input
        className="cell"
        aria-label={label}
        value={selected?.label ?? ""}
        onFocus={() => setEditing(true)}
        onChange={() => undefined}
      />
    );
  }
  return (
    <Autocomplete
      autoHighlight
      size="small"
      options={options}
      filterOptions={filterOptions}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(o, v) => o.value === v.value}
      value={selected}
      onChange={(_, o) => onPick(o?.value ?? "")}
      onBlur={() => setEditing(false)}
      renderInput={(params) => (
        <TextField
          {...params}
          autoFocus
          variant="standard"
          InputProps={{ ...params.InputProps, disableUnderline: true }}
          inputProps={{ ...params.inputProps, "aria-label": label }}
        />
      )}
    />
  );
});

interface LineRowProps {
  index: number;
  line: EntryLine;
  form: (typeof FORMS)[ProdKind];
  options: Record<PickField, Option[]>;
  optionMaps: Record<PickField, Map<string, Option>>;
  isLast: boolean; // the blank entry row: cannot be removed
  onPick: (i: number, field: LineColumn["field"], value: string) => void;
  onPatch: (i: number, patch: Partial<EntryLine>) => void;
  onRemove: (i: number) => void;
}

/** One grid line; memoised so editing a line re-renders only that line. */
const LineRow = React.memo(function LineRow({
  index: i,
  line: l,
  form,
  options,
  optionMaps,
  isLast,
  onPick,
  onPatch,
  onRemove,
}: LineRowProps) {
  const calc = previewAmounts(form.calc, {
    Prod1: num(l.Prod1),
    QRate: num(l.QRate),
    Prod_HR: num(l.Prod_HR),
    Mch_HR: num(l.Mch_HR),
    OcpCode: l.OcpCode,
  });
  return (
    <tr>
      <td>{i + 1}</td>
      {form.columns.map((c) =>
        c.kind === "pick" && form.fill ? (
          // Fill decides machine / worker / quality: shown, not editable.
          <td key={c.field}>
            {optionMaps[c.field as PickField].get(l[c.field as PickField])
              ?.label ?? l[c.field as PickField]}
          </td>
        ) : c.kind === "pick" ? (
          <td key={c.field} className="pick">
            <PickCell
              value={l[c.field as PickField]}
              options={options[c.field as PickField]}
              optionMap={optionMaps[c.field as PickField]}
              label={`Line ${i + 1} ${c.label}`}
              onPick={(v) => onPick(i, c.field, v)}
            />
          </td>
        ) : c.kind === "num" ? (
          <td key={c.field} className="key">
            <input
              className="cell num"
              type="number"
              step="any"
              min={0}
              aria-label={`Line ${i + 1} ${c.label}`}
              value={l[c.field as keyof EntryLine]}
              onChange={(e) => onPatch(i, { [c.field]: e.target.value })}
            />
          </td>
        ) : (
          <td key={c.field} className="out">
            {c.field === "QRate"
              ? l.QRate
                ? Number(l.QRate).toFixed(6)
                : ""
              : isBlank(l)
                ? ""
                : calc[c.field as "CalcRate" | "Amount" | "PayableAmt"].toFixed(
                    c.field === "CalcRate" ? 6 : 2,
                  )}
          </td>
        ),
      )}
      <td style={{ textAlign: "center" }}>
        <IconButton
          size="small"
          color="error"
          disabled={isLast}
          onClick={() => onRemove(i)}
          aria-label={`Remove line ${i + 1}`}
        >
          <DeleteIcon size={16} />
        </IconButton>
      </td>
    </tr>
  );
});

interface EntryDialogProps {
  kind: ProdKind;
  coId: number | string;
  branchId?: number | string;
  docEntry?: number;
  onClose: () => void;
  onSaved: (message: string, close?: boolean) => void;
  onError: (message: string) => void;
}

function EntryDialog({
  kind,
  coId,
  branchId,
  docEntry: openedDoc,
  onClose,
  onSaved,
  onError,
}: EntryDialogProps) {
  const form = FORMS[kind];
  // The first Save creates the document; later saves update it (the dialog stays open).
  const [docEntry, setDocEntry] = useState(openedDoc);
  const [setup, setSetup] = useState<ProdSetup | null>(null);
  const [header, setHeader] = useState<EntryHeader>({
    wdate: yesterdayIso(), // production is entered the next day
    shift: "",
    spell: "",
    dept_code: "",
    mch_type: "",
  });
  // Typed forms: row 1 is the blank entry row; a new one is added on top after each save.
  // Fill forms (weaving) get their lines from Fill only, so no blank row.
  const [lines, setLines] = useState<EntryLine[]>(
    form.fill ? [] : [blankLine()],
  );
  const [loadingDoc, setLoadingDoc] = useState(openedDoc != null);
  const [saving, setSaving] = useState(false);
  // After a save, put the cursor in the new blank row 1 (its first cell).
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    if (focusTick)
      gridRef.current
        ?.querySelector<HTMLInputElement>("tbody tr:first-child input")
        ?.focus();
  }, [focusTick]);

  // Setup depends on the department for the document forms (their pickers are per dept).
  const deptKey = form.doc ? header.dept_code : "";
  useEffect(() => {
    const params = new URLSearchParams({ co_id: String(coId) });
    if (branchId != null) params.append("branch_id", String(branchId));
    if (deptKey) params.append("dept_code", deptKey);
    void fetchWithCookie<{ data: ProdSetup }>(
      `${api.WINSOME_PROD_SETUP}/${kind}?${params}`,
      "GET",
    ).then(({ data, error }) =>
      error || !data
        ? onError(error || "Failed to load pickers")
        : setSetup(data.data),
    );
  }, [kind, coId, branchId, deptKey, onError]);

  useEffect(() => {
    if (openedDoc == null) return;
    void fetchWithCookie<{ data: DocResponse }>(
      `${api.WINSOME_PROD_DOC}/${kind}/${openedDoc}`,
      "GET",
    ).then(({ data, error }) => {
      if (error || !data) {
        onError(error || "Failed to load document");
        return;
      }
      const h = data.data.header;
      setHeader({
        wdate: String(h.wdate).slice(0, 10),
        shift: h.shift,
        spell: h.spell,
        dept_code: h.dept_code,
        mch_type: h.mch_type,
      });
      const str = (v: string | number | null | undefined) =>
        v == null ? "" : String(v);
      setLines([
        ...(form.fill ? [] : [blankLine()]),
        ...data.data.lines.map((l) => ({
          OcpCode: str(l.OcpCode),
          Mch1Code: str(l.Mch1Code),
          Mch2Code: str(l.Mch2Code),
          ECode: str(l.ECode),
          QCode: str(l.QCode),
          Prod1: str(l.Prod1),
          Prod_HR: str(l.Prod_HR),
          Mch_HR: str(l.Mch_HR),
          QRate: str(l.QRate),
        })),
      ]);
      setLoadingDoc(false);
    });
  }, [openedDoc, kind, form.fill, onError]);

  const options = useMemo(
    () => ({
      OcpCode: setup?.occupations ?? [],
      Mch1Code: setup?.machines ?? [],
      Mch2Code: setup?.machines ?? [],
      ECode: setup?.employees ?? [],
      QCode: setup?.qualities ?? [],
    }),
    [setup],
  );
  const optionMaps = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(options).map(([k, list]) => [
          k,
          new Map(list.map((o) => [o.value, o])),
        ]),
      ) as Record<keyof typeof options, Map<string, Option>>,
    [options],
  );
  const qualityRate = useMemo(
    () => new Map((setup?.qualities ?? []).map((q) => [q.value, q.rate])),
    [setup],
  );

  /** Update one line (a new blank row is added on top after Save, not while typing). */
  const patchLine = useCallback((i: number, patch: Partial<EntryLine>) => {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }, []);

  /** Machine picked: default hours, and pre-fill worker + last quality like the legacy form. */
  const onMachine = useCallback(
    async (i: number, code: string) => {
      patchLine(i, { Mch1Code: code });
      if (!code || !header.wdate) return;
      const params = new URLSearchParams({
        mch1_code: code,
        wdate: header.wdate,
        shift: header.shift,
      });
      const { data } = await fetchWithCookie<{
        data: {
          ECode: string;
          Hours: number;
          QCode: string;
          QRate: number | null;
        };
      }>(`${api.WINSOME_PROD_MACHINE_FILL}/${kind}?${params}`, "GET");
      if (!data) return;
      setLines((prev) =>
        prev.map((l, j) => {
          if (j !== i) return l;
          const fill: Partial<EntryLine> = {};
          if (!l.ECode && data.data.ECode) fill.ECode = data.data.ECode;
          // Hours = the worker's total over the shift's spells (A1 + A2 …); 8 when no attendance.
          if (!form.doc && !l.Prod_HR)
            fill.Prod_HR = String(data.data.Hours || 8);
          if (!l.QCode && data.data.QCode) {
            fill.QCode = data.data.QCode;
            fill.QRate = String(
              qualityRate.get(data.data.QCode) ?? data.data.QRate ?? "",
            );
          }
          return { ...l, ...fill };
        }),
      );
    },
    [patchLine, form.doc, header.wdate, header.shift, kind, qualityRate],
  );

  /** Legacy "Fill >>": replace the grid with every loom of the machine type + the workers present. */
  const [filling, setFilling] = useState(false);
  const fillGrid = async () => {
    if (!header.shift) return onError("Please select shift");
    if (!header.mch_type) return onError("Please select machine type");
    if (
      lines.some((l) => !isBlank(l)) &&
      !window.confirm("Replace the lines entered with the Fill?")
    )
      return;
    const params = new URLSearchParams({
      wdate: header.wdate,
      shift: header.shift,
      mch_type: header.mch_type,
    });
    if (branchId != null) params.append("branch_id", String(branchId));
    setFilling(true);
    const { data, error } = await fetchWithCookie<{
      data: {
        Mch1Code: string;
        QCode: string;
        QRate: number;
        ECode: string;
        OcpCode: string;
        Prod_HR: number;
      }[];
    }>(`${api.WINSOME_PROD_FILL}/${kind}?${params}`, "GET");
    setFilling(false);
    if (error || !data) return onError(error || "Fill failed");
    setLines([
      ...data.data.map((r) => ({
        ...blankLine(),
        Mch1Code: r.Mch1Code,
        ECode: r.ECode,
        OcpCode: r.OcpCode,
        QCode: r.QCode,
        QRate: r.QRate ? String(r.QRate) : "",
        Prod_HR: r.Prod_HR ? String(r.Prod_HR) : "",
      })),
    ]);
  };

  const onPick = useCallback(
    (i: number, field: LineColumn["field"], value: string) => {
      if (field === "Mch1Code") void onMachine(i, value);
      else if (field === "QCode")
        patchLine(i, {
          QCode: value,
          QRate: value ? String(qualityRate.get(value) ?? "") : "",
        });
      else patchLine(i, { [field]: value });
    },
    [onMachine, patchLine, qualityRate],
  );
  const removeLine = useCallback(
    (i: number) => setLines((prev) => prev.filter((_, j) => j !== i)),
    [],
  );

  const entered = lines.filter((l) => !isBlank(l));
  const totals = entered.reduce(
    (t, l) => {
      const a = previewAmounts(form.calc, {
        Prod1: num(l.Prod1),
        QRate: num(l.QRate),
        Prod_HR: num(l.Prod_HR),
        Mch_HR: num(l.Mch_HR),
        OcpCode: l.OcpCode,
      });
      return {
        prod: t.prod + num(l.Prod1),
        amount: t.amount + (form.calc === "beaming" ? a.PayableAmt : a.Amount),
      };
    },
    { prod: 0, amount: 0 },
  );

  const save = async () => {
    const h = headerSchema.safeParse(header);
    if (!h.success) return onError(h.error.issues[0].message);
    if (!form.doc && !header.shift) return onError("Shift is required");
    if (form.doc && !header.dept_code) return onError("Department is required");
    if (entered.length === 0) return onError("Enter at least one line");
    for (const [i, l] of entered.entries()) {
      const r = lineSchema.safeParse(l);
      if (!r.success)
        return onError(
          `Line ${i + 1}: ${String(r.error.issues[0].path[0])} ${r.error.issues[0].message}`,
        );
      if (!l.ECode && !(form.fill && l.Mch1Code))
        return onError(`Line ${i + 1}: employee is required`);
    }
    setSaving(true);
    const { data, error } = await fetchWithCookie<{
      message: string;
      doc_entry: number;
    }>(`${api.WINSOME_PROD_SAVE}/${kind}`, "POST", {
      ...header,
      doc_entry: docEntry ?? null,
      lines: entered,
    });
    setSaving(false);
    if (error || !data) return onError(error || "Save failed");
    setDocEntry(data.doc_entry);
    if (!form.fill) {
      setLines((prev) => (isBlank(prev[0]) ? prev : [blankLine(), ...prev]));
      setFocusTick((n) => n + 1);
    }
    onSaved(data.message);
  };

  const remove = async () => {
    if (docEntry == null || !window.confirm(`Delete document ${docEntry}?`))
      return;
    setSaving(true);
    const { data, error } = await fetchWithCookie<{ message: string }>(
      `${api.WINSOME_PROD_DOC}/${kind}/${docEntry}`,
      "DELETE",
    );
    setSaving(false);
    if (error || !data) onError(error || "Delete failed");
    else onSaved(data.message, true);
  };

  const headerSelect = (
    label: string,
    key: keyof EntryHeader,
    items: Option[],
    required = false,
  ) => (
    <TextField
      select
      size="small"
      label={label}
      required={required}
      value={header[key]}
      onChange={(e) => setHeader((h) => ({ ...h, [key]: e.target.value }))}
      sx={{ minWidth: 160 }}
    >
      <MenuItem value="">
        <em>—</em>
      </MenuItem>
      {items.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
  const asOptions = (list: string[]): Option[] =>
    list.map((v) => ({ value: v, label: v }));

  return (
    <Dialog open onClose={onClose} {...fullScreenBesideSidebar}>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" component="span">
          {form.title} {docEntry != null ? `— Doc ${docEntry}` : "— New"}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close dialog">
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loadingDoc || !setup ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 200,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Header only: the shared colour rules use td:has(), too slow over a 2,500-cell grid. */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                ...entryGridCellColorsSx,
              }}
            >
              <TextField
                type="date"
                size="small"
                label="Date"
                required
                value={header.wdate}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, wdate: e.target.value }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              {headerSelect(
                "Shift",
                "shift",
                asOptions(setup.shifts),
                !form.doc,
              )}
              {form.doc &&
                headerSelect("Department", "dept_code", setup.depts, true)}
              {form.mchType &&
                headerSelect(
                  "Machine Type",
                  "mch_type",
                  asOptions(setup.mch_types),
                )}
              {form.fill && (
                <Button
                  variant="outlined"
                  onClick={() => void fillGrid()}
                  disabled={filling}
                >
                  {filling ? "Filling…" : "Fill >>"}
                </Button>
              )}
            </Box>

            <TableContainer
              ref={gridRef}
              sx={{ overflow: "auto", maxHeight: "calc(100vh - 250px)" }}
              onKeyDown={handleGridEnterKey}
            >
              <Table
                size="small"
                stickyHeader
                sx={{
                  borderCollapse: "collapse",
                  "& .MuiInputBase-input": { fontSize: "0.875rem" },
                  ...gridBodySx,
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...headCellSx, width: 36 }}>#</TableCell>
                    {form.columns.map((c) => (
                      <TableCell
                        key={c.field}
                        align={c.kind === "pick" ? "left" : "right"}
                        sx={{ ...headCellSx, minWidth: c.width }}
                      >
                        {c.label}
                      </TableCell>
                    ))}
                    <TableCell sx={{ ...headCellSx, width: 40 }} />
                  </TableRow>
                </TableHead>
                <tbody>
                  {lines.map((l, i) => (
                    <LineRow
                      key={`line-${i}`}
                      index={i}
                      line={l}
                      form={form}
                      options={options}
                      optionMaps={optionMaps}
                      isLast={!form.fill && i === 0 && isBlank(l)}
                      onPick={onPick}
                      onPatch={patchLine}
                      onRemove={removeLine}
                    />
                  ))}
                </tbody>
              </Table>
            </TableContainer>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2">
                Lines: <b>{entered.length}</b> · Total production:{" "}
                <b>{totals.prod.toFixed(2)}</b> · Total amount:{" "}
                <b>{totals.amount.toFixed(2)}</b>
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {docEntry != null && (
                  <Button
                    color="error"
                    onClick={remove}
                    disabled={saving}
                    startIcon={<DeleteIcon size={16} />}
                  >
                    Delete
                  </Button>
                )}
                <Button onClick={onClose}>Close</Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon size={18} />}
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? "Saving..." : docEntry != null ? "Update" : "Save"}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
