"use client";

import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  formatSpent,
  type MoveRow,
  type PlyCell,
  type ReviewKey,
} from "@/lib/review";
import { cn } from "@/lib/utils";

type ListProps = {
  rows: MoveRow[];
  /** The ply on the board. */
  current: number;
  onSelect: (ply: number) => void;
};

function PlyButton({
  cell,
  current,
  onSelect,
  showTime = false,
  className,
}: {
  cell?: PlyCell;
  current: number;
  onSelect: (ply: number) => void;
  showTime?: boolean;
  className?: string;
}) {
  if (!cell) return <span className={className} />;

  const active = cell.ply === current;

  return (
    <button
      type="button"
      data-active={active || undefined}
      aria-current={active ? "step" : undefined}
      className={cn(
        "hover:bg-accent flex cursor-pointer items-baseline rounded px-1 text-left",
        active && "bg-primary/15 text-foreground font-semibold",
        className,
      )}
      onClick={() => onSelect(cell.ply)}
    >
      {cell.san}
      {showTime && cell.spentMs !== null && (
        <span className="text-muted-foreground ml-auto pl-2 text-xs font-normal tabular-nums">
          {formatSpent(cell.spentMs)}
        </span>
      )}
    </button>
  );
}

/**
 * Keeps the active ply visible inside its own scroller. Not `scrollIntoView`,
 * which also scrolls the page and would yank it down to the list on load.
 */
function useActiveInView(current: number) {
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const node = list.current;
    const active = node?.querySelector("[data-active]");
    if (!node || !active) return;

    const scroller =
      node.closest<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? node;
    const box = scroller.getBoundingClientRect();
    const item = active.getBoundingClientRect();

    if (item.left < box.left) scroller.scrollLeft -= box.left - item.left;
    else if (item.right > box.right)
      scroller.scrollLeft += item.right - box.right;

    if (item.top < box.top) scroller.scrollTop -= box.top - item.top;
    else if (item.bottom > box.bottom)
      scroller.scrollTop += item.bottom - box.bottom;
  }, [current]);

  return list;
}

/** One scrolling line of moves, for below the board on small screens. */
export function MoveStrip({ rows, current, onSelect }: ListProps) {
  const strip = useActiveInView(current);

  if (rows.length === 0) return null;

  return (
    <ol
      ref={strip}
      aria-label="Moves"
      className="flex gap-3 overflow-x-auto font-mono text-sm whitespace-nowrap scrollbar-none"
    >
      {rows.map((row) => (
        <li key={row.number} className="flex gap-0.5">
          <span className="text-muted-foreground mr-1">{row.number}.</span>
          <PlyButton cell={row.white} current={current} onSelect={onSelect} />
          {row.black && (
            <PlyButton cell={row.black} current={current} onSelect={onSelect} />
          )}
        </li>
      ))}
    </ol>
  );
}

export function MoveTable({ rows, current, onSelect }: ListProps) {
  const list = useActiveInView(current);

  return (
    <ol ref={list} aria-label="Moves" className="space-y-1 font-mono text-sm">
      {rows.map((row) => (
        <li key={row.number} className="flex gap-2">
          <span className="text-muted-foreground w-6 text-right">
            {row.number}.
          </span>
          <PlyButton
            cell={row.white}
            current={current}
            onSelect={onSelect}
            showTime
            className="w-28"
          />
          <PlyButton
            cell={row.black}
            current={current}
            onSelect={onSelect}
            showTime
            className="w-28"
          />
        </li>
      ))}
    </ol>
  );
}

const STEPS: { key: ReviewKey; label: string; Icon: typeof ChevronLeft }[] = [
  { key: "first", label: "First move", Icon: ChevronFirst },
  { key: "prev", label: "Previous move", Icon: ChevronLeft },
  { key: "next", label: "Next move", Icon: ChevronRight },
  { key: "last", label: "Latest move", Icon: ChevronLast },
];

export function ReviewControls({
  current,
  total,
  onStep,
  className,
}: {
  current: number;
  total: number;
  onStep: (key: ReviewKey) => void;
  className?: string;
}) {
  if (total === 0) return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {STEPS.map(({ key, label, Icon }) => (
        <Button
          key={key}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={
            key === "first" || key === "prev"
              ? current === 0
              : current === total
          }
          onClick={() => onStep(key)}
        >
          <Icon />
        </Button>
      ))}
    </div>
  );
}
