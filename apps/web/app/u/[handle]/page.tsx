import { notFound } from "next/navigation";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { GameRow } from "@/components/game/game-row";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { ProfileFilters } from "@/components/profile/profile-filters";
import { ProfilePagination } from "@/components/profile/profile-pagination";
import { ProfileStatsPanel } from "@/components/profile/profile-stats";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  ApiError,
  getProfile,
  listUserGames,
  playerLabel,
  type Game,
  type Pagination,
  type Profile,
} from "@/lib/api";
import {
  parsePage,
  parseProfileFilter,
  resultFilter,
  type ProfileFilter,
} from "@/lib/profile";
import { getViewerId } from "@/lib/viewer";

function initials(label: string) {
  return label.slice(0, 2).toUpperCase();
}

function joinedOn(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** A finished game's result from this player's side. */
function outcomeFor(game: Game, userId: string) {
  if (game.status !== "FINISHED") return null;
  if (!game.winnerId) return { label: "Draw", variant: "secondary" as const };

  return game.winnerId === userId
    ? { label: "Won", variant: "default" as const }
    : { label: "Lost", variant: "outline" as const };
}

const EMPTY_MESSAGE: Record<
  ProfileFilter,
  (label: string, isOwner: boolean) => { title: string; body: string }
> = {
  ALL: (label, isOwner) => ({
    title: "No games yet",
    body: isOwner
      ? "Open a board from the lobby and your games will show up here."
      : `${label} has not played a game yet.`,
  }),
  won: (label) => ({
    title: "No wins yet",
    body: `${label} has not won a game yet.`,
  }),
  lost: (label) => ({
    title: "No losses",
    body: `${label} has not lost a game.`,
  }),
  drawn: (label) => ({
    title: "No draws",
    body: `${label} has not drawn a game.`,
  }),
};

async function loadGames(handle: string, filter: ProfileFilter, page: number) {
  try {
    const { data, pagination } = await listUserGames(handle, {
      result: resultFilter(filter),
      page,
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

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ result?: string; page?: string }>;
}) {
  const { handle } = await params;
  const query = await searchParams;
  const filter = parseProfileFilter(query.result);
  const page = parsePage(query.page);
  const viewerId = await getViewerId();

  let profile: Profile;

  try {
    profile = (await getProfile(handle)).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { games, pagination, error } = await loadGames(handle, filter, page);

  const { user, stats } = profile;
  const label = playerLabel(user, "Player");
  const isOwner = viewerId !== null && viewerId === user.id;
  const empty = EMPTY_MESSAGE[filter](label, isOwner);

  return (
    <div className="min-h-svh">
      <SiteHeader />

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Avatar size="lg">
              {user.image && <AvatarImage src={user.image} alt="" />}
              <AvatarFallback>{initials(label)}</AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {label}
                </h1>
                {user.isAnonymous && <Badge variant="secondary">Guest</Badge>}
              </div>

              <p className="text-muted-foreground text-sm">
                {user.username ? `@${user.username} · ` : ""}
                Joined {joinedOn(user.createdAt)}
              </p>
            </div>

            {isOwner && (
              <div className="ml-auto">
                {user.isAnonymous ? (
                  <AuthDialog defaultMode="signup">
                    <Button size="sm">Claim a username</Button>
                  </AuthDialog>
                ) : (
                  <EditProfileDialog user={user} />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <ProfileStatsPanel stats={stats} />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Games</h2>

          <ProfileFilters handle={handle} active={filter} />

          <div className="mt-3">
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
                  <EmptyTitle>{empty.title}</EmptyTitle>
                  <EmptyDescription>{empty.body}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <ul className="space-y-3">
                  {games.map((game) => {
                    const outcome = outcomeFor(game, user.id);

                    return (
                      <li key={game.id}>
                        <GameRow
                          game={game}
                          trailing={
                            outcome ? (
                              <Badge variant={outcome.variant}>
                                {outcome.label}
                              </Badge>
                            ) : undefined
                          }
                        />
                      </li>
                    );
                  })}
                </ul>

                <ProfilePagination
                  handle={handle}
                  filter={filter}
                  page={pagination?.page ?? page}
                  totalPages={pagination?.totalPages ?? 1}
                />
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
