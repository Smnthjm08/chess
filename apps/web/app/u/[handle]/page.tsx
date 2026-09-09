import { notFound } from "next/navigation";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { GameRow } from "@/components/game/game-row";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
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
  playerLabel,
  type Game,
  type Profile,
  type ProfileStats,
} from "@/lib/api";
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

const STAT_LABELS: Array<[keyof ProfileStats, string]> = [
  ["played", "Played"],
  ["wins", "Wins"],
  ["losses", "Losses"],
  ["draws", "Draws"],
];

/** A finished game's result from this player's side. */
function outcomeFor(game: Game, userId: string) {
  if (game.status !== "FINISHED") return null;
  if (!game.winnerId) return { label: "Draw", variant: "secondary" as const };

  return game.winnerId === userId
    ? { label: "Won", variant: "default" as const }
    : { label: "Lost", variant: "outline" as const };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const viewerId = await getViewerId();

  let profile: Profile;

  try {
    profile = (await getProfile(handle)).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { user, stats, games } = profile;
  const label = playerLabel(user, "Player");
  const isOwner = viewerId !== null && viewerId === user.id;

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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAT_LABELS.map(([key, statLabel]) => (
            <Card key={key}>
              <CardContent className="space-y-1">
                <p className="text-2xl font-semibold tabular-nums">
                  {stats[key]}
                </p>
                <p className="text-muted-foreground text-xs">{statLabel}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Recent games</h2>

          {games.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No games yet</EmptyTitle>
                <EmptyDescription>
                  {isOwner
                    ? "Open a board from the lobby and your games will show up here."
                    : `${label} has not played a game yet.`}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
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
          )}
        </section>
      </main>
    </div>
  );
}
