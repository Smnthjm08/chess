import { toPgn, type PgnResult } from "@repo/game-core";
import { playerLabel, type GameDetail, type GameResult } from "./api";

/** An unfinished game exports as `*` — PGN's "result unknown". */
function pgnResult(game: GameDetail): PgnResult {
  if (game.status !== "FINISHED") return "*";
  if (!game.winnerId) return "1/2-1/2";

  return game.winnerId === game.whiteId ? "1-0" : "0-1";
}

/**
 * PGN's `Termination` takes a fixed vocabulary, so the reasons the interface
 * spells out ("Checkmate", "Threefold repetition") all land on `Normal` —
 * the movetext already says how those games ended.
 */
const TERMINATION: Partial<Record<GameResult, string>> = {
  TIMEOUT: "Time forfeit",
  ABANDONED: "Abandoned",
};

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "player"
  );
}

export function gamePgn(game: GameDetail): string {
  const played = new Date(game.createdAt);

  return toPgn(
    {
      site: "Chess",
      date: played,
      white: playerLabel(game.white, "Unknown"),
      black: playerLabel(game.black, "Unknown"),
      result: pgnResult(game),
      initialMs: game.initialTimeMs,
      incrementMs: game.incrementMs,
      termination:
        game.status === "FINISHED" && game.result
          ? (TERMINATION[game.result] ?? "Normal")
          : undefined,
    },
    game.moves.map((move) => move.san),
  );
}

export function pgnFilename(game: GameDetail): string {
  const played = new Date(game.createdAt);
  const date = Number.isNaN(played.getTime())
    ? "game"
    : played.toISOString().slice(0, 10);

  return `${slug(playerLabel(game.white, "unknown"))}-vs-${slug(playerLabel(game.black, "unknown"))}-${date}.pgn`;
}
