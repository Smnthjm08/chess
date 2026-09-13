import { GameStatus, prisma } from "@repo/db";
import { START_FEN } from "@repo/game-core";
import { scheduleClockExpiry } from "./clock-expiry";

/**
 * A rematch is born seated and running: both players are already known, so it
 * skips the WAITING phase and the second-seat claim that normally starts the
 * clock. Colours swap, the time control carries over, and both clocks start
 * full rather than from whatever was left on them.
 *
 * No state is broadcast — the new room is empty until the clients arrive and
 * send `game:join` for themselves.
 */
export async function createRematch(previous: {
  whiteId: string;
  blackId: string;
  initialTimeMs: number;
  incrementMs: number;
}) {
  const game = await prisma.game.create({
    data: {
      whiteId: previous.blackId,
      blackId: previous.whiteId,
      status: GameStatus.ACTIVE,
      fen: START_FEN,
      initialTimeMs: previous.initialTimeMs,
      incrementMs: previous.incrementMs,
      whiteTimeMs: previous.initialTimeMs,
      blackTimeMs: previous.initialTimeMs,
      lastMoveAt: new Date(),
    },
  });

  scheduleClockExpiry(game);

  return game;
}
