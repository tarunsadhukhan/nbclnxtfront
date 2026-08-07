"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  TextField,
  Autocomplete,
  Grid,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// ─── Types ──────────────────────────────────────────────────────────

interface Company {
  co_id: number;
  co_name: string;
}

interface WageType {
  id: number;
  code: string;
  name: string;
}

interface PayComponent {
  id: number;
  code: string;
  name: string;
  type: number;
  default_value: number | null;
  type_label: string;
  roundof?: number | null;
  roundof_type?: number | null;
}

interface SchemeDropdown {
  payscheme_id: number;
  payscheme_code: string;
  payscheme_name: string;
  co_id: number | null;
}

interface DetailItem {
  id?: number;
  component_id: number;
  component_name: string;
  component_code?: string;
  formula: string;
  type: string;
  status: number;
  default_value: number | null;
  value?: number | string;
  roundof?: number | null;
  roundof_type?: number | null;
}

interface SchemeData {
  payscheme_id: number;
  co_id: number | null;
  payscheme_code: string;
  payscheme_name: string;
  record_status: number | null;
  wage_type: number | null;
  wage_type_name: string | null;
  branch_id: number | null;
  effective_from: string | null;
}

// ─── Operators for formula builder ──────────────────────────────────
const OPERATORS = [
  { label: "+", value: "+" },
  { label: "-", value: "-" },
  { label: "*", value: "*" },
  { label: "/", value: "/" },
  { label: "%", value: "%" },
  { label: "=", value: "=" },
  { label: ";", value: ";" },
  { label: ">", value: ">" },
  { label: "<", value: "<" },
  { label: "(", value: "(" },
  { label: ")", value: ") result=" },
  { label: "if", value: "var result=0; if (" },
  { label: "else if", value: "else if (" },
  { label: "else", value: "else result=" },
  { label: "result", value: "result" },
];

function CreatePaySchemePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const initialCoId = searchParams.get("co_id") || "";
  const isEditMode = !!editId;

  // Company
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCoId);

  // Header form
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [wageType, setWageType] = useState("");
  const [description, setDescription] = useState("");
  const [recordStatus, setRecordStatus] = useState<number>(1);
  const [activeStatus, setActiveStatus] = useState<number>(1);

  // Setup data
  const [wageTypes, setWageTypes] = useState<WageType[]>([]);
  const [components, setComponents] = useState<PayComponent[]>([]);
  const [schemeDropdown, setSchemeDropdown] = useState<SchemeDropdown[]>([]);
  const [cloneSchemeId, setCloneSchemeId] = useState<number | null>(null);

  // Detail lines (by type)
  const [inputValues, setInputValues] = useState<DetailItem[]>([]);
  const [earningList, setEarningList] = useState<DetailItem[]>([]);
  const [deductionList, setDeductionList] = useState<DetailItem[]>([]);
  const [summaryList, setSummaryList] = useState<DetailItem[]>([]);

  // Add Item dialog
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<PayComponent | null>(null);
  const [formula, setFormula] = useState("");
  const [formulaValue, setFormulaValue] = useState("");
  const [defaultValueOverride, setDefaultValueOverride] = useState("");

  // UI
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // ─── Fetch setup data (components, schemes, companies from co_mst) ──
  const fetchSetup = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCompanyId) params.append("co_id", selectedCompanyId);

      const { data, error } = (await fetchWithCookie(
        `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_CREATE_SETUP}?${params}`,
        "GET"
      )) as { data?: { data: { wage_types: WageType[]; components: PayComponent[]; schemes: SchemeDropdown[]; companies: Company[] } }; error?: string };

      if (error || !data?.data) return;
      setWageTypes(data.data.wage_types || []);
      setComponents(data.data.components || []);
      setSchemeDropdown(data.data.schemes || []);

      // Companies from co_mst
      const coList = data.data.companies || [];
      if (coList.length > 0) {
        setCompanies(coList);
        if (!selectedCompanyId) {
          setSelectedCompanyId(coList[0].co_id.toString());
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  useEffect(() => {
    fetchSetup();
  }, [fetchSetup]);

  // ─── Fetch scheme for edit or clone ─────────────────────────────
  const loadSchemeById = useCallback(
    async (schemeId: string) => {
      try {
        const { data, error } = (await fetchWithCookie(
          `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_BY_ID}/${schemeId}`,
          "GET"
        )) as {
          data?: { data: { scheme: SchemeData; details: DetailItem[] } };
          error?: string;
        };

        if (error || !data?.data) return;
        const { scheme, details } = data.data;

        if (isEditMode) {
          setCode(scheme.payscheme_code || "");
          setName(scheme.payscheme_name || "");
          setWageType(scheme.wage_type != null ? String(scheme.wage_type) : "");
          setRecordStatus(scheme.record_status ?? 1);
        }

        // Distribute details by type
        const inputs: DetailItem[] = [];
        const earnings: DetailItem[] = [];
        const deductions: DetailItem[] = [];
        const summary: DetailItem[] = [];

        for (const d of details) {
          const item: DetailItem = {
            ...d,
            component_name: d.component_name || "",
            status: d.status ?? 1,
          };
          switch (String(d.type)) {
            case "0":
              inputs.push(item);
              break;
            case "1":
              earnings.push(item);
              break;
            case "2":
              deductions.push(item);
              break;
            case "3":
              summary.push(item);
              break;
          }
        }

        setInputValues(inputs);
        setEarningList(earnings);
        setDeductionList(deductions);
        setSummaryList(summary);
      } catch {
        /* ignore */
      }
    },
    [isEditMode]
  );

  useEffect(() => {
    if (editId) loadSchemeById(editId);
  }, [editId, loadSchemeById]);

  // Clone from existing
  const handleClone = useCallback(
    (schemeId: number | null) => {
      setCloneSchemeId(schemeId);
      if (schemeId) {
        loadSchemeById(String(schemeId));
      } else {
        setInputValues([]);
        setEarningList([]);
        setDeductionList([]);
        setSummaryList([]);
      }
    },
    [loadSchemeById]
  );

  // ─── Add item dialog ───────────────────────────────────────────
  const openAddItem = () => {
    setSelectedComponent(null);
    setFormula("");
    setFormulaValue("");
    setDefaultValueOverride("");
    setAddItemOpen(true);
  };

  const handleAddFormula = () => {
    if (!selectedComponent) return;

    const item: DetailItem = {
      component_id: selectedComponent.id,
      component_name: selectedComponent.name,
      component_code: selectedComponent.code,
      formula:
        selectedComponent.type === 0
          ? defaultValueOverride || String(selectedComponent.default_value ?? "")
          : formula,
      type: String(selectedComponent.type),
      status: 1,
      default_value:
        selectedComponent.type === 0
          ? parseFloat(defaultValueOverride || String(selectedComponent.default_value ?? "0"))
          : null,
      roundof: selectedComponent.roundof ?? null,
      roundof_type: selectedComponent.roundof_type ?? null,
    };

    switch (selectedComponent.type) {
      case 0:
        setInputValues((prev) => [...prev, item]);
        break;
      case 1:
        setEarningList((prev) => [...prev, item]);
        break;
      case 2:
        setDeductionList((prev) => [...prev, item]);
        break;
      case 3:
        setSummaryList((prev) => [...prev, item]);
        break;
    }

    setAddItemOpen(false);
  };

  const appendToFormula = (val: string) => setFormula((f) => f + val);
  const undoFormula = () => setFormula((f) => f.slice(0, -1));

  const handleAddValue = () => {
    if (formulaValue) {
      appendToFormula(formulaValue);
      setFormulaValue("");
    }
  };

  // ─── Remove item ───────────────────────────────────────────────
  const removeItem = (
    setter: React.Dispatch<React.SetStateAction<DetailItem[]>>,
    item: DetailItem
  ) => {
    setter((prev) =>
      prev.map((p) => (p === item ? { ...p, status: 0 } : p))
    );
  };

  // ─── Input value change ────────────────────────────────────────
  const handleInputValueChange = (componentId: number, value: string) => {
    setInputValues((prev) =>
      prev.map((iv) =>
        iv.component_id === componentId ? { ...iv, formula: value } : iv
      )
    );
  };

  // ─── Check Calculation ────────────────────────────────────────
  // Iterative substitution-based evaluator (mirrors legacy backend):
  // - Inputs supply literal values keyed by component_code.
  // - Each unresolved formula has known component_codes substituted with
  //   their numeric values, then is evaluated.
  // - Repeat until everything resolves or no further progress is made
  //   (handles forward references like Basic -> C_1_GROSS_ -> Gross1).
  // - Final value rounded per the component's ROUNDOF / ROUNDOF_TYPE:
  //   type 1 = nearest, type 2 = down (truncate), type 3 = up (ceiling).
  const handleCheckCalculation = () => {
    const cooked: Record<string, number> = {};
    const formulas: Record<string, string> = {};
    const rounding: Record<string, { digits: number; type: number }> = {};

    for (const iv of inputValues.filter((iv) => iv.status !== 0)) {
      if (!iv.component_code) continue;
      const n = parseFloat(iv.formula);
      cooked[iv.component_code] = isNaN(n) ? 0 : n;
    }

    const collectFormula = (item: DetailItem) => {
      if (item.status === 0 || !item.component_code) return;
      formulas[item.component_code] = item.formula ?? "";
      rounding[item.component_code] = {
        digits: item.roundof ?? 0,
        type: item.roundof_type ?? 0,
      };
    };
    earningList.forEach(collectFormula);
    deductionList.forEach(collectFormula);
    summaryList.forEach(collectFormula);

    const applyRound = (val: number, code: string): number => {
      const r = rounding[code];
      if (!r) return val;
      const digits = Math.max(0, Math.min(10, r.digits | 0));
      const factor = Math.pow(10, digits);
      // Kill floating-point noise before ceil/floor so e.g. 563.0000001 doesn't jump to 564.
      const scaled = Math.round(val * factor * 1e6) / 1e6;
      // ROUNDOF_TYPE matches the pay_components dropdown (ROUNDOF_TYPE_OPTIONS):
      // 1 = Round Up, 2 = Round Down, 3 = Round Nearest, 0/None = no rounding
      switch (r.type) {
        case 1:
          return Math.ceil(scaled) / factor;
        case 2:
          return Math.floor(scaled) / factor;
        case 3:
          return Math.round(scaled) / factor;
        default:
          return val;
      }
    };

    const evalFormula = (formula: string): number | null => {
      const f = formula.trim();
      if (!f) return 0;
      // Try as expression first (e.g. "A*B/100")
      try {
        // eslint-disable-next-line no-new-func
        const r = new Function(`return (${f});`)();
        if (typeof r === "number" && isFinite(r)) return r;
      } catch { /* fall through to statement form */ }
      // Try as statement block (e.g. "var result=0; if(...) result=...;")
      try {
        // eslint-disable-next-line no-new-func
        const r = new Function(`${f}\nreturn typeof result !== 'undefined' ? Number(result) : NaN;`)();
        if (typeof r === "number" && isFinite(r)) return r;
      } catch { /* unresolved */ }
      return null;
    };

    const allCodes = Object.keys(formulas);
    const MAX_ITER = 100;

    for (let iter = 0; iter < MAX_ITER; iter++) {
      let progress = false;

      for (const code of allCodes) {
        if (code in cooked) continue;

        let f = formulas[code];

        // If the raw formula is already a plain number, accept it
        const direct = parseFloat(f);
        if (!isNaN(direct) && /^-?\d+(\.\d+)?$/.test(f.trim())) {
          cooked[code] = applyRound(direct, code);
          progress = true;
          continue;
        }

        // Substitute known codes (longest first so longer codes win over
        // any that happen to be a prefix substring of another)
        const knownCodes = Object.keys(cooked).sort((a, b) => b.length - a.length);
        for (const refCode of knownCodes) {
          if (refCode === code) continue;
          if (f.indexOf(refCode) === -1) continue;
          f = f.split(refCode).join(String(cooked[refCode]));
        }

        const val = evalFormula(f);
        if (val !== null) {
          cooked[code] = applyRound(val, code);
          progress = true;
        }
      }

      if (allCodes.every((c) => c in cooked)) break;
      if (!progress) break; // Can't resolve any further this pass
    }

    // Final pass: any code still unresolved has formula references to
    // component codes that don't exist in this scheme (or form a cycle).
    // Substitute remaining C_xxx tokens with 0 and evaluate — matches
    // the legacy behavior of dangling refs degrading to 0.
    for (const code of allCodes) {
      if (code in cooked) continue;
      let f = formulas[code];
      const knownCodes = Object.keys(cooked).sort((a, b) => b.length - a.length);
      for (const refCode of knownCodes) {
        if (refCode === code) continue;
        if (f.indexOf(refCode) === -1) continue;
        f = f.split(refCode).join(String(cooked[refCode]));
      }
      f = f.replace(/\bC_[A-Za-z0-9_]*/g, "0");
      const val = evalFormula(f);
      cooked[code] = applyRound(val !== null ? val : 0, code);
    }

    const applyValue = (item: DetailItem): DetailItem => {
      if (item.status === 0) return item;
      const v = item.component_code ? cooked[item.component_code] : undefined;
      return { ...item, value: v !== undefined ? v : 0 };
    };

    setEarningList((prev) => prev.map(applyValue));
    setDeductionList((prev) => prev.map(applyValue));
    setSummaryList((prev) => prev.map(applyValue));
  };

  // ─── Save / Update ─────────────────────────────────────────────
  const collectDetails = (): {
    component_id: number;
    formula: string;
    type: string;
    status: number;
    default_value: number | null;
  }[] => {
    return [
      ...inputValues,
      ...earningList,
      ...deductionList,
      ...summaryList,
    ].map((d) => ({
      component_id: d.component_id,
      formula: d.formula,
      type: d.type,
      status: d.status,
      default_value: d.default_value,
    }));
  };

  const handleSave = async () => {
    if (!code) {
      setSnackbar({ open: true, message: "Code is required", severity: "error" });
      return;
    }
    if (!name) {
      setSnackbar({ open: true, message: "Name is required", severity: "error" });
      return;
    }
    if (wageType === "") {
      setSnackbar({ open: true, message: "Wage Type is required", severity: "error" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        co_id: selectedCompanyId ? parseInt(selectedCompanyId) : null,
        code,
        name,
        wage_type: wageType,
        description,
        details: collectDetails(),
      };

      let res;
      if (isEditMode) {
        res = await fetchWithCookie(
          `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_UPDATE}/${editId}`,
          "PUT",
          payload
        );
      } else {
        res = await fetchWithCookie(
          `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_CREATE}`,
          "POST",
          payload
        );
      }

      if (res.error) throw new Error(res.error);

      setSnackbar({
        open: true,
        message: isEditMode ? "Pay scheme updated" : "Pay scheme created",
        severity: "success",
      });
      setTimeout(() => router.push("/dashboardadmin/paySchemeCreation"), 800);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (status?: number, active?: number) => {
    const override: Record<string, unknown> = {};
    if (status !== undefined) override.record_status = status;
    if (active !== undefined) override.activeStatus = active;

    (async () => {
      setLoading(true);
      try {
        const payload = {
          co_id: selectedCompanyId ? parseInt(selectedCompanyId) : null,
          code,
          name,
          wage_type: wageType,
          description,
          record_status: status ?? recordStatus,
          details: collectDetails(),
        };

        const res = await fetchWithCookie(
          `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_UPDATE}/${editId}`,
          "PUT",
          payload
        );
        if (res.error) throw new Error(res.error);
        setSnackbar({ open: true, message: "Pay scheme updated", severity: "success" });
        setTimeout(() => router.push("/dashboardadmin/paySchemeCreation"), 800);
      } catch (err: unknown) {
        setSnackbar({
          open: true,
          message: err instanceof Error ? err.message : "Error",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  };

  const isLocked = recordStatus === 32;
  const isDeactivated = activeStatus === 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-2xl font-bold text-[#0C3C60]">
          {isEditMode ? "Edit Pay Scheme" : "Create Pay Scheme"}
        </h1>

        {/* ─── Fill Details ─────────────────────────────────────── */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#0C3C60]">Fill Details</h2>
          <Grid container spacing={3}>
            {/* Company */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                size="small"
                options={companies}
                getOptionLabel={(o) => o.co_name}
                value={companies.find((c) => c.co_id.toString() === selectedCompanyId) ?? null}
                onChange={(_, v) => setSelectedCompanyId(v ? v.co_id.toString() : "")}
                disabled={isEditMode}
                isOptionEqualToValue={(o, v) => o.co_id === v.co_id}
                renderInput={(params) => (
                  <TextField {...params} label="Company" required />
                )}
              />
            </Grid>

            {/* Code */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Code"
                required
                size="small"
                fullWidth
                value={code}
                onChange={(e) => {
                  const v = e.target.value;
                  setCode(v);
                  if (!isEditMode) setName(v);
                }}
                disabled={isLocked || isDeactivated}
              />
            </Grid>

            {/* Name */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Name"
                required
                size="small"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLocked || isDeactivated}
              />
            </Grid>

            {/* Wage Type */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Wage Type</InputLabel>
                <Select
                  value={wageType}
                  label="Wage Type"
                  onChange={(e: SelectChangeEvent) => setWageType(e.target.value)}
                  disabled={isLocked || isDeactivated}
                >
                  {wageTypes.map((wt) => (
                    <MenuItem key={wt.id} value={String(wt.id)}>
                      {wt.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Description"
                size="small"
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLocked || isDeactivated}
              />
            </Grid>

            {/* Clone from existing (only in create mode) */}
            {!isEditMode && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Autocomplete
                  size="small"
                  options={schemeDropdown}
                  getOptionLabel={(o) => o.payscheme_name}
                  value={
                    schemeDropdown.find((s) => s.payscheme_id === cloneSchemeId) ||
                    null
                  }
                  onChange={(_, v) => handleClone(v ? v.payscheme_id : null)}
                  renderInput={(params) => (
                    <TextField {...params} label="Copy From Pay Scheme" />
                  )}
                />
              </Grid>
            )}
          </Grid>
        </div>

        {/* ─── Input Values (always visible) ───────────────────── */}
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-[#0C3C60]">Input Values</h2>
          <div className="min-h-12 rounded border border-gray-200 bg-white p-4">
            {inputValues.filter((iv) => iv.status !== 0).length > 0 ? (
              <Grid container spacing={2}>
                {inputValues
                  .filter((iv) => iv.status !== 0)
                  .map((item, idx) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                      <div className="flex items-center gap-1">
                        <TextField
                          label={item.component_name}
                          size="small"
                          fullWidth
                          value={item.formula}
                          onChange={(e) =>
                            handleInputValueChange(item.component_id, e.target.value)
                          }
                          disabled={isLocked || isDeactivated}
                        />
                        {!isLocked && !isDeactivated && (
                          <Tooltip title="Remove">
                            <IconButton
                              size="small"
                              onClick={() => removeItem(setInputValues, item)}
                            >
                              <X size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </div>
                    </Grid>
                  ))}
              </Grid>
            ) : (
              <span className="text-sm text-gray-400">No input values added</span>
            )}
          </div>
        </div>

        {/* ─── Earnings & Deductions (side by side) ────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Earnings */}
          <div>
            <h2 className="mb-2 text-lg font-bold text-[#0C3C60]">Earnings</h2>
            <div className="overflow-hidden rounded border border-[#00b7c2]">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[48%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="bg-[#00b7c2] text-white">
                    <th className="px-3 py-2 text-left font-semibold">Component</th>
                    <th className="px-3 py-2 text-left font-semibold">Formula</th>
                    <th className="px-3 py-2 text-left font-semibold">Value</th>
                    <th className="px-3 py-2 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {earningList
                    .filter((e) => e.status !== 0)
                    .map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="px-3 py-2 wrap-break-word">{item.component_name}</td>
                        <td className="px-3 py-2 whitespace-pre-wrap break-all">{item.formula}</td>
                        <td className="px-3 py-2 wrap-break-word">{item.value !== undefined ? item.value : (item.default_value ?? "")}</td>
                        <td className="px-3 py-2">
                          {!isLocked && !isDeactivated && (
                            <IconButton
                              size="small"
                              onClick={() => removeItem(setEarningList, item)}
                            >
                              <X size={16} />
                            </IconButton>
                          )}
                        </td>
                      </tr>
                    ))}
                  {earningList.filter((e) => e.status !== 0).length === 0 && (
                    <tr>
                      <td colSpan={4} className="h-32" />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h2 className="mb-2 text-lg font-bold text-[#0C3C60]">Deductions</h2>
            <div className="overflow-hidden rounded border border-[#00b7c2]">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[48%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="bg-[#00b7c2] text-white">
                    <th className="px-3 py-2 text-left font-semibold">Component</th>
                    <th className="px-3 py-2 text-left font-semibold">Formula</th>
                    <th className="px-3 py-2 text-left font-semibold">Value</th>
                    <th className="px-3 py-2 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {deductionList
                    .filter((d) => d.status !== 0)
                    .map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="px-3 py-2 wrap-break-word">{item.component_name}</td>
                        <td className="px-3 py-2 whitespace-pre-wrap break-all">{item.formula}</td>
                        <td className="px-3 py-2 wrap-break-word">{item.value !== undefined ? item.value : (item.default_value ?? "")}</td>
                        <td className="px-3 py-2">
                          {!isLocked && !isDeactivated && (
                            <IconButton
                              size="small"
                              onClick={() => removeItem(setDeductionList, item)}
                            >
                              <X size={16} />
                            </IconButton>
                          )}
                        </td>
                      </tr>
                    ))}
                  {deductionList.filter((d) => d.status !== 0).length === 0 && (
                    <tr>
                      <td colSpan={4} className="h-32" />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── Summary (always visible) ──────────────────────── */}
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-bold text-[#0C3C60]">Summary</h2>
          <div className="min-h-12 rounded border border-gray-200 bg-white p-4">
            {summaryList.filter((s) => s.status !== 0).length > 0 ? (
              <Grid container spacing={2}>
                {summaryList
                  .filter((s) => s.status !== 0)
                  .map((item, idx) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                      <div className="flex items-center gap-1">
                        <TextField
                          label={item.component_name}
                          size="small"
                          fullWidth
                          value={item.value ?? ""}
                          InputProps={{ readOnly: true }}
                          disabled
                        />
                        {!isLocked && !isDeactivated && (
                          <Tooltip title="Remove">
                            <IconButton
                              size="small"
                              onClick={() => removeItem(setSummaryList, item)}
                            >
                              <X size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </div>
                      <Typography variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
                        Formula: {item.formula}
                      </Typography>
                    </Grid>
                  ))}
              </Grid>
            ) : (
              <span className="text-sm text-gray-400">No summary items added</span>
            )}
          </div>
        </div>

        {/* ─── Add Item (right-aligned) ──────────────────────── */}
        {!isLocked && !isDeactivated && (
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              className="rounded px-6 py-2 font-semibold text-white"
              style={{ backgroundColor: "#00b7c2" }}
              onClick={openAddItem}
            >
              Add Component
            </button>
          </div>
        )}

        {/* ─── Bottom Action Buttons (centered) ──────────────── */}
        <div className="flex items-center justify-center gap-4">
          {/* Save (create mode) */}
          {!isEditMode && (
            <button
              type="button"
              className="rounded px-6 py-2 font-semibold text-white"
              style={{ backgroundColor: "#a8c836" }}
              onClick={handleSave}
              disabled={loading}
            >
              Save
            </button>
          )}
          {/* Update (edit mode, not locked) */}
          {isEditMode && !isLocked && activeStatus !== 0 && (
            <button
              type="button"
              className="rounded px-6 py-2 font-semibold text-white"
              style={{ backgroundColor: "#a8c836" }}
              onClick={() => handleUpdate()}
              disabled={loading}
            >
              Update
            </button>
          )}
          {/* Check Calculation */}
          <button
            type="button"
            className="rounded px-6 py-2 font-semibold text-white"
            style={{ backgroundColor: "#00b7c2" }}
            onClick={handleCheckCalculation}
            disabled={loading}
          >
            Check Calculation
          </button>
          {/* Lock */}
          {isEditMode && !isLocked && (
            <button
              type="button"
              className="rounded px-6 py-2 font-semibold text-white"
              style={{ backgroundColor: "#00b7c2" }}
              onClick={() => handleUpdate(32)}
              disabled={loading}
            >
              Lock
            </button>
          )}
          {/* Deactivate */}
          {isEditMode && isLocked && activeStatus !== 0 && (
            <button
              type="button"
              className="rounded px-6 py-2 font-semibold text-white"
              style={{ backgroundColor: "#00b7c2" }}
              onClick={() => handleUpdate(32, 0)}
              disabled={loading}
            >
              Deactivate
            </button>
          )}
          {/* Cancel */}
          <button
            type="button"
            className="rounded border-2 border-red-500 bg-white px-6 py-2 font-semibold text-red-500 hover:bg-red-50"
            onClick={() => router.push("/dashboardadmin/paySchemeCreation")}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ─── Add Item Dialog ───────────────────────────────────── */}
      <Dialog open={addItemOpen} onClose={() => setAddItemOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Component</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Component */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                size="small"
                options={components}
                getOptionLabel={(o) => `${o.name} (${o.type_label}) (${o.code})`}
                value={selectedComponent}
                onChange={(_, v) => {
                  setSelectedComponent(v);
                  setFormula("");
                  setDefaultValueOverride(
                    v && v.type === 0 ? String(v.default_value ?? "") : ""
                  );
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Component" required />
                )}
              />
            </Grid>

            {/* Default value (type 0 only) */}
            {selectedComponent?.type === 0 && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Default Value"
                  size="small"
                  fullWidth
                  type="number"
                  value={defaultValueOverride}
                  onChange={(e) => setDefaultValueOverride(e.target.value)}
                />
              </Grid>
            )}

            {/* Formula builder (type != 0) */}
            {selectedComponent && selectedComponent.type !== 0 && (
              <>
                {/* Formula Component (append to formula) */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Autocomplete
                    size="small"
                    options={components}
                    getOptionLabel={(o) => `${o.name} (${o.type_label}) (${o.code})`}
                    onChange={(_, v) => {
                      if (v) appendToFormula(v.code);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Formula Component" />
                    )}
                    value={null}
                  />
                </Grid>

                {/* Operator */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Operator / Condition</InputLabel>
                    <Select
                      value=""
                      label="Operator / Condition"
                      onChange={(e: SelectChangeEvent) => {
                        appendToFormula(e.target.value);
                      }}
                    >
                      {OPERATORS.map((op) => (
                        <MenuItem key={op.label} value={op.value}>
                          {op.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Value */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <div className="flex gap-2">
                    <TextField
                      label="Value"
                      size="small"
                      fullWidth
                      value={formulaValue}
                      onChange={(e) => setFormulaValue(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleAddValue}>
                      ADD
                    </Button>
                  </div>
                </Grid>

                {/* Formula display */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <div className="flex gap-2 items-end">
                    <TextField
                      label="Formula"
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      value={formula}
                      onChange={(e) => setFormula(e.target.value)}
                    />
                    <Button variant="outline" onClick={undoFormula}>
                      Undo
                    </Button>
                  </div>
                </Grid>

                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Note:</strong> Select either Formula or Default Value
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="outline" onClick={() => setAddItemOpen(false)}>
            Cancel
          </Button>
          <Button
            className="btn-primary"
            onClick={handleAddFormula}
            disabled={!selectedComponent}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default function CreatePaySchemePage() {
  return (
    <Suspense fallback={null}>
      <CreatePaySchemePageContent />
    </Suspense>
  );
}
