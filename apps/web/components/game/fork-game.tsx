"use client";

import { GitFork } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { activeGameIdFrom, forkGame } from "@/lib/api";
import { ensureSession } from "@/lib/auth-client";

export function ForkGame({
  gameId,
  ply,
  disabled,
}: {
  gameId: string;
  /** The ply on the board, which becomes the new game's start. */
  ply: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [forking, setForking] = useState(false);

  async function fork() {
    setForking(true);

    try {
      await ensureSession();

      const { data } = await forkGame(gameId, ply);

      router.push(`/game/${data.id}`);
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
        error instanceof Error ? error.message : "Could not fork the game.",
      );
    } finally {
      setForking(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Play on from this position"
      title="Play on from this position"
      disabled={disabled || forking}
      onClick={fork}
    >
      <GitFork />
    </Button>
  );
}
