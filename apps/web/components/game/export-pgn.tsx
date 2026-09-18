"use client";

import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { GameDetail } from "@/lib/api";
import { gamePgn, pgnFilename } from "@/lib/pgn";

export function ExportPgn({
  game,
  className,
}: {
  game: GameDetail;
  className?: string;
}) {
  function download() {
    const url = URL.createObjectURL(
      new Blob([gamePgn(game)], { type: "application/x-chess-pgn" }),
    );

    try {
      const link = document.createElement("a");

      link.href = url;
      link.download = pgnFilename(game);
      link.click();
    } catch {
      toast.error("Could not export the game.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={download}
      disabled={game.moves.length === 0}
      className={className}
    >
      <DownloadIcon />
      PGN
    </Button>
  );
}
