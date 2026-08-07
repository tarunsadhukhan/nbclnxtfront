"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { tokens } from "@/styles/tokens";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
  fetchEmployeeSalary,
  fetchEmployeeSalarySchemes,
  saveEmployeeSalary,
} from "@/utils/hrmsService";
import type { Option } from "../../types/employeeTypes";

// ─── Types ─────────────────────────────────────────────────────────
//
// Mirrors the shape used by dashboardadmin/paySchemeCreation/create/page.tsx
// so the same client-side check-calculation algorithm can be reused.

interface DetailItem {
  component_id: number;
  component_name: string;
  component_code?: string;
  formula: string;
  type: number;
  default_value: number | null;
  roundof?: number | null;
  roundof_type?: number | null;
  value?: number;
}

interface RawDetail {
  component_id: number;
  component_name: string;
  component_code?: string | null;
  type: number | string;
  formula?: string | null;
  default_value?: number | null;
  roundof?: number | null;
  roundof_type?: number | null;
  amount?: number;
}

interface SalaryStructureStepProps {
  ebId: number | null;
  branchId: string;
  disabled: boolean;
  saving: boolean;
  onSaveSuccess?: () => void;
}

const EMPTY_OPTIONS: Option[] = [];

export default function SalaryStructureStep({
  ebId,
  branchId,
  disabled,
  saving,
  onSaveSuccess,
}: SalaryStructureStepProps) {
  const { coId } = useSelectedCompanyCoId();

  const [schemeOptions, setSchemeOptions] = useState<Option[]>(EMPTY_OPTIONS);
  const [paySchemeId, setPaySchemeId] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [empPaySchemeMapId, setEmpPaySchemeMapId] = useState<number | null>(null);

  // Component rows split by type — same buckets the create-payscheme page uses
  const [inputValues, setInputValues] = useState<DetailItem[]>([]);
  const [earningList, setEarningList] = useState<DetailItem[]>([]);
  const [deductionList, setDeductionList] = useState<DetailItem[]>([]);
  const [summaryList, setSummaryList] = useState<DetailItem[]>([]);
  const [showResults, setShowResults] = useState(false);

  const [loadingScheme, setLoadingScheme] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ─── Scheme dropdown ───────────────────────────────────────────────
  useEffect(() => {
    if (!coId) return;
    fetchEmployeeSalarySchemes(coId).then(({ data }) => {
      if (data?.data) setSchemeOptions(data.data as Option[]);
    });
  }, [coId]);

  // Take a flat detail list and route each row into its type bucket.
  // For inputs (type 0), formula starts as the saved amount (if any) or
  // the default_value — so the user sees a number ready to edit.
  const distributeDetails = useCallback((rows: RawDetail[]) => {
    const inputs: DetailItem[] = [];
    const earnings: DetailItem[] = [];
    const deductions: DetailItem[] = [];
    const summary: DetailItem[] = [];

    for (const r of rows) {
      const type = Number(r.type);
      const item: DetailItem = {
        component_id: r.component_id,
        component_name: r.component_name || "",
        component_code: r.component_code ?? undefined,
        formula:
          type === 0
            ? String(r.amount ?? r.default_value ?? 0)
            : r.formula ?? String(r.default_value ?? 0),
        type,
        default_value: r.default_value ?? null,
        roundof: r.roundof ?? null,
        roundof_type: r.roundof_type ?? null,
      };
      switch (type) {
        case 0: inputs.push(item); break;
        case 1: earnings.push(item); break;
        case 2: deductions.push(item); break;
        case 3: summary.push(item); break;
      }
    }

    setInputValues(inputs);
    setEarningList(earnings);
    setDeductionList(deductions);
    setSummaryList(summary);
    setShowResults(false);
  }, []);

  // ─── Load existing salary for this employee ───────────────────────
  useEffect(() => {
    if (!coId || !ebId || !branchId) return;
    fetchEmployeeSalary(coId, ebId, branchId).then(({ data }) => {
      if (!data?.data) return;
      const sal = data.data;
      setPaySchemeId(String(sal.pay_scheme_id));
      setEmpPaySchemeMapId(sal.id ?? null);
      if (sal.effective_from) setEffectiveDate(sal.effective_from.slice(0, 10));
      distributeDetails((sal.components ?? []) as RawDetail[]);
    });
  }, [coId, ebId, branchId, distributeDetails]);

  // ─── On pay-scheme change: pull the scheme structure ──────────────
  const handlePaySchemeChange = useCallback(
    async (newId: string) => {
      if (!newId) return;
      setPaySchemeId(newId);
      setLoadingScheme(true);
      try {
        const { data, error: err } = (await fetchWithCookie(
          `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_BY_ID}/${newId}`,
          "GET",
        )) as {
          data?: { data: { details: RawDetail[] } };
          error?: string;
        };
        if (err || !data?.data) return;
        distributeDetails(data.data.details ?? []);
      } finally {
        setLoadingScheme(false);
      }
    },
    [distributeDetails],
  );

  // ─── Input value edit ─────────────────────────────────────────────
  const handleInputChange = useCallback((componentId: number, raw: string) => {
    setInputValues((prev) =>
      prev.map((c) =>
        c.component_id === componentId ? { ...c, formula: raw } : c,
      ),
    );
    setShowResults(false);
  }, []);

  // ─── Check Calculation (client-side, same algorithm as create page) ─
  //
  // - Inputs supply literal values keyed by component_code.
  // - Each unresolved formula has known component_codes substituted with
  //   their numeric values, then is evaluated via JS `new Function()`.
  // - Repeat until everything resolves or no further progress is made
  //   (handles forward references like Basic -> C_1_GROSS_ -> Gross1).
  // - Leftover unknown C_xxx references degrade to 0 in a final pass,
  //   matching the legacy backend behavior.
  // - Result rounded per the component's ROUNDOF / ROUNDOF_TYPE:
  //   type 1 = nearest, type 2 = down (truncate), type 3 = up (ceiling).
  const handleCheckCalculation = useCallback(() => {
    const cooked: Record<string, number> = {};
    const formulas: Record<string, string> = {};
    const rounding: Record<string, { digits: number; type: number }> = {};

    for (const iv of inputValues) {
      if (!iv.component_code) continue;
      const n = parseFloat(iv.formula);
      cooked[iv.component_code] = isNaN(n) ? 0 : n;
    }

    const collectFormula = (item: DetailItem) => {
      if (!item.component_code) return;
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
      try {
        // eslint-disable-next-line no-new-func
        const r = new Function(`return (${f});`)();
        if (typeof r === "number" && isFinite(r)) return r;
      } catch { /* fall through to statement form */ }
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
        const direct = parseFloat(f);
        if (!isNaN(direct) && /^-?\d+(\.\d+)?$/.test(f.trim())) {
          cooked[code] = applyRound(direct, code);
          progress = true;
          continue;
        }

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
      if (!progress) break;
    }

    // Final pass: dangling C_xxx references → 0
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
      const v = item.component_code ? cooked[item.component_code] : undefined;
      return { ...item, value: v !== undefined ? v : 0 };
    };

    setEarningList((prev) => prev.map(applyValue));
    setDeductionList((prev) => prev.map(applyValue));
    setSummaryList((prev) => prev.map(applyValue));
    setShowResults(true);
  }, [inputValues, earningList, deductionList, summaryList]);

  // ─── Save ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!coId || !ebId || !paySchemeId) {
      setError("Select a pay scheme before saving.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        eb_id: ebId,
        pay_scheme_id: Number(paySchemeId),
        effective_date: effectiveDate || null,
        input_values: inputValues.map((c) => ({
          component_id: c.component_id,
          amount: parseFloat(c.formula) || 0,
        })),
      };
      const { error: err } = await saveEmployeeSalary(coId, payload);
      if (err) { setError(err); return; }
      setSuccessMsg("Salary structure saved successfully.");
      onSaveSuccess?.();
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [coId, ebId, paySchemeId, effectiveDate, inputValues, onSaveSuccess]);

  // ─── Derived ───────────────────────────────────────────────────────
  const selectedSchemeOption = useMemo(
    () => schemeOptions.find((o) => String(o.value) === paySchemeId) ?? null,
    [schemeOptions, paySchemeId],
  );

  const hasComponents =
    inputValues.length > 0 ||
    earningList.length > 0 ||
    deductionList.length > 0 ||
    summaryList.length > 0;

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <Box className="flex flex-col gap-6">
      {/* Header fields */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={500} mb={0.5} display="block">
            Pay Scheme Name *
          </Typography>
          <Autocomplete
            options={schemeOptions}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(o, v) => String(o.value) === String(v.value)}
            value={selectedSchemeOption}
            onChange={(_, opt) => opt && handlePaySchemeChange(String(opt.value))}
            disabled={disabled}
            size="small"
            renderInput={(params) => (
              <TextField {...params} size="small" placeholder="Select Pay Scheme" />
            )}
          />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={500} mb={0.5} display="block">
            Effective Date *
          </Typography>
          <TextField
            type="date"
            size="small"
            fullWidth
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Box>

      {loadingScheme && (
        <Box className="flex justify-center py-4">
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Input Values */}
      {hasComponents && (
        <>
          <Divider />
          <Typography variant="subtitle1" fontWeight={600}>Input Values</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2 }}>
            {inputValues.map((iv) => (
              <Box key={iv.component_id}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  {iv.component_name}
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  value={iv.formula}
                  onChange={(e) => handleInputChange(iv.component_id, e.target.value)}
                  disabled={disabled}
                />
              </Box>
            ))}
          </Box>

          {!disabled && (
            <Box>
              <Button
                variant="contained"
                onClick={handleCheckCalculation}
                disabled={!paySchemeId}
                sx={{ backgroundColor: tokens.brand.secondary, "&:hover": { backgroundColor: tokens.brand.primary } }}
              >
                Check Calculation
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Earnings & Deductions */}
      {showResults && (earningList.length > 0 || deductionList.length > 0) && (
        <>
          <Divider />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>Earnings</Typography>
              <Table size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
                <TableHead sx={{ backgroundColor: "grey.50" }}>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {earningList.map((e) => (
                    <TableRow key={e.component_id}>
                      <TableCell>{e.component_name}</TableCell>
                      <TableCell align="right">{(e.value ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>Deductions</Typography>
              <Table size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
                <TableHead sx={{ backgroundColor: "grey.50" }}>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deductionList.map((d) => (
                    <TableRow key={d.component_id}>
                      <TableCell>{d.component_name}</TableCell>
                      <TableCell align="right">{(d.value ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </>
      )}

      {/* Summary */}
      {showResults && summaryList.length > 0 && (
        <>
          <Divider />
          <Typography variant="subtitle1" fontWeight={600}>Summary</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2 }}>
            {summaryList.map((s) => (
              <Box key={s.component_id}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  {s.component_name}
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={(s.value ?? 0).toFixed(2)}
                  disabled
                />
              </Box>
            ))}
          </Box>
        </>
      )}

      {/* Messages */}
      {error && <Typography color="error" variant="body2">{error}</Typography>}
      {successMsg && <Typography color="success.main" variant="body2">{successMsg}</Typography>}

      {/* Save */}
      {!disabled && hasComponents && (
        <>
          <Divider />
          <Box className="flex justify-end">
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isSaving || saving || !paySchemeId || !ebId}
              sx={{ backgroundColor: tokens.brand.secondary, "&:hover": { backgroundColor: tokens.brand.primary } }}
            >
              {isSaving ? "Saving..." : empPaySchemeMapId ? "Update" : "Save"}
            </Button>
          </Box>
        </>
      )}

      {!ebId && (
        <Typography variant="body2" color="text.secondary" className="italic">
          Save the employee&apos;s Personal Information first before setting up the Salary Structure.
        </Typography>
      )}
    </Box>
  );
}
