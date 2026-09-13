import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FILTER,
  LOBBY_FILTERS,
  filterStatuses,
  lobbyHref,
  parseFilter,
  parsePage,
  type LobbyFilter,
} from "../lobby";

describe("filterStatuses", () => {
  test("waiting and finished are a single status each", () => {
    expect(filterStatuses("WAITING")).toEqual(["WAITING"]);
    expect(filterStatuses("FINISHED")).toEqual(["FINISHED"]);
  });

  // A paused game is still a game in progress; it must not fall out of the
  // lobby entirely just because its status is not ACTIVE.
  test("in progress covers paused as well as active", () => {
    expect(filterStatuses("IN_PROGRESS")).toEqual(["ACTIVE", "PAUSED"]);
  });

  test("all applies no filter", () => {
    expect(filterStatuses("ALL")).toEqual([]);
  });

  test("every tab is accounted for", () => {
    for (const { key } of LOBBY_FILTERS) {
      expect(filterStatuses(key)).toBeArray();
    }
  });
});

describe("parseFilter", () => {
  test("reads back every tab", () => {
    for (const { key } of LOBBY_FILTERS) {
      expect(parseFilter(key)).toBe(key);
    }
  });

  test("falls back to the default for anything else", () => {
    for (const value of [undefined, "", "waiting", "BOGUS", "ACTIVE"]) {
      expect(parseFilter(value)).toBe(DEFAULT_FILTER);
    }
  });

  // `in` on a plain object would let these through as filters.
  test("rejects inherited property names", () => {
    expect(parseFilter("toString")).toBe(DEFAULT_FILTER);
    expect(parseFilter("constructor")).toBe(DEFAULT_FILTER);
  });
});

describe("parsePage", () => {
  test("reads a page number", () => {
    expect(parsePage("2")).toBe(2);
    expect(parsePage("17")).toBe(17);
  });

  test("anything unusable is page 1", () => {
    for (const value of [undefined, "", "0", "-3", "abc", "1.5e9x", "NaN"]) {
      expect(parsePage(value)).toBe(1);
    }
  });
});

describe("lobbyHref", () => {
  test("leaves the default filter and first page out of the URL", () => {
    expect(lobbyHref(DEFAULT_FILTER)).toBe("/lobby");
    expect(lobbyHref(DEFAULT_FILTER, 1)).toBe("/lobby");
  });

  test("names a non-default filter", () => {
    expect(lobbyHref("FINISHED")).toBe("/lobby?filter=FINISHED");
  });

  test("carries the filter across pages", () => {
    expect(lobbyHref("IN_PROGRESS", 3)).toBe(
      "/lobby?filter=IN_PROGRESS&page=3",
    );
  });

  test("a page on the default filter needs no filter param", () => {
    expect(lobbyHref(DEFAULT_FILTER, 4)).toBe("/lobby?page=4");
  });

  // Round trip: every href a tab links to parses back to that same tab.
  test("round-trips through parseFilter", () => {
    for (const { key } of LOBBY_FILTERS) {
      const href = lobbyHref(key, 2);
      const filter = new URL(href, "http://x").searchParams.get("filter");

      expect(parseFilter(filter ?? undefined)).toBe(key as LobbyFilter);
    }
  });
});
