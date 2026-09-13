import { EventType, type ClientMessage } from "@repo/game-core";
import z from "zod";
import { canMatchText } from "../utils/text";

// Every handler reads its game by this id, so a NUL is refused here rather
// than reaching Postgres and coming back as an internal error.
const gameId = z.string().min(1).refine(canMatchText, "Invalid game id");

const gameIdOnly = <T extends ClientMessage["type"]>(type: T) =>
  z.object({
    type: z.literal(type),
    gameId,
  });

const square = z.string().regex(/^[a-h][1-8]$/);

export const clientMessageSchema: z.ZodType<ClientMessage> =
  z.discriminatedUnion("type", [
    gameIdOnly(EventType.GAME_JOIN),
    gameIdOnly(EventType.GAME_LEAVE),
    z.object({
      type: z.literal(EventType.GAME_MOVE),
      gameId,
      data: z.object({
        from: square,
        to: square,
        promotion: z.enum(["q", "r", "b", "n"]).optional(),
      }),
    }),
    gameIdOnly(EventType.GAME_PAUSE),
    gameIdOnly(EventType.GAME_RESUME),
    gameIdOnly(EventType.GAME_RESIGN),
    gameIdOnly(EventType.GAME_DRAW_OFFER),
    gameIdOnly(EventType.GAME_DRAW_ACCEPT),
    gameIdOnly(EventType.GAME_DRAW_DECLINE),
    gameIdOnly(EventType.GAME_REMATCH_OFFER),
    gameIdOnly(EventType.GAME_REMATCH_ACCEPT),
    gameIdOnly(EventType.GAME_REMATCH_DECLINE),
  ]);
