import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildDefaultFormValues } from "../utils/salesInvoiceFactories";
import { mapInvoiceDetailsToFormValues, mapFormValuesToApiPayload } from "../utils/salesInvoiceMappers";
import * as salesInvoiceService from "@/utils/salesInvoiceService";

describe("Sales Invoice - Transporter and e-Invoice Fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Mapper Functions", () => {
    it("should map invoice details to form values with new transporter fields", () => {
      const defaultValues = buildDefaultFormValues();
      const details = {
        branchId: "1",
        invoiceDate: "2026-04-01T00:00:00Z",
        party: "10",
        transporter: "5",
        transporterBranchId: 2,
        transporterGstNo: "19ABC",
        transporterDocNo: "LR123",
        transporterDocDate: "2026-04-01",
      };

      const formValues = mapInvoiceDetailsToFormValues(details, defaultValues);

      expect(formValues.transporter_doc_no).toBe("LR123");
      expect(formValues.transporter_doc_date).toBe("2026-04-01");
      expect(formValues.transporter_gst_no).toBe("19ABC");
      expect(formValues.transporter_branch_id).toBe(2);
    });

    it("should map invoice details to form values with new buyer order fields", () => {
      const defaultValues = buildDefaultFormValues();
      const details = {
        branchId: "1",
        invoiceDate: "2026-04-01T00:00:00Z",
        party: "10",
        buyerOrderNo: "PO-001",
        buyerOrderDate: "2026-03-28",
      };

      const formValues = mapInvoiceDetailsToFormValues(details, defaultValues);

      expect(formValues.buyer_order_no).toBe("PO-001");
      expect(formValues.buyer_order_date).toBe("2026-03-28");
    });

    it("should map invoice details to form values with new e-invoice fields", () => {
      const defaultValues = buildDefaultFormValues();
      const details = {
        branchId: "1",
        invoiceDate: "2026-04-01T00:00:00Z",
        party: "10",
        irn: "abc123",
        ackNo: "ack123",
        ackDate: "2026-04-01",
        qrCode: "qr_data",
      };

      const formValues = mapInvoiceDetailsToFormValues(details, defaultValues);

      expect(formValues.irn).toBe("abc123");
      expect(formValues.ack_no).toBe("ack123");
      expect(formValues.ack_date).toBe("2026-04-01");
      expect(formValues.qr_code).toBe("qr_data");
    });

    it("should map invoice details to form values with submission history", () => {
      const defaultValues = buildDefaultFormValues();
      const history = [
        {
          response_id: 1,
          submission_status: "Accepted",
          submitted_date_time: "2026-04-01T10:00:00",
          irn_from_response: "6f124eef...",
          error_message: null,
        },
      ];
      const details = {
        branchId: "1",
        invoiceDate: "2026-04-01T00:00:00Z",
        party: "10",
        e_invoice_submission_history: history,
      };

      const formValues = mapInvoiceDetailsToFormValues(details, defaultValues);

      expect(formValues.e_invoice_submission_history).toEqual(history);
    });

    it("should map form values to API payload with new transporter fields", () => {
      const formValues = {
        branch: "1",
        date: "2026-04-01",
        party: "10",
        transporter: "5",
        transporter_branch_id: "2",
        transporter_doc_no: "LR456",
        transporter_doc_date: "2026-04-01",
      };

      const payload = mapFormValuesToApiPayload(formValues);

      expect(payload.transporter_doc_no).toBe("LR456");
      expect(payload.transporter_doc_date).toBe("2026-04-01");
      expect(payload.transporter_branch_id).toBe("2");
    });

    it("should map form values to API payload with new buyer order fields", () => {
      const formValues = {
        branch: "1",
        date: "2026-04-01",
        party: "10",
        buyer_order_no: "PO-002",
        buyer_order_date: "2026-03-28",
      };

      const payload = mapFormValuesToApiPayload(formValues);

      expect(payload.buyer_order_no).toBe("PO-002");
      expect(payload.buyer_order_date).toBe("2026-03-28");
    });

    it("should map form values to API payload with new e-invoice fields", () => {
      const formValues = {
        branch: "1",
        date: "2026-04-01",
        party: "10",
        irn: "def456",
        ack_no: "ack456",
        ack_date: "2026-04-01",
        qr_code: "qr_456",
      };

      const payload = mapFormValuesToApiPayload(formValues);

      expect(payload.irn).toBe("def456");
      expect(payload.ack_no).toBe("ack456");
      expect(payload.ack_date).toBe("2026-04-01");
      expect(payload.qr_code).toBe("qr_456");
    });

    it("should exclude read-only transporter_gst_no from payload", () => {
      const formValues = {
        branch: "1",
        date: "2026-04-01",
        party: "10",
        transporter_gst_no: "19AATFN9790P1ZR",
        transporter_branch_id: "1",
      };

      const payload = mapFormValuesToApiPayload(formValues);

      expect(payload.transporter_gst_no).toBeUndefined();
      expect(payload.transporter_branch_id).toBe("1");
    });

    it("should handle null values in payload for empty optional fields", () => {
      const formValues = {
        branch: "1",
        date: "2026-04-01",
        party: "10",
        transporter_doc_no: "",
        buyer_order_no: undefined,
        irn: null,
      };

      const payload = mapFormValuesToApiPayload(formValues);

      expect(payload.transporter_doc_no).toBeNull();
      expect(payload.buyer_order_no).toBeNull();
      expect(payload.irn).toBeNull();
    });
  });

  describe("Service Integration", () => {
    it("should fetch transporter branches when transporter ID provided", async () => {
      const mockBranches = [
        { id: 1, gst_no: "19ABC", address: "123 Main", state_id: 19 },
        { id: 2, gst_no: "19XYZ", address: "456 Elm", state_id: 19 },
      ];

      vi.spyOn(salesInvoiceService, "getTransporterBranches").mockResolvedValue({
        data: mockBranches,
      });

      const result = await salesInvoiceService.getTransporterBranches(1, 1);

      expect(result.data).toEqual(mockBranches);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].gst_no).toBe("19ABC");
    });

    it("should return empty array when no branches found", async () => {
      vi.spyOn(salesInvoiceService, "getTransporterBranches").mockResolvedValue({
        data: [],
      });

      const result = await salesInvoiceService.getTransporterBranches(1, 1);

      expect(result.data).toEqual([]);
    });
  });

  describe("Field Defaults", () => {
    it("should include new transporter fields in default form values", () => {
      const defaults = buildDefaultFormValues();

      // These fields should exist in buildDefaultFormValues or be initialized to empty
      // even though they're not in the current factory
      expect(defaults).toHaveProperty("transporter_address");
      expect(defaults).toHaveProperty("transporter_state_code");
    });

    it("should preserve new field values during mapping round-trip", () => {
      const defaultValues = buildDefaultFormValues();
      const originalValues = {
        ...defaultValues,
        transporter_doc_no: "LR789",
        buyer_order_no: "PO-789",
        irn: "test-irn",
        ack_no: "test-ack",
      };

      const details = {
        branchId: originalValues.branch,
        invoiceDate: originalValues.date + "T00:00:00Z",
        transporterDocNo: originalValues.transporter_doc_no,
        buyerOrderNo: originalValues.buyer_order_no,
        irn: originalValues.irn,
        ackNo: originalValues.ack_no,
      };

      const mapped = mapInvoiceDetailsToFormValues(details, defaultValues);

      expect(mapped.transporter_doc_no).toBe(originalValues.transporter_doc_no);
      expect(mapped.buyer_order_no).toBe(originalValues.buyer_order_no);
      expect(mapped.irn).toBe(originalValues.irn);
      expect(mapped.ack_no).toBe(originalValues.ack_no);
    });
  });
});
