import { playerLabel, type GameDetail, type GameResult } from "@/lib/api";

export const RESULT_TEXT: Record<GameResult, string> = {
  CHECKMATE: "Checkmate",
  RESIGNATION: "Resignation",
  TIMEOUT: "Out of time",
  STALEMATE: "Stalemate",
  THREEFOLD_REPETITION: "Threefold repetition",
  INSUFFICIENT_MATERIAL: "Insufficient material",
  FIFTY_MOVE_RULE: "Fifty-move rule",
  DRAW_AGREED: "Draw agreed",
  ABANDONED: "Abandoned",
};

export type Outcome = "won" | "lost" | "draw" | "over";

/** What the result means to whoever is looking at it. */
export function outcomeFor(
  game: Pick<GameDetail, "whiteId" | "blackId" | "winnerId">,
  viewerId: string | null,
): Outcome {
  if (!game.winnerId) return "draw";

  const playing =
    viewerId !== null &&
    (viewerId === game.whiteId || viewerId === game.blackId);

  if (!playing) return "over";

  return game.winnerId === viewerId ? "won" : "lost";
}

export const OUTCOME_TITLE: Record<Outcome, string> = {
  won: "You won",
  lost: "You lost",
  draw: "Draw",
  over: "Game over",
};

export function resultSummary(
  game: Pick<GameDetail, "white" | "black" | "winnerId" | "result">,
): string {
  if (!game.result) return "Game over";

  const reason = RESULT_TEXT[game.result];

  if (!game.winnerId) return reason;

  const winner =
    game.winnerId === game.white?.id ? game.white : (game.black ?? null);

  return `${reason} — ${playerLabel(winner)} wins`;
}
