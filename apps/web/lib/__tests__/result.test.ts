import { describe, expect, test } from "bun:test";
import type { GameResult } from "../api";
import { outcomeFor, RESULT_TEXT, resultSummary } from "../result";

const alice = {
  id: "w1",
  name: "alice",
  username: "alice",
  displayUsername: "Alice",
};
const bob = { id: "b1", name: "bob", username: "bob", displayUsername: "Bob" };

const game = (winnerId: string | null, result: GameResult | null) => ({
  whiteId: "w1",
  blackId: "b1",
  winnerId,
  result,
  white: alice,
  black: bob,
});

describe("outcomeFor", () => {
  test("each player sees the result from their own side", () => {
    expect(outcomeFor(game("w1", "CHECKMATE"), "w1")).toBe("won");
    expect(outcomeFor(game("w1", "CHECKMATE"), "b1")).toBe("lost");
  });

  test("a spectator is told neither", () => {
    expect(outcomeFor(game("w1", "CHECKMATE"), "someone-else")).toBe("over");
    expect(outcomeFor(game("w1", "CHECKMATE"), null)).toBe("over");
  });

  test("no winner is a draw for everyone", () => {
    expect(outcomeFor(game(null, "STALEMATE"), "w1")).toBe("draw");
    expect(outcomeFor(game(null, "DRAW_AGREED"), null)).toBe("draw");
  });
});

describe("resultSummary", () => {
  test("names the winner of a decisive game", () => {
    expect(resultSummary(game("w1", "CHECKMATE"))).toBe(
      "Checkmate — Alice wins",
    );
    expect(resultSummary(game("b1", "RESIGNATION"))).toBe(
      "Resignation — Bob wins",
    );
    expect(resultSummary(game("b1", "TIMEOUT"))).toBe("Out of time — Bob wins");
  });

  test("a draw names no winner", () => {
    expect(resultSummary(game(null, "STALEMATE"))).toBe("Stalemate");
    expect(resultSummary(game(null, "DRAW_AGREED"))).toBe("Draw agreed");
  });

  test("falls back when there is no result yet", () => {
    expect(resultSummary(game(null, null))).toBe("Game over");
  });

  test("every result the API can return has wording", () => {
    const results: GameResult[] = [
      "CHECKMATE",
      "RESIGNATION",
      "TIMEOUT",
      "STALEMATE",
      "THREEFOLD_REPETITION",
      "INSUFFICIENT_MATERIAL",
      "FIFTY_MOVE_RULE",
      "DRAW_AGREED",
      "ABANDONED",
    ];

    for (const result of results) expect(RESULT_TEXT[result]).toBeTruthy();
  });
});
