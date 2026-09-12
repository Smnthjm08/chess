import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { GameStatus, prisma } from "@repo/db";
import { seatedGame, signInAsGuest, TestClient } from "./helpers/client";
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

/**
 * A resigned game — the shortest route to FINISHED. `finishGame` persists
 * before it broadcasts, so the state frame is proof the row is written.
 */
async function finishedGame() {
  const game = await seatedGame(server);

  game.w.send({ type: "game:resign", gameId: game.gameId });
  await game.w.next("game:state");
  await game.b.next("game:state");
  game.w.drain();
  game.b.drain();

  return game;
}

describe("rematch offers", () => {
  test("an offer reaches the opponent", async () => {
    const { gameId, white, w, b } = await finishedGame();

    w.send({ type: "game:rematch:offer", gameId });

    const frame = await b.next("game:rematch:offer");

    expect(frame.data?.userId).toBe(white.id);

    [w, b].forEach((client) => client.close());
  });

  test("a standing offer is carried by game:state", async () => {
    const { gameId, white, w, b } = await finishedGame();

    w.send({ type: "game:rematch:offer", gameId });
    await b.next("game:rematch:offer");

    // What a reconnecting client relies on: the offer is not replayed as an
    // event, so state has to carry it.
    b.send({ type: "game:join", gameId });
    const state = await b.next("game:state");

    expect(state.data?.rematchOffer).toBe(white.id);

    [w, b].forEach((client) => client.close());
  });

  test("offering twice is refused", async () => {
    const { gameId, w, b } = await finishedGame();

    w.send({ type: "game:rematch:offer", gameId });
    await b.next("game:rematch:offer");

    w.send({ type: "game:rematch:offer", gameId });
    const error = await w.next("game:error");

    expect(error.data?.message).toBe(
      "You already have a rematch offer pending",
    );

    [w, b].forEach((client) => client.close());
  });

  test("a game still in progress cannot be rematched", async () => {
    const { gameId, w, b } = await seatedGame(server);

    w.send({ type: "game:rematch:offer", gameId });
    const error = await w.next("game:error");

    expect(error.data?.message).toBe("Only a finished game can be rematched");

    [w, b].forEach((client) => client.close());
  });

  test("a spectator cannot offer a rematch", async () => {
    const { gameId, w, b } = await finishedGame();

    const onlooker = await signInAsGuest(server);
    const s = await TestClient.connect(server, onlooker);

    s.send({ type: "game:join", gameId });
    await s.next("game:state");

    s.send({ type: "game:rematch:offer", gameId });
    const error = await s.next("game:error");

    expect(error.data?.message).toBe("Spectators cannot offer a rematch");

    [w, b, s].forEach((client) => client.close());
  });
});

describe("accepting a rematch", () => {
  test("creates one new game with the colours swapped", async () => {
    const { gameId, white, black, w, b } = await finishedGame();

    w.send({ type: "game:rematch:offer", gameId });
    await b.next("game:rematch:offer");

    b.send({ type: "game:rematch:accept", gameId });

    // Both players are told where to go.
    const forWhite = await w.next("game:rematch:ready");
    const forBlack = await b.next("game:rematch:ready");
    const rematchId = forWhite.data?.rematchGameId as string;

    expect(rematchId).toBeString();
    expect(forBlack.data?.rematchGameId).toBe(rematchId);
    expect(rematchId).not.toBe(gameId);

    const rematch = await prisma.game.findUniqueOrThrow({
      where: { id: rematchId },
    });

    // Whoever had white now has black.
    expect(rematch.whiteId).toBe(black.id);
    expect(rematch.blackId).toBe(white.id);
    expect(rematch.status).toBe(GameStatus.ACTIVE);
    // Seated and running, so the clock is already armed.
    expect(rematch.lastMoveAt).not.toBeNull();

    [w, b].forEach((client) => client.close());
  });

  test("you cannot accept your own offer", async () => {
    const { gameId, w, b } = await finishedGame();

    w.send({ type: "game:rematch:offer", gameId });
    await b.next("game:rematch:offer");

    w.send({ type: "game:rematch:accept", gameId });
    const error = await w.next("game:error");

    expect(error.data?.message).toBe("You cannot accept your own rematch offer");

    [w, b].forEach((client) => client.close());
  });

  test("there is nothing to accept without an offer", async () => {
    const { gameId, w, b } = await finishedGame();

    b.send({ type: "game:rematch:accept", gameId });
    const error = await b.next("game:error");

    expect(error.data?.message).toBe("There is no rematch offer to accept");

    [w, b].forEach((client) => client.close());
  });

  test("two accepts sent together create exactly one rematch", async () => {
    const { gameId, w, b } = await finishedGame();

    w.send({ type: "game:rematch:offer", gameId });
    await b.next("game:rematch:offer");

    // The reason the accept runs under the game's lock: both frames leave in
    // the same tick, so the server handles them with no round trip between.
    b.send({ type: "game:rematch:accept", gameId });
    b.send({ type: "game:rematch:accept", gameId });

    await b.next("game:rematch:ready");
    await Bun.sleep(300);

    // One original, one rematch — never two rematches.
    const games = await prisma.game.findMany();

    expect(games).toHaveLength(2);

    [w, b].forEach((client) => client.close());
  });
});

describe("declining a rematch", () => {
  test("the offerer is told, and can offer again", async () => {
    const { gameId, black, w, b } = await finishedGame();

    w.send({ type: "game:rematch:offer", gameId });
    await b.next("game:rematch:offer");

    b.send({ type: "game:rematch:decline", gameId });
    const frame = await w.next("game:rematch:decline");

    expect(frame.data?.userId).toBe(black.id);

    // The offer was cleared, so the same player may ask once more.
    w.send({ type: "game:rematch:offer", gameId });
    await b.next("game:rematch:offer");

    // And nothing was created by the decline.
    expect(await prisma.game.count()).toBe(1);

    [w, b].forEach((client) => client.close());
  });

  test("you cannot decline your own offer", async () => {
    const { gameId, w, b } = await finishedGame();

    w.send({ type: "game:rematch:offer", gameId });
    await b.next("game:rematch:offer");

    w.send({ type: "game:rematch:decline", gameId });
    const error = await w.next("game:error");

    expect(error.data?.message).toBe(
      "You cannot decline your own rematch offer",
    );

    [w, b].forEach((client) => client.close());
  });
});
