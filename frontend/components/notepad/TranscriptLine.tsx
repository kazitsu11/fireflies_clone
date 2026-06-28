"use client";

import type { ReactNode } from "react";

import type { Segment } from "@/lib/types";
import { msToClock } from "@/lib/time";
import { cn } from "@/lib/utils";

/** Wrap case-insensitive matches of `query` in <mark> (used by TranscriptSearch). */
function renderText(text: string, query?: string, current?: boolean): ReactNode {
  const q = query?.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let idx = lower.indexOf(ql);
  let key = 0;
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        key={key++}
        className={cn(
          "rounded-sm px-0.5",
          current
            ? "bg-amber-300 text-amber-950 dark:bg-amber-400/60 dark:text-amber-50"
            : "bg-amber-200/70 text-amber-950 dark:bg-amber-400/25 dark:text-amber-100",
        )}
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
    idx = lower.indexOf(ql, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}

export function TranscriptLine({
  segment,
  speakerColor,
  isActive,
  onSeek,
  query,
  isCurrentMatch,
}: {
  segment: Segment;
  speakerColor: string;
  isActive: boolean;
  onSeek: (ms: number) => void;
  query?: string;
  isCurrentMatch?: boolean;
}) {
  return (
    <button
      type="button"
      data-line-idx={segment.idx}
      data-active={isActive}
      onClick={() => onSeek(segment.start_ms)}
      className={cn(
        "group block w-full scroll-mt-4 rounded-lg border-l-2 px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "border-primary bg-primary/[0.07]"
          : "border-transparent hover:bg-accent/60",
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className={cn("text-sm font-semibold", speakerColor)}>
          {segment.speaker}
        </span>
        <span
          className={cn(
            "text-xs tabular-nums transition-colors",
            isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary",
          )}
        >
          {msToClock(segment.start_ms)}
        </span>
      </div>
      <p className="mt-0.5 text-sm leading-relaxed text-foreground/90">
        {renderText(segment.text, query, isCurrentMatch)}
      </p>
    </button>
  );
}
