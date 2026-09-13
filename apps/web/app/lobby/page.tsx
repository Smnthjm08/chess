import { SiteHeader } from "@/components/site-header";
import { CreateGameButton } from "@/components/game/create-game-button";
import { GameRow } from "@/components/game/game-row";
import { LobbyFilters } from "@/components/game/lobby-filters";
import { LobbyPagination } from "@/components/game/lobby-pagination";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { listGames, type Game, type Pagination } from "@/lib/api";
import {
  filterStatuses,
  parseFilter,
  parsePage,
  type LobbyFilter,
} from "@/lib/lobby";

const PAGE_SIZE = 20;

async function loadGames(filter: LobbyFilter, page: number) {
  try {
    const { data, pagination } = await listGames({
      status: filterStatuses(filter),
      page,
      limit: PAGE_SIZE,
    });

    return { games: data, pagination, error: null as string | null };
  } catch (error) {
    return {
      games: [] as Game[],
      pagination: undefined as Pagination | undefined,
      error:
        error instanceof Error ? error.message : "Could not reach the server",
    };
  }
}

const EMPTY_MESSAGE: Record<LobbyFilter, { title: string; body: string }> = {
  WAITING: {
    title: "No games waiting",
    body: "Create one and share the link with an opponent.",
  },
  IN_PROGRESS: {
    title: "Nothing in progress",
    body: "No games are being played right now.",
  },
  FINISHED: {
    title: "No finished games",
    body: "Games you play through to the end will show up here.",
  },
  ALL: {
    title: "No games yet",
    body: "Create the first one and share the link with an opponent.",
  },
};

export default async function LobbyPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const page = parsePage(params.page);

  const { games, pagination, error } = await loadGames(filter, page);

  return (
    <div className="min-h-svh">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Lobby</h1>
            <p className="text-muted-foreground text-sm">
              Open a new board or join a game that is waiting for an opponent.
            </p>
          </div>

          <CreateGameButton />
        </div>

        <LobbyFilters active={filter} />

        <div className="mt-6">
          {error ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Server unreachable</EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : games.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{EMPTY_MESSAGE[filter].title}</EmptyTitle>
                <EmptyDescription>
                  {EMPTY_MESSAGE[filter].body}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <ul className="space-y-3">
                {games.map((game) => (
                  <li key={game.id}>
                    <GameRow game={game} />
                  </li>
                ))}
              </ul>

              <LobbyPagination
                filter={filter}
                page={pagination?.page ?? page}
                totalPages={pagination?.totalPages ?? 1}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
