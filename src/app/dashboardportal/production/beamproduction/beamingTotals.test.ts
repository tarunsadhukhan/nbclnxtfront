import { beamingTotals, fortnightEndFor, isFortnightEnd, periodLabel } from "./beamingTotals";

const SCREENSHOT_LINES = [
  { prodQty: 100000, rate: 0.000757 },
  { prodQty: 17, rate: 0.3 },
];

describe("beamingTotals", () => {
  it("matches the legacy screenshot (PayOProdBmg DocEntry 1448)", () => {
    expect(beamingTotals(96, 0, SCREENSHOT_LINES)).toEqual({
      effHrs: 96,
      divHrs: 288,
      prodQty: 100017,
      prodValue: 80.8,
      lhrValue: 0,
      totalValue: 80.8,
      kav: 4.04,
      rate1: 0.266528,
      rate2: 0.12625,
      rate3: 0.084167,
    });
  });

  it("matches nbcl SM0001 / C / 2025-11-15 (legacy DocEntry 1390) with 88 machine hours", () => {
    const t = beamingTotals(88, 0, SCREENSHOT_LINES);
    expect([t.divHrs, t.kav, t.rate1, t.rate2, t.rate3]).toEqual([264, 4.04, 0.290758, 0.12625, 0.084167]);
  });

  it("values lost hours at the effective-hour rate", () => {
    expect(beamingTotals(56, 8, [{ prodQty: 1, rate: 78.32 }])).toMatchObject({
      effHrs: 48,
      divHrs: 168,
      prodValue: 78.32,
      lhrValue: 13.05,
      totalValue: 91.37,
      kav: 4.568667,
      rate1: 0.516694,
      rate2: 0.142771,
      rate3: 0.095181,
    });
  });

  it("gives zero lost value and zero Rate1 when there are no hours", () => {
    const t = beamingTotals(0, 0, SCREENSHOT_LINES);
    expect([t.lhrValue, t.rate1, t.totalValue]).toEqual([0, 0, 80.8]);
  });
});

describe("fortnight dates", () => {
  it("labels the period like the legacy form", () => {
    expect(periodLabel("2026-08-31")).toBe("AUG/26/02");
    expect(periodLabel("2025-11-15")).toBe("NOV/25/01");
    expect(periodLabel("bad")).toBe("");
  });

  it("accepts only the 15th or the month end", () => {
    expect(["2026-08-15", "2026-08-31", "2028-02-29", "2026-02-28"].map(isFortnightEnd)).toEqual([
      true, true, true, true,
    ]);
    expect(["2026-08-30", "2028-02-28", "2026-13-15", ""].map(isFortnightEnd)).toEqual([
      false, false, false, false,
    ]);
  });

  it("defaults to the fortnight end for a date", () => {
    expect(fortnightEndFor("2026-09-13")).toBe("2026-09-15");
    expect(fortnightEndFor("2026-09-16")).toBe("2026-09-30");
    expect(fortnightEndFor("2028-02-20")).toBe("2028-02-29");
  });
});
