import { prisma } from "@repo/db";
import { createEngine, type ChessEngine } from "@repo/game-core";

export class GameEngineCache {
  private readonly instances = new Map<string, ChessEngine>();

  /**
   * Rebuilt by replaying the stored moves, not loaded from `fen`: a bare FEN
   * has no history, so after a restart or an eviction threefold repetition
   * would start counting again from zero.
   */
  async getOrHydrate(game: {
    id: string;
    fen: string;
    startFen: string;
  }): Promise<ChessEngine> {
    const cached = this.instances.get(game.id);

    if (cached) return cached;

    const moves = await prisma.move.findMany({
      where: { gameId: game.id },
      orderBy: { moveNumber: "asc" },
      select: { from: true, to: true, promotion: true },
    });

    let engine = createEngine(game.startFen);

    try {
      for (const move of moves) {
        engine.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion ?? undefined,
        });
      }
    } catch {
      // Unreachable for rows this server wrote; the position still wins.
    }

    if (engine.fen() !== game.fen) engine = createEngine(game.fen);

    this.instances.set(game.id, engine);
    return engine;
  }

  evict(gameId: string): void {
    this.instances.delete(gameId);
  }
}

export const gameEngineCache = new GameEngineCache();
