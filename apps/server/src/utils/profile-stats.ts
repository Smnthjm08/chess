import { GameResult } from "@repo/db";
import { TIME_CONTROLS } from "@repo/game-core";

/** Every decisive result records a `winnerId`; these are the ones that do not. */
export const DRAW_RESULTS: GameResult[] = [
  GameResult.STALEMATE,
  GameResult.THREEFOLD_REPETITION,
  GameResult.INSUFFICIENT_MATERIAL,
  GameResult.FIFTY_MOVE_RULE,
  GameResult.DRAW_AGREED,
];

export type Outcome = "win" | "loss" | "draw";

export type StatsGame = {
  whiteId: string | null;
  blackId: string | null;
  winnerId: string | null;
  result: GameResult | null;
  initialTimeMs: number;
  incrementMs: number;
};

export type Record3 = { wins: number; losses: number; draws: number };

export type ProfileStats = Record3 & {
  played: number;
  /** Wins over games played, 0–1; null before the first result. */
  winRate: number | null;
  byColour: { white: Record3; black: Record3 };
  byCategory: (Record3 & { category: string })[];
  streak: {
    /** The run the player is on now, most recent game first. */
    current: { outcome: Outcome; length: number } | null;
    bestWin: number;
  };
};

const CATEGORY_ORDER = ["Bullet", "Blitz", "Rapid", "Other"];

function categoryOf(game: StatsGame): string {
  const control = Object.values(TIME_CONTROLS).find(
    (entry) =>
      entry.initialMs === game.initialTimeMs &&
      entry.incrementMs === game.incrementMs,
  );

  return control?.category ?? "Other";
}

/**
 * A finished game from `userId`'s side. Null when it does not count: a game
 * abandoned before anyone took the second seat was never played, and finishes
 * with neither a winner nor a draw result.
 */
export function outcomeFor(game: StatsGame, userId: string): Outcome | null {
  if (!game.whiteId || !game.blackId) return null;
  if (game.winnerId) return game.winnerId === userId ? "win" : "loss";
  if (game.result && DRAW_RESULTS.includes(game.result)) return "draw";

  return null;
}

const empty = (): Record3 => ({ wins: 0, losses: 0, draws: 0 });

function tally(record: Record3, outcome: Outcome) {
  if (outcome === "win") record.wins += 1;
  else if (outcome === "loss") record.losses += 1;
  else record.draws += 1;
}

/** `games` are the player's finished games, newest first. */
export function computeStats(
  games: StatsGame[],
  userId: string,
): ProfileStats {
  const total = empty();
  const byColour = { white: empty(), black: empty() };
  const byCategory = new Map<string, Record3>();

  let current: ProfileStats["streak"]["current"] = null;
  let streakOpen = true;
  let bestWin = 0;
  let winRun = 0;

  for (const game of games) {
    const outcome = outcomeFor(game, userId);
    if (!outcome) continue;

    tally(total, outcome);
    tally(byColour[game.whiteId === userId ? "white" : "black"], outcome);

    const category = categoryOf(game);
    if (!byCategory.has(category)) byCategory.set(category, empty());
    tally(byCategory.get(category)!, outcome);

    if (streakOpen) {
      if (!current) current = { outcome, length: 1 };
      else if (current.outcome === outcome) current.length += 1;
      else streakOpen = false;
    }

    winRun = outcome === "win" ? winRun + 1 : 0;
    bestWin = Math.max(bestWin, winRun);
  }

  const played = total.wins + total.losses + total.draws;

  return {
    ...total,
    played,
    winRate: played > 0 ? total.wins / played : null,
    byColour,
    byCategory: CATEGORY_ORDER.filter((name) => byCategory.has(name)).map(
      (name) => ({ category: name, ...byCategory.get(name)! }),
    ),
    streak: { current, bestWin },
  };
}
