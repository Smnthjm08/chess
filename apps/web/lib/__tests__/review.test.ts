import { describe, expect, test } from "bun:test";
import { START_FEN } from "@repo/game-core";
import type { Move } from "../api";
import {
  clampPly,
  formatSpent,
  plyAt,
  plyLabel,
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

describe("from a forked position", () => {
  // Black to move on move 2.
  const FORK_FEN =
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";

  test("plyAt numbers from the position and starts on its mover", () => {
    expect(plyAt(FORK_FEN, 1)).toEqual({ number: 2, side: "black" });
    expect(plyAt(FORK_FEN, 2)).toEqual({ number: 3, side: "white" });
    expect(plyAt(FORK_FEN, 3)).toEqual({ number: 3, side: "black" });
  });

  test("the standard start is move 1, white", () => {
    expect(plyAt(START_FEN, 1)).toEqual({ number: 1, side: "white" });
    expect(plyAt(START_FEN, 4)).toEqual({ number: 2, side: "black" });
  });

  test("toRows opens on a black-only row", () => {
    expect(toRows(MOVES, [], FORK_FEN)).toEqual([
      { number: 2, black: { ply: 1, san: "e4", spentMs: null } },
      {
        number: 3,
        white: { ply: 2, san: "e5", spentMs: null },
        black: { ply: 3, san: "Nf3", spentMs: null },
      },
    ]);
  });

  test("ply 0 is the forked position", () => {
    expect(positionAt(MOVES, 0, FORK_FEN).fen).toBe(FORK_FEN);
  });

  test("plyLabel uses the fork's numbering", () => {
    expect(plyLabel(MOVES, 0, FORK_FEN)).toBe("the starting position");
    expect(plyLabel(MOVES, 1, FORK_FEN)).toBe("2… e4");
    expect(plyLabel(MOVES, 2, FORK_FEN)).toBe("3. e5");
  });

  test("timeSpent pairs clocks by the side that actually moved", () => {
    const moves = [
      move(1, "Nc6", "b8", "c6", 295_000),
      move(2, "Bb5", "f1", "b5", 290_000),
      move(3, "a6", "a7", "a6", 285_000),
    ];

    // Black moves first (clock not yet running), then white 10s, black 10s.
    expect(timeSpent(moves, 300_000, 0, FORK_FEN)).toEqual([
      5_000, 10_000, 10_000,
    ]);
  });
});
