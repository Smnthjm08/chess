import type { Request, Response } from "express";
import { GameStatus, prisma, type Prisma } from "@repo/db";
import { playerSelect, profileSelect } from "../utils/player-select";
import { computeStats, DRAW_RESULTS } from "../utils/profile-stats";
import { canMatchText } from "../utils/text";

const PAGE_SIZE = 20;

/**
 * Profiles are addressed by username, falling back to the user id so guests —
 * who never get a username — still have a page to link to from the lobby.
 * Usernames are normalized to lowercase by the plugin, so the lookup is too.
 */
async function findByHandle(handle: string) {
  const byUsername = await prisma.user.findUnique({
    where: { username: handle.toLowerCase() },
    select: profileSelect,
  });

  if (byUsername) return byUsername;

  return prisma.user.findUnique({
    where: { id: handle },
    select: profileSelect,
  });
}

function readHandle(req: Request): string | undefined {
  const raw = req.params.handle;
  return Array.isArray(raw) ? raw[0] : raw;
}

async function lookup(req: Request, res: Response) {
  const handle = readHandle(req);

  if (!handle) {
    res.status(400).json({
      success: false,
      error: "Handle is required",
      data: null,
      message: "Invalid handle",
    });
    return null;
  }

  const user = canMatchText(handle) ? await findByHandle(handle) : null;

  if (!user) {
    res.status(404).json({
      success: false,
      error: "User not found",
      data: null,
      message: "User not found",
    });
    return null;
  }

  return user;
}

export const getUserByHandle = async (req: Request, res: Response) => {
  try {
    const user = await lookup(req, res);
    if (!user) return;

    // Scored in memory: one indexed read of a player's finished games is cheap
    // at this scale, and streaks need the games in order anyway.
    const finished = await prisma.game.findMany({
      where: {
        status: GameStatus.FINISHED,
        OR: [{ whiteId: user.id }, { blackId: user.id }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        whiteId: true,
        blackId: true,
        winnerId: true,
        result: true,
        initialTimeMs: true,
        incrementMs: true,
      },
    });

    res.status(200).json({
      success: true,
      error: null,
      data: { user, stats: computeStats(finished, user.id) },
      message: "Profile fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching profile", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
      message: "Internal server error",
    });
  }
};

const RESULT_FILTERS = ["won", "lost", "drawn"] as const;
type ResultFilter = (typeof RESULT_FILTERS)[number];

function resultWhere(
  userId: string,
  filter: ResultFilter | undefined,
): Prisma.GameWhereInput {
  const seated = { OR: [{ whiteId: userId }, { blackId: userId }] };
  const finished = { ...seated, status: GameStatus.FINISHED };

  switch (filter) {
    case "won":
      return { ...finished, winnerId: userId };
    case "lost":
      return { ...finished, winnerId: { not: null, notIn: [userId] } };
    case "drawn":
      return { ...finished, result: { in: DRAW_RESULTS } };
    default:
      return seated;
  }
}

/** A player's games, newest first, optionally only those they won, lost or drew. */
export const getUserGames = async (req: Request, res: Response) => {
  try {
    const user = await lookup(req, res);
    if (!user) return;

    const { page, result } = req.query;
    const filter = RESULT_FILTERS.find((value) => value === result);
    const pageNumber = Math.max(
      1,
      Number.parseInt(typeof page === "string" ? page : "1", 10) || 1,
    );
    const where = resultWhere(user.id, filter);

    const [total, games] = await Promise.all([
      prisma.game.count({ where }),
      prisma.game.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNumber - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          white: { select: playerSelect },
          black: { select: playerSelect },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      error: null,
      data: games,
      pagination: {
        page: pageNumber,
        limit: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
      message: "Games fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching player games", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
      message: "Internal server error",
    });
  }
};
