import { describe, expect, test } from "bun:test";
import {
  DEFAULT_TIME_CONTROL,
  TIME_CONTROLS,
  TIME_CONTROL_KEYS,
  formatTimeControl,
  isTimeControlKey,
} from "../time-control";

describe("TIME_CONTROLS", () => {
  test("every key matches the milliseconds it names", () => {
    for (const key of TIME_CONTROL_KEYS) {
      const { initialMs, incrementMs } = TIME_CONTROLS[key];

      expect(formatTimeControl(initialMs, incrementMs)).toBe(key);
    }
  });

  test("the default is one of the offered controls", () => {
    expect(TIME_CONTROL_KEYS).toContain(DEFAULT_TIME_CONTROL);
  });

  // The schema defaults hard-code these, so a change here needs a migration.
  test("the default is 5 minutes with no increment", () => {
    const { initialMs, incrementMs } = TIME_CONTROLS[DEFAULT_TIME_CONTROL];

    expect(initialMs).toBe(300_000);
    expect(incrementMs).toBe(0);
  });
});

describe("isTimeControlKey", () => {
  test("accepts every offered control", () => {
    for (const key of TIME_CONTROL_KEYS) {
      expect(isTimeControlKey(key)).toBe(true);
    }
  });

  test("rejects anything else", () => {
    for (const value of ["2+1", "", "5", null, undefined, 300_000, {}]) {
      expect(isTimeControlKey(value)).toBe(false);
    }
  });

  // A plain object's inherited keys must not pass as controls.
  test("rejects inherited property names", () => {
    expect(isTimeControlKey("toString")).toBe(false);
    expect(isTimeControlKey("constructor")).toBe(false);
  });
});

describe("formatTimeControl", () => {
  test("renders whole minutes without a decimal", () => {
    expect(formatTimeControl(600_000, 0)).toBe("10+0");
    expect(formatTimeControl(180_000, 2_000)).toBe("3+2");
  });

  test("keeps a fractional minute readable", () => {
    expect(formatTimeControl(30_000, 0)).toBe("0.5+0");
  });
});
