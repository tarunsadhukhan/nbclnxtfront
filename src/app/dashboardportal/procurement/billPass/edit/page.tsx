"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import { ArrowLeft, Save, CheckCircle, Printer } from "lucide-react";

import {
  fetchBillPassById,
  updateBillPass,
  formatCurrency,
  formatBillPassDate,
  buildDrcrLinesByInwardDtl,
  type BillPassDetail,
  type BillPassSRLine,
  type BillPassDRCRLine,
} from "@/utils/billPassService";
import AdditionalChargesTable from "@/components/billPass/AdditionalChargesTable";
import { openStyledPrintWindow } from "@/utils/printUtils";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import useCompanyHeader from "@/hooks/useCompanyHeader";
import {
  renderBillPassPreviewHtml,
  BILL_PASS_PRINT_CSS,
  splitItemNameMake,
} from "./components/BillPassPreview";
import AttachmentUploader from "@/components/AttachmentUploader";

/**
 * @component BillPassEditPage
 * @description Edit page for Procurement Bill Pass.
 * Shows SR line items with inline DR/CR adjustments per line.
 * Editable invoice fields until bill pass is marked complete (billpass_status = 1).
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateInput = (value?: string | null): string => {
  if (!value) return "";
  const match = value.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return "";
};

const formatAmount = (value?: number | null): string => {
  if (value == null) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// ─── Types ────────────────────────────────────────────────────────────────────

type DrcrLineWithNote = BillPassDRCRLine & { note_type: number; note_type_name: string };

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Read-only info field */
function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "baseline" }}>
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
        {label}:
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value || "-"}
      </Typography>
    </Box>
  );
}

