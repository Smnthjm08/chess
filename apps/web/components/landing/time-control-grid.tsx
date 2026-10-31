"use client";

import {
  DEFAULT_TIME_CONTROL,
  TIME_CONTROLS,
  TIME_CONTROL_KEYS,
  type TimeControlKey,
} from "@repo/game-core";
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
    <ul className="border-hairline border-t">
      {TIME_CONTROL_KEYS.map((key) => {
        const featured = key === DEFAULT_TIME_CONTROL;

        return (
          <li key={key} className="border-hairline border-b">
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => create(key)}
              className={cn(
                "group grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 py-8 text-left outline-none sm:grid-cols-12 sm:gap-x-8",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-background disabled:cursor-default",
                pending !== null && pending !== key && "opacity-50",
              )}
            >
              <span
                className={cn(
                  "text-display-md sm:text-display-lg font-mono transition-colors sm:col-span-3",
                  featured
                    ? "text-primary"
                    : "text-foreground group-hover:text-primary group-active:text-primary-active",
                )}
              >
                {key}
              </span>

              <span className="text-title-md self-center max-sm:order-3 sm:col-span-3">
                {TIME_CONTROLS[key].category}
                {featured && (
                  <span className="text-muted-foreground font-normal">
                    , the default
                  </span>
                )}
              </span>

              <span className="text-body-md text-muted-foreground self-center max-sm:order-4 max-sm:col-span-2 sm:col-span-4">
                {describe(key)}
              </span>

              <span className="text-body-sm self-center font-semibold max-sm:order-2 sm:col-span-2 sm:text-right">
                {pending === key ? "Creating…" : `Play ${key}`}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
