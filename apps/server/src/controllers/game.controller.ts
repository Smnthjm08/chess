import {
  DEFAULT_TIME_CONTROL,
  START_FEN,
  TIME_CONTROLS,
  getActiveTurn,
  isTimeControlKey,
} from "@repo/game-core";
import type { Request, Response } from "express";
import { type Game, GameStatus, prisma } from "@repo/db";
import { scheduleClockExpiry } from "../sockets/clock-expiry";
import { gameSocketManager } from "../sockets/game-socket";
import { withGameLock } from "../sockets/game-lock";
import { playerSelect } from "../utils/player-select";

export const createGame = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        data: null,
        message: "Unauthorized",
      });
    }

    const existingActiveGame = await prisma.game.findFirst({
      where: {
        status: GameStatus.ACTIVE,
        OR: [{ whiteId: userId }, { blackId: userId }],
      },
    });

    if (existingActiveGame) {
      return res.status(400).json({
        success: false,
        error: "You are already in an active game",
        data: { activeGameId: existingActiveGame.id },
        message: "Single active game constraint violation",
      });
    }

    const { timeControl = DEFAULT_TIME_CONTROL } = (req.body ?? {}) as {
      timeControl?: unknown;
    };

    if (!isTimeControlKey(timeControl)) {
      return res.status(400).json({
        success: false,
        error: `Unknown time control: ${String(timeControl)}`,
        data: { allowed: Object.keys(TIME_CONTROLS) },
        message: "Invalid time control",
      });
    }

    const { initialMs, incrementMs } = TIME_CONTROLS[timeControl];

    const game = await prisma.game.create({
      data: {
        whiteId: userId,
        status: GameStatus.WAITING,
        fen: START_FEN,
        initialTimeMs: initialMs,
        incrementMs,
        // Both clocks start on the chosen control rather than the default.
        whiteTimeMs: initialMs,
        blackTimeMs: initialMs,
      },
    });

    res.status(201).json({
      success: true,
      error: null,
      data: game,
      message: "Game created",
    });
  } catch (error) {
    console.error("Error creating game", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
      message: "Internal server error",
    });
  }
};

type SeatResult =
  | { status: "ok"; game: Game; role: "white" | "black" }
  | { status: "not-found" }
  | { status: "full" };

/** Two seats, so a claim can lose at most twice before the game is full. */
const MAX_SEAT_ATTEMPTS = 3;

/**
 * The lock only covers this process, so each claim is also conditioned on the
 * seat still being null. Seats are never vacated, so the retry cannot spin.
 */
function claimSeat(gameId: string, userId: string): Promise<SeatResult> {
  return withGameLock(gameId, async () => {
    for (let attempt = 0; attempt < MAX_SEAT_ATTEMPTS; attempt++) {
      const game = await prisma.game.findUnique({ where: { id: gameId } });

      if (!game) return { status: "not-found" } as const;

      if (game.whiteId === userId) {
        return { status: "ok", game, role: "white" } as const;
      }

      if (game.blackId === userId) {
        return { status: "ok", game, role: "black" } as const;
      }

      const role = !game.whiteId ? "white" : !game.blackId ? "black" : null;

      if (!role) return { status: "full" } as const;

      // Filling the second seat is what starts the game and its clock.
      const { count } =
        role === "white"
          ? await prisma.game.updateMany({
              where: { id: gameId, whiteId: null },
              data: { whiteId: userId },
            })
          : await prisma.game.updateMany({
              where: { id: gameId, blackId: null },
              data: {
                blackId: userId,
                status: GameStatus.ACTIVE,
                lastMoveAt: new Date(),
              },
            });

      // Lost the seat to another process between the read and the write.
      if (count === 0) continue;

      const seated = await prisma.game.findUniqueOrThrow({
        where: { id: gameId },
      });

      scheduleClockExpiry(seated);

      gameSocketManager.broadcastGameState(gameId, {
        fen: seated.fen,
        whiteId: seated.whiteId,
        blackId: seated.blackId,
        whiteTimeMs: seated.whiteTimeMs,
        blackTimeMs: seated.blackTimeMs,
        status: seated.status,
        turn: getActiveTurn(seated.fen),
        result: seated.result,
        winnerId: seated.winnerId,
      });

      return { status: "ok", game: seated, role } as const;
    }

    return { status: "full" } as const;
  });
}