/** Inline DR/CR adjustment rows beneath an SR line item */
function DrcrInlineRows({ lines }: { lines: DrcrLineWithNote[] }) {
  if (lines.length === 0) return null;

  return (
    <>
      {lines.map((line) => {
        const isDebit = line.note_type === 1;
        return (
          <Box
            key={line.drcr_note_dtl_id}
            component="tr"
            sx={{
              bgcolor: isDebit ? "error.50" : "success.50",
              borderLeft: `3px solid`,
              borderLeftColor: isDebit ? "error.main" : "success.main",
            }}
          >
            {/* Item — indented with type label */}
            <Box component="td" colSpan={6} sx={{ p: 0.75, pl: 4, fontSize: "0.7rem" }}>
              <Chip
                label={isDebit ? "DEBIT" : "CREDIT"}
                size="small"
                color={isDebit ? "error" : "success"}
                variant="outlined"
                sx={{ fontSize: "0.6rem", height: 18, mr: 1 }}
              />
              <Typography component="span" variant="caption" color="text.secondary">
                {line.adjustment_reason}
              </Typography>
            </Box>
            {/* Qty */}
            <Box component="td" sx={{ p: 0.75, fontSize: "0.7rem", textAlign: "right" }}>
              {formatAmount(line.quantity)}
            </Box>
            {/* Rate */}
            <Box component="td" sx={{ p: 0.75, fontSize: "0.7rem", textAlign: "right" }}>
              {formatAmount(line.rate)}
            </Box>
            {/* Amount */}
            <Box
              component="td"
              colSpan={2}
              sx={{
                p: 0.75,
                fontSize: "0.7rem",
                textAlign: "right",
                fontWeight: 600,
                color: isDebit ? "error.main" : "success.main",
              }}
            >
              {isDebit ? "-" : "+"}{formatAmount(line.line_amount)}
            </Box>
          </Box>
        );
      })}
    </>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function BillPassEditPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inwardIdParam = searchParams.get("id");
  const { selectedCompany } = useSidebarContext();

  // State
  const [detail, setDetail] = React.useState<BillPassDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Form state for editable fields
  const [formData, setFormData] = React.useState({
    invoice_no: "",
    invoice_date: "",
    invoice_amount: "",
    invoice_recvd_date: "",
    invoice_due_date: "",
    round_off_value: "0",
    sr_remarks: "",
  });

  const isComplete = detail?.billpass_status === 1;

  // ─── Load Data ────────────────────────────────────────────────────────────

  const loadData = React.useCallback(async () => {
    if (!inwardIdParam) return;

    setLoading(true);
    setPageError(null);

    try {
      const { data, error } = await fetchBillPassById(inwardIdParam);
      if (error) throw new Error(error);
      if (!data) throw new Error("Bill pass not found");

      setDetail(data);

      // Initialize form with existing data. Invoice amount auto-suggests net_payable
      // (SR - DR + CR + additional charges) when not yet entered, so the user sees
      // the full amount including additional charges on first open.
      const suggestedAmount = data.summary?.net_payable ?? 0;
      setFormData({
        invoice_no: data.invoice_no ?? "",
        invoice_date: toDateInput(data.invoice_date),
        invoice_amount: data.invoice_amount
          ? String(data.invoice_amount)
          : suggestedAmount > 0
            ? suggestedAmount.toFixed(2)
            : "",
        invoice_recvd_date: toDateInput(data.invoice_recvd_date),
        invoice_due_date: toDateInput(data.invoice_due_date),
        round_off_value: data.round_off_value ? String(data.round_off_value) : "0",
        sr_remarks: data.sr_remarks ?? "",
      });
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to load bill pass data");
    } finally {
      setLoading(false);
    }
  }, [inwardIdParam]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  // ─── Form Handlers ────────────────────────────────────────────────────────

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!detail) return;

    setSaving(true);
    try {
      const { error } = await updateBillPass(detail.inward_id, {
        invoice_no: formData.invoice_no || null,
        invoice_date: formData.invoice_date || null,
        invoice_amount: formData.invoice_amount ? parseFloat(formData.invoice_amount) : null,
        invoice_recvd_date: formData.invoice_recvd_date || null,
        invoice_due_date: formData.invoice_due_date || null,
        round_off_value: formData.round_off_value ? parseFloat(formData.round_off_value) : null,
        sr_remarks: formData.sr_remarks || null,
      });

      if (error) {
        setSnackbar({ open: true, message: error, severity: "error" });
        return;
      }

      setSnackbar({ open: true, message: "Bill pass saved successfully", severity: "success" });
      await loadData();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to save",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!detail) return;

    // Validate required fields
    if (!formData.invoice_date || !formData.invoice_amount) {
      setSnackbar({
        open: true,
        message: "Please fill Invoice Date and Invoice Amount before completing",
        severity: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await updateBillPass(detail.inward_id, {
        invoice_no: formData.invoice_no || null,
        invoice_date: formData.invoice_date,
        invoice_amount: parseFloat(formData.invoice_amount),
        invoice_recvd_date: formData.invoice_recvd_date || null,
        invoice_due_date: formData.invoice_due_date || null,
        round_off_value: formData.round_off_value ? parseFloat(formData.round_off_value) : null,
        sr_remarks: formData.sr_remarks || null,
        bill_pass_complete: 1,
      });

      if (error) {
        setSnackbar({ open: true, message: error, severity: "error" });
        return;
      }

      setSnackbar({ open: true, message: "Bill pass completed successfully", severity: "success" });
      setTimeout(() => {
        router.push("/dashboardportal/procurement/billPass");
      }, 1000);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to complete bill pass",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Derived Data ─────────────────────────────────────────────────────────

  // Build DR/CR lines grouped by inward_dtl_id for inline display
  const drcrByLine = React.useMemo(() => {
    if (!detail) return new Map<number, DrcrLineWithNote[]>();
    return buildDrcrLinesByInwardDtl(detail.debit_notes, detail.credit_notes);
  }, [detail]);

  // Calculate net payable with round-off. Mirrors backend formula:
  // sr_total - dr_total + cr_total + additional_total + round_off.
  const netPayable = React.useMemo(() => {
    if (!detail) return 0;
    const s = detail.summary;
    const roundOff = parseFloat(formData.round_off_value) || 0;
    return (
      (s.sr_total ?? 0) -
      (s.dr_total ?? 0) +
      (s.cr_total ?? 0) +
      (s.additional_total ?? 0) +
      roundOff
    );
  }, [detail, formData.round_off_value]);

  const companyHeader = useCompanyHeader(selectedCompany?.co_id, detail?.branch_id ?? undefined);

  const handlePrintPreview = () => {
    if (!detail) return;
    const html = renderBillPassPreviewHtml({
      detail,
      formData,
      netPayable,
      companyName: selectedCompany?.co_name ?? null,
      companyAddress: companyHeader.address || null,
      companyGst: companyHeader.gstNo || null,
      companyCin: companyHeader.cinNo || null,
    });
    const title = `Bill Pass ${detail.bill_pass_no || "Draft"}`;
    const printWindow = openStyledPrintWindow(html, title, BILL_PASS_PRINT_CSS);
    if (!printWindow) return;
    printWindow.focus();
    // Defer print so the window's stylesheets (Google Fonts etc.) load first
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  // ─── Render States ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (pageError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {pageError}
      </Alert>
    );
  }

  if (!detail) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Bill pass not found
      </Alert>
    );
  }

  const { summary } = detail;

  return (
    <Box sx={{ p: 2 }}>
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowLeft size={16} />}
            onClick={() => router.push("/dashboardportal/procurement/billPass")}
          >
            Back
          </Button>
          <Typography variant="h5" fontWeight={600}>
            Bill Pass {detail.bill_pass_no ? `- ${detail.bill_pass_no}` : ""}
          </Typography>
          <Chip
            label={isComplete ? "Complete" : "Pending"}
            size="small"
            color={isComplete ? "success" : "warning"}
            variant="outlined"
          />
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Printer size={16} />}
            onClick={handlePrintPreview}
          >
            Print Preview
          </Button>
          {!isComplete && (
            <>
              <Button
                variant="outlined"
                startIcon={<Save size={16} />}
                onClick={handleSave}
                disabled={saving}
              >
                Save
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle size={16} />}
                onClick={handleComplete}
                disabled={saving}
              >
                Complete Bill Pass
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* ── Header Info (read-only) ──────────────────────────────────────── */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="SR No." value={detail.bill_pass_no} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="SR Date" value={formatBillPassDate(detail.bill_pass_date)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Inward No." value={detail.inward_no} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Inward Date" value={formatBillPassDate(detail.inward_date)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Supplier" value={detail.supplier_name} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Branch" value={detail.branch_name} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Challan No." value={detail.challan_no} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Challan Date" value={formatBillPassDate(detail.challan_date)} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── SR Line Items + Inline DR/CR ─────────────────────────────────── */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            SR Line Items
          </Typography>
          <Typography variant="caption" color="text.secondary" mb={2} display="block">
            {summary.sr_line_count} item(s) &mdash;
            {summary.dr_count > 0 && ` ${summary.dr_count} debit note(s)`}
            {summary.cr_count > 0 && ` ${summary.cr_count} credit note(s)`}
            {summary.dr_count === 0 && summary.cr_count === 0 && " No DR/CR adjustments"}
          </Typography>

          <Box sx={{ overflowX: "auto" }}>
            <Paper variant="outlined">
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                {/* Header */}
                <Box component="thead" sx={{ bgcolor: "primary.main" }}>
                  <Box component="tr">
                    {["PO No.", "Item Code", "Item", "HSN", "Make", "UOM", "Qty", "PO Rate", "Accepted Rate", "Amount", "Tax", "Total"].map(
                      (h) => (
                        <Box
                          key={h}
                          component="th"
                          sx={{
                            p: 1,
                            color: "white",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textAlign: ["PO No.", "Item Code", "Item", "HSN", "Make", "UOM"].includes(h) ? "left" : "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </Box>
                      )
                    )}
                  </Box>
                </Box>

                {/* Body: SR lines with inline DR/CR */}
                <Box component="tbody">
                  {detail.sr_lines.map((line, idx) => {
                    const adjustments = drcrByLine.get(line.inward_dtl_id) ?? [];
                    const drTotal = adjustments
                      .filter((a) => a.note_type === 1)
                      .reduce((s, a) => s + a.line_amount, 0);
                    const crTotal = adjustments
                      .filter((a) => a.note_type === 2)
                      .reduce((s, a) => s + a.line_amount, 0);
                    const lineNet = line.line_total - drTotal + crTotal;
                    const hasAdjustments = adjustments.length > 0;

                    return (
                      <React.Fragment key={line.inward_dtl_id}>
                        {/* SR Line Row */}
                        <Box
                          component="tr"
                          sx={{
                            bgcolor: idx % 2 === 0 ? "grey.50" : "white",
                            borderBottom: hasAdjustments ? "none" : undefined,
                          }}
                        >
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                            <Typography variant="caption" color="text.secondary">
                              {line.po_no || "-"}
                            </Typography>
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                            <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                              {line.full_item_code || line.item_code || "-"}
                            </Typography>
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                            {(() => {
                              const { name, make } = splitItemNameMake(line.item_name);
                              return (
                                <>
                                  <Typography variant="caption" fontWeight={600} display="block">
                                    {name}
                                  </Typography>
                                  {make && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      fontStyle="italic"
                                      display="block"
                                      sx={{ fontSize: "0.65rem" }}
                                    >
                                      {make}
                                    </Typography>
                                  )}
                                </>
                              );
                            })()}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                            {line.hsn_code || "-"}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                            {line.accepted_make_name || "-"}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                            {line.uom_name}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                            {formatAmount(line.approved_qty)}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                            {formatAmount(line.po_rate)}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                            {formatAmount(line.accepted_rate)}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                            {formatAmount(line.line_amount)}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                            {formatAmount(line.tax_amount)}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right", fontWeight: 600 }}>
                            {formatAmount(line.line_total)}
                          </Box>
                        </Box>

                        {/* Inline DR/CR adjustment rows */}
                        <DrcrInlineRows lines={adjustments} />

                        {/* Per-line net if there are adjustments */}
                        {hasAdjustments && (
                          <Box
                            component="tr"
                            sx={{
                              bgcolor: "grey.100",
                              borderBottom: "2px solid",
                              borderBottomColor: "divider",
                            }}
                          >
                            <Box
                              component="td"
                              colSpan={11}
                              sx={{ p: 0.75, pl: 4, fontSize: "0.7rem", textAlign: "right", fontWeight: 600 }}
                            >
                              Line Net Payable:
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                p: 0.75,
                                fontSize: "0.75rem",
                                textAlign: "right",
                                fontWeight: 700,
                                color: "primary.main",
                              }}
                            >
                              {formatAmount(lineNet)}
                            </Box>
                          </Box>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Box>
              </Box>
            </Paper>
          </Box>
        </CardContent>
      </Card>

      {/* ── Additional Charges (read-only, inherited from SR) ────────────── */}
      {(detail.additional_charges?.length ?? 0) > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              Additional Charges
            </Typography>
            <Typography variant="caption" color="text.secondary" mb={2} display="block">
              {summary.additional_count} charge(s) captured at SR stage &mdash; read-only here
            </Typography>
            <AdditionalChargesTable lines={detail.additional_charges} />
          </CardContent>
        </Card>
      )}

      {/* ── Invoice Details + Summary ────────────────────────────────────── */}
      <Grid container spacing={2}>
        {/* Left: Editable Invoice Details */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Invoice Details
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Invoice No."
                    value={formData.invoice_no}
                    onChange={(e) => handleFieldChange("invoice_no", e.target.value)}
                    fullWidth
                    size="small"
                    disabled={isComplete}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Invoice Date *"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => handleFieldChange("invoice_date", e.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    disabled={isComplete}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Invoice Amount *"
                    type="number"
                    value={formData.invoice_amount}
                    onChange={(e) => handleFieldChange("invoice_amount", e.target.value)}
                    fullWidth
                    size="small"
                    disabled={isComplete}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Invoice Received Date"
                    type="date"
                    value={formData.invoice_recvd_date}
                    onChange={(e) => handleFieldChange("invoice_recvd_date", e.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    disabled={isComplete}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Payment Due Date"
                    type="date"
                    value={formData.invoice_due_date}
                    onChange={(e) => handleFieldChange("invoice_due_date", e.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    disabled={isComplete}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Round Off"
                    type="number"
                    value={formData.round_off_value}
                    onChange={(e) => handleFieldChange("round_off_value", e.target.value)}
                    fullWidth
                    size="small"
                    disabled={isComplete}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Remarks"
                    value={formData.sr_remarks}
                    onChange={(e) => handleFieldChange("sr_remarks", e.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    disabled={isComplete}
                  />
                </Grid>
                {detail.inward_id && selectedCompany?.co_id && (
                  <>
                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          DOCUMENTS
                        </Typography>
                      </Divider>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <AttachmentUploader
                        module="proc_billpass"
                        entityId={detail.inward_id}
                        fileType="invoice"
                        coId={Number(selectedCompany.co_id)}
                        disabled={isComplete}
                        label="Invoice"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <AttachmentUploader
                        module="proc_billpass"
                        entityId={detail.inward_id}
                        fileType="ewaybill"
                        coId={Number(selectedCompany.co_id)}
                        disabled={isComplete}
                        label="E-Waybill / Delivery Note"
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Financial Summary (read-only calculated) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Payment Summary
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <SummaryRow label="SR Taxable" value={summary.sr_taxable} />
                {summary.sr_cgst > 0 && <SummaryRow label="CGST" value={summary.sr_cgst} indent />}
                {summary.sr_sgst > 0 && <SummaryRow label="SGST" value={summary.sr_sgst} indent />}
                {summary.sr_igst > 0 && <SummaryRow label="IGST" value={summary.sr_igst} indent />}
                <Divider />
                <SummaryRow label="SR Total" value={summary.sr_total} bold />
                {summary.dr_count > 0 && (
                  <SummaryRow
                    label={`Less: Debit Notes (${summary.dr_count})`}
                    value={summary.dr_total}
                    color="error.main"
                    prefix="-"
                  />
                )}
                {summary.cr_count > 0 && (
                  <SummaryRow
                    label={`Add: Credit Notes (${summary.cr_count})`}
                    value={summary.cr_total}
                    color="success.main"
                    prefix="+"
                  />
                )}
                {summary.additional_count > 0 && (
                  <>
                    <SummaryRow
                      label={`Add: Additional Charges (${summary.additional_count})`}
                      value={summary.additional_net}
                      prefix="+"
                    />
                    {summary.additional_cgst > 0 && (
                      <SummaryRow label="Add. CGST" value={summary.additional_cgst} indent />
                    )}
                    {summary.additional_sgst > 0 && (
                      <SummaryRow label="Add. SGST" value={summary.additional_sgst} indent />
                    )}
                    {summary.additional_igst > 0 && (
                      <SummaryRow label="Add. IGST" value={summary.additional_igst} indent />
                    )}
                    <SummaryRow label="Additional Total" value={summary.additional_total} bold />
                  </>
                )}
                {parseFloat(formData.round_off_value) !== 0 && (
                  <SummaryRow label="Round Off" value={parseFloat(formData.round_off_value) || 0} />
                )}
                <Divider sx={{ borderWidth: 2 }} />
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ py: 1, px: 0.5 }}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    NET PAYABLE
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color="primary.main"
                    sx={{ fontFamily: "monospace" }}
                  >
                    {formatCurrency(netPayable)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Snackbar ─────────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ─── Summary Row helper ───────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  bold,
  indent,
  color,
  prefix,
}: {
  label: string;
  value: number;
  bold?: boolean;
  indent?: boolean;
  color?: string;
  prefix?: string;
}) {
  return (
    <Box display="flex" justifyContent="space-between" sx={{ px: 0.5, pl: indent ? 3 : 0.5 }}>
      <Typography variant="body2" fontWeight={bold ? 600 : 400} color={color || "text.primary"}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={bold ? 600 : 400}
        color={color || "text.primary"}
        sx={{ fontFamily: "monospace" }}
      >
        {prefix ? `${prefix} ` : ""}{formatAmount(value)}
      </Typography>
    </Box>
  );
}

// ─── Export with Suspense wrapper ─────────────────────────────────────────────

export default function BillPassEditPage() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      }
    >
      <BillPassEditPageContent />
    </Suspense>
  );
}
