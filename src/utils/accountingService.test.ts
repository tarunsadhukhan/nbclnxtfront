import { describe, expect, it, vi } from "vitest";

vi.mock("./apiClient2", () => ({ fetchWithCookie: vi.fn() }));

import { fetchWithCookie } from "./apiClient2";
import { createVoucher } from "./accountingService";

/**
 * Regression: POST /api/accounting/vouchers answers with the standard
 * {"data": {...}} envelope and names the id `voucher_id`, so reading
 * `response.voucher_no` / `response.acc_voucher_id` straight off the body
 * silently yielded undefined (no voucher number in the toast, redirect to the
 * list instead of the new voucher).
 */
describe("createVoucher", () => {
  it("unwraps the {data:{voucher_id, voucher_no}} envelope", async () => {
    vi.mocked(fetchWithCookie).mockResolvedValue({
      data: { data: { voucher_id: 42, voucher_no: "JV/26-27/0001", status_id: 21 } },
      error: null,
      status: 200,
    });

    const result = await createVoucher({
      co_id: 1,
      voucher_date: "2026-07-27",
      type_category: "JOURNAL",
      lines: [{ acc_ledger_id: 7, debit_amount: 100, credit_amount: 0 }],
    });

    expect(result.acc_voucher_id).toBe(42);
    expect(result.voucher_no).toBe("JV/26-27/0001");
  });

  it("throws the backend error instead of returning a bogus success", async () => {
    vi.mocked(fetchWithCookie).mockResolvedValue({
      data: null,
      error: "Debit and credit totals must match.",
      status: 400,
    });

    await expect(
      createVoucher({ co_id: 1, voucher_date: "2026-07-27", lines: [] }),
    ).rejects.toThrow("Debit and credit totals must match.");
  });
});
