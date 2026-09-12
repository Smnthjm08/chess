import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { GameStatus, prisma } from "@repo/db";
import { START_FEN } from "@repo/game-core";
import { seatedGame, signInAsGuest, TestClient } from "./helpers/client";
import {
  resetDatabase,
  startTestServer,
  type TestServer,
} from "./helpers/server";

/** Short enough to wait for, long enough not to fire on a slow reconnect. */
const GRACE_MS = 700;

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer({ ABANDON_GRACE_MS: String(GRACE_MS) });
});

afterAll(async () => {
  await server.stop();
});

beforeEach(async () => {
  await resetDatabase();
});

describe("flag fall", () => {
  test("the side on move loses when its clock runs out", async () => {
    const { gameId, white, black, w, b } = await seatedGame(server);

    // Pause banks the elapsed time and disarms the timer, so the clock can be
    // set low; resuming re-arms it against the new value.
    w.send({ type: "game:pause", gameId });
    await w.next("game:state");
    await b.next("game:state");

    await prisma.game.update({
      where: { id: gameId },
      data: { whiteTimeMs: 400 },
    });

    b.send({ type: "game:resume", gameId });
    await w.next("game:state");
    await b.next("game:state");

    const flagged = await b.next("game:state", 4_000);

    expect(flagged.data?.status).toBe("FINISHED");
    expect(flagged.data?.result).toBe("TIMEOUT");
    expect(flagged.data?.winnerId).toBe(black.id);
    expect(flagged.data?.whiteTimeMs).toBe(0);

    const stored = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
    });

    expect(stored.status).toBe("FINISHED");
    expect(stored.result).toBe("TIMEOUT");
    expect(stored.winnerId).not.toBe(white.id);

    [w, b].forEach((client) => client.close());
  });

  test("moving in time disarms the flag", async () => {
    const { gameId, w, b } = await seatedGame(server);

    w.send({ type: "game:pause", gameId });
    await w.next("game:state");
    await b.next("game:state");

    await prisma.game.update({
      where: { id: gameId },
      data: { whiteTimeMs: 3_000 },
    });

    b.send({ type: "game:resume", gameId });
    await w.next("game:state");
    await b.next("game:state");

    w.send({ type: "game:move", gameId, data: { from: "e2", to: "e4" } });
    await w.next("game:state");
    w.drain();
    b.drain();

    // White's clock would have expired by now had the move not re-armed it
    // against black.
    await Bun.sleep(3_500);

    const stored = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
    });

    expect(stored.status).toBe("ACTIVE");

    [w, b].forEach((client) => client.close());
  });

  test("a restart finishes games that flagged while the process was down", async () => {
    const white = await signInAsGuest(server);
    const black = await signInAsGuest(server);

    // A game whose clock ran out with nothing running to notice.
    const game = await prisma.game.create({
      data: {
        fen: START_FEN,
        status: GameStatus.ACTIVE,
        whiteId: white.id,
        blackId: black.id,
        whiteTimeMs: 1_000,
        blackTimeMs: 300_000,
        lastMoveAt: new Date(Date.now() - 60_000),
      },
    });

    const restarted = await startTestServer();

    try {
      // `sweepExpiredGames` runs on listen.
      for (let i = 0; i < 40; i++) {
        const swept = await prisma.game.findUniqueOrThrow({
          where: { id: game.id },
        });

        if (swept.status === "FINISHED") {
          expect(swept.result).toBe("TIMEOUT");
          expect(swept.winnerId).toBe(black.id);
          return;
        }

        await Bun.sleep(50);
      }

      throw new Error("the sweep never finished the expired game");
    } finally {
      await restarted.stop();
    }
  });
});

describe("abandonment", () => {
  test("a player who drops out forfeits after the grace period", async () => {
    const { gameId, white, black, w, b } = await seatedGame(server);

    b.close();

    await Bun.sleep(GRACE_MS + 600);

    const stored = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
    });

    expect(stored.status).toBe("FINISHED");
    expect(stored.result).toBe("ABANDONED");
    expect(stored.winnerId).toBe(white.id);
    expect(stored.winnerId).not.toBe(black.id);

    w.close();
  });

  test("reconnecting inside the grace period saves the game", async () => {
    const { gameId, black, w, b } = await seatedGame(server);

    b.close();
    await Bun.sleep(GRACE_MS / 3);

    const reconnected = await TestClient.connect(server, black);
    reconnected.send({ type: "game:join", gameId });
    await reconnected.next("game:state");

    await Bun.sleep(GRACE_MS + 400);

    const stored = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
    });

    expect(stored.status).toBe("ACTIVE");

    [w, reconnected].forEach((client) => client.close());
  });

  test("a finished game is not forfeited afterwards", async () => {
    const { gameId, black, w, b } = await seatedGame(server);

    w.send({ type: "game:resign", gameId });
    await b.next("game:state");

    b.close();
    await Bun.sleep(GRACE_MS + 400);

    const stored = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
    });

    // Still the resignation, not overwritten by an abandonment.
    expect(stored.result).toBe("RESIGNATION");
    expect(stored.winnerId).toBe(black.id);

    w.close();
  });
});
