import { describe, expect, test } from "bun:test";
import {
  createEngine,
  getActiveTurn,
  getCheckedSquare,
  getLegalMoves,
  getOutcome,
  isPromotion,
  START_FEN,
  tryMove,
} from "../engine";

/** Plays a list of SAN-ish coordinate moves and returns the engine. */
function play(moves: [string, string][], fen = START_FEN) {
  const engine = createEngine(fen);

  for (const [from, to] of moves) {
    const result = tryMove(engine, { from, to });
    if (!result) throw new Error(`illegal move in fixture: ${from}${to}`);
  }

  return engine;
}

describe("getActiveTurn", () => {
  test("reads the active colour out of the FEN", () => {
    expect(getActiveTurn(START_FEN)).toBe("white");
    expect(getActiveTurn("8/8/8/8/8/8/8/K6k b - - 0 1")).toBe("black");
  });

  test("treats a malformed FEN as white to move", () => {
    expect(getActiveTurn("")).toBe("white");
    expect(getActiveTurn("nonsense")).toBe("white");
  });
});

describe("tryMove", () => {
  test("applies a legal move and reports it", () => {
    const engine = createEngine();
    const result = tryMove(engine, { from: "e2", to: "e4" });

    expect(result).not.toBeNull();
    expect(result?.san).toBe("e4");
    expect(result?.from).toBe("e2");
    expect(result?.to).toBe("e4");
    expect(getActiveTurn(result!.fen)).toBe("black");
  });

  test("returns null for an illegal move instead of throwing", () => {
    expect(tryMove(createEngine(), { from: "e2", to: "e5" })).toBeNull();
  });

  test("returns null for a move by the side not on move", () => {
    expect(tryMove(createEngine(), { from: "e7", to: "e5" })).toBeNull();
  });

  test("returns null for a malformed square", () => {
    expect(tryMove(createEngine(), { from: "zz", to: "e4" })).toBeNull();
  });

  test("leaves the position untouched when a move is rejected", () => {
    const engine = createEngine();
    tryMove(engine, { from: "e2", to: "e5" });

    expect(engine.fen()).toBe(START_FEN);
  });

  test("carries the promotion piece through", () => {
    const engine = createEngine("k7/4P3/8/8/8/8/8/K7 w - - 0 1");
    const result = tryMove(engine, { from: "e7", to: "e8", promotion: "n" });

    expect(result?.san).toBe("e8=N");
    expect(result?.promotion).toBe("n");
  });

  test("rejects a promotion with no piece chosen", () => {
    const engine = createEngine("k7/4P3/8/8/8/8/8/K7 w - - 0 1");

    expect(tryMove(engine, { from: "e7", to: "e8" })).toBeNull();
  });
});

describe("getOutcome", () => {
  test("an ongoing game is not over", () => {
    expect(getOutcome(createEngine())).toEqual({
      isGameOver: false,
      result: null,
      winner: null,
    });
  });

  test("checkmate names the winner", () => {
    // Fool's mate: the side to move is mated, so the other side won.
    const engine = play([
      ["f2", "f3"],
      ["e7", "e5"],
      ["g2", "g4"],
      ["d8", "h4"],
    ]);

    expect(getOutcome(engine)).toEqual({
      isGameOver: true,
      result: "CHECKMATE",
      winner: "black",
    });
  });

  test("stalemate is a draw with no winner", () => {
    const engine = createEngine("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");

    expect(getOutcome(engine)).toEqual({
      isGameOver: true,
      result: "STALEMATE",
      winner: null,
    });
  });

  test("insufficient material is a draw", () => {
    const engine = createEngine("8/8/8/4k3/8/8/4K3/8 w - - 0 1");

    expect(getOutcome(engine)).toEqual({
      isGameOver: true,
      result: "INSUFFICIENT_MATERIAL",
      winner: null,
    });
  });

  test("the fifty-move rule is a draw", () => {
    const engine = createEngine("8/8/4k3/8/8/4K3/7R/8 w - - 100 80");

    expect(getOutcome(engine)).toEqual({
      isGameOver: true,
      result: "FIFTY_MOVE_RULE",
      winner: null,
    });
  });

  test("threefold repetition is a draw", () => {
    // Both kings shuffle back to the same position for the third time.
    const engine = play(
      [
        ["e1", "e2"],
        ["e8", "e7"],
        ["e2", "e1"],
        ["e7", "e8"],
        ["e1", "e2"],
        ["e8", "e7"],
        ["e2", "e1"],
        ["e7", "e8"],
      ],
      "4k3/8/8/8/8/8/7R/4K3 w - - 0 1",
    );

    expect(getOutcome(engine)).toEqual({
      isGameOver: true,
      result: "THREEFOLD_REPETITION",
      winner: null,
    });
  });
});

