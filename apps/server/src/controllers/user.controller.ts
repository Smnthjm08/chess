import type { Request, Response } from "express";
import { GameResult, GameStatus, prisma } from "@repo/db";
import { playerSelect, profileSelect } from "../utils/player-select";

/** Every decisive result records a `winnerId`; these are the ones that do not. */
const DRAW_RESULTS = [
  GameResult.STALEMATE,
  GameResult.THREEFOLD_REPETITION,
  GameResult.INSUFFICIENT_MATERIAL,
  GameResult.FIFTY_MOVE_RULE,
  GameResult.DRAW_AGREED,
];

const RECENT_GAMES = 10;

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

export const getUserByHandle = async (req: Request, res: Response) => {
  try {
    const rawHandle = req.params.handle;
    const handle = Array.isArray(rawHandle) ? rawHandle[0] : rawHandle;

    if (!handle) {
      return res.status(400).json({
        success: false,
        error: "Handle is required",
        data: null,
        message: "Invalid handle",
      });
    }

    const user = await findByHandle(handle);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        data: null,
        message: "User not found",
      });
    }

    const seated = [{ whiteId: user.id }, { blackId: user.id }];
    const finished = { status: GameStatus.FINISHED, OR: seated };

    // Losses are counted rather than derived from played - wins - draws: a game
    // abandoned before the second seat was filled finishes with no winner and
    // no draw result, and would otherwise be scored as a loss.
    const [played, wins, draws, losses, games] = await Promise.all([
      prisma.game.count({ where: finished }),
      prisma.game.count({ where: { ...finished, winnerId: user.id } }),
      prisma.game.count({
        where: { ...finished, result: { in: DRAW_RESULTS } },
      }),
      prisma.game.count({
        where: { ...finished, winnerId: { not: null, notIn: [user.id] } },
      }),
      prisma.game.findMany({
        where: { OR: seated },
        orderBy: { createdAt: "desc" },
        take: RECENT_GAMES,
        include: {
          white: { select: playerSelect },
          black: { select: playerSelect },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      error: null,
      data: {
        user,
        stats: { played, wins, losses, draws },
        games,
      },
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
