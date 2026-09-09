"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { InviteLink } from "@/components/game/invite-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activeGameIdFrom, joinGame, playerLabel, type Game } from "@/lib/api";
import { ensureSession, useSession } from "@/lib/auth-client";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function GameSeat({
  game,
  viewerId,
}: {
  game: Game;
  /** Resolved during the server render so the seat controls are in the HTML. */
  viewerId: string | null;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [joining, setJoining] = useState(false);

  // Trust the server's answer until the client's own session settles, which is
  // what keeps a guest sign-in from being overwritten by a stale render.
  const userId = isPending ? viewerId : (session?.user.id ?? null);
  const seat =
    userId && userId === game.whiteId
      ? "White"
      : userId && userId === game.blackId
        ? "Black"
        : null;

  const openSeat = !game.whiteId || !game.blackId;
  const over = game.status === "FINISHED";

  async function takeSeat() {
    setJoining(true);

    try {
      await ensureSession();

      const { data } = await joinGame(game.id);

      toast.success(`You are playing ${data.role}.`);
      router.refresh();
    } catch (error) {
      const elsewhere = activeGameIdFrom(error);

      if (elsewhere) {
        toast.error("You are already in another active game.", {
          action: {
            label: "Go there",
            onClick: () => router.push(`/game/${elsewhere}`),
          },
        });
        return;
      }

      toast.error(
        error instanceof Error ? error.message : "Could not join the game.",
      );
    } finally {
      setJoining(false);
    }
  }

  if (seat) {
    const opponent = seat === "White" ? game.black : game.white;

    return (
      <Panel title={`You are playing ${seat}`}>
        {opponent ? (
          <p className="text-muted-foreground text-sm">
            Your opponent is {playerLabel(opponent)}.
          </p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              Waiting for an opponent. Send them this link — the game starts the
              moment they take the seat.
            </p>
            <InviteLink />
          </>
        )}
      </Panel>
    );
  }

  if (openSeat && !over) {
    return (
      <Panel title="Open seat">
        <Button className="w-full" onClick={takeSeat} disabled={joining}>
          {joining ? "Joining…" : "Take the open seat"}
        </Button>

        {userId ? null : (
          <p className="text-muted-foreground text-xs">
            You will join as a guest.{" "}
            <AuthDialog defaultMode="signin">
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                Sign in
              </Button>
            </AuthDialog>{" "}
            instead to keep this game on your account.
          </p>
        )}

        <InviteLink />
      </Panel>
    );
  }

  return (
    <Panel title={over ? "Game over" : "Spectating"}>
      <p className="text-muted-foreground text-sm">
        {over
          ? "This game has finished."
          : "Both seats are taken — you are watching this game."}
      </p>
    </Panel>
  );
}
