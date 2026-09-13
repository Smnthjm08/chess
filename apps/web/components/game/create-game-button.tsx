"use client";

import {
  TIME_CONTROLS,
  TIME_CONTROL_KEYS,
  type TimeControlKey,
} from "@repo/game-core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { activeGameIdFrom, createGame } from "@/lib/api";
import { ensureSession } from "@/lib/auth-client";

export function useCreateGame() {
  const router = useRouter();
  const [pending, setPending] = useState<TimeControlKey | null>(null);

  async function create(timeControl: TimeControlKey) {
    setPending(timeControl);

    try {
      await ensureSession();

      const { data } = await createGame(timeControl);
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
      setPending(null);
    }
  }

  return { pending, create };
}

export function CreateGameButton({
  label = "New game",
  align = "end",
  className,
}: {
  label?: string;
  align?: "start" | "end";
  className?: string;
}) {
  const { pending, create } = useCreateGame();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button disabled={pending !== null} className={className} />}
      >
        {pending ? "Creating…" : label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {TIME_CONTROL_KEYS.map((key) => (
          <DropdownMenuItem key={key} onClick={() => create(key)}>
            <span className="font-medium">{key}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {TIME_CONTROLS[key].category}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
