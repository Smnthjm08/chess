import { describe, expect, test } from "bun:test";
import { START_FEN } from "@repo/game-core";
import {
  colourOf,
  squareIndex,
  squareName,
  toSquares,
  type Orientation,
} from "../board";

const ORIENTATIONS: Orientation[] = ["white", "black"];

describe("toSquares", () => {
  test("expands a FEN into 64 squares, rank 8 first", () => {
    const squares = toSquares(START_FEN);

    expect(squares).toHaveLength(64);
    expect(squares[0]).toBe("r");
    expect(squares[4]).toBe("k");
    expect(squares[8]).toBe("p");
    expect(squares[63]).toBe("R");
  });

  test("turns run-length digits into empty squares", () => {
    expect(toSquares(START_FEN).slice(16, 32).every((s) => s === null)).toBe(
      true,
    );
  });

  test("handles a sparse position", () => {
    const squares = toSquares("8/8/8/4k3/8/8/8/4K3 w - - 0 1");

    expect(squares.filter(Boolean)).toEqual(["k", "K"]);
    expect(squares).toHaveLength(64);
  });

  test("does not throw on a malformed FEN", () => {
    expect(() => toSquares("")).not.toThrow();
    expect(() => toSquares("garbage")).not.toThrow();
  });
});

describe("colourOf", () => {
  test("uppercase is white, lowercase is black", () => {
    expect(colourOf("K")).toBe("white");
    expect(colourOf("p")).toBe("black");
  });
});

describe("square geometry", () => {
  test("white's board starts at a8 and ends at h1", () => {
    expect(squareName(0, "white")).toBe("a8");
    expect(squareName(7, "white")).toBe("h8");
    expect(squareName(56, "white")).toBe("a1");
    expect(squareName(63, "white")).toBe("h1");
  });

  test("black's board is the same board turned around", () => {
    expect(squareName(0, "black")).toBe("h1");
    expect(squareName(63, "black")).toBe("a8");
  });

  test("a piece keeps its square when the board is flipped", () => {
    const squares = toSquares(START_FEN);
    const flipped = [...squares].reverse();

    for (let index = 0; index < 64; index++) {
      const name = squareName(index, "black");
      const fromWhite = squares[squareIndex(name, "white")];

      expect(flipped[index]).toBe(fromWhite!);
    }
  });

  test("squareIndex inverts squareName for all 64 squares", () => {
    for (const orientation of ORIENTATIONS) {
      for (let index = 0; index < 64; index++) {
        expect(squareIndex(squareName(index, orientation), orientation)).toBe(
          index,
        );
      }
    }
  });

  test("the promotion strip always fits on the board", () => {
    // The picker hangs four squares off the target, folding back on the near
    // half. Both promotion ranks must leave it inside rows 0-7.
    for (const [square, orientation] of [
      ["e8", "white"],
      ["e1", "black"],
      ["e1", "white"],
      ["e8", "black"],
    ] as const) {
      const row = Math.floor(squareIndex(square, orientation) / 8);
      const top = row <= 3 ? row : row - 3;

      expect(top).toBeGreaterThanOrEqual(0);
      expect(top + 3).toBeLessThanOrEqual(7);
    }
  });
});
