import { START_FEN } from "@repo/game-core";
import type { Move } from "./api";

export type PlyCell = { ply: number; san: string; spentMs: number | null };
export type MoveRow = { number: number; white?: PlyCell; black?: PlyCell };

/**
 * The move number and mover of ply `ply` (1-based) in a game that began at
 * `startFen` — a fork can open on black's move, deep into the game.
 */
export function plyAt(
  startFen: string,
  ply: number,
): { number: number; side: "white" | "black" } {
  const [, turn, , , , fullmove] = startFen.split(" ");
  const offset = ply - 1 + (turn === "b" ? 1 : 0);

  return {
    number: (Number(fullmove) || 1) + Math.floor(offset / 2),
    side: offset % 2 === 0 ? "white" : "black",
  };
}

/**
 * Time each move took, from the mover's clock before and after it. Null where
 * either reading is missing — rows from before clocks were recorded.
 */
export function timeSpent(
  moves: Move[],
  initialTimeMs: number,
  incrementMs: number,
  startFen: string = START_FEN,
): (number | null)[] {
  const before: Record<"white" | "black", number | null> = {
    white: initialTimeMs,
    black: initialTimeMs,
  };

  return moves.map((move) => {
    const { side } = plyAt(startFen, move.moveNumber);
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
  startFen: string = START_FEN,
): MoveRow[] {
  const rows: MoveRow[] = [];
  const first = plyAt(startFen, 1).number;

  for (const [i, move] of moves.entries()) {
    const { number, side } = plyAt(startFen, move.moveNumber);
    const row = (rows[number - first] ??= { number });
    const cell = {
      ply: move.moveNumber,
      san: move.san,
      spentMs: spent[i] ?? null,
    };

    row[side] = cell;
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
  startFen: string = START_FEN,
): { fen: string; lastMove: { from: string; to: string } | null } {
  const move = moves[clampPly(ply, moves.length) - 1];

  return move
    ? { fen: move.fen, lastMove: { from: move.from, to: move.to } }
    : { fen: startFen, lastMove: null };
}

/** `12. Nf3`, `12… Nf6`, or the starting position for ply 0. */
export function plyLabel(
  moves: Move[],
  ply: number,
  startFen: string = START_FEN,
): string {
  const move = moves[ply - 1];
  if (!move) return "the starting position";

  const { number, side } = plyAt(startFen, ply);
  return side === "white" ? `${number}. ${move.san}` : `${number}… ${move.san}`;
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
