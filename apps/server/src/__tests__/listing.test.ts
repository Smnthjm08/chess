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
import { api, signInAsGuest } from "./helpers/client";
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

type Listing = {
  data: { id: string; status: GameStatus }[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

async function list(query = ""): Promise<Listing> {
  const res = await api(server)(`/api/v1/games${query}`);

  expect(res.status).toBe(200);

  return (await res.json()) as Listing;
}

/** Rows written directly: the point here is the listing, not how they arose. */
async function seed(statuses: GameStatus[]) {
  const owner = await signInAsGuest(server);

  for (const status of statuses) {
    await prisma.game.create({
      data: { status, fen: START_FEN, whiteId: owner.id },
    });
  }
}

describe("status filtering", () => {
  test("one status returns only those games", async () => {
    await seed([
      GameStatus.WAITING,
      GameStatus.ACTIVE,
      GameStatus.FINISHED,
      GameStatus.WAITING,
    ]);

    const { data } = await list("?status=WAITING");

    expect(data).toHaveLength(2);
    expect(data.every((game) => game.status === GameStatus.WAITING)).toBe(true);
  });

  // What the lobby's "in progress" tab depends on.
  test("a comma-separated list returns the union", async () => {
    await seed([
      GameStatus.WAITING,
      GameStatus.ACTIVE,
      GameStatus.PAUSED,
      GameStatus.FINISHED,
    ]);

    const { data } = await list("?status=ACTIVE,PAUSED");

    expect(data).toHaveLength(2);
    expect(data.map((game) => game.status).sort()).toEqual([
      GameStatus.ACTIVE,
      GameStatus.PAUSED,
    ]);
  });

  test("no status returns everything", async () => {
    await seed([GameStatus.WAITING, GameStatus.ACTIVE, GameStatus.FINISHED]);

    expect((await list()).data).toHaveLength(3);
  });

  test("an unrecognised status is ignored rather than matching nothing", async () => {
    await seed([GameStatus.WAITING, GameStatus.ACTIVE]);

    expect((await list("?status=BOGUS")).data).toHaveLength(2);
  });

  test("unrecognised names are dropped from a list", async () => {
    await seed([GameStatus.WAITING, GameStatus.ACTIVE, GameStatus.FINISHED]);

    const { data } = await list("?status=ACTIVE,BOGUS");

    expect(data).toHaveLength(1);
    expect(data[0]?.status).toBe(GameStatus.ACTIVE);
  });

  test("the count reflects the filter, not the table", async () => {
    await seed([
      GameStatus.WAITING,
      GameStatus.ACTIVE,
      GameStatus.ACTIVE,
      GameStatus.FINISHED,
    ]);

    const { pagination } = await list("?status=ACTIVE");

    expect(pagination?.total).toBe(2);
    expect(pagination?.totalPages).toBe(1);
  });
});

describe("pagination", () => {
  test("pages through a filtered listing without repeating a game", async () => {
    await seed(Array.from({ length: 5 }, () => GameStatus.WAITING));

    const first = await list("?status=WAITING&limit=2&page=1");
    const second = await list("?status=WAITING&limit=2&page=2");
    const third = await list("?status=WAITING&limit=2&page=3");

    expect(first.data).toHaveLength(2);
    expect(second.data).toHaveLength(2);
    expect(third.data).toHaveLength(1);
    expect(first.pagination?.total).toBe(5);
    expect(first.pagination?.totalPages).toBe(3);

    const ids = [...first.data, ...second.data, ...third.data].map(
      (game) => game.id,
    );

    expect(new Set(ids).size).toBe(5);
  });

  test("a page past the end is empty rather than an error", async () => {
    await seed([GameStatus.WAITING]);

    const { data, pagination } = await list("?limit=20&page=9");

    expect(data).toHaveLength(0);
    expect(pagination?.page).toBe(9);
    expect(pagination?.totalPages).toBe(1);
  });

  test("totalPages is at least one even with nothing to show", async () => {
    const { data, pagination } = await list("?status=FINISHED");

    expect(data).toHaveLength(0);
    expect(pagination?.total).toBe(0);
    expect(pagination?.totalPages).toBe(1);
  });
});
