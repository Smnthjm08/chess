import { beforeEach, describe, expect, test } from "bun:test";
import { prisma } from "@repo/db";
import { seatedGame } from "./helpers/client";
import { resetDatabase, startTestServer } from "./helpers/server";

beforeEach(async () => {
  await resetDatabase();
});

describe("graceful shutdown", () => {
  test.each(["SIGTERM", "SIGINT"] as const)(
    "%s closes sockets with 1012 and exits cleanly",
    async (signal) => {
      const server = await startTestServer();
      const { gameId, w, b } = await seatedGame(server);

      const exitCode = await server.stop(signal);

      expect(exitCode).toBe(0);
      expect((await w.closed).code).toBe(1012);
      expect((await b.closed).code).toBe(1012);

      // Left for `sweepExpiredGames` to pick up, not forfeited on the way out.
      const game = await prisma.game.findUniqueOrThrow({
        where: { id: gameId },
      });
      expect(game.status).toBe("ACTIVE");
    },
  );

  test("an idle server exits cleanly", async () => {
    const server = await startTestServer();

    expect(await server.stop("SIGTERM")).toBe(0);
  });
});
