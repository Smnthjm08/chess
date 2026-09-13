import { EventType, type ClientMessage } from "@repo/game-core";
import z from "zod";

const gameIdOnly = <T extends ClientMessage["type"]>(type: T) =>
  z.object({
    type: z.literal(type),
    gameId: z.string().min(1),
  });

const square = z.string().regex(/^[a-h][1-8]$/);

export const clientMessageSchema: z.ZodType<ClientMessage> =
  z.discriminatedUnion("type", [
    gameIdOnly(EventType.GAME_JOIN),
    gameIdOnly(EventType.GAME_LEAVE),
    z.object({
      type: z.literal(EventType.GAME_MOVE),
      gameId: z.string().min(1),
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
