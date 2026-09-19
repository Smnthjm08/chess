import { colourOf, toSquares, type Orientation } from "./board";

/** Lowest value first, which is also the order captures are shown in. */
const PIECES = ["p", "n", "b", "r", "q"] as const;

type PieceType = (typeof PIECES)[number];

const VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const FULL_SET: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

export type SideMaterial = {
  /** Opponent pieces this side has taken, as FEN letters in the opponent's case. */
  captured: string[];
  /** Points ahead of the opponent; 0 when level or behind. */
  advantage: number;
};

/**
 * Captures are counted against a full set rather than tracked move by move, so
 * this reads any position — a reviewed ply or a forked start. A promotion can
 * leave more of a piece than a set holds; that is never shown as a negative
 * capture, and the points still count toward the advantage.
 */
export function materialOf(fen: string): Record<Orientation, SideMaterial> {
  const counts: Record<Orientation, Record<PieceType, number>> = {
    white: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    black: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };

  for (const piece of toSquares(fen)) {
    const type = piece?.toLowerCase() as PieceType | undefined;
    if (!piece || !type || !(type in VALUE)) continue;

    counts[colourOf(piece)][type] += 1;
  }

  const points = (side: Orientation) =>
    PIECES.reduce((sum, type) => sum + counts[side][type] * VALUE[type], 0);

  const capturedFrom = (victim: Orientation) =>
    PIECES.flatMap((type) =>
      Array<string>(Math.max(0, FULL_SET[type] - counts[victim][type])).fill(
        victim === "white" ? type.toUpperCase() : type,
      ),
    );

  const lead = points("white") - points("black");

  return {
    white: { captured: capturedFrom("black"), advantage: Math.max(0, lead) },
    black: { captured: capturedFrom("white"), advantage: Math.max(0, -lead) },
  };
}
