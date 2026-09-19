import { describe, expect, test } from "bun:test";
import { GameResult } from "@repo/db";
import { computeStats, outcomeFor, type StatsGame } from "../profile-stats";

const ME = "me";
const THEM = "them";

function game(
  outcome: "win" | "loss" | "draw" | "unplayed",
  overrides: Partial<StatsGame> = {},
): StatsGame {
  const base: StatsGame = {
    whiteId: ME,
    blackId: THEM,
    winnerId: null,
    result: null,
    initialTimeMs: 300_000,
    incrementMs: 0,
  };

  switch (outcome) {
    case "win":
      return { ...base, winnerId: ME, result: GameResult.CHECKMATE, ...overrides };
    case "loss":
      return { ...base, winnerId: THEM, result: GameResult.RESIGNATION, ...overrides };
    case "draw":
      return { ...base, result: GameResult.DRAW_AGREED, ...overrides };
    case "unplayed":
      return { ...base, blackId: null, result: GameResult.ABANDONED, ...overrides };
  }
}

describe("outcomeFor", () => {
  test("reads a result from the player's side", () => {
    expect(outcomeFor(game("win"), ME)).toBe("win");
    expect(outcomeFor(game("win"), THEM)).toBe("loss");
    expect(outcomeFor(game("draw"), THEM)).toBe("draw");
  });

  test("a game nobody joined does not count", () => {
    expect(outcomeFor(game("unplayed"), ME)).toBeNull();
  });
});

describe("computeStats", () => {
  test("no games means no win rate and no streak", () => {
    const stats = computeStats([], ME);

    expect(stats.played).toBe(0);
    expect(stats.winRate).toBeNull();
    expect(stats.streak).toEqual({ current: null, bestWin: 0 });
    expect(stats.byCategory).toEqual([]);
  });

  test("totals and win rate leave unplayed games out", () => {
    const stats = computeStats(
      [game("win"), game("loss"), game("draw"), game("win"), game("unplayed")],
      ME,
    );

    expect(stats).toMatchObject({ played: 4, wins: 2, losses: 1, draws: 1 });
    expect(stats.winRate).toBe(0.5);
  });

  test("splits by the colour the player had", () => {
    const stats = computeStats(
      [
        game("win"),
        game("win", { whiteId: THEM, blackId: ME }),
        game("loss", { whiteId: THEM, blackId: ME }),
      ],
      ME,
    );

    expect(stats.byColour).toEqual({
      white: { wins: 1, losses: 0, draws: 0 },
      black: { wins: 1, losses: 1, draws: 0 },
    });
  });

  test("groups by time-control category, fastest first", () => {
    const stats = computeStats(
      [
        game("win", { initialTimeMs: 600_000 }),
        game("loss", { initialTimeMs: 60_000 }),
        game("draw", { initialTimeMs: 180_000, incrementMs: 2_000 }),
        game("win"),
        game("win", { initialTimeMs: 900_000 }),
      ],
      ME,
    );

    expect(stats.byCategory).toEqual([
      { category: "Bullet", wins: 0, losses: 1, draws: 0 },
      { category: "Blitz", wins: 1, losses: 0, draws: 1 },
      { category: "Rapid", wins: 1, losses: 0, draws: 0 },
      { category: "Other", wins: 1, losses: 0, draws: 0 },
    ]);
  });

  test("the current streak is the run of the newest results", () => {
    const stats = computeStats(
      [game("loss"), game("loss"), game("win"), game("loss")],
      ME,
    );

    expect(stats.streak.current).toEqual({ outcome: "loss", length: 2 });
  });

  test("unplayed games do not break a streak", () => {
    const stats = computeStats(
      [game("win"), game("unplayed"), game("win"), game("draw")],
      ME,
    );

    expect(stats.streak.current).toEqual({ outcome: "win", length: 2 });
  });

  test("the best win streak can be in the past", () => {
    const stats = computeStats(
      [game("loss"), game("win"), game("win"), game("win"), game("draw"), game("win")],
      ME,
    );

    expect(stats.streak.bestWin).toBe(3);
  });
});
