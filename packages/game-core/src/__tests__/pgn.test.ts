import { describe, expect, test } from "bun:test";
import { Chess } from "chess.js";
import { toPgn, type PgnTags } from "../pgn";

const base: PgnTags = {
  white: "alice",
  black: "bob",
  result: "1-0",
  date: new Date("2026-09-13T21:40:00Z"),
};

function headerOf(pgn: string, name: string) {
  return pgn.match(new RegExp(`^\\[${name} "(.*)"\\]$`, "m"))?.[1];
}

function movetextOf(pgn: string) {
  return pgn.split("\n\n")[1]?.trimEnd();
}

describe("toPgn", () => {
  test("numbers each pair of plies and ends on the result", () => {
    const pgn = toPgn(base, ["e4", "e5", "Nf3", "Nc6", "Bb5"]);

    expect(movetextOf(pgn)).toBe("1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0");
  });

  test("writes the seven tag roster in order", () => {
    const pgn = toPgn(base, ["e4"]);
    const names = [...pgn.matchAll(/^\[(\w+) /gm)].map((match) => match[1]);

    expect(names).toEqual([
      "Event",
      "Site",
      "Date",
      "Round",
      "White",
      "Black",
      "Result",
    ]);
  });

  test("separates headers from movetext with a blank line", () => {
    const pgn = toPgn(base, ["e4", "e5"]);

    expect(pgn).toContain('[Result "1-0"]\n\n1. e4 e5 1-0\n');
  });

  test("a game with no moves is still valid PGN", () => {
    const pgn = toPgn({ ...base, result: "*" }, []);

    expect(movetextOf(pgn)).toBe("*");
  });

  test("dates render in UTC regardless of the local zone", () => {
    // 23:40 UTC-on-the-13th is already the 14th in +05:30, so a local-time
    // render would disagree with the server's own date.
    const pgn = toPgn(
      { ...base, date: new Date("2026-09-13T23:40:00Z") },
      ["e4"],
    );

    expect(headerOf(pgn, "Date")).toBe("2026.09.13");
  });

  test("an unknown date falls back to the placeholder", () => {
    expect(headerOf(toPgn({ ...base, date: undefined }, []), "Date")).toBe(
      "????.??.??",
    );
    expect(
      headerOf(toPgn({ ...base, date: new Date("nonsense") }, []), "Date"),
    ).toBe("????.??.??");
  });

  test("time control is written in seconds, not the UI's minutes", () => {
    const pgn = toPgn({ ...base, initialMs: 180_000, incrementMs: 2_000 }, []);

    expect(headerOf(pgn, "TimeControl")).toBe("180+2");
  });

  test("time control is omitted when it is not given", () => {
    expect(toPgn(base, [])).not.toContain("TimeControl");
  });

  test("termination is written only when given", () => {
    expect(headerOf(toPgn({ ...base, termination: "Time forfeit" }, []), "Termination")).toBe(
      "Time forfeit",
    );
    expect(toPgn(base, [])).not.toContain("Termination");
  });

  test("quotes and backslashes in a name cannot break out of a tag", () => {
    const pgn = toPgn({ ...base, white: 'a "b" c\\d' }, []);

    expect(pgn).toContain('[White "a \\"b\\" c\\\\d"]');
  });

  test("movetext wraps at 80 columns", () => {
    const pgn = toPgn(base, Array.from({ length: 120 }, () => "Nf3"));

    for (const line of movetextOf(pgn)!.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(80);
    }
  });

  test("wrapping never splits a move number from its move", () => {
    const pgn = toPgn(base, Array.from({ length: 120 }, () => "Nf3"));

    for (const line of movetextOf(pgn)!.split("\n")) {
      expect(line).not.toMatch(/\d+\.$/);
    }
  });
});

/**
 * The formatting above is only worth anything if something else can read it,
 * so these play real games and hand the export back to chess.js.
 */
describe("toPgn round-trips through chess.js", () => {
  function play(moves: string[]) {
    const chess = new Chess();
    for (const san of moves) chess.move(san);

    return chess;
  }

  test("a parsed export reaches the same position", () => {
    const moves = [
      "e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7",
      "Re1", "b5", "Bb3", "d6", "c3", "O-O", "h3", "Nb8", "d4", "Nbd7",
    ];
    const played = play(moves);

    const parsed = new Chess();
    parsed.loadPgn(toPgn({ ...base, result: "*" }, moves));

    expect(parsed.fen()).toBe(played.fen());
    expect(parsed.history()).toEqual(moves);
  });

  test("a checkmate export carries its result and headers", () => {
    const moves = ["f3", "e5", "g4", "Qh4#"];
    const pgn = toPgn(
      { ...base, result: "0-1", initialMs: 60_000, incrementMs: 0 },
      moves,
    );

    const parsed = new Chess();
    parsed.loadPgn(pgn);

    expect(parsed.isCheckmate()).toBe(true);
    expect(parsed.history()).toEqual(moves);

    const headers = parsed.getHeaders();
    expect(headers.Result).toBe("0-1");
    expect(headers.White).toBe("alice");
    expect(headers.TimeControl).toBe("60+0");
  });

  test("a wrapped export still parses", () => {
    const chess = new Chess();
    const moves: string[] = [];

    // Long enough to wrap over several lines — the shuffle repeats a position,
    // which is fine for parsing and keeps the game legal.
    for (let round = 0; round < 15; round++) {
      for (const san of ["Nf3", "Nf6", "Ng1", "Ng8"]) {
        chess.move(san);
        moves.push(san);
      }
    }

    const pgn = toPgn({ ...base, result: "1/2-1/2" }, moves);
    expect(movetextOf(pgn)!.split("\n").length).toBeGreaterThan(1);

    const parsed = new Chess();
    parsed.loadPgn(pgn);

    expect(parsed.history()).toEqual(moves);
  });

  test("promotion, castling and disambiguation survive the round trip", () => {
    const moves = [
      "e4", "d5", "exd5", "Nf6", "d6", "Be6", "dxc7", "Nc6", "Nf3", "g6",
      "Be2", "Bg7", "O-O", "O-O", "cxd8=Q", "Raxd8",
    ];
    const played = play(moves);

    const parsed = new Chess();
    parsed.loadPgn(toPgn({ ...base, result: "*" }, moves));

    expect(parsed.fen()).toBe(played.fen());
    expect(parsed.history()).toContain("cxd8=Q");
    expect(parsed.history()).toContain("O-O");
    expect(parsed.history()).toContain("Raxd8");
  });
});
