import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
vi.mock("@/utils/apiClient2", () => ({
  fetchWithCookie: (...args: unknown[]) => fetchMock(...args),
}));

import {
  fetchPayslipPrintComponentList,
  fetchPaySchemeComponents,
  createPayslipPrintComponent,
  updatePayslipPrintComponent,
} from "@/utils/hrmsService";

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ data: { data: [] }, error: null });
});

describe("payslip print component service", () => {
  it("list builds co_id + filters into the query string", async () => {
    await fetchPayslipPrintComponentList("5", { page: 2, limit: 10, search: "hra", branch_id: "3", payscheme_id: 7 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("payslip_print_component_list");
    expect(url).toContain("co_id=5");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=10");
    expect(url).toContain("search=hra");
    expect(url).toContain("branch_id=3");
    expect(url).toContain("payscheme_id=7");
    expect(fetchMock.mock.calls[0][1]).toBe("GET");
  });

  it("scheme components passes co_id + payscheme_id", async () => {
    await fetchPaySchemeComponents("5", 7);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("pay_scheme_components");
    expect(url).toContain("co_id=5");
    expect(url).toContain("payscheme_id=7");
  });

  it("create POSTs to the create route with co_id and body", async () => {
    await createPayslipPrintComponent("5", { payscheme_id: 7 });
    expect(fetchMock.mock.calls[0][0]).toContain("payslip_print_component_create?co_id=5");
    expect(fetchMock.mock.calls[0][1]).toBe("POST");
    expect(fetchMock.mock.calls[0][2]).toEqual({ payscheme_id: 7 });
  });

  it("update PUTs to the update route with pay_id and co_id", async () => {
    await updatePayslipPrintComponent("5", 42, { is_active: 0 });
    expect(fetchMock.mock.calls[0][0]).toContain("payslip_print_component_update/42?co_id=5");
    expect(fetchMock.mock.calls[0][1]).toBe("PUT");
  });
});