describe("getLegalMoves", () => {
  test("lists the destinations of the piece on the square", () => {
    expect(getLegalMoves(START_FEN, "e2").sort()).toEqual(["e3", "e4"]);
    expect(getLegalMoves(START_FEN, "g1").sort()).toEqual(["f3", "h3"]);
  });

  test("is empty for an empty square and for the idle side", () => {
    expect(getLegalMoves(START_FEN, "e4")).toEqual([]);
    expect(getLegalMoves(START_FEN, "e7")).toEqual([]);
  });

  test("collapses the four promotion moves onto one square", () => {
    expect(getLegalMoves("k7/4P3/8/8/8/8/8/K7 w - - 0 1", "e7")).toEqual([
      "e8",
    ]);
  });

  test("offers castling as a king move to its landing square", () => {
    const targets = getLegalMoves("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", "e1");

    expect(targets).toContain("g1");
    expect(targets).toContain("c1");
    // Never the rook's own square — that would be an illegal `to`.
    expect(targets).not.toContain("h1");
  });

  test("excludes moves that would expose the king", () => {
    // The bishop is pinned against its king down the e-file by the rook.
    expect(getLegalMoves("4r2k/8/8/8/8/8/4B3/4K3 w - - 0 1", "e2")).toEqual([]);
  });

  test("offers only the moves that answer a check", () => {
    // The rook checks along the first rank; the bishop's one legal move is
    // to interpose on f1.
    expect(getLegalMoves("4k3/8/8/8/8/8/4B3/4K2r w - - 0 1", "e2")).toEqual([
      "f1",
    ]);
  });

  test("fails closed on a malformed square", () => {
    expect(getLegalMoves(START_FEN, "z9")).toEqual([]);
    expect(getLegalMoves(START_FEN, "")).toEqual([]);
    expect(getLegalMoves("not a fen", "e2")).toEqual([]);
  });
});

describe("isPromotion", () => {
  const promoting = "1n5k/P7/8/8/8/8/8/K7 w - - 0 1";

  test("is true for a pawn reaching the back rank", () => {
    expect(isPromotion(promoting, "a7", "a8")).toBe(true);
  });

  test("is true for a capture onto the back rank", () => {
    expect(isPromotion(promoting, "a7", "b8")).toBe(true);
  });

  test("is false for a pawn that cannot reach the rank", () => {
    // Blocked by a bishop, so nothing promotes even though the rank is right.
    expect(isPromotion("4b2k/4P3/8/8/8/8/8/K7 w - - 0 1", "e7", "e8")).toBe(
      false,
    );
  });

  test("is false for any other piece landing on the back rank", () => {
    expect(isPromotion("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a1", "a8")).toBe(
      false,
    );
  });

  test("fails closed on malformed squares", () => {
    expect(isPromotion(promoting, "zz", "a8")).toBe(false);
    expect(isPromotion(promoting, "a7", "")).toBe(false);
  });
});

describe("getCheckedSquare", () => {
  test("returns the square of the king in check", () => {
    const engine = play([
      ["f2", "f3"],
      ["e7", "e5"],
      ["g2", "g4"],
      ["d8", "h4"],
    ]);

    expect(getCheckedSquare(engine.fen())).toBe("e1");
  });

  test("returns null when nobody is in check", () => {
    expect(getCheckedSquare(START_FEN)).toBeNull();
  });

  test("points at the side to move, not the side that gave check", () => {
    expect(getCheckedSquare("4k3/8/8/8/8/8/8/R3K3 b - - 0 1")).toBeNull();
    expect(getCheckedSquare("4k3/8/8/8/8/8/8/4R1K1 b - - 0 1")).toBe("e8");
  });

  test("fails closed on a malformed FEN", () => {
    expect(getCheckedSquare("not a fen")).toBeNull();
  });
});
