import type { TestServer } from "./server";

export type Guest = { id: string; cookie: string };

export type ServerFrame = {
  type: string;
  gameId?: string;
  data?: Record<string, unknown>;
};

const ORIGIN = "http://localhost:3000";

export async function signInAsGuest(server: TestServer): Promise<Guest> {
  const res = await fetch(`${server.baseUrl}/api/auth/sign-in/anonymous`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: "{}",
  });

  if (!res.ok) throw new Error(`guest sign-in failed: ${res.status}`);

  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((value) => value.split(";")[0])
    .join("; ");
  const body = (await res.json()) as { user: { id: string } };

  return { id: body.user.id, cookie };
}

export function api(server: TestServer, guest?: Guest) {
  return async (path: string, init: RequestInit = {}) =>
    fetch(`${server.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        ...(guest ? { cookie: guest.cookie } : {}),
        ...(init.headers ?? {}),
      },
    });
}

export async function createGame(server: TestServer, guest: Guest) {
  const res = await api(server, guest)("/api/v1/games", {
    method: "POST",
    body: "{}",
  });
  const body = (await res.json()) as { data: { id: string } };

  return body.data.id;
}

export async function joinGame(
  server: TestServer,
  guest: Guest,
  gameId: string,
) {
  return api(server, guest)(`/api/v1/games/${gameId}/join`, {
    method: "POST",
    body: "{}",
  });
}

/**
 * A real WebSocket client with an inbox, so a test can wait for the specific
 * frame it cares about without depending on the order unrelated ones arrive in.
 */
export class TestClient {
  private readonly inbox: ServerFrame[] = [];
  private readonly socket: WebSocket;

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.addEventListener("message", (event) => {
      this.inbox.push(JSON.parse(String(event.data)) as ServerFrame);
    });
  }

  static async connect(server: TestServer, guest: Guest): Promise<TestClient> {
    const socket = new WebSocket(server.wsUrl, {
      headers: { cookie: guest.cookie, origin: ORIGIN },
    } as unknown as string[]);

    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve());
      socket.addEventListener("error", () =>
        reject(new Error("socket failed to open")),
      );
    });

    return new TestClient(socket);
  }

  send(message: unknown): void {
    this.socket.send(JSON.stringify(message));
  }

  /** Waits for the next frame of `type`, consuming it. */
  async next(type: string, timeoutMs = 5_000): Promise<ServerFrame> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const index = this.inbox.findIndex((frame) => frame.type === type);

      if (index >= 0) return this.inbox.splice(index, 1)[0]!;

      await Bun.sleep(10);
    }

    throw new Error(
      `timed out waiting for "${type}"; saw ${JSON.stringify(
        this.inbox.map((frame) => frame.type),
      )}`,
    );
  }

  /** Asserts nothing of `type` arrives within the window. */
  async never(type: string, windowMs = 400): Promise<void> {
    await Bun.sleep(windowMs);

    const seen = this.inbox.find((frame) => frame.type === type);

    if (seen) throw new Error(`unexpected "${type}": ${JSON.stringify(seen)}`);
  }

  drain(): ServerFrame[] {
    return this.inbox.splice(0, this.inbox.length);
  }

  close(): void {
    this.socket.close(1000);
  }
}

/** Two seated players on a started game, each with an open socket. */
export async function seatedGame(server: TestServer) {
  const white = await signInAsGuest(server);
  const black = await signInAsGuest(server);
  const gameId = await createGame(server, white);

  await joinGame(server, black, gameId);

  const w = await TestClient.connect(server, white);
  const b = await TestClient.connect(server, black);

  w.send({ type: "game:join", gameId });
  b.send({ type: "game:join", gameId });
  await w.next("game:state");
  await b.next("game:state");
  w.drain();
  b.drain();

  return { white, black, gameId, w, b };
}
