import type { Turn } from "../engine";
import type { EventType } from "./events";

export type GameRole = "white" | "black" | "spectator";

// client -> server
export type ClientMessage =
  | {
      type: EventType.GAME_JOIN;
      gameId: string;
    }
  | {
      type: EventType.GAME_LEAVE;
      gameId: string;
    }
  | {
      type: EventType.GAME_MOVE;
      gameId: string;
      data: {
        from: string;
        to: string;
        promotion?: string;
      };
    }
  | {
      type: EventType.GAME_PAUSE;
      gameId: string;
    }
  | {
      type: EventType.GAME_RESUME;
      gameId: string;
    }
  | {
      type: EventType.GAME_RESIGN;
      gameId: string;
    }
  | {
      type: EventType.GAME_DRAW_OFFER;
      gameId: string;
    }
  | {
      type: EventType.GAME_DRAW_ACCEPT;
      gameId: string;
    }
  | {
      type: EventType.GAME_DRAW_DECLINE;
      gameId: string;
    }
  | {
      type: EventType.GAME_REMATCH_OFFER;
      gameId: string;
    }
  | {
      type: EventType.GAME_REMATCH_ACCEPT;
      gameId: string;
    }
  | {
      type: EventType.GAME_REMATCH_DECLINE;
      gameId: string;
    };

// server -> client
export type ServerMessage =
  | {
      type: EventType.GAME_JOIN;
      gameId: string;
      data?: {
        userId: string;
      };
    }
  | {
      type: EventType.GAME_LEAVE;
      gameId: string;
      data?: {
        userId?: string;
      };
    }
  | {
      type: EventType.GAME_STATE;
      gameId: string;
      data: {
        fen: string;
        whiteId: string | null;
        blackId: string | null;
        whiteTimeMs: number;
        blackTimeMs: number;
        status: string;
        turn: Turn;
        // `GameResult` name, null until the game ends.
        result: string | null;
        winnerId: string | null;
        role: GameRole;
        /** The player whose draw offer is standing, or null. */
        drawOffer: string | null;
        /** The player whose rematch offer is standing, or null. */
        rematchOffer: string | null;
      };
    }
  | {
      type: EventType.GAME_MOVE;
      gameId: string;
      data: {
        from: string;
        to: string;
        promotion?: string;
        san: string;
        fen: string;
      };
    }
  | {
      type: EventType.GAME_PAUSE;
      gameId: string;
      data?: {
        status: string;
      };
    }
  | {
      type: EventType.GAME_RESUME;
      gameId: string;
      data?: {
        status: string;
      };
    }
  | {
      type: EventType.GAME_RESIGN;
      gameId: string;
      data: {
        userId: string;
      };
    }
  | {
      type: EventType.GAME_DRAW_OFFER;
      gameId: string;
      data: {
        userId: string;
      };
    }
  | {
      type: EventType.GAME_DRAW_ACCEPT;
      gameId: string;
      data: {
        userId: string;
      };
    }
  | {
      type: EventType.GAME_DRAW_DECLINE;
      gameId: string;
      data: {
        userId: string;
      };
    }
  | {
      type: EventType.GAME_REMATCH_OFFER;
      gameId: string;
      data: {
        userId: string;
      };
    }
  | {
      type: EventType.GAME_REMATCH_DECLINE;
      gameId: string;
      data: {
        userId: string;
      };
    }
  | {
      // `gameId` is the finished game the offer was made in; the rematch is a
      // new game the players are expected to move to.
      type: EventType.GAME_REMATCH_READY;
      gameId: string;
      data: {
        rematchGameId: string;
      };
    }
  | {
      type: EventType.GAME_ERROR;
      data: {
        message: string;
      };
    }
  | {
      type: EventType.CONNECTED;
    };
