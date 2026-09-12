import { describe, expect, test } from "bun:test";
import {
  clockAt,
  clockUrgency,
  formatClock,
  type ClockBaseline,
} from "../clock";

const baseline: ClockBaseline = {
  whiteTimeMs: 60_000,
  blackTimeMs: 45_000,
  turn: "white",
  running: true,
  anchor: 1_000_000,
};

describe("clockAt", () => {
  test("only the side on move spends time", () => {
    expect(clockAt(baseline, baseline.anchor + 5_000)).toEqual({
      whiteTimeMs: 55_000,
      blackTimeMs: 45_000,
    });
  });

  test("charges black when black is on move", () => {
    const black = { ...baseline, turn: "black" as const };

    expect(clockAt(black, black.anchor + 5_000)).toEqual({
      whiteTimeMs: 60_000,
      blackTimeMs: 40_000,
    });
  });

  test("a stopped clock does not tick", () => {
    const stopped = { ...baseline, running: false };

    expect(clockAt(stopped, stopped.anchor + 30_000)).toEqual({
      whiteTimeMs: 60_000,
      blackTimeMs: 45_000,
    });
  });

  test("clamps at zero rather than going negative", () => {
    expect(clockAt(baseline, baseline.anchor + 90_000).whiteTimeMs).toBe(0);
  });

  test("a reading older than the anchor does not hand time back", () => {
    expect(clockAt(baseline, baseline.anchor - 5_000).whiteTimeMs).toBe(60_000);
  });

  test("interpolation never leaks into the next authoritative reading", () => {
    for (let i = 1; i <= 100; i++) clockAt(baseline, baseline.anchor + i * 100);

    const snapped: ClockBaseline = {
      ...baseline,
      whiteTimeMs: 58_000,
      anchor: baseline.anchor + 10_000,
    };

    expect(clockAt(snapped, snapped.anchor).whiteTimeMs).toBe(58_000);
  });
});

describe("formatClock", () => {
  test("shows minutes and seconds above ten seconds", () => {
    expect(formatClock(65_000)).toBe("1:05");
    expect(formatClock(600_000)).toBe("10:00");
    expect(formatClock(10_000)).toBe("0:10");
  });

  test("shows tenths inside the last ten seconds", () => {
    expect(formatClock(9_999)).toBe("0:09.9");
    expect(formatClock(9_400)).toBe("0:09.4");
    expect(formatClock(0)).toBe("0:00.0");
  });

  test("clamps a negative reading", () => {
    expect(formatClock(-500)).toBe("0:00.0");
  });
});

describe("clockUrgency", () => {
  test("changes at thirty and ten seconds", () => {
    expect(clockUrgency(30_000)).toBe("normal");
    expect(clockUrgency(29_999)).toBe("low");
    expect(clockUrgency(10_000)).toBe("low");
    expect(clockUrgency(9_999)).toBe("urgent");
    expect(clockUrgency(0)).toBe("urgent");
  });
});
