import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { prisma } from "@repo/db";
import { TIME_CONTROLS } from "@repo/game-core";
import { api, createGame, seatedGame, signInAsGuest } from "./helpers/client";
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

describe("creating a game with a time control", () => {
  test("both clocks start on the chosen control", async () => {
    const guest = await signInAsGuest(server);
    const gameId = await createGame(server, guest, "3+2");

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

    expect(game.initialTimeMs).toBe(TIME_CONTROLS["3+2"].initialMs);
    expect(game.incrementMs).toBe(TIME_CONTROLS["3+2"].incrementMs);
    expect(game.whiteTimeMs).toBe(TIME_CONTROLS["3+2"].initialMs);
    expect(game.blackTimeMs).toBe(TIME_CONTROLS["3+2"].initialMs);
  });

  test("an omitted control falls back to the 5+0 default", async () => {
    const guest = await signInAsGuest(server);
    const gameId = await createGame(server, guest);

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

    expect(game.initialTimeMs).toBe(300_000);
    expect(game.incrementMs).toBe(0);
  });

  test("an unknown control is refused", async () => {
    const guest = await signInAsGuest(server);

    const res = await api(server, guest)("/api/v1/games", {
      method: "POST",
      body: JSON.stringify({ timeControl: "2+1" }),
    });

    expect(res.status).toBe(400);
    expect(await prisma.game.count()).toBe(0);
  });

  // `in` would let this through and index to Object.prototype.toString.
  test("an inherited property name is not a control", async () => {
    const guest = await signInAsGuest(server);

    const res = await api(server, guest)("/api/v1/games", {
      method: "POST",
      body: JSON.stringify({ timeControl: "toString" }),
    });

    expect(res.status).toBe(400);
    expect(await prisma.game.count()).toBe(0);
  });
});

describe("increment", () => {
  test("is added to the clock of the player who moved", async () => {
    const { gameId, w, b } = await seatedGame(server, "3+2");

    w.send({ type: "game:move", gameId, data: { from: "e2", to: "e4" } });
    await w.next("game:state");

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

    // The move took milliseconds and the increment is two seconds, so white is
    // now *above* where they started — which only the increment can explain.
    expect(game.whiteTimeMs).toBeGreaterThan(TIME_CONTROLS["3+2"].initialMs);
    // Black has not moved, so their clock is untouched.
    expect(game.blackTimeMs).toBe(TIME_CONTROLS["3+2"].initialMs);

    [w, b].forEach((client) => client.close());
  });

  test("a zero-increment control only ever counts down", async () => {
    const { gameId, w, b } = await seatedGame(server, "5+0");

    w.send({ type: "game:move", gameId, data: { from: "e2", to: "e4" } });
    await w.next("game:state");

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

    expect(game.whiteTimeMs).toBeLessThan(TIME_CONTROLS["5+0"].initialMs);
    expect(game.blackTimeMs).toBe(TIME_CONTROLS["5+0"].initialMs);

    [w, b].forEach((client) => client.close());
  });

  test("accrues over several moves", async () => {
    const { gameId, w, b } = await seatedGame(server, "3+2");

    const moves = [
      ["e2", "e4"],
      ["e7", "e5"],
      ["g1", "f3"],
      ["b8", "c6"],
    ] as const;

    for (const [index, [from, to]] of moves.entries()) {
      const mover = index % 2 === 0 ? w : b;

      mover.send({ type: "game:move", gameId, data: { from, to } });
      await mover.next("game:state");
    }

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

    // Two moves each, so two increments each.
    expect(game.whiteTimeMs).toBeGreaterThan(TIME_CONTROLS["3+2"].initialMs);
    expect(game.blackTimeMs).toBeGreaterThan(TIME_CONTROLS["3+2"].initialMs);

    [w, b].forEach((client) => client.close());
  });
});

describe("rematch", () => {
  test("carries the time control over with full clocks", async () => {
    const { gameId, w, b } = await seatedGame(server, "3+2");

    w.send({ type: "game:resign", gameId });
    await w.next("game:state");
    await b.next("game:state");

    w.send({ type: "game:rematch:offer", gameId });
    await b.next("game:rematch:offer");
    b.send({ type: "game:rematch:accept", gameId });

    const ready = await w.next("game:rematch:ready");
    const rematch = await prisma.game.findUniqueOrThrow({
      where: { id: ready.data?.rematchGameId as string },
    });

    expect(rematch.initialTimeMs).toBe(TIME_CONTROLS["3+2"].initialMs);
    expect(rematch.incrementMs).toBe(TIME_CONTROLS["3+2"].incrementMs);
    expect(rematch.whiteTimeMs).toBe(TIME_CONTROLS["3+2"].initialMs);
    expect(rematch.blackTimeMs).toBe(TIME_CONTROLS["3+2"].initialMs);

    [w, b].forEach((client) => client.close());
  });
});
