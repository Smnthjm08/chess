import { serverUrl } from "./env";

export type GameStatus = "WAITING" | "ACTIVE" | "PAUSED" | "FINISHED";

export type GameResult =
  | "CHECKMATE"
  | "RESIGNATION"
  | "TIMEOUT"
  | "STALEMATE"
  | "THREEFOLD_REPETITION"
  | "INSUFFICIENT_MATERIAL"
  | "FIFTY_MOVE_RULE"
  | "DRAW_AGREED"
  | "ABANDONED";

export type Player = {
  id: string;
  name: string;
  username: string | null;
  displayUsername: string | null;
};

/**
 * Guests never have a `username` — their generated handle is `name`. Credential
 * users get `displayUsername` for the casing they typed. Empty strings fall
 * through too, so a seated player always renders as something.
 */
export function playerLabel(player: Player | null, fallback = "Open seat") {
  if (!player) return fallback;

  return (
    player.displayUsername?.trim() ||
    player.username?.trim() ||
    player.name?.trim() ||
    "Player"
  );
}

/**
 * Profile links prefer the username and fall back to the id, so guests — who
 * never get one — are still linkable. `GET /users/:handle` resolves both.
 */
export function profileHandle(
  player: Pick<Player, "id" | "username"> | null,
): string | null {
  if (!player) return null;

  return player.username?.trim() || player.id;
}

export type Game = {
  id: string;
  status: GameStatus;
  fen: string;
  result: GameResult | null;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveAt: string | null;
  whiteId: string | null;
  blackId: string | null;
  winnerId: string | null;
  createdAt: string;
  white: Player | null;
  black: Player | null;
};

export type Move = {
  id: string;
  moveNumber: number;
  san: string;
  fen: string;
  from: string;
  to: string;
  promotion: string | null;
};

export type GameDetail = Game & { moves: Move[] };

export type ProfileUser = Player & {
  image: string | null;
  isAnonymous: boolean;
  createdAt: string;
};

export type ProfileStats = {
  played: number;
  wins: number;
  losses: number;
  draws: number;
};

export type Profile = {
  user: ProfileUser;
  stats: ProfileStats;
  games: Game[];
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type Envelope<T> = {
  success: boolean;
  error: string | null;
  data: T;
  message: string;
  pagination?: Pagination;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The envelope still carries a payload on failure — see `activeGameId`. */
    readonly data: unknown = null,
  ) {
    super(message);
  }
}

/**
 * A player may hold only one active game, so creating or joining a second one
 * is refused with the id of the game they are already in — enough for the UI
 * to offer a way back to it instead of a dead end.
 */
export function activeGameIdFrom(error: unknown): string | null {
  if (!(error instanceof ApiError) || typeof error.data !== "object") {
    return null;
  }

  const id = (error.data as { activeGameId?: unknown } | null)?.activeGameId;

  return typeof id === "string" ? id : null;
}

/**
 * The session cookie is what authenticates both these calls and the WebSocket
 * upgrade, so every request has to carry credentials even when it is a plain
 * read.
 */
async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<Envelope<T>> {
  const response = await fetch(`${serverUrl}/api/v1${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body = (await response.json()) as Envelope<T>;

  if (!response.ok || !body.success) {
    throw new ApiError(
      body.error ?? response.statusText,
      response.status,
      body.data,
    );
  }

  return body;
}

export async function listGames(params?: {
  status?: GameStatus;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();

  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const suffix = query.size > 0 ? `?${query}` : "";

  return request<Game[]>(`/games${suffix}`);
}

export async function getGame(gameId: string) {
  return request<GameDetail>(`/games/${gameId}`);
}

export async function createGame() {
  return request<Game>("/games", { method: "POST" });
}

export async function joinGame(gameId: string) {
  return request<{ game: Game; role: "white" | "black" }>(
    `/games/${gameId}/join`,
    { method: "POST" },
  );
}

export async function getProfile(handle: string) {
  return request<Profile>(`/users/${encodeURIComponent(handle)}`);
}
