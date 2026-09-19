import { describe, expect, test } from "bun:test";
import { START_FEN } from "@repo/game-core";
import type { GameDetail, GameResult, GameStatus, Move } from "../api";
import { gamePgn, pgnFilename } from "../pgn";

const alice = {
  id: "w1",
  name: "alice",
  username: "alice",
  displayUsername: "Alice",
};
const bob = { id: "b1", name: "bob", username: "bob", displayUsername: "Bob" };

const move = (moveNumber: number, san: string): Move => ({
  id: `m${moveNumber}`,
  moveNumber,
  san,
  fen: "",
  from: "",
  to: "",
  promotion: null,
  clockMs: null,
});

const game = (overrides: Partial<GameDetail> = {}): GameDetail =>
  ({
    id: "g1",
    status: "FINISHED" as GameStatus,
    fen: "",
    startFen: START_FEN,
    forkedFromId: null,
    forkedFromPly: null,
    result: "CHECKMATE" as GameResult,
    initialTimeMs: 180_000,
    incrementMs: 2_000,
    whiteTimeMs: 0,
    blackTimeMs: 0,
    lastMoveAt: null,
    whiteId: "w1",
    blackId: "b1",
    winnerId: "w1",
    createdAt: "2026-09-13T21:40:00.000Z",
    white: alice,
    black: bob,
    moves: [move(1, "e4"), move(2, "e5"), move(3, "Qh5")],
    ...overrides,
  }) as GameDetail;

function headerOf(pgn: string, name: string) {
  return pgn.match(new RegExp(`^\\[${name} "(.*)"\\]$`, "m"))?.[1];
}

describe("gamePgn", () => {
  test("names both players as the interface labels them", () => {
    const pgn = gamePgn(game());

    expect(headerOf(pgn, "White")).toBe("Alice");
    expect(headerOf(pgn, "Black")).toBe("Bob");
  });

  test("an empty seat is still named", () => {
    expect(headerOf(gamePgn(game({ black: null })), "Black")).toBe("Unknown");
  });

  test("the winner's colour decides the result", () => {
    expect(headerOf(gamePgn(game({ winnerId: "w1" })), "Result")).toBe("1-0");
    expect(headerOf(gamePgn(game({ winnerId: "b1" })), "Result")).toBe("0-1");
  });

  test("a finished game with no winner is a draw", () => {
    const pgn = gamePgn(game({ winnerId: null, result: "STALEMATE" }));

    expect(headerOf(pgn, "Result")).toBe("1/2-1/2");
  });

  test("an unfinished game exports as in progress, not as a draw", () => {
    const pgn = gamePgn(
      game({ status: "ACTIVE", result: null, winnerId: null }),
    );

    expect(headerOf(pgn, "Result")).toBe("*");
    expect(pgn.trimEnd().endsWith("*")).toBe(true);
    expect(pgn).not.toContain("Termination");
  });

  test("termination uses PGN's vocabulary, not the interface's wording", () => {
    expect(headerOf(gamePgn(game({ result: "TIMEOUT" })), "Termination")).toBe(
      "Time forfeit",
    );
    expect(
      headerOf(gamePgn(game({ result: "ABANDONED" })), "Termination"),
    ).toBe("Abandoned");
    expect(
      headerOf(gamePgn(game({ result: "CHECKMATE" })), "Termination"),
    ).toBe("Normal");
  });

  test("the time control is carried over in seconds", () => {
    expect(headerOf(gamePgn(game()), "TimeControl")).toBe("180+2");
  });

  test("the movetext is the stored move list in order", () => {
    expect(gamePgn(game())).toContain("1. e4 e5 2. Qh5 1-0");
  });

  test("a forked game carries its starting position", () => {
    const fen =
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";
    const pgn = gamePgn(game({ startFen: fen, moves: [move(1, "Nc6")] }));

    expect(headerOf(pgn, "FEN")).toBe(fen);
    expect(pgn).toContain("2... Nc6");
  });

  test("a standard game has no FEN tag", () => {
    expect(headerOf(gamePgn(game()), "FEN")).toBeUndefined();
  });
});

describe("pgnFilename", () => {
  test("names the file after the players and the date", () => {
    expect(pgnFilename(game())).toBe("alice-vs-bob-2026-09-13.pgn");
  });

  test("handles names that are not filename-safe", () => {
    const messy = { ...alice, displayUsername: "Añ  Ice/Bob?" };

    expect(pgnFilename(game({ white: messy }))).toBe(
      "a-ice-bob-vs-bob-2026-09-13.pgn",
    );
  });
});
