"use client";

import type { GameRole, Turn } from "@repo/game-core";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GameStatus } from "@/lib/api";

export type GameAction =
  | "resign"
  | "draw:offer"
  | "draw:accept"
  | "draw:decline"
  | "pause"
  | "resume"
  | "rematch:offer"
  | "rematch:accept"
  | "rematch:decline";

function RematchCard({
  offer,
  viewerId,
  connected,
  onAction,
}: {
  offer: string | null;
  viewerId: string;
  connected: boolean;
  onAction: (action: GameAction) => void;
}) {
  const mine = offer === viewerId;
  const theirs = offer !== null && !mine;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rematch</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {theirs ? (
          <>
            <p className="text-sm">Your opponent wants a rematch.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!connected}
                onClick={() => onAction("rematch:accept")}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!connected}
                onClick={() => onAction("rematch:decline")}
              >
                Decline
              </Button>
            </div>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={!connected || mine}
            onClick={() => onAction("rematch:offer")}
          >
            {mine ? "Rematch offered" : "Offer rematch"}
          </Button>
        )}

        <p className="text-muted-foreground text-xs">
          {mine
            ? "Waiting for your opponent to answer."
            : "Colours swap — you will play the other side."}
        </p>
      </CardContent>
    </Card>
  );
}

export function GameControls({
  role,
  turn,
  status,
  drawOffer,
  rematchOffer,
  viewerId,
  connected,
  onAction,
}: {
  role: GameRole;
  turn: Turn;
  status: GameStatus;
  /** The id of the player whose draw offer is standing, if any. */
  drawOffer: string | null;
  /** The id of the player whose rematch offer is standing, if any. */
  rematchOffer: string | null;
  viewerId: string | null;
  connected: boolean;
  onAction: (action: GameAction) => void;
}) {
  const [confirmingResign, setConfirmingResign] = useState(false);

  // Resigning and offering a draw need neither the clock running nor your
  // turn, so a paused game still offers both.
  const inProgress = status === "ACTIVE" || status === "PAUSED";

  if (role === "spectator" || !viewerId) return null;

  // The game is over: nothing is left to resign or agree, but the two players
  // can start again.
  if (status === "FINISHED") {
    return (
      <RematchCard
        offer={rematchOffer}
        viewerId={viewerId}
        connected={connected}
        onAction={onAction}
      />
    );
  }

  if (!inProgress) return null;

  const mine = drawOffer === viewerId;
  const theirs = drawOffer !== null && !mine;

  // The server refuses a pause from anyone but the player on move, and a
  // resume from anyone but their opponent, so neither is offered otherwise.
  const canPause = status === "ACTIVE" && role === turn;
  const canResume = status === "PAUSED" && role !== turn;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {theirs && (
          <div className="border-hairline bg-surface-soft space-y-3 rounded-lg border p-3">
            <p className="text-sm">Your opponent offers a draw.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!connected}
                onClick={() => onAction("draw:accept")}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!connected}
                onClick={() => onAction("draw:decline")}
              >
                Decline
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!connected || drawOffer !== null}
            onClick={() => onAction("draw:offer")}
          >
            {mine ? "Draw offered" : "Offer draw"}
          </Button>

          {canPause && (
            <Button
              size="sm"
              variant="outline"
              disabled={!connected}
              onClick={() => onAction("pause")}
            >
              Pause
            </Button>
          )}

          {canResume && (
            <Button
              size="sm"
              variant="outline"
              disabled={!connected}
              onClick={() => onAction("resume")}
            >
              Resume
            </Button>
          )}

          <Button
            size="sm"
            variant="destructive"
            disabled={!connected}
            onClick={() => setConfirmingResign(true)}
          >
            Resign
          </Button>
        </div>

        {mine && (
          <p className="text-muted-foreground text-xs">
            Waiting for your opponent to answer. An offer stands until they
            answer it or play a move.
          </p>
        )}

        {status === "PAUSED" && !canResume && (
          <p className="text-muted-foreground text-xs">
            Paused — only your opponent can resume.
          </p>
        )}
      </CardContent>

      <AlertDialog open={confirmingResign} onOpenChange={setConfirmingResign}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resign this game?</AlertDialogTitle>
            <AlertDialogDescription>
              Your opponent wins immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep playing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmingResign(false);
                onAction("resign");
              }}
            >
              Resign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
