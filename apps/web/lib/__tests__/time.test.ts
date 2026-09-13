import { describe, expect, test } from "bun:test";
import { formatRelativeTime } from "../time";

describe("formatRelativeTime", () => {
  const BASE_TIME = new Date("2026-09-13T12:00:00.000Z").getTime();

  test("returns empty string for invalid dates", () => {
    expect(formatRelativeTime("invalid-date", BASE_TIME)).toBe("");
  });

  test("returns 'just now' for durations under 45 seconds", () => {
    expect(formatRelativeTime(BASE_TIME, BASE_TIME)).toBe("just now");
    expect(formatRelativeTime(BASE_TIME - 10_000, BASE_TIME)).toBe("just now");
    expect(formatRelativeTime(BASE_TIME - 44_000, BASE_TIME)).toBe("just now");
  });

  test("returns '1 min ago' for ~60 seconds", () => {
    expect(formatRelativeTime(BASE_TIME - 45_000, BASE_TIME)).toBe("1 min ago");
    expect(formatRelativeTime(BASE_TIME - 60_000, BASE_TIME)).toBe("1 min ago");
    expect(formatRelativeTime(BASE_TIME - 89_000, BASE_TIME)).toBe("1 min ago");
  });

  test("returns '2 min ago' for 2 minutes (user requested format)", () => {
    expect(formatRelativeTime(BASE_TIME - 120_000, BASE_TIME)).toBe("2 min ago");
  });

  test("returns minutes ago up to an hour", () => {
    expect(formatRelativeTime(BASE_TIME - 15 * 60_000, BASE_TIME)).toBe(
      "15 min ago",
    );
    expect(formatRelativeTime(BASE_TIME - 59 * 60_000, BASE_TIME)).toBe(
      "59 min ago",
    );
  });

  test("returns hours ago", () => {
    expect(formatRelativeTime(BASE_TIME - 60 * 60_000, BASE_TIME)).toBe("1 hr ago");
    expect(formatRelativeTime(BASE_TIME - 2 * 60 * 60_000, BASE_TIME)).toBe(
      "2 hr ago",
    );
    expect(formatRelativeTime(BASE_TIME - 23 * 60 * 60_000, BASE_TIME)).toBe(
      "23 hr ago",
    );
  });

  test("returns days ago", () => {
    expect(formatRelativeTime(BASE_TIME - 24 * 60 * 60_000, BASE_TIME)).toBe(
      "1 day ago",
    );
    expect(formatRelativeTime(BASE_TIME - 48 * 60 * 60_000, BASE_TIME)).toBe(
      "2 days ago",
    );
  });

  test("returns months and years ago", () => {
    expect(
      formatRelativeTime(BASE_TIME - 30 * 24 * 60 * 60_000, BASE_TIME),
    ).toBe("1 mo ago");
    expect(
      formatRelativeTime(BASE_TIME - 60 * 24 * 60 * 60_000, BASE_TIME),
    ).toBe("2 mo ago");
    expect(
      formatRelativeTime(BASE_TIME - 365 * 24 * 60 * 60_000, BASE_TIME),
    ).toBe("1 yr ago");
  });

  test("handles ISO strings and future clock skews gracefully", () => {
    const isoString = new Date(BASE_TIME - 120_000).toISOString();
    expect(formatRelativeTime(isoString, BASE_TIME)).toBe("2 min ago");

    // Future timestamp (clock skew)
    expect(formatRelativeTime(BASE_TIME + 5_000, BASE_TIME)).toBe("just now");
  });
});
