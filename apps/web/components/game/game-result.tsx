"use client";

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
import { OUTCOME_TITLE, outcomeFor, resultSummary } from "@/lib/result";

export function GameResultDialog({
  game,
  viewerId,
  open,
  onOpenChange,
}: {
  game: GameDetail;
  viewerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{OUTCOME_TITLE[outcomeFor(game, viewerId)]}</DialogTitle>
          <DialogDescription>{resultSummary(game)}.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Review the board
          </DialogClose>
          <Button render={<Link href="/lobby" />}>Back to lobby</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
