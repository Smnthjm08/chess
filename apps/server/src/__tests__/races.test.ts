import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { prisma } from "@repo/db";
import {
  createGame,
  joinGame,
  seatedGame,
  signInAsGuest,
} from "./helpers/client";
import {
  resetDatabase,
  startTestServer,
  type TestServer,
} from "./helpers/server";

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(async () => {
  await resetDatabase();
});

describe("concurrent moves", () => {
  test("two moves sent together commit exactly one", async () => {
    const { gameId, w, b } = await seatedGame(server);

    // Both frames leave in the same tick, so the server handles them back to
    // back with no round trip in between — the interleaving the lock exists
    // for. The second is legal in the starting position but not after the
    // first has been applied.
    w.send({ type: "game:move", gameId, data: { from: "e2", to: "e4" } });
    w.send({ type: "game:move", gameId, data: { from: "d2", to: "d4" } });

    await w.next("game:state");
    const error = await w.next("game:error");

    // White's second move is refused because it is now black's turn.
    expect(error.data?.message).toBe("Not your turn");

    const moves = await prisma.move.findMany({ where: { gameId } });

    expect(moves).toHaveLength(1);
    expect(moves[0]?.san).toBe("e4");

    [w, b].forEach((client) => client.close());
  });

  test("both players moving at once commits only the side on move", async () => {
    const { gameId, w, b } = await seatedGame(server);

    w.send({ type: "game:move", gameId, data: { from: "e2", to: "e4" } });
    b.send({ type: "game:move", gameId, data: { from: "e7", to: "e5" } });

    await w.next("game:state");
    await Bun.sleep(300);

    const moves = await prisma.move.findMany({
      where: { gameId },
      orderBy: { moveNumber: "asc" },
    });

    // Black's frame either lost the race (rejected as out of turn) or arrived
    // after white's committed and was legal. Either way the history is a
    // valid, gapless sequence — never two first moves.
    expect(moves.length).toBeGreaterThanOrEqual(1);
    expect(moves[0]?.san).toBe("e4");
    expect(moves.map((move) => move.moveNumber)).toEqual(
      moves.map((_, index) => index + 1),
    );

    [w, b].forEach((client) => client.close());
  });

  test("a burst of moves never duplicates a move number", async () => {
    const { gameId, w, b } = await seatedGame(server);

    for (let i = 0; i < 8; i++) {
      w.send({ type: "game:move", gameId, data: { from: "e2", to: "e4" } });
      b.send({ type: "game:move", gameId, data: { from: "e7", to: "e5" } });
    }

    await Bun.sleep(600);

    const moves = await prisma.move.findMany({
      where: { gameId },
      orderBy: { moveNumber: "asc" },
    });
    const numbers = moves.map((move) => move.moveNumber);

    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).toEqual(numbers.map((_, index) => index + 1));

    [w, b].forEach((client) => client.close());
  });
});

describe("concurrent seat claims", () => {
  test("two players joining at once take two distinct seats", async () => {
    const creator = await signInAsGuest(server);
    const first = await signInAsGuest(server);
    const second = await signInAsGuest(server);
    const gameId = await createGame(server, creator);

    const [a, c] = await Promise.all([
      joinGame(server, first, gameId),
      joinGame(server, second, gameId),
    ]);

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

    // The creator holds white; exactly one of the two claimants gets black.
    expect(game.whiteId).toBe(creator.id);
    expect([first.id, second.id]).toContain(game.blackId ?? "unfilled");
    expect(game.status).toBe("ACTIVE");

    const accepted = [a, c].filter((res) => res.ok);

    expect(accepted).toHaveLength(1);
  });

  test("eight simultaneous claims still fill one seat", async () => {
    const creator = await signInAsGuest(server);
    const gameId = await createGame(server, creator);
    const claimants = await Promise.all(
      Array.from({ length: 8 }, () => signInAsGuest(server)),
    );

    const results = await Promise.all(
      claimants.map((guest) => joinGame(server, guest, gameId)),
    );

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

    expect(results.filter((res) => res.ok)).toHaveLength(1);
    expect(claimants.map((guest) => guest.id)).toContain(
      game.blackId ?? "unfilled",
    );
    expect(game.whiteId).toBe(creator.id);
  });

  test("the seat a claimant is told they hold is the one recorded", async () => {
    const creator = await signInAsGuest(server);
    const joiner = await signInAsGuest(server);
    const gameId = await createGame(server, creator);

    const res = await joinGame(server, joiner, gameId);
    const body = (await res.json()) as { data: { role: string } };
    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

    expect(body.data.role).toBe("black");
    expect(game.blackId).toBe(joiner.id);
  });
});
