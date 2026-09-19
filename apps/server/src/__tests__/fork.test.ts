import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { GameStatus, prisma } from "@repo/db";
import { START_FEN, TIME_CONTROLS } from "@repo/game-core";
import {
  api,
  joinGame,
  seatedGame,
  signInAsGuest,
  TestClient,
  type Guest,
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

type Seated = Awaited<ReturnType<typeof seatedGame>>;

async function play(game: Seated, moves: [string, string][]) {
  for (const [index, [from, to]] of moves.entries()) {
    const mover = index % 2 === 0 ? game.w : game.b;

    mover.send({ type: "game:move", gameId: game.gameId, data: { from, to } });
    await mover.next("game:state");
  }
}

/** 1. e4 e5, then white resigns. */
async function finishedGame(timeControl?: string) {
  const game = await seatedGame(server, timeControl);

  await play(game, [
    ["e2", "e4"],
    ["e7", "e5"],
  ]);

  game.w.send({ type: "game:resign", gameId: game.gameId });
  await game.w.next("game:state");
  [game.w, game.b].forEach((client) => client.close());

  return game;
}

function fork(guest: Guest, gameId: string, body: unknown) {
  return api(server, guest)(`/api/v1/games/${gameId}/fork`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function forkedId(guest: Guest, gameId: string, ply: number) {
  const res = await fork(guest, gameId, { ply });
  expect(res.status).toBe(201);

  return ((await res.json()) as { data: { id: string } }).data.id;
}

describe("forking a finished game", () => {
  test("starts a waiting game from that position, linked back", async () => {
    const { gameId } = await finishedGame("3+2");
    const guest = await signInAsGuest(server);

    const id = await forkedId(guest, gameId, 2);

    const [original, forked] = await Promise.all([
      prisma.game.findUniqueOrThrow({
        where: { id: gameId },
        include: { moves: { orderBy: { moveNumber: "asc" } } },
      }),
      prisma.game.findUniqueOrThrow({
        where: { id },
        include: { moves: true },
      }),
    ]);

    expect(forked.status).toBe(GameStatus.WAITING);
    expect(forked.fen).toBe(original.moves[1]!.fen);
    expect(forked.startFen).toBe(forked.fen);
    expect(forked.forkedFromId).toBe(gameId);
    expect(forked.forkedFromPly).toBe(2);
    expect(forked.moves).toHaveLength(0);
    expect(forked.initialTimeMs).toBe(TIME_CONTROLS["3+2"].initialMs);
    expect(forked.incrementMs).toBe(TIME_CONTROLS["3+2"].incrementMs);
    expect(forked.blackTimeMs).toBe(TIME_CONTROLS["3+2"].initialMs);
  });

  test("seats the creator on the side to move", async () => {
    const { gameId } = await finishedGame();
    const guest = await signInAsGuest(server);

    const whiteToMove = await forkedId(guest, gameId, 0);
    const blackToMove = await forkedId(guest, gameId, 1);

    const [w, b] = await Promise.all([
      prisma.game.findUniqueOrThrow({ where: { id: whiteToMove } }),
      prisma.game.findUniqueOrThrow({ where: { id: blackToMove } }),
    ]);

    expect(w.fen).toBe(START_FEN);
    expect([w.whiteId, w.blackId]).toEqual([guest.id, null]);
    expect([b.whiteId, b.blackId]).toEqual([null, guest.id]);
  });

  test("filling the white seat starts a fork where black moves first", async () => {
    const { gameId } = await finishedGame();
    const creator = await signInAsGuest(server);
    const opponent = await signInAsGuest(server);

    const id = await forkedId(creator, gameId, 1);
    const res = await joinGame(server, opponent, id);
    const body = (await res.json()) as { data: { role: string } };

    expect(body.data.role).toBe("white");

    const game = await prisma.game.findUniqueOrThrow({ where: { id } });
    expect(game.status).toBe(GameStatus.ACTIVE);
    expect(game.lastMoveAt).not.toBeNull();

    // And the creator, on black, is the one who can move.
    const b = await TestClient.connect(server, creator);
    b.send({ type: "game:join", gameId: id });
    await b.next("game:state");
    b.drain();

    b.send({ type: "game:move", gameId: id, data: { from: "g8", to: "f6" } });
    const state = await b.next("game:state");

    expect(state.data?.turn).toBe("white");

    const moves = await prisma.move.findMany({ where: { gameId: id } });
    expect(moves.map((move) => [move.moveNumber, move.san])).toEqual([
      [1, "Nf6"],
    ]);

    b.close();
  });
});

describe("forking is refused", () => {
  test("for a game still being played", async () => {
    const game = await seatedGame(server);
    const guest = await signInAsGuest(server);

    const res = await fork(guest, game.gameId, { ply: 0 });

    expect(res.status).toBe(400);
    [game.w, game.b].forEach((client) => client.close());
  });

  test("for a ply outside the game, or not a ply at all", async () => {
    const { gameId } = await finishedGame();
    const guest = await signInAsGuest(server);

    for (const ply of [3, -1, 1.5, "1", undefined]) {
      expect((await fork(guest, gameId, { ply })).status).toBe(400);
    }
  });

  test("for a position where the game is already over", async () => {
    const game = await seatedGame(server);

    // Fool's mate: the game finishes itself on the fourth ply.
    await play(game, [
      ["f2", "f3"],
      ["e7", "e5"],
      ["g2", "g4"],
      ["d8", "h4"],
    ]);
    [game.w, game.b].forEach((client) => client.close());

    const guest = await signInAsGuest(server);

    expect((await fork(guest, game.gameId, { ply: 4 })).status).toBe(400);
    expect((await fork(guest, game.gameId, { ply: 3 })).status).toBe(201);
  });

  test("for an unknown game", async () => {
    const guest = await signInAsGuest(server);

    const res = await fork(guest, crypto.randomUUID(), { ply: 0 });

    expect(res.status).toBe(404);
  });

  test("without a session", async () => {
    const { gameId } = await finishedGame();

    const res = await api(server)(`/api/v1/games/${gameId}/fork`, {
      method: "POST",
      body: JSON.stringify({ ply: 0 }),
    });

    expect(res.status).toBe(401);
  });
});
