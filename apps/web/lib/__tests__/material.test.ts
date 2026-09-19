import { describe, expect, test } from "bun:test";
import { START_FEN } from "@repo/game-core";
import { materialOf } from "../material";

describe("materialOf", () => {
  test("the starting position has nothing captured and no advantage", () => {
    expect(materialOf(START_FEN)).toEqual({
      white: { captured: [], advantage: 0 },
      black: { captured: [], advantage: 0 },
    });
  });

  test("a capture is credited to the side that made it", () => {
    // 1. e4 d5 2. exd5: white has taken a pawn.
    const fen = "rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2";

    expect(materialOf(fen)).toEqual({
      white: { captured: ["p"], advantage: 1 },
      black: { captured: [], advantage: 0 },
    });
  });

  test("captures list lowest value first, and the lead is net points", () => {
    // White is missing a knight; black is missing two pawns and a rook.
    const fen = "1nbqkbnr/pppppp2/8/8/8/8/PPPPPPPP/R1BQKBNR w KQk - 0 1";

    expect(materialOf(fen)).toEqual({
      white: { captured: ["p", "p", "r"], advantage: 4 },
      black: { captured: ["N"], advantage: 0 },
    });
  });

  test("equal trades cancel out", () => {
    // Queens off.
    const fen = "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1";

    expect(materialOf(fen).white).toEqual({ captured: ["q"], advantage: 0 });
    expect(materialOf(fen).black).toEqual({ captured: ["Q"], advantage: 0 });
  });

  test("a promotion is never a negative capture, but its points count", () => {
    // White's h-pawn took its way to h8 and promoted: black is down a pawn and
    // a rook, white has a second queen. 47 points to 33.
    const fen = "rnbqkbnQ/ppppppp1/8/8/8/8/PPPPPPP1/RNBQKBNR b KQq - 0 1";

    // The promoted pawn reads as a capture for black — the set is short one —
    // which is how a count against a full set has to see it.
    expect(materialOf(fen)).toEqual({
      white: { captured: ["p", "r"], advantage: 14 },
      black: { captured: ["P"], advantage: 0 },
    });
  });
});
