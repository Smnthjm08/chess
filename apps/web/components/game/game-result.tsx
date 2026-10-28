"use client";

import { Flag, Handshake, Trophy, type LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { GameDetail } from "@/lib/api";
import {
  outcomeFor,
  outcomeTitle,
  resultSummary,
  type Outcome,
} from "@/lib/result";
import { cn } from "@/lib/utils";

const TONE: Record<Outcome, string> = {
  won: "border-success/40 bg-success/10 [&_[data-title]]:text-success",
  lost: "border-destructive/40 bg-destructive/10 [&_[data-title]]:text-destructive",
  draw: "border-hairline-strong bg-muted",
  over: "border-primary bg-primary text-primary-foreground",
};

const ICON: Record<Outcome, LucideIcon> = {
  won: Trophy,
  lost: Flag,
  draw: Handshake,
  over: Trophy,
};

export function ResultBanner({
  outcome,
  title,
  summary,
  className,
}: {
  outcome: Outcome;
  title: string;
  summary: string;
  className?: string;
}) {
  const Icon = ICON[outcome];

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
        TONE[outcome],
        className,
      )}
    >
      <Icon data-title className="size-5 shrink-0" />
      <div className="min-w-0">
        <p data-title className="text-base leading-tight font-semibold">
          {title}
        </p>
        <p className="text-sm opacity-80">{summary}</p>
      </div>
    </div>
  );
}

export function GameResultDialog({
  game,
  viewerId,
  open,
  onOpenChange,
  onRematch,
}: {
  game: GameDetail;
  viewerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omitted for spectators, who have no rematch to offer. */
  onRematch?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="sr-only">
            {outcomeTitle(game, viewerId)}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {resultSummary(game)}.
          </DialogDescription>
          <ResultBanner
            outcome={outcomeFor(game, viewerId)}
            title={outcomeTitle(game, viewerId)}
            summary={resultSummary(game)}
            className="py-4 [&_[data-title]]:text-xl"
          />
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Review the board
          </DialogClose>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/lobby" />}
          >
            Back to lobby
          </Button>
          {onRematch && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onRematch();
              }}
            >
              Offer rematch
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
