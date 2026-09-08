"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { activeGameIdFrom, createGame } from "@/lib/api";
import { ensureSession } from "@/lib/auth-client";

export function CreateGameButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onCreate() {
    setPending(true);

    try {
      await ensureSession();

      const { data } = await createGame();
      router.push(`/game/${data.id}`);
    } catch (error) {
      const elsewhere = activeGameIdFrom(error);

      if (elsewhere) {
        toast.error("You are already in an active game.", {
          action: {
            label: "Go there",
            onClick: () => router.push(`/game/${elsewhere}`),
          },
        });
        return;
      }

      toast.error(
        error instanceof Error ? error.message : "Could not create the game",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={onCreate} disabled={pending}>
      {pending ? "Creating…" : "New game"}
    </Button>
  );
}
