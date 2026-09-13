"use client";

import {
  DEFAULT_TIME_CONTROL,
  TIME_CONTROLS,
  TIME_CONTROL_KEYS,
  type TimeControlKey,
} from "@repo/game-core";
import { ArrowRightIcon } from "lucide-react";
import { useCreateGame } from "@/components/game/create-game-button";
import { cn } from "@/lib/utils";

function describe(key: TimeControlKey) {
  const { initialMs, incrementMs } = TIME_CONTROLS[key];
  const minutes = initialMs / 60_000;
  const increment = incrementMs / 1000;

  return `${minutes} minute${minutes === 1 ? "" : "s"} a side, ${
    increment ? `+${increment}s per move` : "no increment"
  }`;
}

export function TimeControlGrid() {
  const { pending, create } = useCreateGame();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TIME_CONTROL_KEYS.map((key) => {
        const featured = key === DEFAULT_TIME_CONTROL;

        return (
          <button
            key={key}
            type="button"
            disabled={pending !== null}
            onClick={() => create(key)}
            className={cn(
              "group flex min-h-56 cursor-pointer flex-col rounded-xl border p-8 text-left transition-colors outline-none",
              "focus-visible:ring-ring/50 focus-visible:ring-3 disabled:cursor-default",
              featured
                ? "bg-primary text-on-yellow hover:bg-primary-active border-transparent"
                : "border-hairline bg-card hover:bg-accent",
              pending !== null && pending !== key && "opacity-50",
            )}
          >
            <span
              className={cn(
                "text-caption-upper uppercase",
                featured ? "text-on-yellow/70" : "text-muted-foreground",
              )}
            >
              {TIME_CONTROLS[key].category}
              {featured && " · Default"}
            </span>

            <span
              className={cn(
                "text-display-md mt-3 font-mono",
                featured ? "text-on-yellow" : "text-foreground",
              )}
            >
              {key}
            </span>

            <span
              className={cn(
                "text-body-sm mt-2",
                featured ? "text-on-yellow/80" : "text-muted-foreground",
              )}
            >
              {describe(key)}
            </span>

            <span className="text-body-sm mt-auto flex items-center gap-1.5 pt-6 font-semibold">
              {pending === key ? "Creating…" : `Play ${key}`}
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