export const joinGame = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const rawGameId = req.params.gameId;
    const gameId = Array.isArray(rawGameId) ? rawGameId[0] : rawGameId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        data: null,
        message: "Unauthorized",
      });
    }

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: "Game ID is required",
        data: null,
        message: "Invalid game ID",
      });
    }

    const otherActiveGame = await prisma.game.findFirst({
      where: {
        status: GameStatus.ACTIVE,
        id: { not: gameId },
        OR: [{ whiteId: userId }, { blackId: userId }],
      },
    });

    if (otherActiveGame) {
      return res.status(400).json({
        success: false,
        error: "You are already in another active game",
        data: { activeGameId: otherActiveGame.id },
        message: "Single active game constraint violation",
      });
    }

    const seat = await claimSeat(gameId, userId);

    if (seat.status === "not-found") {
      return res.status(404).json({
        success: false,
        error: "Game not found",
        data: null,
        message: "Game not found",
      });
    }

    if (seat.status === "full") {
      return res.status(400).json({
        success: false,
        error: "Game is full",
        data: null,
        message: "Game is full",
      });
    }

    res.status(200).json({
      success: true,
      error: null,
      data: { game: seat.game, role: seat.role },
      message: "Joined game successfully",
    });
  } catch (error) {
    console.error("Error joining game", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
      message: "Internal server error",
    });
  }
};

export const getGames = async (req: Request, res: Response) => {
  try {
    const { status, page, limit } = req.query;

    // Comma-separated so a lobby tab can mean more than one status — "in
    // progress" is ACTIVE and PAUSED. Unrecognised names are dropped, and a
    // filter that names nothing valid falls back to no filter at all.
    const validStatuses = (typeof status === "string" ? status.split(",") : [])
      .map((value) => value.trim())
      .filter((value): value is GameStatus =>
        Object.values(GameStatus).includes(value as GameStatus),
      );

    const where =
      validStatuses.length > 0 ? { status: { in: validStatuses } } : undefined;

    const pageNumber = Math.max(
      1,
      Number.parseInt(typeof page === "string" ? page : "1", 10) || 1,
    );
    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(typeof limit === "string" ? limit : "20", 10) || 20,
      ),
    );

    const skip = (pageNumber - 1) * pageSize;

    const totalGames = await prisma.game.count({ where });

    const games = await prisma.game.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        white: { select: playerSelect },
        black: { select: playerSelect },
      },
    });

    const totalPages = Math.max(1, Math.ceil(totalGames / pageSize));

    res.status(200).json({
      success: true,
      error: null,
      data: games,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: totalGames,
        totalPages,
      },
      message: "Games fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching games", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
      message: "Internal server error",
    });
  }
};

export const getGameById = async (req: Request, res: Response) => {
  try {
    const rawGameId = req.params.gameId;
    const gameId = Array.isArray(rawGameId) ? rawGameId[0] : rawGameId;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: "Game ID is required",
        data: null,
        message: "Invalid game ID",
      });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        white: { select: playerSelect },
        black: { select: playerSelect },
        moves: { orderBy: { moveNumber: "asc" } },
      },
    });

    if (!game) {
      return res.status(404).json({
        success: false,
        error: "Game not found",
        data: null,
        message: "Game not found",
      });
    }

    res.status(200).json({
      success: true,
      error: null,
      data: game,
      message: "Game fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching game by ID", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
      message: "Internal server error",
    });
  }
};
