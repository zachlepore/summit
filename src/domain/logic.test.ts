import { describe, expect, it } from "vitest";
import {
  addDays,
  countdown,
  daysBetween,
  due,
  isComplete,
  orderedMeasurements,
  schedule,
  trend,
} from "./logic";
import { seed } from "../data/seed";
import type { Measurement } from "./model";
describe("calendar dates", () => {
  it("counts through year boundaries and leap days", () => {
    expect(daysBetween("2026-10-12", "2027-01-10")).toBe(90);
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("counts down without negatives", () => {
    expect(countdown("2027-01-10", "2026-10-12")).toBe(90);
    expect(countdown("2027-01-10", "2027-01-11")).toBe(0);
  });
  it("is stable across daylight saving boundaries", () =>
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2));
});
describe("habit completion", () => {
  const s = seed(),
    h = s.missions[0].habits[0];
  it("scopes completion by ID and day", () => {
    const entries = [
      { id: "entry", habitId: h.id, date: "2026-10-12", completed: true },
    ];
    expect(isComplete(entries, h.id, "2026-10-12")).toBe(true);
    expect(isComplete(entries, h.id, "2026-10-13")).toBe(false);
    expect(isComplete(entries, "other", "2026-10-12")).toBe(false);
  });
  it("respects active state and scheduled days", () => {
    expect(due({ ...h, active: false }, "2026-10-12")).toBe(false);
    expect(
      due({ ...h, frequency: "weekdays", weekdays: [1] }, "2026-10-12"),
    ).toBe(true);
    expect(
      due({ ...h, frequency: "weekly", weekdays: [0] }, "2026-10-12"),
    ).toBe(false);
  });
});
describe("training schedule", () => {
  it("generates the 13 weeks and exact long-session suggestions", () => {
    const sessions = schedule("mission", "2026-10-12", "2027-01-10");
    expect(sessions).toHaveLength(91);
    expect(sessions[0].activityType).toBe("Push");
    expect(sessions[6].activityType).toBe("Recovery");
    expect(
      sessions
        .filter((s) => s.plannedDistance !== null)
        .map((s) => s.plannedDistance),
    ).toEqual([4, 5, 6, 4, 7, 8, 6, 9, 10, 7, 11, 6]);
    expect(sessions.find((s) => s.date === "2027-01-09")?.activityType).toBe(
      "Mission weekend",
    );
    expect(new Set(sessions.map((s) => s.id)).size).toBe(91);
  });
  it("supports other mission ranges", () =>
    expect(
      schedule("other", "2026-10-14", "2026-10-15").map((s) => s.activityType),
    ).toEqual(["Pull", "Easy run / hills"]));
});
describe("observed measurements", () => {
  const make = (date: string, value: number): Measurement => ({
    id: date,
    missionId: "m",
    measurementDefinitionId: "weight",
    date,
    value,
  });
  it("orders copies without mutating inputs", () => {
    const values = [make("2026-10-14", 222), make("2026-10-12", 225)];
    expect(orderedMeasurements(values)[0].value).toBe(225);
    expect(values[0].value).toBe(222);
  });
  it("uses only observations within seven calendar days, never fabricates points", () => {
    const values = [
      make("2026-10-12", 225),
      make("2026-10-13", 223),
      make("2026-10-15", 221),
      make("2026-10-25", 220),
    ];
    const result = trend(values);
    expect(result).toHaveLength(4);
    expect(result.map((x) => x.trend)).toEqual([null, null, 223, null]);
  });
});
