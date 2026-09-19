import { START_FEN } from "@repo/game-core";
import type { Move } from "./api";

export type PlyCell = { ply: number; san: string; spentMs: number | null };
export type MoveRow = { number: number; white?: PlyCell; black?: PlyCell };

/**
 * Time each move took, from the mover's clock before and after it. Null where
 * either reading is missing — rows from before clocks were recorded.
 */
export function timeSpent(
  moves: Move[],
  initialTimeMs: number,
  incrementMs: number,
): (number | null)[] {
  const before: Record<"white" | "black", number | null> = {
    white: initialTimeMs,
    black: initialTimeMs,
  };

  return moves.map((move) => {
    const side = move.moveNumber % 2 === 1 ? "white" : "black";
    const prior = before[side];
    before[side] = move.clockMs;

    if (prior === null || move.clockMs === null) return null;

    return Math.max(0, prior + incrementMs - move.clockMs);
  });
}

/** `4.2s` under ten seconds, `34s` under a minute, `1:05` beyond. */
export function formatSpent(ms: number): string {
  if (ms < 10_000) return `${(Math.floor(ms / 100) / 10).toFixed(1)}s`;

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Pairs the flat move list into numbered white/black rows. */
export function toRows(
  moves: Move[],
  spent: (number | null)[] = [],
): MoveRow[] {
  const rows: MoveRow[] = [];

  for (const [i, move] of moves.entries()) {
    const index = Math.floor((move.moveNumber - 1) / 2);
    const row = (rows[index] ??= { number: index + 1 });
    const cell = {
      ply: move.moveNumber,
      san: move.san,
      spentMs: spent[i] ?? null,
    };

    if (move.moveNumber % 2 === 1) row.white = cell;
    else row.black = cell;
  }

  return rows;
}

export function clampPly(ply: number, total: number): number {
  return Math.min(Math.max(ply, 0), total);
}

/** Ply 0 is the starting position; ply n is the position after move n. */
export function positionAt(
  moves: Move[],
  ply: number,
): { fen: string; lastMove: { from: string; to: string } | null } {
  const move = moves[clampPly(ply, moves.length) - 1];

  return move
    ? { fen: move.fen, lastMove: { from: move.from, to: move.to } }
    : { fen: START_FEN, lastMove: null };
}

export type ReviewKey = "first" | "prev" | "next" | "last";

export const REVIEW_KEYS: Record<string, ReviewKey> = {
  ArrowLeft: "prev",
  ArrowRight: "next",
  Home: "first",
  End: "last",
};

export function stepPly(key: ReviewKey, ply: number, total: number): number {
  switch (key) {
    case "first":
      return 0;
    case "prev":
      return clampPly(ply - 1, total);
    case "next":
      return clampPly(ply + 1, total);
    case "last":
      return total;
  }
}
