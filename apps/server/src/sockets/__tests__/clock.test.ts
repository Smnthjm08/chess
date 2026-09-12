import { describe, expect, test } from "bun:test";
import { START_FEN } from "@repo/game-core";
import { GameStatus } from "@repo/db";
import { reconcileTurnClock, remainingMs, type ClockGame } from "../clock";

const BLACK_TO_MOVE = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1";

/** A game whose turn started `agoMs` ago, against a fixed `now`. */
function game(over: Partial<ClockGame> = {}, agoMs = 0): ClockGame {
  return {
    fen: START_FEN,
    whiteId: "white-id",
    blackId: "black-id",
    whiteTimeMs: 300_000,
    blackTimeMs: 300_000,
    status: GameStatus.ACTIVE,
    lastMoveAt: new Date(Date.now() - agoMs),
    ...over,
  };
}

describe("remainingMs", () => {
  test("counts down the side on move", () => {
    expect(remainingMs(game({}, 10_000))).toBeCloseTo(290_000, -2);
  });

  test("counts down whichever side is on move", () => {
    const black = game({ fen: BLACK_TO_MOVE, blackTimeMs: 120_000 }, 20_000);

    expect(remainingMs(black)).toBeCloseTo(100_000, -2);
  });

  test("is null when no clock is running", () => {
    expect(remainingMs(game({ status: GameStatus.PAUSED }))).toBeNull();
    expect(remainingMs(game({ status: GameStatus.WAITING }))).toBeNull();
    expect(remainingMs(game({ status: GameStatus.FINISHED }))).toBeNull();
    expect(remainingMs(game({ lastMoveAt: null }))).toBeNull();
  });

  test("never goes negative", () => {
    expect(remainingMs(game({ whiteTimeMs: 1_000 }, 60_000))).toBe(0);
  });

  test("a clock stamped in the future does not gain time", () => {
    expect(remainingMs(game({}, -5_000))).toBe(300_000);
  });
});

describe("reconcileTurnClock", () => {
  test("banks the elapsed time against the side on move only", () => {
    const state = reconcileTurnClock(game({}, 30_000));

    expect(state.whiteTimeMs).toBeCloseTo(270_000, -2);
    expect(state.blackTimeMs).toBe(300_000);
    expect(state.timedOut).toBe(false);
    expect(state.winnerId).toBeNull();
  });

  test("restamps lastMoveAt so the next turn starts from now", () => {
    const before = Date.now();
    const state = reconcileTurnClock(game({}, 5_000));

    expect(state.lastMoveAt!.getTime()).toBeGreaterThanOrEqual(before);
  });

  test("charges black when black is on move", () => {
    const state = reconcileTurnClock(game({ fen: BLACK_TO_MOVE }, 30_000));

    expect(state.whiteTimeMs).toBe(300_000);
    expect(state.blackTimeMs).toBeCloseTo(270_000, -2);
  });

  test("flags the side on move and hands the win to the opponent", () => {
    const state = reconcileTurnClock(game({ whiteTimeMs: 1_000 }, 5_000));

    expect(state.timedOut).toBe(true);
    expect(state.whiteTimeMs).toBe(0);
    expect(state.winnerId).toBe("black-id");
  });

  test("a flagging black hands the win to white", () => {
    const state = reconcileTurnClock(
      game({ fen: BLACK_TO_MOVE, blackTimeMs: 500 }, 5_000),
    );

    expect(state.timedOut).toBe(true);
    expect(state.blackTimeMs).toBe(0);
    expect(state.winnerId).toBe("white-id");
  });

  test("leaves a paused game exactly as it found it", () => {
    const paused = game({ status: GameStatus.PAUSED, lastMoveAt: null }, 0);
    const state = reconcileTurnClock(paused);

    expect(state.whiteTimeMs).toBe(paused.whiteTimeMs);
    expect(state.blackTimeMs).toBe(paused.blackTimeMs);
    expect(state.lastMoveAt).toBeNull();
    expect(state.timedOut).toBe(false);
  });

  test("a zero-elapsed reconcile is a no-op that keeps the stamp", () => {
    const subject = game({}, -1_000);
    const state = reconcileTurnClock(subject);

    expect(state.whiteTimeMs).toBe(300_000);
    expect(state.lastMoveAt).toBe(subject.lastMoveAt);
  });
});
