import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import {
  api,
  createGame,
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

/** Resignation is the shortest route to a decisive FINISHED game. */
async function decidedGame(timeControl?: string) {
  const game = await seatedGame(server, timeControl);

  game.b.send({ type: "game:resign", gameId: game.gameId });
  await game.w.next("game:state");
  [game.w, game.b].forEach((client) => client.close());

  return game; // white won
}

/** A fresh opponent joins `white`, plays out, then `loser` resigns. */
async function playAgainst(white: Guest, loser: "white" | "black") {
  const opponent = await signInAsGuest(server);
  const gameId = await createGame(server, white);
  await joinGame(server, opponent, gameId);

  const w = await TestClient.connect(server, white);
  const b = await TestClient.connect(server, opponent);
  w.send({ type: "game:join", gameId });
  b.send({ type: "game:join", gameId });
  await w.next("game:state");
  await b.next("game:state");

  (loser === "white" ? w : b).send({ type: "game:resign", gameId });
  await w.next("game:state");
  w.close();
  b.close();
}

function profile(handle: string) {
  return api(server)(`/api/v1/users/${handle}`);
}

function games(handle: string, query = "") {
  return api(server)(`/api/v1/users/${handle}/games${query}`);
}

describe("GET /users/:handle", () => {
  test("reports wins, losses, draws and win rate across a player's games", async () => {
    const white = await signInAsGuest(server);

    await playAgainst(white, "black");
    await playAgainst(white, "black");
    await playAgainst(white, "white");

    const body = (await (await profile(white.id)).json()) as {
      data: { stats: Record<string, unknown> };
    };

    expect(body.data.stats).toMatchObject({
      played: 3,
      wins: 2,
      losses: 1,
      draws: 0,
      winRate: 2 / 3,
    });
  });

  test("a game nobody joined does not count as played", async () => {
    const white = await signInAsGuest(server);
    await createGame(server, white);

    const body = (await (await profile(white.id)).json()) as {
      data: { stats: Record<string, unknown> };
    };

    expect(body.data.stats).toMatchObject({ played: 0, winRate: null });
  });

  test("is addressable by user id", async () => {
    const { white } = await decidedGame();

    const body = (await (await profile(white.id)).json()) as {
      data: { user: { id: string } };
    };

    expect(body.data.user.id).toBe(white.id);
  });

  test("an unknown handle is a 404", async () => {
    expect((await profile("nobody")).status).toBe(404);
  });
});

describe("GET /users/:handle/games", () => {
  test("lists the player's games, newest first, paginated", async () => {
    const { white } = await decidedGame();

    const res = await games(white.id);
    const body = (await res.json()) as {
      data: { id: string }[];
      pagination: { page: number; total: number; totalPages: number };
    };

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({
      page: 1,
      total: 1,
      totalPages: 1,
    });
  });

  test("result=won / lost filter to that outcome, from each side", async () => {
    const { white, black } = await decidedGame();

    const whiteWon = (await (await games(white.id, "?result=won")).json()) as {
      data: unknown[];
    };
    const whiteLost = (
      await (await games(white.id, "?result=lost")).json()
    ) as { data: unknown[] };
    const blackWon = (await (await games(black.id, "?result=won")).json()) as {
      data: unknown[];
    };

    expect(whiteWon.data).toHaveLength(1);
    expect(whiteLost.data).toHaveLength(0);
    expect(blackWon.data).toHaveLength(0);
  });

  test("an unfinished game the player is seated in still lists unfiltered", async () => {
    const game = await seatedGame(server);

    const body = (await (await games(game.white.id)).json()) as {
      data: { id: string }[];
    };

    expect(body.data.map((g) => g.id)).toEqual([game.gameId]);
    [game.w, game.b].forEach((client) => client.close());
  });

  test("an unknown handle is a 404", async () => {
    expect((await games("nobody")).status).toBe(404);
  });
});
