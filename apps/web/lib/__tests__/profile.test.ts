import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PROFILE_FILTER,
  PROFILE_FILTERS,
  parsePage,
  parseProfileFilter,
  profileGamesHref,
  resultFilter,
} from "../profile";

describe("resultFilter", () => {
  test("ALL applies no filter", () => {
    expect(resultFilter("ALL")).toBeUndefined();
  });

  test("every other tab passes its own name through", () => {
    expect(resultFilter("won")).toBe("won");
    expect(resultFilter("lost")).toBe("lost");
    expect(resultFilter("drawn")).toBe("drawn");
  });
});

describe("parseProfileFilter", () => {
  test("reads back every tab", () => {
    for (const { key } of PROFILE_FILTERS) {
      expect(parseProfileFilter(key)).toBe(key);
    }
  });

  test("anything unrecognised falls back to the default", () => {
    expect(parseProfileFilter(undefined)).toBe(DEFAULT_PROFILE_FILTER);
    expect(parseProfileFilter("toString")).toBe(DEFAULT_PROFILE_FILTER);
    expect(parseProfileFilter("draw")).toBe(DEFAULT_PROFILE_FILTER);
  });
});

describe("parsePage", () => {
  test("anything below 2 is page 1", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("not a number")).toBe(1);
  });

  test("reads a real page number", () => {
    expect(parsePage("4")).toBe(4);
  });
});

describe("profileGamesHref", () => {
  test("the default filter and first page are left implicit", () => {
    expect(profileGamesHref("alice", "ALL")).toBe("/u/alice");
    expect(profileGamesHref("alice", "ALL", 1)).toBe("/u/alice");
  });

  test("a non-default filter and page are both in the query", () => {
    expect(profileGamesHref("alice", "won", 3)).toBe(
      "/u/alice?result=won&page=3",
    );
  });

  test("the handle is encoded", () => {
    expect(profileGamesHref("a b", "ALL")).toBe("/u/a%20b");
  });
});
