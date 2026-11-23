import { describe, expect, it } from "vitest";
import {
  blankLine,
  calcGratuity,
  editLine,
  getAge,
  ratesFromLastWages,
  type GratLine,
} from "./calc";

const years = (from: number, wd: number[]): GratLine[] =>
  wd.map((w, i) => ({ ...blankLine(from + i), WorkingDays: w }));

describe("winsome gratuity calc (legacy Calc_Final)", () => {
  it("5-year check: eligibility starts at the first of 5 continuous 240-day years", () => {
    const r = calcGratuity(
      "calc",
      {
        FiveYear240Validation: "Y",
        PeriodInYears: 6,
        PeriodInMonth: 8,
        AvgRatePerDay: 300,
        AdvanceAgainstGrat: 1000,
        EligiblityStartingYear: 0,
      },
      years(2010, [250, 250, 250, 250, 250, 250, 100]),
      [
        {
          NomineeName: "A",
          PShare: 50,
          GShare: 50,
          GAmount: 0,
          Relation: "",
          Address: "",
        },
      ],
    );
    expect(r.header).toMatchObject({
      EligiblityStartingYear: 2010,
      MaxApplicableYrs: 7,
      NoOfApplicableYrs: 6,
      NonEligibleYrs: 1,
      FinalNoOfApplicableYrs: 6,
      GratuityAmt: 27000,
      NetAmt: 26000,
      FinalGratuityAmt: 27000,
      FinalNetAmt: 26000,
    });
    expect(r.lines.map((l) => l.Eligible).join("")).toBe("YYYYYYN");
    expect(r.lines[0].STLEarned).toBe(13); // 250 / 20 rounded half up
    expect(r.nominees[0].GAmount).toBe(13000);
  });

  it("without the 5-year check every 240-day year counts; STL pays the final %", () => {
    const r = calcGratuity(
      "stl",
      {
        FiveYear240Validation: "N",
        PeriodInYears: 3,
        PeriodInMonth: 0,
        AvgRatePerDay: 200,
        FinalPayPercent: 50,
      },
      years(2010, [250, 100, 250]),
      [],
    );
    expect(r.header).toMatchObject({
      NoOfApplicableYrs: 2,
      FinalNoOfApplicableYrs: 1, // ceil(2 * 50%)
      GratuityAmt: 6000,
      FinalGratuityAmt: 3000,
    });
  });

  it("strike days count only when TSW is allowed", () => {
    const line = { ...blankLine(2020), WorkingDays: 200, StrikeDays: 50 };
    const run = (tsw: string) =>
      calcGratuity(
        "calc",
        { FiveYear240Validation: "N", AvgRatePerDay: 100, PeriodInYears: 1 },
        [{ ...line, TSWAllow: tsw }],
        [],
      ).header.NoOfApplicableYrs;
    expect(run("Y")).toBe(1);
    expect(run("N")).toBe(0);
  });

  it("legacy GET_AGE and rates", () => {
    expect(getAge("1998-04-09", "2020-11-30")).toEqual({ y: 22, m: 7, d: 21 });
    expect(getAge("2003-06-23", "2021-09-04")).toEqual({ y: 18, m: 2, d: 12 });
    expect(ratesFromLastWages(327.1, 8)).toEqual({
      AvgRatePerHour: 40.8875,
      AvgRatePerDay: 327.1,
    });
  });

  it("editing a year caps days at 365 and clears its eligibility", () => {
    const lines = years(2010, [250, 250]).map((l) => ({ ...l, Eligible: "Y" }));
    const out = editLine(lines, 1, {
      WorkingDays: 400,
      StrikeDays: 10,
      STLAvailed: 20,
    });
    expect(out[1]).toMatchObject({ WorkingDays: 355, STLAvailed: 0, Eligible: "N" });
    expect(out[0].Eligible).toBe("Y");
  });
});
