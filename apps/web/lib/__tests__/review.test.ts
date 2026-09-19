import { describe, expect, test } from "bun:test";
import { START_FEN } from "@repo/game-core";
import type { Move } from "../api";
import {
  clampPly,
  formatSpent,
  positionAt,
  stepPly,
  timeSpent,
  toRows,
} from "../review";

function move(
  moveNumber: number,
  san: string,
  from: string,
  to: string,
  clockMs: number | null = null,
): Move {
  return {
    id: `m${moveNumber}`,
    moveNumber,
    san,
    fen: `fen-after-${moveNumber}`,
    from,
    to,
    promotion: null,
    clockMs,
  };
}

const MOVES = [
  move(1, "e4", "e2", "e4"),
  move(2, "e5", "e7", "e5"),
  move(3, "Nf3", "g1", "f3"),
];

describe("toRows", () => {
  test("pairs plies into numbered rows, keeping each ply", () => {
    expect(toRows(MOVES)).toEqual([
      {
        number: 1,
        white: { ply: 1, san: "e4", spentMs: null },
        black: { ply: 2, san: "e5", spentMs: null },
      },
      { number: 2, white: { ply: 3, san: "Nf3", spentMs: null } },
    ]);
  });

  test("attaches time spent to each ply", () => {
    const rows = toRows(MOVES, [100, 2000, null]);

    expect(rows[0]?.white?.spentMs).toBe(100);
    expect(rows[0]?.black?.spentMs).toBe(2000);
    expect(rows[1]?.white?.spentMs).toBeNull();
  });

  test("an empty game has no rows", () => {
    expect(toRows([])).toEqual([]);
  });
});

describe("positionAt", () => {
  test("ply 0 is the starting position with no last move", () => {
    expect(positionAt(MOVES, 0)).toEqual({ fen: START_FEN, lastMove: null });
  });

  test("ply n is the position after move n", () => {
    expect(positionAt(MOVES, 2)).toEqual({
      fen: "fen-after-2",
      lastMove: { from: "e7", to: "e5" },
    });
  });

  test("out-of-range plies clamp to the ends", () => {
    expect(positionAt(MOVES, 99).fen).toBe("fen-after-3");
    expect(positionAt(MOVES, -4).fen).toBe(START_FEN);
  });
});

describe("stepPly", () => {
  test("steps and jumps within the game", () => {
    expect(stepPly("prev", 2, 3)).toBe(1);
    expect(stepPly("next", 2, 3)).toBe(3);
    expect(stepPly("first", 2, 3)).toBe(0);
    expect(stepPly("last", 0, 3)).toBe(3);
  });

  test("does not step past either end", () => {
    expect(stepPly("prev", 0, 3)).toBe(0);
    expect(stepPly("next", 3, 3)).toBe(3);
  });

  test("clampPly bounds to [0, total]", () => {
    expect(clampPly(5, 3)).toBe(3);
    expect(clampPly(-1, 3)).toBe(0);
  });
});

describe("timeSpent", () => {
  test("is each side's previous clock plus increment minus the new one", () => {
    // 3+2: white spends 0 (clock not yet running), black 5s, white 12s.
    const moves = [
      move(1, "e4", "e2", "e4", 182_000),
      move(2, "e5", "e7", "e5", 177_000),
      move(3, "Nf3", "g1", "f3", 172_000),
    ];

    expect(timeSpent(moves, 180_000, 2_000)).toEqual([0, 5_000, 12_000]);
  });

  test("is null where a clock reading is missing, and recovers after", () => {
    const moves = [
      move(1, "e4", "e2", "e4", null),
      move(2, "e5", "e7", "e5", 290_000),
      move(3, "Nf3", "g1", "f3", 280_000),
      move(4, "Nc6", "b8", "c6", 285_000),
    ];

    expect(timeSpent(moves, 300_000, 0)).toEqual([null, 10_000, null, 5_000]);
  });
});

describe("formatSpent", () => {
  test("tenths under ten seconds, whole seconds under a minute, then m:ss", () => {
    expect(formatSpent(0)).toBe("0.0s");
    expect(formatSpent(4_280)).toBe("4.2s");
    expect(formatSpent(34_900)).toBe("34s");
    expect(formatSpent(65_000)).toBe("1:05");
  });
});
